# Frontend/Backend API Migration Contract

## Purpose

This document is the contract required by the current frontend. It identifies:

- APIs that are no longer used and should not be implemented for the new flow.
- APIs that must be added.
- APIs whose request or response shape must be changed.
- The exact lifecycle for `START`, `END`, `REMATCH`, and `NEXT MATCH`.

All examples below are under `/api` and require the normal Bearer token unless stated otherwise.

## 1. APIs To Remove From The New Flow

### 1.1 Remove match countdown control

The frontend no longer uses:

```http
POST /api/matches/:id/match-timer
```

The old request was:

```json
{ "action": "START" }
```

or:

```json
{ "action": "PAUSE" }
```

This endpoint must not be used for match lifecycle control. Match completion is controlled explicitly by the Host. The per-question timer remains separate and is still represented by the `timer` field in live state.

The old frontend method `matchTimer`/`matchControl` is obsolete. The current frontend uses the explicit endpoints in section 2.

### 1.2 Remove competition match-duration fields

The frontend no longer sends or reads:

```json
{ "matchDurationMinutes": 30 }
```

`matchDurationMinutes` should not be required by `POST /competitions` or `PATCH /competitions/:id`. If the backend already has this field, it may remain backward-compatible, but it is not part of the active frontend contract.

### 1.3 Do not require `INCORRECT` from Host

The Host now sends only:

```json
{ "result": "CORRECT" }
```

or:

```json
{ "result": "TIMEOUT" }
```

The backend may keep `INCORRECT` in the result enum for old records or administrative tooling, but the Host UI must not be required to send it.

## 2. APIs To Add

## 2.1 Start an existing upcoming match

```http
POST /api/matches/:id/start
```

Auth: `HOST` assigned to the competition, or `ADMIN`.

Use this only when the match is `UPCOMING` and has not started before.

### Success `200`

```json
{
  "matchId": "m_001",
  "status": "IN_PROGRESS",
  "liveState": {
    "matchId": "m_001",
    "matchStatus": "IN_PROGRESS",
    "matchName": "ROUND 1 — MATCH 01",
    "schoolA": {
      "id": "sch_001",
      "name": "Greenwood High",
      "logoUrl": null,
      "score": 0
    },
    "schoolB": {
      "id": "sch_002",
      "name": "Lakeside Academy",
      "logoUrl": null,
      "score": 0
    },
    "currentSchoolId": null,
    "questionsAnsweredInTurn": 0,
    "currentSubjectId": null,
    "currentQuestion": null,
    "videoQuestion": null,
    "questionMode": "NORMAL",
    "questionSlots": [],
    "videoQuestions": [],
    "timer": {
      "durationSeconds": 30,
      "remainingSeconds": 30,
      "state": "IDLE"
    },
    "lastResult": null
  }
}
```

## 2.2 End the current match

```http
POST /api/matches/:id/end
```

Auth: `HOST` or `ADMIN`.

Rules:

- The match must be `IN_PROGRESS`.
- Close any selected question according to the backend policy.
- Mark the match `COMPLETED`.
- Preserve its scores and `MatchQuestion` history.
- Do not delete or reset the old match.
- The response must keep enough information for Controller to display the completed match until the Host chooses the next action.

### Success `200`

```json
{
  "matchId": "m_001",
  "status": "COMPLETED",
  "liveState": {
    "matchId": "m_001",
    "matchStatus": "COMPLETED",
    "matchName": "ROUND 1 — MATCH 01",
    "schoolA": {
      "id": "sch_001",
      "name": "Greenwood High",
      "logoUrl": null,
      "score": 40
    },
    "schoolB": {
      "id": "sch_002",
      "name": "Lakeside Academy",
      "logoUrl": null,
      "score": 30
    },
    "currentQuestion": null,
    "videoQuestion": null,
    "questionSlots": [],
    "videoQuestions": [],
    "timer": {
      "durationSeconds": 30,
      "remainingSeconds": 0,
      "state": "IDLE"
    },
    "lastResult": null
  }
}
```

## 2.3 Start a rematch with the same schools

```http
POST /api/matches/:id/rematch
```

Auth: `HOST` or `ADMIN`.

Rules:

- The source match must be `COMPLETED`.
- Create a new match instance; do not reuse the old match row.
- Keep the same `schoolA` and `schoolB`.
- Keep the old match and its results as history.
- Create a new `LiveMatch` record.
- Start the new match as `IN_PROGRESS`.
- Reset scores to `0` and clear all live question/result state.
- Generate a fresh question set for the new match. The first selected subject must expose 20 fresh slots, all `AVAILABLE`.
- A question used in the old match must be allowed in the rematch only if the product rules permit it; if the requirement is a completely fresh set, selection must exclude all old `MatchQuestion` rows and choose another pool.

### Success `201` or `200`

