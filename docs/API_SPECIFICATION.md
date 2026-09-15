# School Competition Management & Live Quiz System — API Specification

Version: 1.0
Base URL: `https://api.schoolcompetition.example/api` (configurable via `VITE_API_BASE_URL`)
Content type: `application/json` unless otherwise noted (file uploads use `multipart/form-data`)
Auth scheme: Bearer JWT in `Authorization: Bearer <token>` header, issued by the Authentication API

This document is the backend handoff contract for every API currently called by the frontend. The frontend must not need direct database access.

## Table of Contents

1. Conventions & Shared Types
2. Authentication API
3. Admin Profile API
4. Schools API
5. Subjects API
6. Question Bank API (incl. Video Questions)
7. Question Templates API
8. Competitions API (Competition Setup)
9. Hosts & Controllers API
10. Fixtures API
11. Matches API
12. Host Control API
13. Controller / Public Display API
14. Live Match State API
15. Results API
16. Sponsors API
17. Reports API
18. Dashboard/Stats API
19. Error Response Format (global)
20. Status Enums (global)

---

## 1. Conventions & Shared Types

- All list endpoints support pagination: `?page=1&pageSize=20` and return `{ data, page, pageSize, total }`.
- All list endpoints support `?status=ENABLED|DISABLED` and `?search=<text>` filters where applicable.
- All timestamps are ISO 8601 strings in UTC, e.g. `"2025-05-24T09:00:00Z"`.
- IDs are strings (UUIDs).
- Every authenticated endpoint requires `Authorization: Bearer <token>`.
- Role gate values: `ADMIN`, `HOST`, `CONTROLLER`.
- Uploaded logos/images must be PNG, JPEG, or WebP, no larger than 2 MB, between 128 and 2048 px on each side, and use a 1:1 aspect ratio with a tolerance of 15%.
- Upload endpoints return a persistent `logoUrl` or `personImageUrl` for later reads.

### Shared object: `School`
```json
{
  "id": "sch_001",
  "name": "Greenwood High School",
  "logoUrl": "https://cdn.example.com/schools/greenwood.png",
  "status": "ENABLED",
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-01-10T08:00:00Z"
}
```

### Shared object: `Subject`
```json
{
  "id": "subj_001",
  "name": "Mathematics",
  "status": "ENABLED",
  "createdAt": "2025-01-10T08:00:00Z"
}
```

### Shared object: `Question`
```json
{
  "id": "q_001",
  "subjectId": "subj_001",
  "mode": "MULTIPLE_CHOICE",
  "text": "What is the capital of Tanzania?",
  "optionA": "Nairobi",
  "optionB": "Dodoma",
  "optionC": "Kampala",
  "optionD": "Kigali",
  "correctAnswer": "B",
  "marks": 10,
  "isVideoQuestion": false,
  "personName": null,
  "personImageUrl": null,
  "youtubeUrl": null,
  "status": "ENABLED",
  "createdAt": "2025-01-10T08:00:00Z"
}
```
Notes:
- For `mode = "TRUE_FALSE"`: `correctAnswer` is `"TRUE"` or `"FALSE"`; option fields are `null`.
- For `mode = "MENTION"`: `correctAnswer` holds the expected answer text; option fields are `null`. Mention is never valid when `isVideoQuestion = true`.
- For `isVideoQuestion = true`: `personName`, `personImageUrl`, `youtubeUrl` are required; `mode` must be `MULTIPLE_CHOICE` or `TRUE_FALSE`.

### Shared object: `Sponsor`
```json
{
  "id": "spn_001",
  "name": "Zanzibar Telecom",
  "logoUrl": "https://cdn.example.com/sponsors/zantel.png",
  "contactInfo": { "phone": "+255 24 000 0000", "email": "info@example.com", "website": "https://example.com" },
  "slogan": "Connecting every classroom.",
  "includeInReport": true
}
```

---

## 2. Authentication API

### 2.1 Admin Login
`POST /api/auth/admin/login`
- Auth: None.
- Required: `name`, `password`.
- Success `200`: `{ "user": { "id": "adm_001", "name": "Jane Doe", "role": "ADMIN" }, "token": "jwt..." }`
- Errors: `401` invalid credentials.

