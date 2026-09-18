// Export all services from a single entry point
export * from "./api.service";
export * from "./auth.service";
export * from "./amenities.service";
export { unitTypeService } from "./unitTypeService";
export { locationService } from "./locationService";
export { locationTypeService } from "./locationTypeService";
export { addonTypeService } from "./addonTypeService";
export { addonService } from "./addonService";
export { addonItemService } from "./addonItemService";
export { unitAddonService } from "./unitAddonService";
export { unitResidentService } from "./unitResidentService";
export { unitRentalService } from "./unitRentalService";
export { unitRentalPaymentService } from "./unitRentalPaymentService";
export { chargeService } from "./chargeService";
export { unitChargeService } from "./unitChargeService";
export { auditLogService } from "./auditLogService";
export { vehicleService } from "./vehicleService";
export { visitorService } from "./visitorService";
export { accessLogService } from "./accessLogService";
export { incidentService } from "./incidentService";
export { incidentAttachmentService } from "./incidentAttachmentService";
export { amenityBookingService } from "./amenityBookingService";

// Re-export commonly used types
export type { TablesUpdate, TablesInsert } from "../types/database.types";
