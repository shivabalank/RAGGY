from datetime import datetime, timezone


def iso(dt: datetime) -> str:
    """ISO-8601 in UTC. SQLite hands back naive datetimes; treat them as UTC so the browser converts correctly."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
