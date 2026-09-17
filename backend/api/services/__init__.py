from urllib.parse import urlparse

from django.db.models import Q, ProtectedError

from api.exceptions import not_found, resource_in_use, validation_error
from api.models import LiveMatch, Question, Subject
from api.uploads import validate_and_open_image


def _bool(value, default=False):
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _clean_youtube(url):
    if not url:
        return None
    parsed = urlparse(str(url))
    if parsed.scheme not in {"http", "https"}:
        raise validation_error("youtubeUrl must be a valid http(s) URL.", fields={"youtubeUrl": "Invalid URL."})
    host = (parsed.hostname or "").lower()
    if host not in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}:
        raise validation_error("youtubeUrl must be a YouTube URL.", fields={"youtubeUrl": "Only YouTube URLs are allowed."})
    return url


def normalize_subject_code(code):
    if code is None:
        return None
    cleaned = str(code).strip().upper()
    return cleaned or None


def validate_question_payload(data, instance=None, files=None):
    files = files or {}
    payload = {}

    subject_id = data.get("subjectId") if "subjectId" in data else (instance.subject_id if instance else None)
    if not subject_id:
        raise validation_error("subjectId is required.", fields={"subjectId": "This field is required."})
    try:
        subject = Subject.objects.get(pk=subject_id)
    except Subject.DoesNotExist as exc:
        raise not_found("Unknown subjectId.") from exc
    payload["subject"] = subject

    mode = data.get("mode") if "mode" in data else (instance.mode if instance else None)
    if not mode:
        raise validation_error("mode is required.", fields={"mode": "This field is required."})
    if mode not in Question.Mode.values:
        raise validation_error("Invalid mode.", fields={"mode": "Must be MULTIPLE_CHOICE, TRUE_FALSE, or MENTION."})
    payload["mode"] = mode

    text = data.get("text") if "text" in data else (instance.text if instance else None)
    if not text or not str(text).strip():
        raise validation_error("text is required.", fields={"text": "This field is required."})
    payload["text"] = str(text).strip()

    marks = data.get("marks") if "marks" in data else (instance.marks if instance else None)
    try:
        marks = int(marks)
    except (TypeError, ValueError) as exc:
        raise validation_error("marks must be a positive integer.", fields={"marks": "Invalid marks."}) from exc
    if marks < 1:
        raise validation_error("marks must be greater than 0.", fields={"marks": "Must be > 0."})
    payload["marks"] = marks

    is_video = data.get("isVideoQuestion") if "isVideoQuestion" in data else None
    if is_video is None:
        is_video = instance.is_video_question if instance else False
    is_video = _bool(is_video, False)
    payload["is_video_question"] = is_video

    if is_video and mode == Question.Mode.MENTION:
        raise validation_error("Mention mode is not supported for video questions.")

    option_a = option_b = option_c = option_d = None
    correct = data.get("correctAnswer") if "correctAnswer" in data else (instance.correct_answer if instance else None)

    if mode == Question.Mode.MULTIPLE_CHOICE:
        option_a = data.get("optionA") if "optionA" in data else (instance.option_a if instance else None)
        option_b = data.get("optionB") if "optionB" in data else (instance.option_b if instance else None)
        option_c = data.get("optionC") if "optionC" in data else (instance.option_c if instance else None)
        option_d = data.get("optionD") if "optionD" in data else (instance.option_d if instance else None)
        missing = [name for name, val in [("optionA", option_a), ("optionB", option_b), ("optionC", option_c), ("optionD", option_d)] if not val]
        if missing:
            raise validation_error("Multiple choice questions require all four options.", fields={k: "Required." for k in missing})
        if not correct or str(correct).upper() not in {"A", "B", "C", "D"}:
            raise validation_error("correctAnswer must be one of A, B, C, D.", fields={"correctAnswer": "Must be A, B, C, or D."})
        correct = str(correct).upper()
    elif mode == Question.Mode.TRUE_FALSE:
        if not correct or str(correct).upper() not in {"TRUE", "FALSE"}:
            raise validation_error("correctAnswer must be TRUE or FALSE.", fields={"correctAnswer": "Must be TRUE or FALSE."})
        correct = str(correct).upper()
    else:
        if not correct or not str(correct).strip():
            raise validation_error("correctAnswer is required for mention questions.", fields={"correctAnswer": "Required."})
        correct = str(correct).strip()

    payload["option_a"] = option_a
    payload["option_b"] = option_b
    payload["option_c"] = option_c
    payload["option_d"] = option_d
    payload["correct_answer"] = correct

    person_name = data.get("personName") if "personName" in data else (instance.person_name if instance else None)
    youtube_url = data.get("youtubeUrl") if "youtubeUrl" in data else (instance.youtube_url if instance else None)
    person_image = files.get("personImage")
    person_image_url = data.get("personImageUrl")

    if is_video:
        if not person_name:
            raise validation_error("personName is required for video questions.", fields={"personName": "Required."})
        if person_image:
            validate_and_open_image(person_image)
            payload["person_image"] = person_image
        elif not (instance and instance.person_image) and not person_image_url:
            raise validation_error("personImage or personImageUrl is required for video questions.", fields={"personImage": "Required."})
        youtube_url = _clean_youtube(youtube_url)
        if not youtube_url:
            raise validation_error("youtubeUrl is required for video questions.", fields={"youtubeUrl": "Required."})
        payload["person_name"] = person_name
        payload["youtube_url"] = youtube_url
    else:
        payload["person_name"] = None
        payload["youtube_url"] = None
        payload["person_image"] = None

    return payload


def question_in_progress(question):
    return question.match_usages.filter(
        Q(status="SELECTED") | Q(match__status="IN_PROGRESS")
    ).exists()


def ensure_question_deletable(question):
    if question.match_usages.exists():
        raise resource_in_use()


def ensure_school_deletable(school):
    if (
        school.competitions.exists()
        or school.matches_as_a.exists()
        or school.matches_as_b.exists()
        or school.won_matches.exists()
    ):
        raise resource_in_use()


def ensure_subject_deletable(subject):
    if (
        subject.questions.exists()
        or subject.competitions.exists()
        or LiveMatch.objects.filter(current_subject=subject).exists()
    ):
        raise resource_in_use()


def safe_delete(instance):
    try:
        instance.delete()
    except ProtectedError as exc:
        raise resource_in_use() from exc
