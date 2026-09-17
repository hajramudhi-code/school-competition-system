from rest_framework_simplejwt.tokens import AccessToken

from api.models import AccessTokenBlacklist, User
from api.tokens import TokenService


def user_payload(user: User):
    data = {"id": str(user.id), "name": user.name, "role": user.role}
    if user.role in {User.Role.HOST, User.Role.CONTROLLER} and user.competition_id:
        data["competitionId"] = str(user.competition_id)
    return data


def issue_auth_response(user: User):
    return {"user": user_payload(user), "token": TokenService.issue(user)}


def revoke_request_token(request):
    header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION", "")
    if not header.startswith("Bearer "):
        return
    raw = header.split(" ", 1)[1].strip()
    token = AccessToken(raw)
    TokenService.blacklist_access(token)
    AccessTokenBlacklist.objects.filter(expires_at__lt=__import__("django.utils.timezone", fromlist=["timezone"]).now()).delete()
