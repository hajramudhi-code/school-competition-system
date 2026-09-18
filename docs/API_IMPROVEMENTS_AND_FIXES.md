# API Improvements and Fixes

This document contains only the API contracts affected by the recent Admin, Host, Controller, date-gating, rematch, and Lucky Question changes. It is not a replacement for the complete API specification.

## 1. Subject Management

### `GET /api/subjects`

The response must preserve the subject `code` because the frontend uses it to identify the Lucky Question category.

```json
{
  "data": [
    {
      "id": "subj_lucky",
      "name": "Lucky Question",
      "code": "LUCKY",
      "status": "ENABLED",
      "createdAt": "2026-09-18T08:00:00Z",
      "updatedAt": "2026-09-18T08:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

### `POST /api/subjects`

Required request fields:

```json
{
  "name": "Lucky Question",
  "code": "LUCKY"
}
```

Rules:

- `name` and `code` are required.
- `code` is unique and should be returned exactly as stored.
- Create `Lucky Question` as a normal subject with code `LUCKY`; do not add a frontend-only subject type that the API does not understand.

### `PATCH /api/subjects/:id`

Optional fields:

```json
{
  "name": "Lucky Question",
  "code": "LUCKY"
}
```

The code must remain unique. The updated subject must be returned in the response.

## 2. Lucky Question Competition Membership

### `PATCH /api/competitions/:id`

The Lucky Question subject must be included in the competition subject list before a Host can select it.

```json
{
  "subjectIds": ["subj_001", "subj_002", "subj_lucky"]
}
```

`POST /api/matches/:id/select-subject` must continue to reject a subject that is not part of the competition. The frontend may display a Lucky fallback, but only a registered competition subject can be selected successfully by the backend.

## 3. Video Question Creation

### `POST /api/questions`

Lucky Question video records use the existing question contract; the subject is `subj_lucky` and the video flag is on the question.

```json
{
  "subjectId": "subj_lucky",
  "mode": "MULTIPLE_CHOICE",
  "text": "Which participant is shown in this video?",
  "optionA": "Participant A",
  "optionB": "Participant B",
  "optionC": "Participant C",
  "optionD": "Participant D",
  "correctAnswer": "B",
  "marks": 10,
  "isVideoQuestion": true,
  "personName": "Participant B",
  "personImageUrl": "https://cdn.example.test/person-b.jpg",
  "youtubeUrl": "https://www.youtube.com/watch?v=example"
}
```

Rules:

- `isVideoQuestion=true` is the video discriminator; Subject does not need a separate video type.
- Video questions must belong to the Lucky Question subject for this flow.
- `MENTION` mode is not valid for video questions.
- `personName`, person image, and `youtubeUrl` are required for video questions.

## 4. Host Mode and Subject Ordering

### `POST /api/matches/:id/mode`

Request:

```json
{ "mode": "VIDEO" }
```

The response must be the updated `LiveMatchState`, including the current mode and current subject.

For a Host switch to video mode, the frontend performs this ordered sequence:

1. Set match mode to `VIDEO`.
2. Select the registered Lucky Question subject.
3. Load video slots for that subject.

The backend must allow step 2 only when the Lucky Question subject is enabled and belongs to the competition.

Switching back to `NORMAL` restores the previously selected normal subject when one exists.

## 5. Select Subject

### `POST /api/matches/:id/select-subject`

Request:

```json
{ "subjectId": "subj_lucky" }
```

Response requirements:

- Return `LiveMatchState`.
- Set `currentSubjectId` to `subj_lucky`.
- Rebuild `questionSlots` for the active mode.
- In `VIDEO` mode, include only enabled video questions for the Lucky Question subject.
- In `NORMAL` mode, include only non-video questions for the selected normal subject.

## 6. List and Select Video Questions

### `GET /api/matches/:id/video-questions?subjectId=subj_lucky`

Response:

```json
{
  "data": [
    {
      "id": "q_video_001",
      "subjectId": "subj_lucky",
      "mode": "MULTIPLE_CHOICE",
      "text": "Which participant is shown in this video?",
      "optionA": "Participant A",
      "optionB": "Participant B",
      "optionC": "Participant C",
      "optionD": "Participant D",
      "correctAnswer": "B",
      "marks": 10,
      "isVideoQuestion": true,
      "personName": "Participant B",
      "personImageUrl": "https://cdn.example.test/person-b.jpg",
      "youtubeUrl": "https://www.youtube.com/watch?v=example",
      "status": "ENABLED"
    }
  ]
}
```

The endpoint must filter by both `subjectId` and `isVideoQuestion=true`.

### `POST /api/matches/:id/select-question`

Request:

```json
{ "questionId": "q_video_001" }
```

Validation:

- The question belongs to `currentSubjectId`.
- The question is enabled and available.
- `isVideoQuestion` matches the current match mode.
- In video mode, the selected question belongs to the Lucky Question subject.

Response: updated `LiveMatchState` with `videoQuestion`, `videoPlaybackState`, and a running `timer`.

## 7. Shared Live State

### `GET /api/matches/:id/live-state`

### `GET /api/matches/:id/public-state`

The response must include these fields for the Host and Controller integrations:

```json
{
  "matchId": "m_001",
  "currentSubjectId": "subj_lucky",
  "questionMode": "VIDEO",
  "currentQuestion": null,
  "questionSlots": [
    { "questionId": "q_video_001", "slot": 1, "status": "AVAILABLE" }
  ],
  "videoQuestion": null,
  "videoPlaybackState": "IDLE",
  "timer": {
    "durationSeconds": 30,
    "remainingSeconds": 30,
    "state": "IDLE"
  },
  "lastResult": null,
  "matchStatus": "IN_PROGRESS"
}
```

Response rules:

- `questionSlots` is always an array.
- In `NORMAL`, slots contain only non-video questions.
- In `VIDEO`, slots contain only video questions for `currentSubjectId`.
- `videoQuestion` is populated after a video question is selected.
- `public-state` must not expose `correctAnswer` before the result is recorded. It may expose it only for the currently revealed question after `lastResult` is populated.

## 8. Controller Mode

### `POST /api/matches/:id/controller-mode`

Request:

```json
{ "mode": "VIDEO" }
```

Response:

```json
{ "controllerMode": "VIDEO" }
```

This is a display preference only. It must not change Host mode, score, current question, selected subject, or question status.

The Controller video UI displays `Lucky Question` as its single category, while the normal UI displays the normal competition subjects.

## 9. Result Recording and Timeout

### `POST /api/matches/:id/question-result`

Request:

```json
{
  "questionId": "q_video_001",
  "result": "CORRECT"
}
```

Allowed results: `CORRECT`, `INCORRECT`, `TIMEOUT`.

Rules:

- `TIMEOUT` awards zero points.
- A completed question cannot be recorded twice.
- The response is the updated `LiveMatchState`.
- `lastResult` must identify the question and result so the Controller can reveal the answer and display the result notice.

## 10. Match Date and Lifecycle APIs

The Host frontend blocks future-dated matches and periodically reassesses the assignment. The backend should enforce the same rule server-side.

These lifecycle endpoints are called by the current Host frontend but are missing from the existing backend route inventory and must be implemented or explicitly removed from the frontend:

### `POST /api/matches/:id/start`

- Reject a match whose date is in the future.
- Set match status to `IN_PROGRESS`.
- Return updated `LiveMatchState`.

### `POST /api/matches/:id/end`

- End the current match.
- Return updated match/live state.

### `POST /api/matches/:id/rematch`

- Reset the same match record for the same schools.
- Clear current question, timer, slots, and result state.
- Return updated `LiveMatchState` using the same `matchId`.
- Reject a future-dated rematch.

### `POST /api/matches/:id/next`

- Create or activate the next scheduled match.
- Return the new match/live state and its `matchId`.
- Reject a future-dated next match or return a clear scheduled response that the Host can display.

For all lifecycle mutations, return the same response shape consumed by the Host and Controller instead of a second incompatible wrapper.
