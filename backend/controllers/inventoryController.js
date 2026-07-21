import {
  inventoryService,
  getHttpErrorStatus,
} from "../services/inventoryService.js";

export const adminCreateInventoryItem = async (req, res) => {
  try {
    const item = await inventoryService.admin.createItem({
      itemName: req.body.itemName,
      purchaseDate: req.body.purchaseDate,
      unitRate: req.body.unitRate,
      quantity: req.body.quantity,
      gstType: req.body.gstType,
      gstPercent: req.body.gstPercent,
      adminId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Inventory item added",
      item,
    });
  } catch (error) {
    console.error("Create inventory item error:", error);
    const status = getHttpErrorStatus(error) ?? 500;
    return res.status(status).json({
      success: false,
      message: status === 500 ? "Internal server error" : error.message,
    });
  }
};

export const adminListInventoryItems = async (req, res) => {
  try {
    const { records, pagination, summary } =
      await inventoryService.admin.listItems({
        page: req.query.page,
        limit: req.query.limit,
      });

    return res.status(200).json({
      success: true,
      records,
      pagination,
      summary,
    });
  } catch (error) {
    console.error("List inventory items error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const adminUpdateInventoryItem = async (req, res) => {
  try {
    const item = await inventoryService.admin.updateItem({
      id: req.params.id,
      itemName: req.body.itemName,
      purchaseDate: req.body.purchaseDate,
      unitRate: req.body.unitRate,
      quantity: req.body.quantity,
      gstType: req.body.gstType,
      gstPercent: req.body.gstPercent,
    });

    return res.status(200).json({
      success: true,
      message: "Inventory item updated",
      item,
    });
  } catch (error) {
    console.error("Update inventory item error:", error);
    const status = getHttpErrorStatus(error) ?? 500;
    return res.status(status).json({
      success: false,
      message: status === 500 ? "Internal server error" : error.message,
    });
  }
};

export const adminDeleteInventoryItem = async (req, res) => {
  try {
    await inventoryService.admin.deleteItem({ id: req.params.id });

    return res.status(200).json({
      success: true,
      message: "Inventory item deleted",
    });
  } catch (error) {
    console.error("Delete inventory item error:", error);
    const status = getHttpErrorStatus(error) ?? 500;
    return res.status(status).json({
      success: false,
      message: status === 500 ? "Internal server error" : error.message,
    });
  }
};

export const listInventoryItemNames = async (req, res) => {
  try {
    const items = await inventoryService.shared.listItemNames();

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("List inventory item names error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const adminGetStockBalance = async (req, res) => {
  try {
    const balances = await inventoryService.admin.getStockBalance();

    return res.status(200).json({
      success: true,
      balances,
    });
  } catch (error) {
    console.error("Get stock balance error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
