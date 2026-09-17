from django.core.management.base import BaseCommand

from api.models import User

# Demo accounts for local/test and first Vercel deploy. Change passwords after go-live.
DEMO_USERS = (
    {
        "username": "Admin",
        "name": "Admin",
        "role": User.Role.ADMIN,
        "password": "ChangeMe1!",
        "is_staff": True,
        "is_superuser": True,
        "login": "POST /api/auth/admin/login with name + password",
    },
    {
        "username": "host",
        "name": "Demo Host",
        "role": User.Role.HOST,
        "password": "ChangeMe1!",
        "is_staff": False,
        "is_superuser": False,
        "login": "POST /api/auth/staff/login with username + password",
    },
    {
        "username": "controller",
        "name": "Demo Controller",
        "role": User.Role.CONTROLLER,
        "password": "ChangeMe1!",
        "is_staff": False,
        "is_superuser": False,
        "login": "POST /api/auth/staff/login with username + password",
    },
)


class Command(BaseCommand):
    help = "Create or reset default demo login users (Admin, Host, Controller)."

    def handle(self, *args, **options):
        for spec in DEMO_USERS:
            user = User.objects.filter(username=spec["username"]).first()
            if user is None:
                user = User.objects.create_user(
                    username=spec["username"],
                    name=spec["name"],
                    password=spec["password"],
                    role=spec["role"],
                    is_staff=spec["is_staff"],
                    is_superuser=spec["is_superuser"],
                )
                action = "Created"
            else:
                user.name = spec["name"]
                user.role = spec["role"]
                user.is_staff = spec["is_staff"]
                user.is_superuser = spec["is_superuser"]
                user.is_active = True
                user.set_password(spec["password"])
                user.save()
                action = "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action} {spec['role']}: username={spec['username']!r} "
                    f"password={spec['password']!r} ({spec['login']})"
                )
            )