### 2.2 Staff (Host/Controller) Login
`POST /api/auth/staff/login`
- Purpose: Shared login for Host and Controller; role is resolved server-side.
- Auth: None.
- Required: `username`, `password`.
- Success `200`:
```json
{ "user": { "id": "hst_001", "name": "Peter K.", "role": "HOST", "competitionId": "cmp_001" }, "token": "jwt..." }
```
(`role` may be `HOST` or `CONTROLLER`.)
- Errors: `401` invalid credentials.

### 2.4 Get Current Session
`GET /api/auth/me`
- Auth: Any authenticated role.
- Success `200`: `{ "user": { "id": "...", "name": "...", "role": "ADMIN|HOST|CONTROLLER" } }`
- Errors: `401` unauthorized.

### 2.5 Logout
`POST /api/auth/logout`
- Auth: Any authenticated role.
- Success `200`: `{ "message": "Logged out" }`

---

## 3. Admin Profile API

### 3.1 Get Profile
`GET /api/admin/profile`
- Auth: ADMIN.
- Success `200`: `{ "id": "adm_001", "name": "Jane Doe" }`

### 3.2 Verify Current Password (pre-edit gate)
`POST /api/admin/profile/verify-password`
- Auth: ADMIN.
- Required: `currentPassword`.
- Success `200`: `{ "verified": true }`
- Errors: `403` `{ "message": "Access denied" }` on mismatch.

### 3.3 Update Profile
`PATCH /api/admin/profile`
- Auth: ADMIN.
- Required: `currentPassword`. Optional: `name`, `newPassword`, `confirmNewPassword`.
- Success `200`: `{ "id": "adm_001", "name": "Jane D." }`
- Errors: `400` password mismatch, `403` current password incorrect.

---

## 4. Schools API

### 4.1 List Schools
`GET /api/schools?status=&search=&page=&pageSize=`
- Auth: ADMIN (read also allowed for HOST/CONTROLLER views that need names/logos, read-only).
- Success `200`: `{ "data": [School], "page":1, "pageSize":20, "total": 42 }`

### 4.2 Get School
`GET /api/schools/:id`
- Success `200`: `School`
- Errors: `404`.

### 4.3 Create School
`POST /api/schools`
- Auth: ADMIN.
- Required: `name`. Optional: `logoUrl` (or multipart `logo` file).
- Success `201`: `School`
- Errors: `400` validation, `409` duplicate name.

### 4.4 Update School
`PATCH /api/schools/:id`
- Auth: ADMIN.
- Optional: `name`, `logoUrl`, or multipart `logo` file.
- Success `200`: `School`

### 4.5 Enable / Disable School
`PATCH /api/schools/:id/status`
- Auth: ADMIN.
- Required: `status` (`ENABLED` | `DISABLED`).
- Success `200`: `School`
- Notes: A `DISABLED` school must be rejected by `POST /api/competitions` and `PATCH /api/competitions/:id/schools` if included in `schoolIds` (`400` with `{ "message": "School <id> is disabled" }`).

---

## 5. Subjects API

Mirrors Schools.

### 5.1 List Subjects
`GET /api/subjects?status=&search=`
- Success `200`: `{ "data": [Subject], ... }`

### 5.2 Create Subject
`POST /api/subjects`
- Auth: ADMIN. Required: `name`.
- Success `201`: `Subject`. Errors: `409` duplicate.

### 5.3 Update Subject
`PATCH /api/subjects/:id`
- Auth: ADMIN. Optional: `name`.
- Success `200`: `Subject`

### 5.4 Enable / Disable Subject
`PATCH /api/subjects/:id/status`
- Auth: ADMIN. Required: `status`.
- Success `200`: `Subject`

---

## 6. Question Bank API

### 6.1 List Questions
`GET /api/questions?subjectId=&mode=&isVideoQuestion=&status=&search=&page=&pageSize=`
- Auth: ADMIN.
- Success `200`: `{ "data": [Question], ... }`

