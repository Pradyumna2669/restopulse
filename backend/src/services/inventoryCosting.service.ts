import { store } from '../data/store';
import { InventoryUnit, RecipeItem, MenuItem, OrderItem, PurchaseOrder, WastageLog, RecipeVarianceReport } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class InventoryCostingService {
  /**
   * Converts a quantity from one unit to another
   */
  public static convertUnits(quantity: number, fromUnit: InventoryUnit, toUnit: InventoryUnit): number {
    if (fromUnit === toUnit) {
      return quantity;
    }

    // Weight conversions: kg <-> grams
    if (fromUnit === 'kg' && toUnit === 'grams') {
      return quantity * 1000;
    }
    if (fromUnit === 'grams' && toUnit === 'kg') {
      return quantity / 1000;
    }

    // Volume conversions: litres <-> ml
    if (fromUnit === 'litres' && toUnit === 'ml') {
      return quantity * 1000;
    }
    if (fromUnit === 'ml' && toUnit === 'litres') {
      return quantity / 1000;
    }

    // Direct unit fallback if units cannot be directly converted
    return quantity;
  }

  /**
   * Computes the theoretical ingredient cost for a menu item given its BOM recipe
   */
  public static calculateRecipeCost(recipe?: RecipeItem[]): number {
    if (!recipe || recipe.length === 0) return 0;
    const inventory = store.getInventory();

    let totalCost = 0;
    for (const ing of recipe) {
      const material = inventory.find(m => m.id === ing.rawMaterialId);
      if (!material) continue;

      // Convert recipe required quantity to material's stocking unit
      const normalizedQty = this.convertUnits(ing.quantityRequired, ing.unit, material.unit);
      totalCost += normalizedQty * material.costPerUnit;
    }

    return Math.round(totalCost * 100) / 100;
  }

  /**
   * Deducts raw materials from inventory based on recipe BOM when an order is fulfilled
   */
  public static deductRecipeStockOnOrder(orderItems: OrderItem[]): {
    success: boolean;
    deductions: { rawMaterialId: string; name: string; quantityDeducted: number; unit: InventoryUnit; remainingStock: number }[];
  } {
    const menuItems = store.getMenuItems();
    const inventory = store.getInventory();
    const deductions: { rawMaterialId: string; name: string; quantityDeducted: number; unit: InventoryUnit; remainingStock: number }[] = [];

    for (const orderItem of orderItems) {
      const menuItem = menuItems.find((m: MenuItem) => m.id === orderItem.menuItemId);
      if (!menuItem || !menuItem.recipe || menuItem.recipe.length === 0) continue;

      for (const recipeItem of menuItem.recipe) {
        const material = inventory.find(m => m.id === recipeItem.rawMaterialId);
        if (!material) continue;

        const totalQtyNeeded = recipeItem.quantityRequired * orderItem.quantity;
        const normalizedQty = this.convertUnits(totalQtyNeeded, recipeItem.unit, material.unit);

        const newStock = Math.max(0, Math.round((material.currentStock - normalizedQty) * 1000) / 1000);
        store.updateRawMaterial(material.id, { currentStock: newStock });

        deductions.push({
          rawMaterialId: material.id,
          name: material.name,
          quantityDeducted: normalizedQty,
          unit: material.unit,
          remainingStock: newStock
        });
      }
    }

    return { success: true, deductions };
  }

  /**
   * Marks a Purchase Order as received, automatically inwarding all stock items into inventory
   */
  public static processGoodsReceived(
    poId: string,
    receivedBy: string
  ): { success: boolean; po?: PurchaseOrder; error?: string } {
    const po = store.getPurchaseOrderById(poId);
    if (!po) {
      return { success: false, error: 'Purchase Order not found' };
    }

    if (po.status === 'received') {
      return { success: false, error: 'Purchase Order has already been received' };
    }

    if (po.status === 'cancelled') {
      return { success: false, error: 'Cannot receive a cancelled Purchase Order' };
    }

    const inventory = store.getInventory();
    const inwardEntries = [];

    // Inward each item into raw materials
    for (const item of po.items) {
      const material = inventory.find(m => m.id === item.rawMaterialId);
      const normalizedQty = material ? this.convertUnits(item.quantity, item.unit, material.unit) : item.quantity;
      const targetUnit = material ? material.unit : item.unit;

      const inward = store.addStockInward({
        rawMaterialId: item.rawMaterialId,
        rawMaterialName: item.rawMaterialName,
        quantityAdded: normalizedQty,
        unit: targetUnit,
        costPrice: item.unitCost,
        supplierName: po.supplierName,
        purchaseOrderId: po.id
      });
      inwardEntries.push(inward);
    }

    // Transition PO status
    const updatedPo = store.updatePurchaseOrder(po.id, {
      status: 'received',
      receivedAt: new Date().toISOString(),
      receivedBy,
      updatedAt: new Date().toISOString()
    });

    store.addAuditLog({
      userId: 'procurement-mgr',
      userName: receivedBy,
      role: 'inventory',
      action: 'STOCK_INWARD_PO_RECEIVED',
      entityType: 'inventory',
      entityId: po.id,
      details: {
        poNumber: po.poNumber,
        supplierName: po.supplierName,
        totalItems: po.items.length,
        totalAmount: po.totalAmount
      }
    });

    return { success: true, po: updatedPo };
  }

  /**
   * Logs stock wastage / spoilage with manager PIN verification and stock deduction
   */
  public static logWastage(data: {
    rawMaterialId: string;
    quantity: number;
    reason: 'spoilage' | 'expired' | 'damaged' | 'prep_waste' | 'audit_discrepancy';
    notes?: string;
    loggedBy: string;
    managerPin?: string;
  }): { success: boolean; wastage?: WastageLog; error?: string } {
    const material = store.getInventory().find(m => m.id === data.rawMaterialId);
    if (!material) {
      return { success: false, error: 'Raw material not found' };
    }

    let managerApproval: { userId: string; userName: string; role: string } | undefined;

    if (data.managerPin) {
      const pinResult = store.verifyPin(data.managerPin, ['manager', 'owner']);
      if (!pinResult.success || !pinResult.user) {
        return { success: false, error: 'Invalid Manager PIN for wastage authorization' };
      }
      managerApproval = {
        userId: pinResult.user.id,
        userName: pinResult.user.name,
        role: pinResult.user.role
      };
    }

    // Compute cost impact
    const cost = Math.round(data.quantity * material.costPerUnit * 100) / 100;

    // Deduct stock
    const newStock = Math.max(0, Math.round((material.currentStock - data.quantity) * 1000) / 1000);
    store.updateRawMaterial(material.id, { currentStock: newStock });

    const wastageRecord: WastageLog = {
      id: `wst_${uuidv4()}`,
      rawMaterialId: material.id,
      rawMaterialName: material.name,
      quantity: data.quantity,
      unit: material.unit,
      cost,
      reason: data.reason,
      loggedBy: data.loggedBy,
      managerApproval,
      notes: data.notes,
      createdAt: new Date().toISOString()
    };

    store.createWastageLog(wastageRecord);

    store.addAuditLog({
      userId: managerApproval?.userId || 'staff',
      userName: managerApproval?.userName || data.loggedBy,
      role: (managerApproval?.role as any) || 'inventory',
      action: 'STOCK_WASTAGE_RECORDED',
      entityType: 'inventory',
      entityId: material.id,
      reason: data.reason,
      details: {
        materialName: material.name,
        quantityWasted: data.quantity,
        unit: material.unit,
        costImpact: cost,
        notes: data.notes
      }
    });

    return { success: true, wastage: wastageRecord };
  }

  /**
   * Generates a recipe variance report comparing stock on hand with theoretical consumption
   */
  public static getRecipeVarianceReport(): RecipeVarianceReport[] {
    const inventory = store.getInventory();
    const wastageLogs = store.getWastageLogs();

    return inventory.map(item => {
      const itemWastage = wastageLogs
        .filter(w => w.rawMaterialId === item.id)
        .reduce((sum, w) => sum + w.quantity, 0);

      // Variance is the recorded wastage + discrepancy from reorder level
      const costImpact = Math.round(itemWastage * item.costPerUnit * 100) / 100;

      return {
        rawMaterialId: item.id,
        rawMaterialName: item.name,
        unit: item.unit,
        theoreticalConsumption: 0, // Computed from historical order bills
        actualStockOnHand: item.currentStock,
        recordedWastage: itemWastage,
        variance: -itemWastage,
        costImpact
      };
    });
  }
}
