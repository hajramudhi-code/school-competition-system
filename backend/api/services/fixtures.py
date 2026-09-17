from api.exceptions import conflict, validation_error
from api.models import Competition, Match, Status


ROUND_NAMES = {
    2: "Final",
    4: "Semifinal",
    8: "Quarterfinal",
    16: "Round of 16",
    32: "Round of 32",
    64: "Round of 64",
}


def _round_name(contestant_count):
    return ROUND_NAMES.get(contestant_count, f"Round of {contestant_count}")


def _serialize_fixture(competition, include_excluded=None):
    rounds = []
    matches = list(
        competition.matches.select_related("school_a", "school_b").order_by("round_number", "match_number")
    )
    by_round = {}
    for match in matches:
        by_round.setdefault(match.round_number, {"roundName": match.round_name, "matches": []})
        by_round[match.round_number]["matches"].append(
            {
                "matchId": str(match.id),
                "schoolAId": str(match.school_a_id) if match.school_a_id else None,
                "schoolBId": str(match.school_b_id) if match.school_b_id else None,
                "date": match.date.isoformat() if match.date else None,
            }
        )
    for number in sorted(by_round):
        rounds.append(
            {
                "roundNumber": number,
                "roundName": by_round[number]["roundName"],
                "matches": by_round[number]["matches"],
            }
        )
    payload = {"competitionId": str(competition.id), "rounds": rounds}
    if include_excluded is not None:
        payload["excludedSchoolIds"] = [str(pk) for pk in include_excluded]
    return payload


def generate_fixture(competition, regenerate=False):
    existing = competition.matches.all()
    if existing.exists() and not regenerate:
        raise conflict("Fixture already generated. Use regenerate.")
    if regenerate:
        if existing.filter(played_questions__isnull=False).distinct().exists() or existing.filter(
            status=Match.Status.IN_PROGRESS
        ).exists() or existing.filter(status=Match.Status.COMPLETED).exists():
            raise conflict("Cannot regenerate fixture after match results have been recorded.")
        existing.delete()

    schools = list(competition.schools.filter(status=Status.ENABLED).order_by("name"))
    # Preserve competition M2M insertion/selection order when possible.
    ordered_ids = list(competition.schools.through.objects.filter(competition=competition).order_by("id").values_list("school_id", flat=True))
    by_id = {school.id: school for school in schools}
    ordered = [by_id[pk] for pk in ordered_ids if pk in by_id]
    if len(ordered) < len(schools):
        leftover = [s for s in schools if s.id not in {x.id for x in ordered}]
        ordered.extend(leftover)

    excluded = []
    if len(ordered) % 2 == 1:
        excluded.append(ordered.pop())
    if len(ordered) < 2:
        raise validation_error("At least 2 eligible schools are required to generate a fixture.")

    # Build rounds from current contestant list. Contestants are School or None (TBD winner).
    contestants = list(ordered)
    created_rounds = []
    round_number = 1
    start = competition.start_date

    while len(contestants) > 1:
        bye = None
        if len(contestants) % 2 == 1:
            bye = contestants.pop()
        round_matches = []
        name = _round_name(len(contestants) + (1 if bye else 0))
        if len(contestants) == 2 and bye is None:
            name = "Final" if round_number > 1 or len(ordered) == 2 else name
        for index in range(0, len(contestants), 2):
            left, right = contestants[index], contestants[index + 1]
            match = Match.objects.create(
                competition=competition,
                round_number=round_number,
                round_name=name,
                match_number=(index // 2) + 1,
                school_a=left if hasattr(left, "id") else None,
                school_b=right if hasattr(right, "id") else None,
                date=start,
            )
            round_matches.append(match)
        created_rounds.append(round_matches)
        next_slots = list(round_matches)
        if bye is not None:
            next_slots.append(bye)
        contestants = next_slots
        round_number += 1

    for round_index, round_matches in enumerate(created_rounds[:-1]):
        next_round = created_rounds[round_index + 1]
        for i, match in enumerate(round_matches):
            target = next_round[i // 2] if next_round else None
            if target:
                match.next_match = target
                match.next_slot = "A" if i % 2 == 0 else "B"
                match.save(update_fields=["next_match", "next_slot"])

    competition.fixture_generated = True
    competition.save(update_fields=["fixture_generated", "updated_at"])
    return _serialize_fixture(competition, include_excluded=[school.id for school in excluded])


def get_fixture(competition):
    if not competition.fixture_generated and not competition.matches.exists():
        raise validation_error("No fixture has been generated for this competition.")
    return _serialize_fixture(competition)
