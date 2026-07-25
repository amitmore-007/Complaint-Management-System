from typing import Dict, List, Optional

from api import attendance

from utils.auth import get_auth


def register(mcp):
    @mcp.tool(name="attendance_check_in")
    def attendance_check_in() -> Dict:
        """check in for the current day (any role). returns the day's attendance record."""
        return attendance.check_in(get_auth())

    @mcp.tool(name="attendance_start_break")
    def attendance_start_break() -> Dict:
        """start a break on the current checked-in session. returns the updated attendance record."""
        return attendance.start_break(get_auth())

    @mcp.tool(name="attendance_end_break")
    def attendance_end_break() -> Dict:
        """end the current break and resume working. returns the updated attendance record."""
        return attendance.end_break(get_auth())

    @mcp.tool(name="attendance_check_out")
    def attendance_check_out() -> Dict:
        """check out for the day. returns the final attendance record for today."""
        return attendance.check_out(get_auth())

    @mcp.tool(name="get_today_attendance")
    def get_today_attendance() -> Dict:
        """
        get the current user's attendance record for today, if any.

        returns: { userId, userRole, userName, date, checkInTime, checkOutTime,
            currentStatus: "working"|"on_break"|"checked_out", sessions: [...],
            totalWorkSeconds, totalBreakSeconds } or {} if not checked in today.
        """
        return attendance.get_today(get_auth())

    @mcp.tool(name="get_attendance_history")
    def get_attendance_history(limit: int = 30) -> List[Dict]:
        """
        get the current user's own attendance history.

        args:
            limit (int): max number of days to return, defaults to 30 (max 90).
        """
        return attendance.get_history({"limit": limit}, get_auth())

    @mcp.tool(name="get_attendance_summary")
    def get_attendance_summary(date: Optional[str] = None) -> Dict:
        """
        admin only — attendance summary counts for a given day.

        args:
            date (str, optional): "YYYY-MM-DD", defaults to today.

        returns: { working, on_break, checked_out, total_checked_in, not_checked_in, total_active }
        """
        return attendance.get_summary({"date": date}, get_auth())

    @mcp.tool(name="list_attendance_records")
    def list_attendance_records(
        date: Optional[str] = None,
        userRole: Optional[str] = None,
        userId: Optional[str] = None,
        fromDate: Optional[str] = None,
        toDate: Optional[str] = None,
    ) -> List[Dict]:
        """
        admin only — list attendance records across all users, with filters.

        args:
            date (str, optional): "YYYY-MM-DD" single day filter.
            userRole (str, optional): "admin" | "client" | "technician".
            userId (str, optional): filter to one user.
            fromDate (str, optional): range start "YYYY-MM-DD" (takes priority over `date` if given with toDate).
            toDate (str, optional): range end "YYYY-MM-DD".
        """
        return attendance.list_attendance(
            {"date": date, "userRole": userRole, "userId": userId, "fromDate": fromDate, "toDate": toDate},
            get_auth(),
        )
