from typing import Dict, List, Optional

from api import store

from utils.auth import get_auth


def register(mcp):
    @mcp.tool(name="list_stores")
    def list_stores(name: Optional[str] = None) -> List[Dict]:
        """
        list stores (any authenticated role) — e.g. to populate a store picker
        when creating a complaint.

        args:
            name (str, optional): exact store name (case-insensitive) to fetch just one store.
                omit to get all stores.

        returns: list of { _id, name, managers: [{name, phoneNumber}], isActive }.
        """
        return store.list_stores(name, get_auth())

    @mcp.tool(name="upsert_store")
    def upsert_store(storeName: str) -> Dict:
        """
        admin only — create a store by name if it doesn't exist yet, or return the
        existing one.

        args:
            storeName (str): the store's name.
        """
        return store.upsert_store({"storeName": storeName}, get_auth())

    @mcp.tool(name="update_store_managers")
    def update_store_managers(storeId: str, managers: List[Dict]) -> Dict:
        """
        admin only — replace a store's list of outlet managers.

        args:
            storeId (str): id of the store.
            managers (list[dict]): full replacement list, each item: { name, phoneNumber }.
        """
        return store.update_store_managers({"storeId": storeId, "managers": managers}, get_auth())
