import { v4 as uuidv4 } from 'uuid';
import { store, DEFAULT_OUTLET_ID } from '../data/store';
import {
  Organization,
  Brand,
  Outlet,
  OutletMenuOverride,
  EffectiveMenuItem,
  InterStoreTransfer,
  TransferItem,
  TransferStatus,
  MaterialStockMatrixEntry,
  ConsolidatedHqReport
} from '../types';

export class MultiOutletService {
  // ==========================================
  // Organization & Brands
  // ==========================================
  static getOrganization(): Organization {
    return store.getOrganization();
  }

  static updateOrganization(update: Partial<Organization>): Organization {
    return store.updateOrganization(update);
  }

  static getBrands(): Brand[] {
    return store.getBrands();
  }

  // ==========================================
  // Outlets Directory
  // ==========================================
  static getOutlets(filter?: { active?: boolean; isFranchise?: boolean; city?: string }): Outlet[] {
    let outlets = store.getOutlets();
    if (filter) {
      if (filter.active !== undefined) {
        outlets = outlets.filter(o => o.active === filter.active);
      }
      if (filter.isFranchise !== undefined) {
        outlets = outlets.filter(o => o.isFranchise === filter.isFranchise);
      }
      if (filter.city) {
        outlets = outlets.filter(o => o.address.city.toLowerCase() === filter.city!.toLowerCase());
      }
    }
    return outlets;
  }

  static getOutletById(id: string): Outlet | undefined {
    return store.getOutletById(id);
  }

  static createOutlet(data: {
    code: string;
    name: string;
    tier: Outlet['tier'];
    isFranchise: boolean;
    franchiseOwnerName?: string;
    franchiseContactPhone?: string;
    franchiseRoyaltyPercent?: number;
    marketingLevyPercent?: number;
    gstin: string;
    fssaiNumber: string;
    phone: string;
    email: string;
    address: Outlet['address'];
    posTerminalCount?: number;
    openingTime?: string;
    closingTime?: string;
  }): Outlet {
    const org = store.getOrganization();
    const brands = store.getBrands();
    const brandId = brands[0]?.id || 'brand_tdg';

    return store.createOutlet({
      orgId: org.id,
      brandId,
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      tier: data.tier,
      isFranchise: data.isFranchise,
      franchiseOwnerName: data.franchiseOwnerName,
      franchiseContactPhone: data.franchiseContactPhone,
      franchiseRoyaltyPercent: data.isFranchise ? (data.franchiseRoyaltyPercent ?? org.defaultFranchiseRoyaltyPercent) : 0,
      marketingLevyPercent: data.isFranchise ? (data.marketingLevyPercent ?? org.defaultMarketingLevyPercent) : 0,
      gstin: data.gstin.trim(),
      fssaiNumber: data.fssaiNumber.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      address: data.address,
      posTerminalCount: data.posTerminalCount || 1,
      active: true,
      openingTime: data.openingTime || '09:00',
      closingTime: data.closingTime || '23:00'
    });
  }

  static updateOutlet(id: string, update: Partial<Outlet>): Outlet {
    const updated = store.updateOutlet(id, update);
    if (!updated) {
      throw new Error(`Outlet with ID '${id}' not found`);
    }
    return updated;
  }

  // ==========================================
  // Central Menu Master & Outlet Overrides
  // ==========================================
  static getEffectiveMenu(outletId: string): EffectiveMenuItem[] {
    const outlet = store.getOutletById(outletId);
    if (!outlet) {
      throw new Error(`Outlet '${outletId}' does not exist`);
    }
    return store.getEffectiveMenuForOutlet(outletId);
  }

  static getMenuOverrides(outletId?: string): OutletMenuOverride[] {
    return store.getOutletMenuOverrides(outletId);
  }

  static setMenuOverride(
    outletId: string,
    menuItemId: string,
    override: { priceOverride?: number; inStockOverride?: boolean; gstRateOverride?: number; isExcluded?: boolean; updatedBy?: string }
  ): OutletMenuOverride {
    const outlet = store.getOutletById(outletId);
    if (!outlet) {
      throw new Error(`Outlet '${outletId}' does not exist`);
    }
    const menuItem = store.getMenuItems().find(m => m.id === menuItemId);
    if (!menuItem) {
      throw new Error(`Menu item '${menuItemId}' does not exist in master catalog`);
    }
    return store.setOutletMenuOverride(outletId, menuItemId, override);
  }

  static removeMenuOverride(outletId: string, menuItemId: string): boolean {
    return store.removeOutletMenuOverride(outletId, menuItemId);
  }

  // ==========================================
  // Inter-Store Stock Transfers (IST)
  // ==========================================
  static getTransfers(filter?: { status?: TransferStatus; sourceOutletId?: string; destinationOutletId?: string }): InterStoreTransfer[] {
    return store.getStockTransfers(filter);
  }

