from django.db import transaction
from django.utils import timezone

from api.exceptions import conflict, not_found, validation_error
from api.models import LiveMatch, Match, MatchQuestion, Question, Status, Subject
from api.uploads import media_url
from api.utils import iso


TURN_LIMIT = 5


def get_or_create_live(match):
    live, _ = LiveMatch.objects.get_or_create(
        match=match,
        defaults={"timer_duration_seconds": match.competition.question_duration_seconds},
    )
    return live


def remaining_seconds(live):
    if live.timer_state == LiveMatch.TimerState.PAUSED:
        return live.timer_paused_remaining or 0
    if live.timer_state != LiveMatch.TimerState.RUNNING or not live.timer_started_at:
        return live.timer_duration_seconds if live.timer_state == LiveMatch.TimerState.IDLE else 0
    elapsed = (timezone.now() - live.timer_started_at).total_seconds()
    remaining = int(live.timer_duration_seconds - elapsed)
    return max(remaining, 0)


def apply_timeout_if_needed(match, live):
    if live.timer_state != LiveMatch.TimerState.RUNNING:
        return live
    if remaining_seconds(live) > 0:
        return live
    if not live.current_question_id:
        live.timer_state = LiveMatch.TimerState.IDLE
        live.save(update_fields=["timer_state", "updated_at"])
        return live
    record_question_result(match, live, live.current_question_id, MatchQuestion.Result.TIMEOUT, auto=True)
    live.refresh_from_db()
    return live


def _public_question(question, request, include_answer=False):
    if not question:
        return None
    data = {
        "id": str(question.id),
        "subjectId": str(question.subject_id),
        "mode": question.mode,
        "text": question.text,
        "optionA": question.option_a,
        "optionB": question.option_b,
        "optionC": question.option_c,
        "optionD": question.option_d,
        "marks": question.marks,
        "status": "SELECTED",
        "isVideoQuestion": question.is_video_question,
        "personName": question.person_name,
        "personImageUrl": media_url(request, question.person_image),
        "youtubeUrl": question.youtube_url,
    }
    if include_answer:
        data["correctAnswer"] = question.correct_answer
    return data


def build_question_slots(match, live):
    """Stable numbered slots for the selected subject filtered by host mode."""
    if not live.current_subject_id:
        return []

    want_video = live.question_mode == LiveMatch.QuestionMode.VIDEO
    questions = list(
        Question.objects.filter(
            subject_id=live.current_subject_id,
            status=Status.ENABLED,
            is_video_question=want_video,
        ).order_by("created_at", "id")
    )
    if not questions:
        return []

    usages = {
        str(item.question_id): item
        for item in match.played_questions.filter(question_id__in=[q.id for q in questions])
    }
    slots = []
    for index, question in enumerate(questions, start=1):
        usage = usages.get(str(question.id))
        status_value = usage.status if usage else "AVAILABLE"
        slots.append(
            {
                "questionId": str(question.id),
                "slot": index,
                "status": status_value,
            }
        )
    return slots


def serialize_live_state(match, request=None, public=False, host=False):
    live = get_or_create_live(match)
    live = apply_timeout_if_needed(match, live)
    match.refresh_from_db()

    school_a = match.school_a
    school_b = match.school_b
    current = live.current_question
    # Controller/public display needs the answer key (e.g. "B") in the payload.
    include_answer = True
    current_payload = _public_question(current, request, include_answer=include_answer)
    if current_payload:
        usage = match.played_questions.filter(question=current).first()
        current_payload["status"] = usage.status if usage else "SELECTED"

    question_slots = build_question_slots(match, live)

    video_q = live.video_question if live.question_mode == LiveMatch.QuestionMode.VIDEO else None
    last_result = live.last_result
    if last_result and current and str(last_result.get("questionId")) == str(current.id):
        last_result = {**last_result, "correctAnswer": current.correct_answer}

    return {
        "matchId": str(match.id),
        "matchName": match.match_label,
        "date": match.date.isoformat() if match.date else None,
        "day": match.day,
        "schoolA": {
            "id": str(school_a.id) if school_a else None,
            "name": school_a.name if school_a else None,
            "logoUrl": media_url(request, school_a.logo) if school_a else None,
            "score": match.score_a,
        },
        "schoolB": {
            "id": str(school_b.id) if school_b else None,
            "name": school_b.name if school_b else None,
            "logoUrl": media_url(request, school_b.logo) if school_b else None,
            "score": match.score_b,
        },
        "currentSchoolId": str(live.current_school_id) if live.current_school_id else None,
        "questionsAnsweredInTurn": live.questions_answered_in_turn,
        "currentSubjectId": str(live.current_subject_id) if live.current_subject_id else None,
        "currentQuestion": current_payload,
        "questionMode": live.question_mode,
        "questionSlots": question_slots,
        "timer": {
            "durationSeconds": live.timer_duration_seconds,
            "remainingSeconds": remaining_seconds(live),
            "state": live.timer_state,
        },
        "videoQuestion": _public_question(video_q, request, include_answer=True) if video_q else None,
        "videoPlaybackState": live.video_playback_state,
        "lastResult": last_result,
        "matchStatus": match.status,
    }


