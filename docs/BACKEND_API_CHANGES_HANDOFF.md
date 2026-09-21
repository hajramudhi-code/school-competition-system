# Backend API Changes Handoff

This document contains only the API behavior changes that must be implemented or verified in the backend. It is a focused handoff extracted from the full API specifications.

## 1. Historical Data and `RESOURCE_IN_USE`

Historical references must not block safe retirement. Results, match history, questions, reports, and audit records must remain available.

Return `409 RESOURCE_IN_USE` only when the resource is still required by active work:

- a school or subject is required by an `ACTIVE` or `UPCOMING` competition;
- a question is currently selected or required by an `IN_PROGRESS` match;
- a competition has an `UPCOMING` or `IN_PROGRESS` match.

For historical data, use retirement/archiving instead of hard deletion.

## 2. Image Upload Restrictions

The shared API contract requires these rules for uploaded school, competition,
sponsor, and video-question person images:

- Allowed types: PNG, JPEG, or WebP.
- Maximum file size: 10 MB.
- No width restriction.
- No height restriction.
- No aspect-ratio restriction.
- Return a persistent `logoUrl` or `personImageUrl` after a successful upload.

The backend must validate the file type and 10 MB limit server-side for both
multipart uploads and any URL-backed image flow that the backend downloads or
processes. Return a structured `400` validation error for an unsupported type
or oversized file.

## 3. Delete School

```http
DELETE /api/schools/:id
```

- Auth: `ADMIN`.
- Return `204` for an unused school.
- If the school has historical competition or match references, retain the row and set `status` to `DISABLED`; return `204`.
- Do not return `RESOURCE_IN_USE` only because a completed match or old competition references the school.
- A hard delete is allowed only when the school has no references.
- Return `409 RESOURCE_IN_USE` only when the school is currently required by an active or upcoming competition.

Existing endpoint remains valid:

```http
PATCH /api/schools/:id/status
```

## 4. Delete Subject

```http
DELETE /api/subjects/:id
```

- Auth: `ADMIN`.
- Return `204` for an unused subject.
- If the subject is referenced by historical questions or competitions, retain the row and set `status` to `DISABLED`; return `204`.
- Do not return `RESOURCE_IN_USE` for historical references.
- A hard delete is allowed only when the subject has no references.
- Return `409 RESOURCE_IN_USE` only when the subject is currently required by an active or upcoming competition.

Existing endpoint remains valid:

```http
PATCH /api/subjects/:id/status
```

## 5. Delete Question

```http
DELETE /api/questions/:id
```

- Auth: `ADMIN`.
- Return `204` for an unused question.
- If the question was used by a completed or historical match, retain it and set `status` to `DISABLED`; return `204`.
- A hard delete is allowed only when the question has no match or result references.
- Return `409 RESOURCE_IN_USE` only when the question is currently selected or required by an `IN_PROGRESS` match.

Existing endpoint remains valid:

```http
PATCH /api/questions/:id/status
```

## 6. Delete or Archive Competition

```http
DELETE /api/competitions/:id
```

- Auth: `ADMIN`.
- A competition with no matches may be hard-deleted and return `204`.
- A competition whose matches are all `COMPLETED` must be retired/archived from normal admin lists and return `204`.
- Archived competition matches, results, reports, officials, and audit history must remain accessible through their existing read endpoints.
- Completion is not a reason to return `RESOURCE_IN_USE`.
- Return `409 RESOURCE_IN_USE` only when the competition has an `UPCOMING` or `IN_PROGRESS` match.

The frontend may continue calling the existing `DELETE` endpoint. The backend can implement archive behavior behind that endpoint.

## 7. Subject Code Contract

### Create

```http
POST /api/subjects
```

```json
{
  "name": "History",
  "code": "HISTORY"
}
```

- `name` and `code` are required on create.
- `code` must be unique.
- Return the stored `code` in subject list and detail responses.

### Update

```http
PATCH /api/subjects/:id
```

```json
{
  "name": "World History"
}
```

- `code` may be omitted to preserve its current value.
- If supplied, the new `code` must remain unique.

## 8. Fixture Generation and Regeneration

### First generation

```http
POST /api/competitions/:id/fixtures/generate
```

- Use when no fixture exists.
- If a fixture already exists, return `409` with a clear conflict code such as `FIXTURE_ALREADY_GENERATED`.

### Regeneration

```http
POST /api/competitions/:id/fixtures/regenerate
```

- Use when an existing fixture schedule must be changed.
- The active frontend now calls this endpoint when a fixture already exists.
- Return the regenerated fixture with `201` (or the agreed successful 2xx response).
- Do not regenerate if any match has recorded results; return a clear `409`, such as `FIXTURE_HAS_RESULTS`.
- Never delete or overwrite recorded match results during regeneration.

## 9. Rematch Must Create a New Match

```http
POST /api/matches/:id/rematch
```

- The source match must be `COMPLETED`.
- Create a new match record for the same schools.
- Keep the old match, results, and question history unchanged.
- Create a new live-match record.
- Reset only the new match state: score, current question, timer, slots, and result state.
- Return the new `matchId` and its `LiveMatchState`.
- Do not reset or reuse the completed match row.
- Reject a future-dated rematch with a clear validation error.

## 10. Existing Data-Safety Conflicts That Remain Intentional

These are not `RESOURCE_IN_USE` errors and should remain enforced:

- A completed question cannot receive a second result.
- A finalized match cannot be finalized again.
- A future-dated match cannot be started.
- A fixture with recorded results cannot be regenerated.

Use specific error codes/messages so the frontend can distinguish these cases from resource retirement.

## 11. Acceptance Tests

1. Delete an unused school: return `204`.
2. Delete a school referenced only by completed matches: return `204`, set `DISABLED`, preserve matches/results.
3. Delete a subject referenced by historical questions: return `204`, set `DISABLED`, preserve questions.
4. Delete a question used by a completed match: return `204`, set `DISABLED`, preserve match history.
5. Delete a completed competition: return `204`, archive it from normal lists, preserve results/reports.
6. Attempt to delete a subject used by an active competition: return `409 RESOURCE_IN_USE`.
7. Attempt to delete a competition with an upcoming or in-progress match: return `409 RESOURCE_IN_USE`.
8. Generate a fixture once, then change its schedule and call `/fixtures/regenerate` successfully before results exist.
9. Attempt regeneration after a result exists: return a specific `409` conflict without changing old results.
10. Rematch a completed match: return a new `matchId`; verify the old match and results are unchanged.
11. Create a subject without `code`: return validation error.
12. Update a subject without `code`: preserve its existing code.
13. Reject an uploaded image larger than 10 MB or with an unsupported file type; accept valid images regardless of width, height, or aspect ratio.