```json
{
  "previousMatchId": "m_001",
  "matchId": "m_003",
  "status": "IN_PROGRESS",
  "liveState": {
    "matchId": "m_003",
    "matchStatus": "IN_PROGRESS",
    "matchName": "REMATCH — MATCH 01",
    "schoolA": {
      "id": "sch_001",
      "name": "Greenwood High",
      "logoUrl": null,
      "score": 0
    },
    "schoolB": {
      "id": "sch_002",
      "name": "Lakeside Academy",
      "logoUrl": null,
      "score": 0
    },
    "currentSchoolId": null,
    "questionsAnsweredInTurn": 0,
    "currentSubjectId": null,
    "currentQuestion": null,
    "videoQuestion": null,
    "questionMode": "NORMAL",
    "questionSlots": [],
    "videoQuestions": [],
    "timer": {
      "durationSeconds": 30,
      "remainingSeconds": 30,
      "state": "IDLE"
    },
    "lastResult": null
  }
}
```

## 2.4 Start the next fixture match

```http
POST /api/matches/:id/next
```

Auth: `HOST` or `ADMIN`.

Rules:

- The source match must be `COMPLETED`.
- Mark the source match as history; never overwrite its result.
- Resolve the next fixture match from the competition bracket.
- If the next match needs a winner from another feeder, return a conflict instead of creating an invalid match.
- Create or activate the next match as `IN_PROGRESS`.
- Return a new `matchId`.
- Reset live state and expose fresh slots for the new match.

### Success `200`

```json
{
  "previousMatchId": "m_001",
  "matchId": "m_002",
  "status": "IN_PROGRESS",
  "liveState": {
    "matchId": "m_002",
    "matchStatus": "IN_PROGRESS",
    "matchName": "ROUND 1 — MATCH 02",
    "schoolA": {
      "id": "sch_003",
      "name": "Harbour School",
      "logoUrl": null,
      "score": 0
    },
    "schoolB": {
      "id": "sch_004",
      "name": "Hillcrest Academy",
      "logoUrl": null,
      "score": 0
    },
    "currentSchoolId": null,
    "questionsAnsweredInTurn": 0,
    "currentSubjectId": null,
    "currentQuestion": null,
    "videoQuestion": null,
    "questionMode": "NORMAL",
    "questionSlots": [],
    "videoQuestions": [],
    "timer": {
      "durationSeconds": 30,
      "remainingSeconds": 30,
      "state": "IDLE"
    },
    "lastResult": null
  }
}
```

### No next match `409`

```json
{
  "error": {
    "code": "NO_NEXT_MATCH",
    "message": "There is no playable next match yet.",
    "fields": {}
  }
}
```

## 3. Existing APIs To Change

## 3.1 `GET /api/matches`

The frontend now requests these statuses:

```text
IN_PROGRESS
UPCOMING
COMPLETED
```

The endpoint must return the newest relevant match first for a competition, especially for `COMPLETED`, because Host and Controller use the latest completed match while waiting for `REMATCH` or `NEXT MATCH`.

Expected response:

```json
{
  "data": [
    {
      "id": "m_001",
      "competitionId": "cmp_001",
      "roundName": "ROUND 1",
      "matchLabel": "ROUND 1 — MATCH 01",
      "schoolAId": "sch_001",
      "schoolBId": "sch_002",
      "date": "2026-09-17",
      "day": "THURSDAY",
      "status": "COMPLETED"
    }
  ]
}
```

## 3.2 Live state endpoints

These must return the same lifecycle-aware `LiveMatchState` shape:

```http
GET /api/matches/:id/live-state
GET /api/matches/:id/public-state
```

The response must include:

```json
{
  "matchId": "m_002",
  "matchStatus": "IN_PROGRESS",
  "currentQuestion": null,
  "videoQuestion": null,
  "questionSlots": [],
  "videoQuestions": [],
  "lastResult": null,
  "timer": {
    "durationSeconds": 30,
    "remainingSeconds": 30,
    "state": "IDLE"
  }
}
```

`public-state` rules:

- Do not expose `correctAnswer` before a result is recorded.
- Expose `correctAnswer` for the revealed question after `lastResult` is populated.
- Include `videoQuestions` or provide an equivalent controller-authorized list endpoint. The current Controller UI expects the list when Video mode has no selected question.

## 3.3 Video question list

The Host uses:

```http
GET /api/matches/:id/video-questions?subjectId=:subjectId
```

The response must be:

```json
{
  "data": [
    {
      "id": "qv_001",
      "subjectId": "subj_001",
      "slot": 1,
      "slotStatus": "AVAILABLE",
      "isVideoQuestion": true,
      "personName": "Person One",
      "personImageUrl": "https://example.test/person-one.jpg",
      "youtubeUrl": "https://www.youtube.com/watch?v=example",
      "text": "Question text",
      "mode": "MULTIPLE_CHOICE",
      "optionA": "Answer A",
      "optionB": "Answer B",
      "optionC": "Answer C",
      "optionD": "Answer D",
      "correctAnswer": "A"
    }
  ]
}
```