def _mark_in_progress(match):
    if match.status == Match.Status.UPCOMING:
        match.status = Match.Status.IN_PROGRESS
        match.save(update_fields=["status", "updated_at"])
        competition = match.competition
        if competition.status == competition.Status.UPCOMING:
            competition.status = competition.Status.IN_PROGRESS
            competition.save(update_fields=["status", "updated_at"])


@transaction.atomic
def select_school(match, school_id):
    live = LiveMatch.objects.select_for_update().get(pk=get_or_create_live(match).pk)
    apply_timeout_if_needed(match, live)
    live.refresh_from_db()

    if str(school_id) not in {str(match.school_a_id), str(match.school_b_id)}:
        raise validation_error("schoolId must be one of the match schools.", fields={"schoolId": "Invalid school."})

    switching = live.current_school_id and str(live.current_school_id) != str(school_id)
    if switching and live.questions_answered_in_turn < TURN_LIMIT:
        other = match.school_b if str(live.current_school_id) == str(match.school_a_id) else match.school_a
        locked = other.name if other else "School B"
        current_name = live.current_school.name if live.current_school else "School A"
        raise conflict(f"{locked} is locked until {current_name} completes {TURN_LIMIT} questions")

    if switching or live.questions_answered_in_turn >= TURN_LIMIT:
        live.questions_answered_in_turn = 0
    live.current_school_id = school_id
    live.save(update_fields=["current_school", "questions_answered_in_turn", "updated_at"])
    _mark_in_progress(match)
    return live


@transaction.atomic
def select_subject(match, subject_id):
    live = get_or_create_live(match)
    apply_timeout_if_needed(match, live)
    try:
        subject = match.competition.subjects.get(pk=subject_id)
    except Subject.DoesNotExist as exc:
        raise validation_error("Subject is not part of this competition.", fields={"subjectId": "Unregistered subject."}) from exc
    if subject.status != Status.ENABLED:
        raise validation_error("Subject is disabled.", fields={"subjectId": "Disabled subject."})
    live.current_subject = subject
    live.save(update_fields=["current_subject", "updated_at"])
    _mark_in_progress(match)
    return live


def _start_timer(live, duration):
    live.timer_duration_seconds = duration
    live.timer_started_at = timezone.now()
    live.timer_paused_remaining = None
    live.timer_state = LiveMatch.TimerState.RUNNING
    live.save(
        update_fields=[
            "timer_duration_seconds",
            "timer_started_at",
            "timer_paused_remaining",
            "timer_state",
            "updated_at",
        ]
    )


@transaction.atomic
def select_question(match, question_id):
    live = get_or_create_live(match)
    apply_timeout_if_needed(match, live)
    live.refresh_from_db()
    if not live.current_subject_id:
        raise validation_error("Select a subject before choosing a question.")
    if not live.current_school_id:
        raise validation_error("Select a school before choosing a question.")

    try:
        question = Question.objects.get(pk=question_id, subject_id=live.current_subject_id)
    except Question.DoesNotExist as exc:
        raise not_found("Question not found for the selected subject.") from exc

    if question.status != Status.ENABLED:
        raise conflict("Question is not AVAILABLE.")
    if match.played_questions.filter(question=question, status=MatchQuestion.Status.COMPLETED).exists():
        raise conflict("Question is not AVAILABLE.")

    expected_video = live.question_mode == LiveMatch.QuestionMode.VIDEO
    if question.is_video_question != expected_video:
        raise conflict("Question is not AVAILABLE.")

    slot_map = {
        item["questionId"]: item["slot"] for item in build_question_slots(match, live)
    }
    stable_slot = slot_map.get(str(question.id))
    if stable_slot is None:
        raise conflict("Question is not AVAILABLE.")

    usage, created = MatchQuestion.objects.get_or_create(
        match=match,
        question=question,
        defaults={
            "slot": stable_slot,
            "status": MatchQuestion.Status.SELECTED,
            "school": live.current_school,
            "turn_index": live.questions_answered_in_turn,
        },
    )
    if not created and usage.status == MatchQuestion.Status.COMPLETED:
        raise conflict("Question is not AVAILABLE.")
    usage.status = MatchQuestion.Status.SELECTED
    usage.school = live.current_school
    usage.slot = stable_slot
    usage.save(update_fields=["status", "school", "slot"])

    live.current_question = question
    if question.is_video_question:
        live.video_question = question
        live.video_playback_state = LiveMatch.VideoPlayback.LOADING
    else:
        live.video_question = None
        live.video_playback_state = LiveMatch.VideoPlayback.IDLE
    live.save()
    _start_timer(live, match.competition.question_duration_seconds)
    _mark_in_progress(match)
    return live


