/**
 * Announcement Service
 * Flat CRUD via createCrudService, same composition as visitorService.ts.
 * selectClause joins the author's email.
 */

import { createCrudService } from "./createCrudService";
import type {
  AnnouncementWithAuthor,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "@/types/announcement.types";

export const announcementService = createCrudService<
  AnnouncementWithAuthor,
  CreateAnnouncementDto,
  UpdateAnnouncementDto
>("announcements", {
  parentColumn: "residential_id",
  orderBy: "created_at",
  selectClause: "*, profiles:created_by(email)",
});