Only the first 4 video cards are rendered by the frontend. The backend may return more, but the first four must be stable and ordered.

## 3.4 Question result

```http
POST /api/matches/:id/question-result
```

Active Host payloads are now:

```json
{
  "questionId": "q_001",
  "result": "CORRECT"
}
```

or:

```json
{
  "questionId": "q_001",
  "result": "TIMEOUT"
}
```

Success must return the updated live state with:

```json
{
  "lastResult": {
    "questionId": "q_001",
    "result": "CORRECT",
    "schoolId": "sch_001",
    "timestamp": "2026-09-17T12:00:00Z",
    "correctAnswer": "A"
  },
  "currentQuestion": {
    "id": "q_001",
    "status": "SELECTED",
    "correctAnswer": "A"
  },
  "timer": {
    "state": "IDLE",
    "remainingSeconds": 0
  }
}
```

The current Host keeps this question open for reveal until the Host presses `X`. The Controller keeps it visible and highlights the correct option.

## 3.5 Competitions API

The active frontend competition payload no longer includes `matchDurationMinutes`:

```json
{
  "name": "Regional Science Bowl",
  "logoUrl": null,
  "questionDurationSeconds": 30,
  "startDate": "2026-09-17",
  "endDate": "2026-09-20",
  "schoolIds": ["sch_001", "sch_002"],
  "subjectIds": ["subj_001"]
}
```

`matchDurationMinutes` must not be required for create/update.

## 3.6 Subjects API

Subject code is sent by the active frontend when creating a subject and is
optional only when updating an existing subject.

Create:

```http
POST /api/subjects
```

```json
{ "name": "History", "code": "HISTORY" }
```

Update:

```http
PATCH /api/subjects/:id
```

```json
{ "name": "World History" }
```

The backend must require a unique `code` when creating a subject. On update,
`code` may be omitted to preserve the existing value; if supplied, it must
remain unique. Existing stored codes remain valid.

## 3.7 Sponsors API

Sponsors are now global records managed independently from a single competition selection.

Create:

```http
POST /api/sponsors
```

JSON request:

```json
{ "name": "Zanzibar Telecom" }
```

Multipart request fields:

```text
name: Zanzibar Telecom
logo: <image file>
```

Update:

```http
PATCH /api/sponsors/:id
```

```json
{ "name": "New Sponsor Name", "logoUrl": "https://example.test/logo.png" }
```

Delete:

```http
DELETE /api/sponsors/:id
```

Response:

```json
{
  "id": "spn_001",
  "name": "Zanzibar Telecom",
  "logoUrl": "https://example.test/logo.png"
}
```

The old fields `contactInfo`, `slogan`, and `includeInReport` are not sent by the active frontend and must not be required. They may remain nullable for old records.

## 4. APIs That Remain Unchanged

These are still used by the frontend:

```text
POST /api/auth/admin/login
POST /api/auth/staff/login
GET  /api/auth/me
POST /api/auth/logout
GET  /api/schools
POST /api/schools
PATCH /api/schools/:id
DELETE /api/schools/:id
PATCH /api/schools/:id/status
GET  /api/subjects
GET  /api/questions
POST /api/questions
PATCH /api/questions/:id
DELETE /api/questions/:id
PATCH /api/questions/:id/status
POST /api/competitions/:id/fixtures/generate
GET  /api/competitions/:id/fixtures
POST /api/competitions/:id/fixtures/regenerate
GET  /api/competitions/:id/results
POST /api/competitions/:id/reports
GET  /api/reports/:id
GET  /api/reports/:id/file
```

## 5. Backend Acceptance Checklist

- [ ] Add `POST /matches/:id/start`.
- [ ] Add `POST /matches/:id/end`.
- [ ] Add `POST /matches/:id/rematch`.
- [ ] Add `POST /matches/:id/next`.
- [ ] Keep old completed matches and their results immutable.
- [ ] Create a new match/live record for rematches; do not reset the old match in place.
- [ ] Resolve the next fixture match without overwriting old results.
- [ ] Return a new `matchId` from rematch and next-match responses.
- [ ] Return 20 fresh normal question slots as `AVAILABLE` when a subject is selected for a new match.
- [ ] Return 4 stable video questions for the active video subject, or return the full list with stable ordering.
- [ ] Require a unique Subject `code` on create; allow it to be omitted on update.
- [ ] Support Sponsor delete.
- [ ] Stop requiring old sponsor contact/slogan/report fields.
- [ ] Keep public-state safe before reveal and reveal `correctAnswer` only after result.
- [ ] Test Host and Controller against the same live-state transition.