### 6.2 Get Question
`GET /api/questions/:id`
- Success `200`: `Question`

### 6.3 Create Question (Manual Entry)
`POST /api/questions`
- Auth: ADMIN.
- Required (all modes): `subjectId`, `mode` (`MULTIPLE_CHOICE`|`TRUE_FALSE`|`MENTION`), `text`, `marks`.
- Required if `mode=MULTIPLE_CHOICE`: `optionA`, `optionB`, `optionC`, `optionD`, `correctAnswer` (one of A/B/C/D).
- Required if `mode=TRUE_FALSE`: `correctAnswer` (`TRUE`|`FALSE`).
- Required if `mode=MENTION`: `correctAnswer` (expected text). `isVideoQuestion` must be `false`.
- Optional: `isVideoQuestion` (boolean, default `false`); if `true`, required: `personName`, `personImageUrl` (or multipart `personImage`), `youtubeUrl`, and `mode` must not be `MENTION`.
- Success `201`: `Question`
- Errors: `400` validation (e.g., `"Mention mode is not supported for video questions"`), `404` unknown `subjectId`.

### 6.4 Update Question
`PATCH /api/questions/:id`
- Auth: ADMIN. Same field rules as create, all optional.
- Success `200`: `Question`

### 6.5 Delete Question
`DELETE /api/questions/:id`
- Auth: ADMIN.
- Success `204`.
- Errors: `409` if referenced by a match already in progress.

### 6.6 Enable / Disable Question
`PATCH /api/questions/:id/status`
- Auth: ADMIN. Required: `status`.
- Success `200`: `Question`

---

## 7. Question Templates API

(Lives under Question Bank, not Subjects.)

