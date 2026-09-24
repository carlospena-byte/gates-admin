import { toast } from "sonner";

/**
 * Shows a "Delete X?" toast with Delete/Cancel actions instead of a native
 * confirm(). Was hand-copied into every Manager's handleDelete; onConfirm
 * runs only if the user picks "Delete". `description` overrides the default
 * generic warning — used e.g. to call out that deleting a resident with
 * active access will revoke it immediately.
 */
export function confirmDeleteToast(label: string, onConfirm: () => void | Promise<void>, description?: string) {
  const toastId = toast(`Delete "${label}"?`, {
    description: description ?? "This action cannot be undone.",
    duration: Infinity,
    action: {
      label: "Delete",
      onClick: async () => {
        toast.dismiss(toastId);
        await onConfirm();
      },
    },
    cancel: {
      label: "Cancel",
      onClick: () => {
        toast.dismiss(toastId);
      },
    },
  });
}
