from typing import Optional, TypedDict


class GetHistoryPayload(TypedDict, total=False):
    limit: int


class GetSummaryPayload(TypedDict, total=False):
    date: Optional[str]


class ListAttendancePayload(TypedDict, total=False):
    date: Optional[str]
    userRole: Optional[str]
    userId: Optional[str]
    fromDate: Optional[str]
    toDate: Optional[str]
