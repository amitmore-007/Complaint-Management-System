from typing import Dict, List, Optional

from api import inventory

from utils.auth import get_auth


def register(mcp):
    @mcp.tool(name="list_inventory_items")
    def list_inventory_items(page: int = 1, limit: int = 30) -> Dict:
        """
        admin only — list inventory purchase records.

        returns: { records: [...], pagination: {total, page, pages, limit},
            summary: {totalPurchaseValue, gstValue, nonGstValue} }
        """
        return inventory.list_inventory_items({"page": page, "limit": limit}, get_auth())

    @mcp.tool(name="get_stock_balance")
    def get_stock_balance() -> List[Dict]:
        """
        admin only — current remaining stock per inventory item (purchased minus used).

        returns: list of { itemId, itemName, gstType, gstPercent, latestUnitRate,
            purchasedQty, usedQty, remainingQty }
        """
        return inventory.get_stock_balance(get_auth())

    @mcp.tool(name="create_inventory_item")
    def create_inventory_item(
        itemName: str,
        purchaseDate: str,
        unitRate: float,
        quantity: float,
        gstType: Optional[str] = None,
        gstPercent: Optional[float] = None,
    ) -> Dict:
        """
        admin only — record a new inventory purchase.

        args:
            itemName (str): name of the item. gstType is locked to whatever was used
                the first time this item name was purchased.
            purchaseDate (str): ISO date of purchase.
            unitRate (float): price per unit.
            quantity (float): quantity purchased.
            gstType (str, optional): "gst" | "non-gst" — required the first time this
                item name is purchased.
            gstPercent (float, optional): gst percentage, only relevant when gstType="gst".
        """
        return inventory.create_inventory_item(
            {
                "itemName": itemName,
                "purchaseDate": purchaseDate,
                "unitRate": unitRate,
                "quantity": quantity,
                "gstType": gstType,
                "gstPercent": gstPercent,
            },
            get_auth(),
        )

    @mcp.tool(name="update_inventory_item")
    def update_inventory_item(
        itemId: str,
        itemName: Optional[str] = None,
        purchaseDate: Optional[str] = None,
        unitRate: Optional[float] = None,
        quantity: Optional[float] = None,
        gstType: Optional[str] = None,
        gstPercent: Optional[float] = None,
    ) -> Dict:
        """admin only — correct an inventory purchase record."""
        return inventory.update_inventory_item(
            {
                "itemId": itemId,
                "itemName": itemName,
                "purchaseDate": purchaseDate,
                "unitRate": unitRate,
                "quantity": quantity,
                "gstType": gstType,
                "gstPercent": gstPercent,
            },
            get_auth(),
        )

    @mcp.tool(name="delete_inventory_item")
    def delete_inventory_item(itemId: str) -> Dict:
        """admin only — delete an inventory purchase record."""
        return inventory.delete_inventory_item({"itemId": itemId}, get_auth())

    @mcp.tool(name="list_inventory_item_names")
    def list_inventory_item_names() -> List[Dict]:
        """
        technician only — list available inventory item names for the material picker
        used when resolving a complaint or submitting a billing record.

        returns: list of { itemId, itemName, gstType, gstPercent, latestUnitRate, remainingQty }.
        use itemId as the `item` value in update_complaint_status's materials list.
        """
        return inventory.list_inventory_item_names(get_auth())
