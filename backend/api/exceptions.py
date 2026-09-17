from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_exception_handler


class APIError(APIException):
    def __init__(self, message, code="ERROR", http_status=status.HTTP_400_BAD_REQUEST, fields=None):
        self.status_code = http_status
        self.code = code
        self.fields = fields or {}
        super().__init__(detail=message)


def _error_payload(code, message, fields=None):
    return {"error": {"code": code, "message": message, "fields": fields or {}}}


def api_exception_handler(exc, context):
    if isinstance(exc, APIError):
        from rest_framework.response import Response

        return Response(
            _error_payload(exc.code, str(exc.detail), exc.fields),
            status=exc.status_code,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        from rest_framework.response import Response
        import logging

        logging.getLogger("api").exception("Unhandled API exception")
        message = "An unexpected error occurred."
        from django.conf import settings

        if settings.DEBUG:
            message = str(exc)
        return Response(
            _error_payload("SERVER_ERROR", message),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = getattr(exc, "default_code", None) or "ERROR"
    code_map = {
        "not_authenticated": ("UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED),
        "authentication_failed": ("UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED),
        "permission_denied": ("FORBIDDEN", status.HTTP_403_FORBIDDEN),
        "not_found": ("NOT_FOUND", status.HTTP_404_NOT_FOUND),
        "throttled": ("RATE_LIMITED", status.HTTP_429_TOO_MANY_REQUESTS),
        "invalid": ("VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST),
        "parse_error": ("VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST),
        "method_not_allowed": ("METHOD_NOT_ALLOWED", status.HTTP_405_METHOD_NOT_ALLOWED),
    }
    mapped = code_map.get(code)
    if mapped:
        code, status_code = mapped
        response.status_code = status_code

    fields = {}
    message = "Request failed."
    detail = response.data

    if isinstance(detail, dict):
        if "detail" in detail and len(detail) == 1:
            message = str(detail["detail"])
        else:
            fields = {
                key: (
                    [str(item) for item in value]
                    if isinstance(value, (list, tuple))
                    else str(value)
                )
                for key, value in detail.items()
                if key != "detail"
            }
            if "detail" in detail:
                message = str(detail["detail"])
            elif fields:
                first_key = next(iter(fields))
                first_val = fields[first_key]
                message = first_val[0] if isinstance(first_val, list) else str(first_val)
    elif isinstance(detail, list) and detail:
        message = str(detail[0])
    else:
        message = str(detail)

    response.data = _error_payload(code.upper() if isinstance(code, str) else "ERROR", message, fields)
    return response


def validation_error(message, fields=None):
    return APIError(message, code="VALIDATION_ERROR", http_status=status.HTTP_400_BAD_REQUEST, fields=fields)


def unauthorized(message="Unauthorized"):
    return APIError(message, code="UNAUTHORIZED", http_status=status.HTTP_401_UNAUTHORIZED)


def forbidden(message="Access denied"):
    return APIError(message, code="FORBIDDEN", http_status=status.HTTP_403_FORBIDDEN)


def not_found(message="Not found"):
    return APIError(message, code="NOT_FOUND", http_status=status.HTTP_404_NOT_FOUND)


def conflict(message, fields=None):
    return APIError(message, code="CONFLICT", http_status=status.HTTP_409_CONFLICT, fields=fields)


def resource_in_use(message="This resource cannot be deleted because it is in use.", fields=None):
    return APIError(message, code="RESOURCE_IN_USE", http_status=status.HTTP_409_CONFLICT, fields=fields)


def unprocessable(message, fields=None):
    return APIError(message, code="UNPROCESSABLE", http_status=status.HTTP_422_UNPROCESSABLE_ENTITY, fields=fields)
