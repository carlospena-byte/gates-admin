import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import { useI18n } from "@/i18n/useI18n";

interface LocationTypeCreateFormProps {
  isSubmitting: boolean;
  onCreate: (name: string, code: string, level: number) => Promise<boolean>;
}

export function LocationTypeCreateForm({ isSubmitting, onCreate }: LocationTypeCreateFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [level, setLevel] = useState("1");

  const parsedLevel = Number.parseInt(level, 10);
  const isLevelValid = Number.isInteger(parsedLevel) && parsedLevel >= 1;

  const handleCreate = async () => {
    if (!name.trim() || !code.trim() || !isLevelValid) return;
    const ok = await onCreate(name.trim(), code.trim(), parsedLevel);
    if (ok) {
      setName("");
      setCode("");
      setLevel("1");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("locationType.create.label")}</label>
      <div className="grid grid-cols-3 gap-2">
        <Input
          label={t("locationType.create.nameLabel")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("locationType.create.namePlaceholder")}
          disabled={isSubmitting}
        />
        <Input
          label={t("locationType.code")}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("locationType.create.codePlaceholder")}
          disabled={isSubmitting}
        />
        <Input
          label={t("locationType.level")}
          type="number"
          min={1}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("locationType.create.levelHelp")}</p>
      <Button
        onClick={handleCreate}
        disabled={isSubmitting || !name.trim() || !code.trim() || !isLevelValid}
        className="w-full"
      >
        {isSubmitting ? (
          <Spinner size="sm" />
        ) : (
          <>
            <PlusIcon /> <span className="ml-2">{t("locationType.create.submit")}</span>
          </>
        )}
      </Button>
    </div>
  );
}
