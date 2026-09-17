from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"
    verbose_name = "Competition API"

    def ready(self):
        from django.db.backends.signals import connection_created

        def _enable_sqlite_wal(sender, connection, **kwargs):
            if connection.vendor == "sqlite":
                cursor = connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA foreign_keys=ON;")

        connection_created.connect(_enable_sqlite_wal)
