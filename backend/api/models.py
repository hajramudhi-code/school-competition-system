import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, username, name, password, role, **extra_fields):
        if not username:
            raise ValueError("A username is required.")
        if not name:
            raise ValueError("A name is required.")
        user = self.model(username=username, name=name, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, name=None, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(username, name or username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        HOST = "HOST", "Host"
        CONTROLLER = "CONTROLLER", "Controller"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    username = models.CharField(max_length=150, unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    competition = models.ForeignKey(
        "Competition",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staff_members",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name"],
                condition=models.Q(role="ADMIN"),
                name="unique_admin_name",
            ),
        ]
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["username"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.role})"


class AccessTokenBlacklist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    jti = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="blacklisted_tokens")
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["expires_at"])]


class Status(models.TextChoices):
    ENABLED = "ENABLED", "Enabled"
    DISABLED = "DISABLED", "Disabled"


class School(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    logo = models.ImageField(upload_to="schools/", null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ENABLED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=32, unique=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ENABLED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class Question(models.Model):
    class Mode(models.TextChoices):
        MULTIPLE_CHOICE = "MULTIPLE_CHOICE", "Multiple choice"
        TRUE_FALSE = "TRUE_FALSE", "True/False"
        MENTION = "MENTION", "Mention"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="questions")
    mode = models.CharField(max_length=32, choices=Mode.choices)
    text = models.TextField()
    option_a = models.CharField(max_length=500, null=True, blank=True)
    option_b = models.CharField(max_length=500, null=True, blank=True)
    option_c = models.CharField(max_length=500, null=True, blank=True)
    option_d = models.CharField(max_length=500, null=True, blank=True)
    correct_answer = models.CharField(max_length=500)
    marks = models.PositiveIntegerField()
    is_video_question = models.BooleanField(default=False)
    person_name = models.CharField(max_length=200, null=True, blank=True)
    person_image = models.ImageField(upload_to="questions/", null=True, blank=True)
    youtube_url = models.URLField(max_length=500, null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ENABLED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["subject", "status"]),
            models.Index(fields=["mode"]),
            models.Index(fields=["is_video_question"]),
        ]

    def __str__(self):
        return self.text[:80]


class Sponsor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    logo = models.ImageField(upload_to="sponsors/", null=True, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    contact_website = models.URLField(max_length=500, blank=True, default="")
    slogan = models.CharField(max_length=300, blank=True, default="")
    include_in_report = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Competition(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "UPCOMING", "Upcoming"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    logo = models.ImageField(upload_to="competitions/", null=True, blank=True)
    question_duration_seconds = models.PositiveIntegerField(default=30)
    start_date = models.DateField()
    end_date = models.DateField()
    subjects = models.ManyToManyField(Subject, related_name="competitions")
    schools = models.ManyToManyField(School, related_name="competitions")
    host = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="hosted_competitions",
    )
    controller = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="controlled_competitions",
    )
    sponsor = models.ForeignKey(
        Sponsor,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="competitions",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.UPCOMING)
    fixture_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "name"]

    def __str__(self):
        return self.name


class Match(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "UPCOMING", "Upcoming"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name="matches")
    round_number = models.PositiveIntegerField()
    round_name = models.CharField(max_length=80)
    match_number = models.PositiveIntegerField()
    school_a = models.ForeignKey(
        School, null=True, blank=True, on_delete=models.PROTECT, related_name="matches_as_a"
    )
    school_b = models.ForeignKey(
        School, null=True, blank=True, on_delete=models.PROTECT, related_name="matches_as_b"
    )
    next_match = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="feeders",
    )
    next_slot = models.CharField(max_length=1, blank=True, default="")  # A or B
    date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.UPCOMING)
    score_a = models.PositiveIntegerField(default=0)
    score_b = models.PositiveIntegerField(default=0)
    winner = models.ForeignKey(
        School, null=True, blank=True, on_delete=models.PROTECT, related_name="won_matches"
    )
    finalized_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["competition", "round_number", "match_number"]
        indexes = [
            models.Index(fields=["competition", "status"]),
            models.Index(fields=["date"]),
        ]

    @property
    def match_label(self):
        return f"{self.round_name.upper()} — MATCH {self.match_number:02d}"

    @property
    def day(self):
        if not self.date:
            return None
        return self.date.strftime("%A").upper()

    def __str__(self):
        return self.match_label


class LiveMatch(models.Model):
    class QuestionMode(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        VIDEO = "VIDEO", "Video"

    class TimerState(models.TextChoices):
        IDLE = "IDLE", "Idle"
        RUNNING = "RUNNING", "Running"
        PAUSED = "PAUSED", "Paused"

    class VideoPlayback(models.TextChoices):
        IDLE = "IDLE", "Idle"
        LOADING = "LOADING", "Loading"
        PLAYING = "PLAYING", "Playing"
        ENDED = "ENDED", "Ended"

    match = models.OneToOneField(Match, on_delete=models.CASCADE, related_name="live")
    current_school = models.ForeignKey(School, null=True, blank=True, on_delete=models.SET_NULL)
    questions_answered_in_turn = models.PositiveIntegerField(default=0)
    current_subject = models.ForeignKey(Subject, null=True, blank=True, on_delete=models.SET_NULL)
    current_question = models.ForeignKey(
        Question, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    question_mode = models.CharField(
        max_length=16, choices=QuestionMode.choices, default=QuestionMode.NORMAL
    )
    controller_mode = models.CharField(
        max_length=16, choices=QuestionMode.choices, default=QuestionMode.NORMAL
    )
    timer_duration_seconds = models.PositiveIntegerField(default=30)
    timer_started_at = models.DateTimeField(null=True, blank=True)
    timer_paused_remaining = models.PositiveIntegerField(null=True, blank=True)
    timer_state = models.CharField(max_length=16, choices=TimerState.choices, default=TimerState.IDLE)
    video_question = models.ForeignKey(
        Question, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    video_playback_state = models.CharField(
        max_length=16, choices=VideoPlayback.choices, default=VideoPlayback.IDLE
    )
    last_result = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class MatchQuestion(models.Model):
    class Status(models.TextChoices):
        SELECTED = "SELECTED", "Selected"
        COMPLETED = "COMPLETED", "Completed"

    class Result(models.TextChoices):
        CORRECT = "CORRECT", "Correct"
        INCORRECT = "INCORRECT", "Incorrect"
        TIMEOUT = "TIMEOUT", "Timeout"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="played_questions")
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="match_usages")
    slot = models.PositiveIntegerField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SELECTED)
    result = models.CharField(max_length=16, choices=Result.choices, null=True, blank=True)
    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.SET_NULL)
    points_awarded = models.PositiveIntegerField(default=0)
    recorded_at = models.DateTimeField(null=True, blank=True)
    turn_index = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [("match", "question")]
        ordering = ["slot"]


class Report(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "PROCESSING", "Processing"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name="reports")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PROCESSING)
    file = models.FileField(upload_to="reports/", null=True, blank=True)
    message = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
