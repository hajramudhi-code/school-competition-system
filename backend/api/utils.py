from datetime import timezone as dt_timezone

from django.utils import timezone


def iso(dt):
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, dt_timezone.utc)
    return dt.astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z")


def apply_search(queryset, term, *fields):
    if not term:
        return queryset
    from django.db.models import Q

    query = Q()
    for field in fields:
        query |= Q(**{f"{field}__icontains": term})
    return queryset.filter(query)


def apply_status(queryset, status_value):
    if not status_value:
        return queryset
    return queryset.filter(status=status_value)