  static getTransferById(id: string): InterStoreTransfer | undefined {
    return store.getStockTransferById(id);
  }

  static createTransfer(data: {
    sourceOutletId: string;
    destinationOutletId: string;
    items: { rawMaterialId: string; quantityRequested: number }[];
    notes?: string;
    requestedBy: { userId: string; userName: string; role: string };
  }): InterStoreTransfer {
    if (data.sourceOutletId === data.destinationOutletId) {
      throw new Error('Source and destination outlets cannot be identical for inter-store transfer');
    }

    const source = store.getOutletById(data.sourceOutletId);
    if (!source) throw new Error(`Source outlet '${data.sourceOutletId}' not found`);

    const destination = store.getOutletById(data.destinationOutletId);
    if (!destination) throw new Error(`Destination outlet '${data.destinationOutletId}' not found`);

    const transferItems: TransferItem[] = [];
    let subtotalCost = 0;

    const inventory = store.getInventory();

    for (const item of data.items) {
      const mat = inventory.find(m => m.id === item.rawMaterialId);
      if (!mat) {
        throw new Error(`Raw material '${item.rawMaterialId}' does not exist in inventory`);
      }
      const totalCost = Number((item.quantityRequested * mat.costPerUnit).toFixed(2));
      subtotalCost += totalCost;

      transferItems.push({
        rawMaterialId: mat.id,
        rawMaterialName: mat.name,
        unit: mat.unit,
        quantityRequested: Number(item.quantityRequested),
        unitCost: mat.costPerUnit,
        totalCost
      });
    }

    const transferNumber = `IST-${new Date().getFullYear()}-${String(store.getStockTransfers().length + 1).padStart(3, '0')}`;

    const newTransfer: InterStoreTransfer = {
      id: 'ist_' + uuidv4().slice(0, 8),
      transferNumber,
      sourceOutletId: source.id,
      sourceOutletName: source.name,
      destinationOutletId: destination.id,
      destinationOutletName: destination.name,
      status: 'requested',
      items: transferItems,
      subtotalCost: Number(subtotalCost.toFixed(2)),
      notes: data.notes,
      requestedBy: {
        ...data.requestedBy,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return store.createStockTransfer(newTransfer);
  }

  static approveTransfer(
    transferId: string,
    approvedBy: { userId: string; userName: string; role: string }
  ): InterStoreTransfer {
    const transfer = store.getStockTransferById(transferId);
    if (!transfer) throw new Error(`Transfer '${transferId}' not found`);
    if (transfer.status !== 'requested') {
      throw new Error(`Transfer ${transfer.transferNumber} is in '${transfer.status}' status (must be 'requested' to approve)`);
    }

    transfer.status = 'approved';
    transfer.approvedBy = {
      ...approvedBy,
      timestamp: new Date().toISOString()
    };
    transfer.updatedAt = new Date().toISOString();
    store.updateStockTransfer(transfer.id, transfer);
    return transfer;
  }

  static dispatchTransfer(
    transferId: string,
    dispatchedBy: { userId: string; userName: string; role: string },
    carrierDetails?: { carrierName?: string; trackingReference?: string; vehicleNumber?: string }
  ): InterStoreTransfer {
    const dispatched = store.dispatchStockTransfer(transferId, dispatchedBy, carrierDetails);
    if (!dispatched) {
      throw new Error(`Transfer '${transferId}' not found`);
    }
    return dispatched;
  }

  static receiveTransfer(
    transferId: string,
    receivedBy: { userId: string; userName: string; role: string },
    receivedItems?: { rawMaterialId: string; quantityReceived: number; varianceReason?: string }[]
  ): InterStoreTransfer {
    const received = store.receiveStockTransfer(transferId, receivedBy, receivedItems);
    if (!received) {
      throw new Error(`Transfer '${transferId}' not found`);
    }
    return received;
  }

  static cancelTransfer(
    transferId: string,
    cancelledBy: { userId: string; userName: string; role: string; reason: string }
  ): InterStoreTransfer {
    const cancelled = store.cancelStockTransfer(transferId, cancelledBy);
    if (!cancelled) {
      throw new Error(`Transfer '${transferId}' not found`);
    }
    return cancelled;
  }

  // ==========================================
  // System-Wide Inventory Matrix
  // ==========================================
  static getInventoryMatrix(): MaterialStockMatrixEntry[] {
    return store.getMaterialStockMatrix();
  }

  // ==========================================
  // Consolidated Headquarters Report & Royalties
  // ==========================================
  static getConsolidatedHqReport(period?: string): ConsolidatedHqReport {
    return store.getConsolidatedHqReport(period);
  }
}
