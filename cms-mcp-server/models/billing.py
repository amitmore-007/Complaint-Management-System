from typing import Optional, List, TypedDict


class CreateBillingRecordPayload(TypedDict, total=False):
    complaintId: str
    isComplaintResolved: Optional[bool]


class ListBillingRecordsPayload(TypedDict, total=False):
    page: int
    limit: int


class GetBillingRecordPayload(TypedDict):
    recordId: str


class BillingMaterial(TypedDict, total=False):
    name: str
    quantity: float
    price: float


class UpdateBillingRecordPayload(TypedDict, total=False):
    recordId: str
    materialsUsed: Optional[bool]
    isComplaintResolved: Optional[bool]
    materials: Optional[List[BillingMaterial]]
