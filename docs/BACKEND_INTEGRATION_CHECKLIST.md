# Backend Integration Checklist

This document contains the backend response requirements needed by the current frontend.
It supplements `API_SPECIFICATION.md` and focuses on the fields that previously caused
missing subject codes, missing question numbers, and missing staff names.

## 1. Subject Response

Every subject returned by these endpoints must include the same fields:

- `GET /api/subjects`
- `GET /api/subjects/:id`
- `POST /api/subjects`
- `PATCH /api/subjects/:id`

Required response shape:

```json
{
  "id": "subj_001",
  "name": "Mathematics",
  "code": "MATH",
  "status": "ENABLED",
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-01-10T08:00:00Z"
}
```

Rules:

- `code` is required and must be a real backend value, not generated from the name.
- `code` must be unique.
- `code` must be returned by the list endpoint, not only after create/update.
- `updatedAt` must change after subject edit or enable/disable.
- Create and update must accept `name` and `code`.

## 2. Host Subject Selection

Request:

```http
POST /api/matches/:matchId/select-subject
```

Body:

```json
{
  "subjectId": "subj_001"
}
```

The successful response must be the updated live state:

```json
{
  "matchId": "m_001",
  "currentSubjectId": "subj_001",
  "questionMode": "NORMAL",
  "questionSlots": [
    {
      "questionId": "q_001",
      "slot": 1,
      "status": "AVAILABLE"
    },
    {
      "questionId": "q_002",
      "slot": 2,
      "status": "AVAILABLE"
    }
  ]
}
```

Rules:

- `currentSubjectId` must equal the submitted `subjectId`.
- `questionSlots` must always be present as an array.
- Slots must be filtered by the selected subject.
- In `NORMAL` mode, slots must contain non-video questions only.
- Every slot requires `questionId`, `slot`, and `status`.
- `slot` must be a stable positive integer starting from 1.
- If the subject has no questions, return `questionSlots: []`, not a missing field.
- Questions must be ordered consistently on every live-state request.

## 3. Live State For Host And Controller

Both endpoints must return the same question selection and slot data:

```http
GET /api/matches/:matchId/live-state
GET /api/matches/:matchId/public-state
```

Required fields:

```json
{
  "currentSubjectId": "subj_001",
  "questionMode": "NORMAL",
  "questionSlots": [
    {
      "questionId": "q_001",
      "slot": 1,
      "status": "AVAILABLE"
    }
  ],
  "currentQuestion": null,
  "timer": {
    "durationSeconds": 30,
    "remainingSeconds": 30,
    "state": "IDLE"
  }
}
```

After `select-question`, return the updated state immediately:

```json
{
  "currentQuestion": {
    "id": "q_001",
    "subjectId": "subj_001",
    "mode": "MULTIPLE_CHOICE",
    "text": "Question text",
    "status": "SELECTED"
  },
  "questionSlots": [
    {
      "questionId": "q_001",
      "slot": 1,
      "status": "SELECTED"
    }
  ]
}
```

## 4. Staff Names On Competition

`GET /api/competitions/:competitionId` must return names, not IDs only:

```json
{
  "hostId": "hst_001",
  "controllerId": "ctl_001",
  "hostName": "Juma Mohamed Juma",
  "controllerName": "Aisha Mohamed"
}
```

Nested objects are also accepted:

```json
{
  "host": {
    "id": "hst_001",
    "name": "Juma Mohamed Juma",
    "role": "HOST"
  },
  "controller": {
    "id": "ctl_001",
    "name": "Aisha Mohamed",
    "role": "CONTROLLER"
  }
}
```

After these requests, the returned staff names must be persisted and visible in the
competition detail response:

```http
POST /api/competitions/:competitionId/host
POST /api/competitions/:competitionId/controller
```

## 5. Questions Pagination

Request:

```http
GET /api/questions?page=1&pageSize=20
```

Response:

```json
{
  "data": [],
  "page": 1,
  "pageSize": 20,
  "total": 42
}
```

Rules:

- Return only the requested page.
- Preserve the requested `page` and `pageSize` in the response.
- `total` must be the total number of records after filters.
- Subject filtering must work together with pagination:
  `GET /api/questions?subjectId=subj_001&page=1&pageSize=20`.

## 6. Delete Endpoints Used By Frontend

These endpoints are called by the admin frontend:

```http
DELETE /api/schools/:schoolId
DELETE /api/subjects/:subjectId
DELETE /api/questions/:questionId
```

Success response:

```http
204 No Content
```

Historical references must not block safe retirement. For a referenced subject,
set `status: DISABLED` and retain the row. For a competition whose matches are all
`COMPLETED`, archive it from normal lists while retaining matches and results.

Return `RESOURCE_IN_USE` only when an entity is still needed by active or upcoming
work, for example a subject used by an active competition or a competition with an
`UPCOMING`/`IN_PROGRESS` match:

```json
{
  "error": {
    "code": "RESOURCE_IN_USE",
    "message": "This resource cannot be deleted because it is in use."
  }
}
```

with HTTP status `409`.

## 7. Final Backend Test Cases

Before integration is considered complete, verify:

1. Create a subject with code `MATH`; list it and confirm `code: MATH` is present.
2. Edit the subject; confirm `updatedAt` changes.
3. Select that subject from Host; confirm live state contains matching `currentSubjectId`.
4. Confirm Host receives real `questionSlots` for that subject.
5. Confirm Controller receives the same slots from `public-state`.
6. Select a question; confirm its slot changes to `SELECTED`.
7. Assign Host and Controller; reload competition detail and confirm both names are present.
8. Request questions with `pageSize=20`; confirm pagination metadata and record count.
9. Delete an unused school/subject; confirm HTTP `204`.
10. Retire a referenced subject; confirm HTTP `204`, `status: DISABLED`, and intact historical questions.
11. Delete a completed competition; confirm HTTP `204`, hidden from normal lists, and intact matches/results.
12. Try deleting a subject used by an active competition or a competition with an upcoming/in-progress match; confirm HTTP `409` with the documented error shape.
