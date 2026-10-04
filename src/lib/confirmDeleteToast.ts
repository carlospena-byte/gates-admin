import { toast } from "sonner";
import { translate } from "@/i18n/translate";

/**
 * Shows a "Delete X?" toast with Delete/Cancel actions instead of a native
 * confirm(). Was hand-copied into every Manager's handleDelete; onConfirm
 * runs only if the user picks "Delete". `description` overrides the default
 * generic warning — used e.g. to call out that deleting a resident with
 * active access will revoke it immediately.
 */
export function confirmDeleteToast(label: string, onConfirm: () => void | Promise<void>, description?: string) {
  const toastId = toast(translate("toast.confirmDelete.title", { label }), {
    description: description ?? translate("toast.confirmDelete.description"),
    duration: Infinity,
    action: {
      label: translate("common.delete"),
      onClick: async () => {
        toast.dismiss(toastId);
        await onConfirm();
      },
    },
    cancel: {
      label: translate("common.cancel"),
      onClick: () => {
        toast.dismiss(toastId);
      },
    },
  });
}
