from typing import Optional, List, TypedDict, NotRequired


class StoreManager(TypedDict):
    name: str
    phoneNumber: str
    notifyOnResolve: NotRequired[bool]


class UpsertStorePayload(TypedDict):
    storeName: str


class UpdateStoreManagersPayload(TypedDict):
    storeId: str
    managers: List[StoreManager]