### 7.1 Request Template Download
`POST /api/questions/templates/download`
- Auth: ADMIN.
- Purpose: Configure and generate a downloadable template file matching a question mode.
- Required: `subjectId`, `mode` (`MULTIPLE_CHOICE`|`TRUE_FALSE`|`MENTION`), `questionCount` (int > 0), `marksPerQuestion` (int > 0).
- Response: `200` binary `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (or CSV) stream with `Content-Disposition: attachment; filename="template_mathematics_multiple_choice.xlsx"`.
- Errors: `400` invalid mode/counts, `404` unknown subject.
- Example request:
```json
{ "subjectId": "subj_001", "mode": "MULTIPLE_CHOICE", "questionCount": 20, "marksPerQuestion": 10 }
```

### 7.2 Upload Template
`POST /api/questions/templates/upload` (multipart/form-data)
- Auth: ADMIN.
- Required: `file`, `subjectId`, `mode`.
- Success `200`:
```json
{
  "totalRows": 20,
  "validQuestions": 18,
  "invalidQuestions": 1,
  "duplicateQuestions": 1,
  "missingFields": [{ "row": 5, "fields": ["optionC"] }],
  "importedQuestionIds": ["q_101", "q_102"]
}
```
- Errors: `400` unreadable/malformed file, `422` schema mismatch with selected mode.

---

## 8. Competitions API (Competition Setup)

### 8.1 List Competitions
`GET /api/competitions?status=&search=&page=&pageSize=`
- Auth: ADMIN (read-only summary also usable on landing page via `GET /api/competitions/public`).
- Success `200`: `{ "data": [CompetitionSummary], ... }`
- `CompetitionSummary` includes `id`, `name`, `logoUrl`, `questionDurationSeconds`, `startDate`, `endDate`, `status`, and optional `sponsorId`.

### 8.2 Get Competition
`GET /api/competitions/:id`
- Success `200`:
```json
{
  "id": "cmp_001",
  "name": "Regional Science Bowl 2025",
  "logoUrl": "https://cdn.example.com/comps/rsb.png",
  "questionDurationSeconds": 30,
  "startDate": "2025-05-01",
  "endDate": "2025-05-30",
  "subjectIds": ["subj_001", "subj_002"],
  "schoolIds": ["sch_001", "sch_002", "sch_003", "sch_004"],
  "hostId": "hst_001",
  "controllerId": "ctl_001",
  "status": "UPCOMING",
  "sponsorId": "spn_001"
}
```

### 8.3 Create Competition
`POST /api/competitions`
- Auth: ADMIN.
- Required: `name`, `startDate`, `endDate`, `subjectIds` (non-empty, all `ENABLED`), `schoolIds` (non-empty, all `ENABLED`).
- Optional: `logoUrl` or multipart `logo` file, `sponsorId`, `questionDurationSeconds` (integer, 5–300; defaults to 30).
- Success `201`: `Competition`
- Errors: `400` disabled subject/school included, invalid date range (`endDate < startDate`).

### 8.4 Update Competition
`PATCH /api/competitions/:id`
- Auth: ADMIN. All fields optional, same validation as create. `questionDurationSeconds` applies uniformly to every question in the competition and can be edited before or during competition setup.
- Success `200`: `Competition`

### 8.5 Delete Competition
`DELETE /api/competitions/:id`
- Auth: ADMIN.
- Success `204`.
- Errors: `409` if matches already started.

---

## 9. Hosts & Controllers API

### 9.1 Assign Host to Competition
`POST /api/competitions/:id/host`
- Auth: ADMIN.
- Required: `name`, `username`, `password`.
- Success `201`: `{ "id": "hst_001", "name": "Peter K.", "username": "peterk", "role": "HOST", "competitionId": "cmp_001" }`
- Errors: `409` username taken.

### 9.2 Assign Controller to Competition
`POST /api/competitions/:id/controller`
- Auth: ADMIN.
- Required: `name`, `username`, `password`.
- Success `201`: `{ "id": "ctl_001", "name": "Aisha M.", "username": "aisham", "role": "CONTROLLER", "competitionId": "cmp_001" }`

### 9.3 Update Host/Controller Credentials
`PATCH /api/staff/:id`
- Auth: ADMIN.
- Optional: `name`, `username`, `password`.
- Success `200`: staff object (password never returned).

---

## 10. Fixtures API

### 10.1 Generate Fixture
`POST /api/competitions/:id/fixtures/generate`
- Auth: ADMIN.
- Purpose: Auto-generate bracket from the competition's selected schools.
- Behavior: if `schoolIds.length` is odd, the largest even-numbered prefix of the (defined) selection order is used; disabled schools cannot be included (already enforced at competition-save time).
- Success `201`:
```json
{
  "competitionId": "cmp_001",
  "rounds": [
    {
      "roundNumber": 1,
      "roundName": "Round of 16",
      "matches": [
        { "matchId": "m_001", "schoolAId": "sch_001", "schoolBId": "sch_002", "date": "2025-05-01" }
      ]
    }
  ],
  "excludedSchoolIds": ["sch_017"]
}
```
- Errors: `400` fewer than 2 eligible schools, `409` fixture already generated (use regenerate).

### 10.2 Get Fixture
`GET /api/competitions/:id/fixtures`
- Success `200`: same shape as 10.1 response body (without `excludedSchoolIds` once persisted).

### 10.3 Regenerate Fixture
`POST /api/competitions/:id/fixtures/regenerate`
- Auth: ADMIN.
- Success `201`: fixture object.
- Errors: `409` if any match has already recorded results.

---

## 11. Matches API

### 11.1 List Matches
`GET /api/matches?competitionId=&status=&date=&page=&pageSize=`
- Auth: ADMIN, HOST (own competition), CONTROLLER (own competition, read-only).
- Success `200`: `{ "data": [MatchSummary], ... }`

### 11.2 Get Match
`GET /api/matches/:id`
- Success `200`:
```json
{
  "id": "m_001",
  "competitionId": "cmp_001",
  "roundName": "Semifinal",
  "matchLabel": "SEMIFINAL — MATCH 02",
  "schoolAId": "sch_001",
  "schoolBId": "sch_002",
  "date": "2025-05-24",
  "day": "SATURDAY",
  "status": "UPCOMING"
}
```

### 11.3 Update Match Scheduling
`PATCH /api/matches/:id`
- Auth: ADMIN.
- Optional: `date` (must fall within competition's start/end interval).
- Success `200`: match object.
- Errors: `400` date outside competition interval.

---

## 12. Host Control API

All endpoints below require `Authorization` as `HOST` and that the `HOST` is assigned to the match's competition. Every state-changing call returns the updated `LiveMatchState` (see §14) so the Host UI and the mock server stay consistent, and the same update is what the Controller polls/subscribes to.

### 12.1 Get Live State (Host view)
`GET /api/matches/:id/live-state`
- Success `200`: `LiveMatchState`

### 12.2 Select School / Turn
`POST /api/matches/:id/select-school`
- Required: `schoolId` (must be `schoolAId` or `schoolBId` of the match).
- Rule enforced server-side: cannot switch to the other school until the current school has completed 5 questions in the current subject rotation (`questionsAnsweredInTurn === 5`).
- Success `200`: `LiveMatchState`
- Errors: `409` `{ "message": "School B is locked until School A completes 5 questions" }`

### 12.3 Select Subject
`POST /api/matches/:id/select-subject`
- Required: `subjectId` (must be `ENABLED` and part of the competition's `subjectIds`).
- Success `200`: `LiveMatchState`
- Errors: `400` disabled/unregistered subject.

### 12.4 Select Question
`POST /api/matches/:id/select-question`
- Required: `questionId` (must belong to selected subject, status `AVAILABLE`, and match current mode — normal or video).
- Success `200`: `LiveMatchState` (question moves to `SELECTED`, video state begins loading if `isVideoQuestion`).
- Errors: `409` question not `AVAILABLE` (already `COMPLETED`/disabled).

### 12.5 Timer State
`POST /api/matches/:id/timer`
- The current frontend does not call this endpoint manually. Selecting a question through §12.4 automatically starts the timer using the competition's `questionDurationSeconds`.
- If supported for internal/admin use, `action` may be `START`, `PAUSE`, or `RESET`; `durationSeconds` is required for `START`/`RESET` and must be 5–300.
- Success `200`: `LiveMatchState` with updated `timer`.

The Host UI does not expose manual Start/Pause/Reset controls. When the authoritative server clock reaches zero, the backend must atomically close the selected question and record a `TIMEOUT` result worth zero points. A timeout must not award marks and must not be recorded twice.

### 12.6 Record Question Result
`POST /api/matches/:id/question-result`
- Required: `questionId`, `result` (`CORRECT`|`INCORRECT`|`TIMEOUT`).
- Behavior: idempotent guard — a `questionId` already `COMPLETED` returns `409` (`"Question already recorded"`); `TIMEOUT` always awards 0 points; `CORRECT` awards the question's `marks` to the currently selected school.
- Success `200`: `LiveMatchState` (question → `COMPLETED`, score updated, `questionsAnsweredInTurn` incremented, `lastResult` populated for the Controller edge-flash).
- Errors: `409` already recorded, `400` question not currently selected.

### 12.7 Switch Mode
`POST /api/matches/:id/mode`
- Required: `mode` (`NORMAL`|`VIDEO`).
- Success `200`: `LiveMatchState`
- Note: This changes the Host's own mode only; the Controller must independently call the same endpoint from its own UI (§13.2) — the two are not force-linked, only the underlying match data is shared.

### 12.8 List Video Questions for Match Subject
`GET /api/matches/:id/video-questions?subjectId=`
- Success `200`: `{ "data": [Question] }` (only `isVideoQuestion=true`, `status=ENABLED`, matching subject).

---

## 13. Controller / Public Display API

Controller endpoints are strictly read-plus-mode-toggle. No endpoint here can mutate score, selection, or question state.

### 13.1 Get Public State
`GET /api/matches/:id/public-state`
- Auth: CONTROLLER (read-only) or ADMIN.
- Success `200`: `LiveMatchState` filtered to public-safe fields (no correct-answer field is included pre-reveal; `correctAnswer` is included only once `lastResult` is populated for that question, matching what should be revealed post-decision).

### 13.2 Controller Mode Toggle
`POST /api/matches/:id/controller-mode`
- Auth: CONTROLLER.
- Required: `mode` (`NORMAL`|`VIDEO`).
- Success `200`: `{ "controllerMode": "VIDEO" }`
- Note: This only affects which UI the Controller renders locally; it does not change Host mode or match data.

### 13.3 Live State Subscription (polling or SSE)
`GET /api/matches/:id/public-state/stream`
- Auth: CONTROLLER or ADMIN.
- Purpose: Server-Sent Events stream of `LiveMatchState` updates so the Controller reflects Host actions without manual refresh. Mock implementation may simulate via short-interval polling of §13.1.
- Success: `200` `text/event-stream`, events named `state-update` with `LiveMatchState` JSON payload.

---

## 14. Live Match State (shared model)

`LiveMatchState` (returned by §12.1, §13.1, and as the trailing payload of every Host mutation):
```json
{
  "matchId": "m_001",
  "matchName": "SEMIFINAL — MATCH 02",
  "date": "2025-05-24",
  "day": "SATURDAY",
  "schoolA": { "id": "sch_001", "name": "Greenwood High", "logoUrl": "...", "score": 40 },
  "schoolB": { "id": "sch_002", "name": "Lakeside Academy", "logoUrl": "...", "score": 30 },
  "currentSchoolId": "sch_001",
  "questionsAnsweredInTurn": 2,
  "currentSubjectId": "subj_001",
  "currentQuestion": {
    "id": "q_045",
    "mode": "MULTIPLE_CHOICE",
    "text": "...",
    "optionA": "...", "optionB": "...", "optionC": "...", "optionD": "...",
    "marks": 10,
    "status": "SELECTED"
  },
  "questionMode": "NORMAL",
  "questionSlots": [
    { "questionId": "q_041", "slot": 1, "status": "COMPLETED" },
    { "questionId": "q_045", "slot": 5, "status": "SELECTED" }
  ],
  "timer": { "durationSeconds": 30, "remainingSeconds": 18, "state": "RUNNING" },
  "videoQuestion": null,
  "videoPlaybackState": "IDLE",
  "lastResult": { "questionId": "q_040", "result": "CORRECT", "schoolId": "sch_001", "timestamp": "2025-05-24T09:12:03Z" },
  "matchStatus": "IN_PROGRESS"
}
```

---

## 15. Results API

### 15.1 Get Match Result
`GET /api/matches/:id/result`
- Auth: ADMIN, HOST, CONTROLLER (read-only).
- Success `200`:
```json
{
  "matchId": "m_001",
  "schoolA": { "id": "sch_001", "name": "Greenwood High", "score": 80 },
  "schoolB": { "id": "sch_002", "name": "Lakeside Academy", "score": 100 },
  "winnerId": "sch_002",
  "status": "COMPLETED"
}
```
- Errors: `404` if match has no recorded result yet.

### 15.2 List Results (Admin Results page)
`GET /api/competitions/:id/results?page=&pageSize=`
- Success `200`: `{ "data": [MatchResult], ... }`

### 15.3 Finalize Match Result
`POST /api/matches/:id/finalize`
- Auth: HOST or ADMIN.
- Purpose: Locks the match once all rounds are complete; computes `winnerId` from final scores.
- Success `200`: `MatchResult`
- Errors: `409` match already finalized, `400` scores tied with no tiebreak rule configured (returns `requiresTiebreak: true`).

---

## 16. Sponsors API

### 16.1 List Sponsors
`GET /api/sponsors`
- Auth: ADMIN.
- Success `200`: `{ "data": [Sponsor] }`

### 16.2 Create/Update Sponsor
`POST /api/sponsors` / `PATCH /api/sponsors/:id`
- Required (create): `name`. Optional: `logoUrl` or multipart `logo` file, `contactInfo`, `slogan`, `includeInReport`.
- `contactInfo` may contain `phone`, `email`, and `website`.
- `includeInReport` defaults to `true` and controls whether the backend includes the sponsor in generated reports.
- Sponsor is optional. A competition may have `sponsorId: null`; reports must still generate normally without a sponsor section.
- Success `201`/`200`: `Sponsor`

### 16.3 Attach Sponsor to Competition
`PATCH /api/competitions/:id`
- Field: `sponsorId` (see §8.4).

---

## 17. Reports API

### 17.1 Request Report Generation
`POST /api/competitions/:id/reports`
- Auth: ADMIN.
- Purpose: Backend compiles a database-driven PDF (schools, subjects, matches, fixture, results, final winner, officials, sponsor).
- Success `202`:
```json
{ "reportId": "rpt_001", "status": "PROCESSING" }
```

### 17.2 Get Report Status / Download
`GET /api/reports/:reportId`
- Success `200` (while processing): `{ "reportId": "rpt_001", "status": "PROCESSING" }`
- Success `200` (ready): `{ "reportId": "rpt_001", "status": "READY", "downloadUrl": "/api/reports/rpt_001/file" }`
- Errors: `500` `{ "status": "FAILED", "message": "Report generation failed" }`

### 17.3 Download Report File
`GET /api/reports/:reportId/file`
- Success `200`: binary `application/pdf` stream.
- Errors: `404` not ready or not found.

---

## 18. Dashboard / Stats API

### 18.1 Admin Dashboard Summary
`GET /api/admin/dashboard`
- Auth: ADMIN.
- Success `200`:
```json
{
  "totalSchools": 42, "enabledSchools": 38,
  "totalSubjects": 10, "enabledSubjects": 9,
  "totalQuestions": 560, "videoQuestions": 40,
  "upcomingMatches": 6, "completedMatches": 12,
  "upcomingMatchList": [ { "competitionName": "...", "matchLabel": "...", "schoolAName": "...", "schoolBName": "...", "date": "...", "time": "...", "status": "UPCOMING" } ],
  "recentResults": [ { "matchLabel": "...", "schoolAName": "...", "schoolAScore": 80, "schoolBName": "...", "schoolBScore": 100, "winnerName": "...", "status": "COMPLETED" } ],
  "competitionSummaries": [ { "name": "...", "logoUrl": "...", "startDate": "...", "endDate": "...", "hostName": "...", "controllerName": "..." } ],
  "sponsor": { "name": "...", "logoUrl": "..." }
}
```

### 18.2 Public Landing Page Data
`GET /api/competitions/public`
- Auth: None.
- Purpose: Powers the Landing Page (participating schools, upcoming competition info, branding) without exposing admin-only fields.
- Success `200`: `{ "data": [ { "id": "cmp_001", "name": "...", "logoUrl": "...", "startDate": "...", "endDate": "...", "participatingSchoolNames": ["..."] } ] }`

---

## 19. Error Response Format (global)

All errors follow:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "fields": { "endDate": "End date must be after start date" }
  }
}
```
Standard HTTP status usage:
- `400` Validation error / malformed request
- `401` Unauthorized (missing/invalid/expired token)
- `403` Forbidden (authenticated but wrong role, or password gate failed)
- `404` Not found
- `409` Conflict (duplicate, already recorded, locked turn, already finalized)
- `422` Unprocessable (e.g., template schema mismatch)
- `500` Server error

---

## 20. Status Enums (global)

```text
EntityStatus:        ENABLED | DISABLED
CompetitionStatus:   UPCOMING | ACTIVE | COMPLETED
MatchStatus:         UPCOMING | IN_PROGRESS | COMPLETED
QuestionSlotStatus:  AVAILABLE | SELECTED | COMPLETED | DISABLED
QuestionResult:      CORRECT | INCORRECT | TIMEOUT
QuestionMode:        MULTIPLE_CHOICE | TRUE_FALSE | MENTION
MatchMode:           NORMAL | VIDEO
VideoPlaybackState:  IDLE | LOADING | PLAYING | ENDED
TimerState:          IDLE | RUNNING | PAUSED | EXPIRED
Role:                ADMIN | HOST | CONTROLLER
```

These enums must be centralized in `src/constants/status.js` (or `.ts`) and imported everywhere — no raw status strings scattered through components (see spec §58).
