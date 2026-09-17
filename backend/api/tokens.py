from datetime import datetime, timezone as dt_timezone

from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import AccessTokenBlacklist


class TokenService:
    @staticmethod
    def issue(user):
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["name"] = user.name
        if user.competition_id:
            refresh["competitionId"] = str(user.competition_id)
        access = refresh.access_token
        access["role"] = user.role
        access["name"] = user.name
        if user.competition_id:
            access["competitionId"] = str(user.competition_id)
        return str(access)

    @staticmethod
    def blacklist_access(token):
        jti = token.get("jti")
        exp = token.get("exp")
        user_id = token.get("user_id")
        if not jti or not user_id:
            return
        expires_at = datetime.fromtimestamp(exp, tz=dt_timezone.utc) if exp else timezone.now()
        AccessTokenBlacklist.objects.get_or_create(
            jti=jti,
            defaults={"user_id": user_id, "expires_at": expires_at},
        )


class BlacklistCheckingJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        jti = token.get("jti")
        if jti and AccessTokenBlacklist.objects.filter(jti=jti).exists():
            raise InvalidToken("Token has been revoked.")
        return token
