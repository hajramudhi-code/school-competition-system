import re

from django.db import migrations, models


def backfill_subject_codes(apps, schema_editor):
    Subject = apps.get_model("api", "Subject")
    used = set()
    for subject in Subject.objects.all().order_by("created_at", "id"):
        base = re.sub(r"[^A-Z0-9]", "", (subject.name or "").upper())[:12] or "SUBJ"
        code = base
        suffix = 1
        while code in used:
            suffix += 1
            code = f"{base[:8]}{suffix}"
        subject.code = code
        subject.save(update_fields=["code"])
        used.add(code)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="subject",
            name="code",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.RunPython(backfill_subject_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="subject",
            name="code",
            field=models.CharField(max_length=32, unique=True),
        ),
    ]
