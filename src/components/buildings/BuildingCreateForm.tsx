import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";

interface BuildingCreateFormProps {
  isSubmitting: boolean;
  onCreate: (name: string) => Promise<boolean>;
}

export function BuildingCreateForm({ isSubmitting, onCreate }: BuildingCreateFormProps) {
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const ok = await onCreate(name.trim());
    if (ok) setName("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Add New Building</label>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Building A, Block 1..."
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
