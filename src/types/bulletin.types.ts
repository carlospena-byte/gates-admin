/**
 * Bulletin (boletín) types. Plain hand-written style, same as announcement.types.ts.
 */

export type BulletinStatus = "draft" | "published";
export type BulletinAttachmentKind = "image" | "pdf";

export interface Bulletin {
  id: string;
  residential_id: string;
  title: string;
  /** HTML from the rich text editor. */
  description: string | null;
  status: BulletinStatus;
  published_at: string | null;
  notified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulletinAttachment {
  id: string;
  bulletin_id: string;
  residential_id: string;
  kind: BulletinAttachmentKind;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  sort_order: number;
  created_at: string;
}

// Bulletin joined with its attachments, for the list (counts) and the edit form.
export type BulletinWithAttachments = Bulletin & {
  bulletin_attachments: BulletinAttachment[];
  profiles: { email: string | null } | null;
};

export interface BulletinNotifyResult {
  sent: number;
  failed: number;
  alreadyNotified?: boolean;
}
