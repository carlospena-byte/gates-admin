/**
 * Announcement types. Same plain hand-written style as visitor.types.ts.
 */

export type AnnouncementAudience = "everyone" | "admins";
export type AnnouncementStatus = "draft" | "published";

export interface Announcement {
  id: string;
  residential_id: string;
  title: string;
  content: string | null;
  category: string | null;
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  publish_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementDto {
  residential_id: string;
  title: string;
  content?: string | null;
  category?: string | null;
  audience?: AnnouncementAudience;
  status?: AnnouncementStatus;
  publish_at?: string | null;
  created_by?: string | null;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string | null;
  category?: string | null;
  audience?: AnnouncementAudience;
  status?: AnnouncementStatus;
  publish_at?: string | null;
}

// Announcement joined with the author's email, same join-on-select shape
// as VisitorWithInviter.
export type AnnouncementWithAuthor = Announcement & {
  profiles: { email: string | null } | null;
};
