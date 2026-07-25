from typing import Optional, List, TypedDict


class CreateEquipmentPayload(TypedDict):
    name: str


class UpdateEquipmentPayload(TypedDict, total=False):
    equipmentId: str
    name: Optional[str]
    isActive: Optional[bool]


class AssetChecklistItem(TypedDict, total=False):
    equipmentId: str
    name: str
    isPresent: bool
    count: int


class SubmitAssetRecordPayload(TypedDict, total=False):
    storeName: str
    equipment: List[AssetChecklistItem]
    notes: Optional[str]


class ListAssetRecordsPayload(TypedDict, total=False):
    page: int
    limit: int
    storeName: Optional[str]
    technicianId: Optional[str]


class GetAssetRecordPayload(TypedDict):
    recordId: str


class UpdateAssetRecordPayload(TypedDict, total=False):
    recordId: str
    storeName: Optional[str]
    equipment: Optional[List[AssetChecklistItem]]
    notes: Optional[str]


class DeleteAssetRecordPayload(TypedDict):
    recordId: str
