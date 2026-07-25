from typing import Dict, Optional

from api import stats

from utils.auth import get_auth

_RANGE_ARGS = """
        from_date (str, optional): ISO date range start.
        to_date (str, optional): ISO date range end.
        tz (str, optional): IANA timezone (e.g. "Asia/Kolkata") used to bucket the range."""


def register(mcp):
    @mcp.tool(name="stats_complaints_created_vs_resolved")
    def stats_complaints_created_vs_resolved(
        interval: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        tz: Optional[str] = None,
    ) -> Dict:
        """
        admin only — time-bucketed created-vs-resolved complaint counts.

        args:
            interval (str, optional): "day" | "week" | "month" bucket size.
            from_date, to_date, tz: see date-range args below.
        """
        return stats.created_vs_resolved(interval, from_date, to_date, tz, get_auth())

    @mcp.tool(name="stats_complaints_created_vs_resolved_drilldown")
    def stats_complaints_created_vs_resolved_drilldown(
        interval: str, period: str, tz: Optional[str] = None
    ) -> Dict:
        """
        admin only — list the complaints inside one bucket from stats_complaints_created_vs_resolved.

        args:
            interval (str): "day" | "week" | "month" — must match the parent call.
            period (str): the specific bucket label returned by the parent call (e.g. a date/week/month string).
            tz (str, optional): IANA timezone.
        """
        return stats.created_vs_resolved_drilldown(interval, period, tz, get_auth())

    @mcp.tool(name="stats_complaint_status_funnel")
    def stats_complaint_status_funnel(
        from_date: Optional[str] = None, to_date: Optional[str] = None, tz: Optional[str] = None
    ) -> Dict:
        """
        admin only — complaint counts per status stage (pending/assigned/in-progress/resolved).

        args: from_date, to_date, tz — optional ISO date range + IANA timezone.
        """
        return stats.status_funnel(from_date, to_date, tz, get_auth())

    @mcp.tool(name="stats_complaint_status_funnel_drilldown")
    def stats_complaint_status_funnel_drilldown(
        status: str, from_date: Optional[str] = None, to_date: Optional[str] = None, tz: Optional[str] = None
    ) -> Dict:
        """
        admin only — list complaints in one funnel stage.

        args:
            status (str): "pending" | "assigned" | "in-progress" | "resolved".
            from_date, to_date, tz: optional ISO date range + IANA timezone.
        """
        return stats.status_funnel_drilldown(status, from_date, to_date, tz, get_auth())

    @mcp.tool(name="stats_store_leaderboard")
    def stats_store_leaderboard(
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        tz: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> Dict:
        """
        admin only — stores ranked by complaint volume.

        args:
            from_date, to_date, tz: optional ISO date range + IANA timezone.
            limit (int, optional): max stores to return.
        """
        return stats.store_leaderboard(from_date, to_date, tz, limit, get_auth())

    @mcp.tool(name="stats_store_leaderboard_drilldown")
    def stats_store_leaderboard_drilldown(
        storeName: str, from_date: Optional[str] = None, to_date: Optional[str] = None, tz: Optional[str] = None
    ) -> Dict:
        """
        admin only — resolved/unresolved complaint breakdown for one store.

        args:
            storeName (str): exact store name.
            from_date, to_date, tz: optional ISO date range + IANA timezone.
        """
        return stats.store_leaderboard_drilldown(storeName, from_date, to_date, tz, get_auth())

    @mcp.tool(name="stats_time_to_resolve")
    def stats_time_to_resolve(
        interval: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        tz: Optional[str] = None,
    ) -> Dict:
        """
        admin only — average/median resolution time, bucketed over time.

        args:
            interval (str, optional): "day" | "week" | "month" bucket size.
            from_date, to_date, tz: optional ISO date range + IANA timezone.
        """
        return stats.time_to_resolve(interval, from_date, to_date, tz, get_auth())

    @mcp.tool(name="stats_time_to_resolve_drilldown")
    def stats_time_to_resolve_drilldown(interval: str, period: str, tz: Optional[str] = None) -> Dict:
        """admin only — list complaints (with hoursToResolve) inside one bucket from stats_time_to_resolve."""
        return stats.time_to_resolve_drilldown(interval, period, tz, get_auth())

    @mcp.tool(name="stats_complaint_aging")
    def stats_complaint_aging(
        from_date: Optional[str] = None, to_date: Optional[str] = None, tz: Optional[str] = None
    ) -> Dict:
        """
        admin only — currently-open complaints bucketed by age (e.g. 0-1d, 1-3d, ...).

        args: from_date, to_date, tz — optional ISO date range + IANA timezone.
        """
        return stats.aging(from_date, to_date, tz, get_auth())

    @mcp.tool(name="stats_complaint_aging_drilldown")
    def stats_complaint_aging_drilldown(
        bucket: str, from_date: Optional[str] = None, to_date: Optional[str] = None, tz: Optional[str] = None
    ) -> Dict:
        """
        admin only — list complaints in one aging bucket from stats_complaint_aging.

        args:
            bucket (str): the bucket label returned by stats_complaint_aging.
            from_date, to_date, tz: optional ISO date range + IANA timezone.
        """
        return stats.aging_drilldown(bucket, from_date, to_date, tz, get_auth())

    @mcp.tool(name="stats_technician_assigned_vs_resolved")
    def stats_technician_assigned_vs_resolved(
        from_date: Optional[str] = None, to_date: Optional[str] = None, tz: Optional[str] = None
    ) -> Dict:
        """
        admin only — per-technician assigned vs resolved complaint counts.

        args: from_date, to_date, tz — optional ISO date range + IANA timezone.
        """
        return stats.technician_assigned_vs_resolved(from_date, to_date, tz, get_auth())

    @mcp.tool(name="stats_technician_drilldown")
    def stats_technician_drilldown(
        technicianId: str, from_date: Optional[str] = None, to_date: Optional[str] = None, tz: Optional[str] = None
    ) -> Dict:
        """
        admin only — assigned/resolved complaint detail for one technician.

        args:
            technicianId (str): id of the technician.
            from_date, to_date, tz: optional ISO date range + IANA timezone.
        """
        return stats.technician_drilldown(technicianId, from_date, to_date, tz, get_auth())
