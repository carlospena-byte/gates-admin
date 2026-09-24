import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";

interface NamedTypeFormProps {
  entityLabel: string;
  placeholder: string;
  isSubmitting: boolean;
  onCreate: (name: string) => Promise<boolean>;
}

export function NamedTypeForm({ entityLabel, placeholder, isSubmitting, onCreate }: NamedTypeFormProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const ok = await onCreate(name.trim());
    if (ok) {
      setName("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-auto">
        {t("namedType.form.add", { entityLabel })}
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        label={entityLabel}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") setIsOpen(false);
        }}
        autoFocus
        disabled={isSubmitting}
      />
      <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()}>
        {isSubmitting ? <Spinner size="sm" /> : t("common.save")}
      </Button>
      <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
        {t("common.cancel")}
      </Button>
    </div>
  );
}
