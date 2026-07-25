from typing import Optional, List, TypedDict


class StoreManager(TypedDict):
    name: str
    phoneNumber: str


class UpsertStorePayload(TypedDict):
    storeName: str


class UpdateStoreManagersPayload(TypedDict):
    storeId: str
    managers: List[StoreManager]
