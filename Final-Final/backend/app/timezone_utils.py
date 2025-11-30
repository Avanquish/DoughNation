"""
Timezone utilities for consistent datetime handling across the application.
All datetime operations should use Philippines timezone (Asia/Manila).
"""

from datetime import datetime, date, time
from zoneinfo import ZoneInfo

# Philippines timezone
PHILIPPINES_TZ = ZoneInfo("Asia/Manila")


def now_ph() -> datetime:
    """Get current datetime in Philippines timezone."""
    return datetime.now(PHILIPPINES_TZ)


def today_ph() -> date:
    """Get current date in Philippines timezone."""
    return now_ph().date()


def to_ph_timezone(dt: datetime) -> datetime:
    """
    Convert a datetime to Philippines timezone.
    If datetime is naive, assume it's UTC.
    """
    if dt is None:
        return None
    
    if dt.tzinfo is None:
        # Assume naive datetime is UTC
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    
    return dt.astimezone(PHILIPPINES_TZ)


def get_day_start_ph(day: date = None) -> datetime:
    """Get start of day (00:00:00) in Philippines timezone."""
    if day is None:
        day = today_ph()
    return datetime.combine(day, time.min).replace(tzinfo=PHILIPPINES_TZ)


def get_day_end_ph(day: date = None) -> datetime:
    """Get end of day (23:59:59.999999) in Philippines timezone."""
    if day is None:
        day = today_ph()
    return datetime.combine(day, time.max).replace(tzinfo=PHILIPPINES_TZ)


def format_datetime_ph(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime in Philippines timezone."""
    if dt is None:
        return ""
    
    dt_ph = to_ph_timezone(dt)
    return dt_ph.strftime(format_str)


def parse_date_ph(date_str: str, format_str: str = "%Y-%m-%d") -> date:
    """Parse date string and return date object."""
    return datetime.strptime(date_str, format_str).date()


def create_datetime_ph(year: int, month: int, day: int, 
                       hour: int = 0, minute: int = 0, second: int = 0) -> datetime:
    """Create a datetime in Philippines timezone."""
    return datetime(year, month, day, hour, minute, second, tzinfo=PHILIPPINES_TZ)