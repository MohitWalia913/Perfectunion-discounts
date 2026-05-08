import { format } from "date-fns"
import type { BulkDiscountRow } from "@/lib/bulk-discount-io"

/** Treez org bulk-create payloads (same shape as bulk-upload page). */
export function buildTreezPayloadsFromBulkRows(validRows: BulkDiscountRow[]): Record<string, unknown>[] {
  return validRows.map((row) => ({
    title: row.title,
    amount: row.amount,
    method: "PERCENT",
    isActive: true,
    isManual: false,
    isCart: false,
    isStackable: false,
    isAdjustment: false,
    requireReason: false,
    requirePin: false,
    requireCoupon: false,
    storeCustomizations: row.selectedStores.map((s) => ({ entityId: s.id })),
    collections: row.selectedCollections.map((c) => ({ productCollectionId: c.id })),
    schedule: {
      startDate: format(row.startDate!, "yyyy-MM-dd"),
      startTime: "00:00:00",
      endDate: row.endDate
        ? format(row.endDate, "yyyy-MM-dd")
        : format(row.startDate!, "yyyy-MM-dd"),
      endTime: "23:59:59",
      allDay: true,
      spansMultipleDays: false,
      repeatType: row.repeat ? row.repeatType : "DO_NOT",
    },
    conditions: {
      customerCapEnabled: false,
      customerLimitEnabled: false,
      purchaseMinimumEnabled: false,
      customerEventEnabled: false,
      itemLimitEnabled: false,
      customerLicenseTypeEnabled: false,
      packageAgeEnabled: false,
      fulfillmentTypesEnabled: false,
    },
  }))
}
