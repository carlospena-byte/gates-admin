/**
 * Visitor Service
 * Flat CRUD via createCrudService, same as unitResidentService/locationService.
 * The full residential-wide list is fetched once and split into
 * Today/Upcoming/Inside/History client-side (see useVisitorManagerData) —
 * same convention as every other "Manager" hook, no separate endpoint per
 * tab. selectClause joins the inviting profile's email for the "Invited By"
 * column, same shape as unitService's owner join.
 */

import { createCrudService } from "./createCrudService";
import type { CreateVisitorDto, UpdateVisitorDto, VisitorWithInviter } from "@/types/visitor.types";

export const visitorService = createCrudService<VisitorWithInviter, CreateVisitorDto, UpdateVisitorDto>(
  "visitors",
  {
    parentColumn: "residential_id",
    orderBy: "valid_from",
    selectClause: "*, profiles:invited_by(email)",
  },
);
