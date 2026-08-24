import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";

interface NamedTypeFormProps {
  entityLabel: string;
  placeholder: string;
  isSubmitting: boolean;
  onCreate: (name: string) => Promise<boolean>;
}

export function NamedTypeForm({ entityLabel, placeholder, isSubmitting, onCreate }: NamedTypeFormProps) {
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const ok = await onCreate(name.trim());
    if (ok) setName("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Add New {entityLabel}</label>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          disabled={isSubmitting}
        />
        <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? <Spinner size="sm" /> : <PlusIcon />}
        </Button>
      </div>
    </div>
  );
}
