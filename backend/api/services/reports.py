from io import BytesIO

from django.core.files.base import ContentFile
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from api.models import Match, Report


def _p(text, styles):
    return Paragraph(str(text or ""), styles["BodyText"])


def generate_competition_report(report: Report):
    competition = report.competition
    try:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title=f"{competition.name} Report")
        styles = getSampleStyleSheet()
        story = [
            Paragraph(competition.name, styles["Title"]),
            Paragraph(
                f"{competition.start_date.isoformat()} — {competition.end_date.isoformat()}",
                styles["Normal"],
            ),
            Spacer(1, 12),
        ]

        story.append(Paragraph("Officials", styles["Heading2"]))
        host = competition.host.name if competition.host else "Unassigned"
        controller = competition.controller.name if competition.controller else "Unassigned"
        story.append(Paragraph(f"Host: {host}", styles["Normal"]))
        story.append(Paragraph(f"Controller: {controller}", styles["Normal"]))
        story.append(Spacer(1, 10))

        sponsor = competition.sponsor
        if sponsor and sponsor.include_in_report:
            story.append(Paragraph("Sponsor", styles["Heading2"]))
            story.append(Paragraph(sponsor.name, styles["Normal"]))
            if sponsor.slogan:
                story.append(Paragraph(sponsor.slogan, styles["Italic"]))
            story.append(Spacer(1, 10))

        story.append(Paragraph("Schools", styles["Heading2"]))
        school_rows = [["Name", "Status"]]
        for school in competition.schools.order_by("name"):
            school_rows.append([school.name, school.status])
        story.append(_table(school_rows))
        story.append(Spacer(1, 10))

        story.append(Paragraph("Subjects", styles["Heading2"]))
        subject_rows = [["Name", "Status"]]
        for subject in competition.subjects.order_by("name"):
            subject_rows.append([subject.name, subject.status])
        story.append(_table(subject_rows))
        story.append(Spacer(1, 10))

        story.append(Paragraph("Fixture & Results", styles["Heading2"]))
        match_rows = [["Round", "Match", "School A", "Score A", "School B", "Score B", "Winner", "Status"]]
        for match in competition.matches.select_related("school_a", "school_b", "winner").order_by(
            "round_number", "match_number"
        ):
            match_rows.append(
                [
                    match.round_name,
                    match.match_label,
                    match.school_a.name if match.school_a else "TBD",
                    str(match.score_a),
                    match.school_b.name if match.school_b else "TBD",
                    str(match.score_b),
                    match.winner.name if match.winner else "—",
                    match.status,
                ]
            )
        story.append(_table(match_rows, small=True))
        story.append(Spacer(1, 12))

        final = (
            competition.matches.filter(round_name="Final", status=Match.Status.COMPLETED)
            .select_related("winner")
            .first()
        )
        if final and final.winner:
            story.append(Paragraph(f"Champion: {final.winner.name}", styles["Heading2"]))

        doc.build(story)
        report.file.save(f"report_{competition.id}.pdf", ContentFile(buffer.getvalue()), save=False)
        report.status = Report.Status.READY
        report.message = ""
        report.save(update_fields=["file", "status", "message", "updated_at"])
    except Exception as exc:  # noqa: BLE001 — persist failure for the client
        report.status = Report.Status.FAILED
        report.message = "Report generation failed"
        report.save(update_fields=["status", "message", "updated_at"])
        raise exc


def _table(rows, small=False):
    table = Table(rows, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3b73")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8 if small else 10),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table
