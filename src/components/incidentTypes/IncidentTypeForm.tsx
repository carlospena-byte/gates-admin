import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import { useI18n } from "@/i18n/useI18n";
import type { IncidentTypeAssignableRole } from "@/types/incidentType.types";

const ASSIGNABLE_ROLES: IncidentTypeAssignableRole[] = ["security", "member"];

interface IncidentTypeFormProps {
  isSubmitting: boolean;
  onCreate: (name: string, roles: IncidentTypeAssignableRole[]) => Promise<boolean>;
}

export function IncidentTypeForm({ isSubmitting, onCreate }: IncidentTypeFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<IncidentTypeAssignableRole[]>([]);

  const toggleRole = (role: IncidentTypeAssignableRole) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleCreate = async () => {
    if (!name.trim()) return;
    const ok = await onCreate(name.trim(), roles);
    if (ok) {
      setName("");
      setRoles([]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        {t("namedType.form.addNew", { entityLabel: t("incidentTypes.entityLabel") })}
      </label>
      <div className="flex gap-2">
        <Input
          label={t("incidentTypes.entityLabel")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("incidentTypes.placeholder")}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          disabled={isSubmitting}
        />
        <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? <Spinner size="sm" /> : <PlusIcon />}
        </Button>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t("incidentTypes.rolesLabel")}</span>
        <div className="flex flex-wrap gap-4">
          <span className="text-sm text-muted-foreground">
            {t("incidentTypes.role.owner")} / {t("incidentTypes.role.admin")} —{" "}
            {t("incidentTypes.role.alwaysIncluded")}
          </span>
          {ASSIGNABLE_ROLES.map((role) => (
            <Checkbox
              key={role}
              checked={roles.includes(role)}
              onCheckedChange={() => toggleRole(role)}
              disabled={isSubmitting}
              label={t(`incidentTypes.role.${role}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