@transaction.atomic
def set_timer(match, action, duration_seconds=None):
    live = get_or_create_live(match)
    action = (action or "").upper()
    if action not in {"START", "PAUSE", "RESET"}:
        raise validation_error("action must be START, PAUSE, or RESET.", fields={"action": "Invalid action."})
    if action in {"START", "RESET"}:
        try:
            duration_seconds = int(duration_seconds)
        except (TypeError, ValueError) as exc:
            raise validation_error("durationSeconds is required for START/RESET.", fields={"durationSeconds": "Required."}) from exc
        if duration_seconds < 5 or duration_seconds > 300:
            raise validation_error("durationSeconds must be between 5 and 300.", fields={"durationSeconds": "Out of range."})
        _start_timer(live, duration_seconds)
        return live
    if live.timer_state == LiveMatch.TimerState.RUNNING:
        live.timer_paused_remaining = remaining_seconds(live)
        live.timer_state = LiveMatch.TimerState.PAUSED
        live.timer_started_at = None
        live.save(update_fields=["timer_paused_remaining", "timer_state", "timer_started_at", "updated_at"])
    return live


@transaction.atomic
def record_question_result(match, live, question_id, result, auto=False):
    live = live or get_or_create_live(match)
    result = (result or "").upper()
    if result not in MatchQuestion.Result.values:
        raise validation_error("result must be CORRECT, INCORRECT, or TIMEOUT.", fields={"result": "Invalid result."})

    if not live.current_question_id or str(live.current_question_id) != str(question_id):
        if not auto:
            raise validation_error("Question is not currently selected.")

    usage = match.played_questions.filter(question_id=question_id).first()
    if usage and usage.status == MatchQuestion.Status.COMPLETED:
        raise conflict("Question already recorded")
    if not usage:
        raise validation_error("Question is not currently selected.")

    question = usage.question
    points = 0
    if result == MatchQuestion.Result.CORRECT:
        points = question.marks
        if live.current_school_id == match.school_a_id:
            match.score_a += points
        elif live.current_school_id == match.school_b_id:
            match.score_b += points
        match.save(update_fields=["score_a", "score_b", "updated_at"])

    usage.status = MatchQuestion.Status.COMPLETED
    usage.result = result
    usage.school = live.current_school
    usage.points_awarded = points
    usage.recorded_at = timezone.now()
    usage.save()

    live.questions_answered_in_turn = min(live.questions_answered_in_turn + 1, TURN_LIMIT)
    live.last_result = {
        "questionId": str(question.id),
        "result": result,
        "schoolId": str(live.current_school_id) if live.current_school_id else None,
        "timestamp": iso(timezone.now()),
    }
    live.timer_state = LiveMatch.TimerState.IDLE
    live.timer_started_at = None
    live.current_question = question  # keep for reveal
    live.save()
    return live


@transaction.atomic
def set_host_mode(match, mode):
    live = get_or_create_live(match)
    mode = (mode or "").upper()
    if mode not in LiveMatch.QuestionMode.values:
        raise validation_error("mode must be NORMAL or VIDEO.", fields={"mode": "Invalid mode."})
    live.question_mode = mode
    live.save(update_fields=["question_mode", "updated_at"])
    return live


@transaction.atomic
def set_controller_mode(match, mode):
    live = get_or_create_live(match)
    mode = (mode or "").upper()
    if mode not in LiveMatch.QuestionMode.values:
        raise validation_error("mode must be NORMAL or VIDEO.", fields={"mode": "Invalid mode."})
    live.controller_mode = mode
    live.save(update_fields=["controller_mode", "updated_at"])
    return {"controllerMode": live.controller_mode}


@transaction.atomic
def finalize_match(match):
    if match.finalized_at:
        raise conflict("Match already finalized")
    live = get_or_create_live(match)
    apply_timeout_if_needed(match, live)
    match.refresh_from_db()
    if match.score_a == match.score_b:
        raise validation_error(
            "Scores are tied and no tiebreak rule is configured.",
            fields={"requiresTiebreak": True},
        )
    winner = match.school_a if match.score_a > match.score_b else match.school_b
    match.winner = winner
    match.status = Match.Status.COMPLETED
    match.finalized_at = timezone.now()
    match.save(update_fields=["winner", "status", "finalized_at", "updated_at"])

    if match.next_match_id and winner:
        nxt = match.next_match
        if match.next_slot == "B":
            nxt.school_b = winner
        else:
            nxt.school_a = winner
        nxt.save(update_fields=["school_a", "school_b", "updated_at"])

    competition = match.competition
    if not competition.matches.exclude(status=Match.Status.COMPLETED).exists():
        competition.status = competition.Status.COMPLETED
        competition.save(update_fields=["status", "updated_at"])

    return match
