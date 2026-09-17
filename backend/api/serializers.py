from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from api.exceptions import validation_error
from api.models import Question, School, Sponsor, Subject, User
from api.uploads import media_url
from api.utils import iso


def require_strong_password(password, user=None):
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise validation_error("Weak password.", fields={"password": list(exc.messages)})


class UserPublicSerializer(serializers.Serializer):
    def to_representation(self, user):
        payload = {"id": str(user.id), "name": user.name, "role": user.role}
        if user.role in {User.Role.HOST, User.Role.CONTROLLER} and user.competition_id:
            payload["competitionId"] = str(user.competition_id)
        return payload


class SchoolSerializer(serializers.ModelSerializer):
    logoUrl = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()
    updatedAt = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = ["id", "name", "logoUrl", "status", "createdAt", "updatedAt"]

    def get_logoUrl(self, obj):
        return media_url(self.context.get("request"), obj.logo)

    def get_createdAt(self, obj):
        return iso(obj.created_at)

    def get_updatedAt(self, obj):
        return iso(obj.updated_at)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.id)
        return data


class SubjectSerializer(serializers.ModelSerializer):
    createdAt = serializers.SerializerMethodField()
    updatedAt = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ["id", "name", "code", "status", "createdAt", "updatedAt"]

    def get_createdAt(self, obj):
        return iso(obj.created_at)

    def get_updatedAt(self, obj):
        return iso(obj.updated_at)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.id)
        return data


class QuestionSerializer(serializers.ModelSerializer):
    subjectId = serializers.UUIDField(source="subject_id")
    optionA = serializers.CharField(source="option_a", allow_null=True)
    optionB = serializers.CharField(source="option_b", allow_null=True)
    optionC = serializers.CharField(source="option_c", allow_null=True)
    optionD = serializers.CharField(source="option_d", allow_null=True)
    correctAnswer = serializers.CharField(source="correct_answer")
    isVideoQuestion = serializers.BooleanField(source="is_video_question")
    personName = serializers.CharField(source="person_name", allow_null=True)
    personImageUrl = serializers.SerializerMethodField()
    youtubeUrl = serializers.CharField(source="youtube_url", allow_null=True)
    createdAt = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "subjectId",
            "mode",
            "text",
            "optionA",
            "optionB",
            "optionC",
            "optionD",
            "correctAnswer",
            "marks",
            "isVideoQuestion",
            "personName",
            "personImageUrl",
            "youtubeUrl",
            "status",
            "createdAt",
        ]

    def get_personImageUrl(self, obj):
        return media_url(self.context.get("request"), obj.person_image)

    def get_createdAt(self, obj):
        return iso(obj.created_at)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.id)
        data["subjectId"] = str(instance.subject_id)
        return data


class SponsorSerializer(serializers.ModelSerializer):
    logoUrl = serializers.SerializerMethodField()
    contactInfo = serializers.SerializerMethodField()
    includeInReport = serializers.BooleanField(source="include_in_report")

    class Meta:
        model = Sponsor
        fields = ["id", "name", "logoUrl", "contactInfo", "slogan", "includeInReport"]

    def get_logoUrl(self, obj):
        return media_url(self.context.get("request"), obj.logo)

    def get_contactInfo(self, obj):
        return {
            "phone": obj.contact_phone or None,
            "email": obj.contact_email or None,
            "website": obj.contact_website or None,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.id)
        return data


class StaffSerializer(serializers.ModelSerializer):
    competitionId = serializers.UUIDField(source="competition_id", allow_null=True)

    class Meta:
        model = User
        fields = ["id", "name", "username", "role", "competitionId"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.id)
        if instance.competition_id:
            data["competitionId"] = str(instance.competition_id)
        return data
