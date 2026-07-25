from typing import Optional, List, TypedDict


class GetComplaintPayload(TypedDict):
    complaintId: str


class ListComplaintsPayload(TypedDict, total=False):
    status: Optional[str]
    priority: Optional[str]
    page: int
    limit: int


class CreateComplaintPayload(TypedDict, total=False):
    title: str
    description: str
    location: Optional[str]
    storeId: Optional[str]
    priority: Optional[str]


class UpdateComplaintPayload(TypedDict, total=False):
    complaintId: str
    title: Optional[str]
    description: Optional[str]
    location: Optional[str]
    priority: Optional[str]
    store: Optional[str]


class DeleteComplaintPayload(TypedDict):
    complaintId: str


class DuplicateComplaintPayload(TypedDict, total=False):
    complaintId: str
    title: Optional[str]
    description: Optional[str]
    location: Optional[str]
    priority: Optional[str]


class BulkComplaintItem(TypedDict, total=False):
    title: str
    description: str
    location: Optional[str]
    priority: Optional[str]


class CreateBulkComplaintsPayload(TypedDict):
    complaints: List[BulkComplaintItem]


class AssignComplaintPayload(TypedDict):
    complaintId: str
    technicianId: str


class ReassignComplaintPayload(TypedDict):
    complaintId: str
    technicianId: str


class MaterialUsage(TypedDict):
    item: str
    quantity: float


class UpdateComplaintStatusPayload(TypedDict, total=False):
    complaintId: str
    status: str
    notes: Optional[str]
    resolutionNotes: Optional[str]
    materialsUsed: Optional[bool]
    materials: Optional[List[MaterialUsage]]


class UpdateAutoAssignSettingPayload(TypedDict):
    enabled: bool
