import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";

interface LocationTypeCreateFormProps {
  isSubmitting: boolean;
  onCreate: (name: string, code: string, level: number) => Promise<boolean>;
}

export function LocationTypeCreateForm({ isSubmitting, onCreate }: LocationTypeCreateFormProps) {
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
      <label className="text-sm font-medium">Add New Location Type</label>
      <div className="grid grid-cols-3 gap-2">
        <Input
          label="Display Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Edificio"
          disabled={isSubmitting}
        />
        <Input
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g., EDIFICIO"
          disabled={isSubmitting}
        />
        <Input
          label="Level"
          type="number"
          min={1}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Level 1 = top of the hierarchy (e.g. Edificio, Bloque). Level 2 goes under a level 1
        location (e.g. Piso, Polígono), and so on.
      </p>
      <Button
        onClick={handleCreate}
        disabled={isSubmitting || !name.trim() || !code.trim() || !isLevelValid}
        className="w-full"
      >
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
