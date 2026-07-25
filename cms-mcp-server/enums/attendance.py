from enum import Enum


class AttendanceStatus(str, Enum):
    WORKING = "working"
    ON_BREAK = "on_break"
    CHECKED_OUT = "checked_out"


class AttendanceSessionType(str, Enum):
    WORK = "work"
    BREAK = "break"
