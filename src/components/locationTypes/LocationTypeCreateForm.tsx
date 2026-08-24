import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";

interface LocationTypeCreateFormProps {
  isSubmitting: boolean;
  onCreate: (name: string, code: string) => Promise<boolean>;
}

export function LocationTypeCreateForm({ isSubmitting, onCreate }: LocationTypeCreateFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !code.trim()) return;
    const ok = await onCreate(name.trim(), code.trim());
    if (ok) {
      setName("");
      setCode("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Add New Location Type</label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name (e.g., Tower)"
          disabled={isSubmitting}
        />
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Code (e.g., TOWER)"
          disabled={isSubmitting}
        />
      </div>
      <Button onClick={handleCreate} disabled={isSubmitting || !name.trim() || !code.trim()} className="w-full">
        {isSubmitting ? (
          <Spinner size="sm" />
        ) : (
          <>
            <PlusIcon /> <span className="ml-2">Add Type</span>
          </>
        )}
      </Button>
    </div>
  );
}
