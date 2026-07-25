from typing import Optional, TypedDict


class ListInventoryItemsPayload(TypedDict, total=False):
    page: int
    limit: int


class CreateInventoryItemPayload(TypedDict, total=False):
    itemName: str
    purchaseDate: str
    unitRate: float
    quantity: float
    gstType: Optional[str]
    gstPercent: Optional[float]


class UpdateInventoryItemPayload(TypedDict, total=False):
    itemId: str
    itemName: Optional[str]
    purchaseDate: Optional[str]
    unitRate: Optional[float]
    quantity: Optional[float]
    gstType: Optional[str]
    gstPercent: Optional[float]


class DeleteInventoryItemPayload(TypedDict):
    itemId: str
