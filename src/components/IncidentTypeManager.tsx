/**
 * Incident Type Manager
 * Settings panel for managing incident types and which extra roles
 * (security/member) can see and manage every incident of a type — owner/admin
 * always have full access and aren't configured here.
 */

import { IncidentTypeForm } from "@/components/incidentTypes/IncidentTypeForm";
import { IncidentTypeTable } from "@/components/incidentTypes/IncidentTypeTable";
import { useIncidentTypeManagerData } from "@/hooks/useIncidentTypeManagerData";

export function IncidentTypeSettingsPanel({ residentialId }: { residentialId: string }) {
  const { items, isLoading, isSubmitting, create, update, remove, toggleActive } = useIncidentTypeManagerData(
    residentialId,
    true,
  );

  return (
    <div className="space-y-4">
      <IncidentTypeForm isSubmitting={isSubmitting} onCreate={create} />

      <IncidentTypeTable
        items={items}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onUpdate={update}
        onDelete={remove}
        onToggleActive={toggleActive}
      />
    </div>
  );
}
