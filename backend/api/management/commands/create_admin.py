from django.core.management.base import BaseCommand

from api.models import User


class Command(BaseCommand):
    help = "Create the first admin user if none exists."

    def add_arguments(self, parser):
        parser.add_argument("--name", default="Admin")
        parser.add_argument("--password", default="ChangeMe1!")

    def handle(self, *args, **options):
        if User.objects.filter(role=User.Role.ADMIN).exists():
            self.stdout.write(self.style.WARNING("An admin already exists."))
            return
        User.objects.create_user(
            username=options["name"],
            name=options["name"],
            password=options["password"],
            role=User.Role.ADMIN,
        )
        self.stdout.write(self.style.SUCCESS(f"Created admin '{options['name']}'."))
