import { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import type { ChargeFormPayload } from "@/hooks/useChargeManagerData";

interface ChargeCreateFormProps {
  isSubmitting: boolean;
  onCreate: (payload: ChargeFormPayload) => Promise<boolean>;
}

export function ChargeCreateForm({ isSubmitting, onCreate }: ChargeCreateFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const ok = await onCreate({ name: name.trim(), description: description.trim() });
    if (ok) {
      setName("");
      setDescription("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("charges.create.title")}</label>
      <div className="space-y-2">
        <Input
          label={t("charges.detail.chargeName.label")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("charges.create.name.placeholder")}
          disabled={isSubmitting}
        />
        <Input
          label={t("charges.detail.descriptionOptional.label")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
        <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()} className="w-full">
          {isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <PlusIcon /> <span className="ml-2">{t("charges.create.submit")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
