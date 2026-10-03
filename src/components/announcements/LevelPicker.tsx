/**
 * Multi-select over the location hierarchy (levels), built to stay usable
 * with hundreds of nodes (e.g. 20 buildings x 20 floors):
 *  - selected levels show as removable chips with their full path;
 *  - the tree starts collapsed and expands per branch;
 *  - typing searches every level at once and lists matches with their path;
 *  - picking a level covers everything under it, so descendants show as
 *    "included" instead of being selectable again.
 * Each row shows how many units it reaches.
 */

import { useMemo, useState } from "react";
import { IconChevronDown, IconChevronRight, IconX } from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { normalizeForSearch } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

export interface LevelOption {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
}

interface LevelPickerProps {
  levels: LevelOption[];
  /** location_id of every unit in the residential (null when unplaced). */
  unitLocationIds: (string | null)[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

const MAX_SEARCH_RESULTS = 50;

export function LevelPicker({
  levels,
  unitLocationIds,
  selected,
  onChange,
  disabled,
}: LevelPickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { byId, childrenOf, roots, paths, unitCount } = useMemo(() => {
    const byId = new Map(levels.map((l) => [l.id, l]));
    const childrenOf = new Map<string, LevelOption[]>();
    const roots: LevelOption[] = [];
    for (const l of levels) {
      if (l.parentId && byId.has(l.parentId)) {
        childrenOf.set(l.parentId, [...(childrenOf.get(l.parentId) ?? []), l]);
      } else {
        roots.push(l);
      }
    }
    const sortByName = (a: LevelOption, b: LevelOption) =>
      a.name.localeCompare(b.name, undefined, { numeric: true });
    roots.sort(sortByName);
    for (const list of childrenOf.values()) list.sort(sortByName);

    const paths = new Map<string, string>();
    const pathOf = (l: LevelOption): string => {
      const cached = paths.get(l.id);
      if (cached) return cached;
      const parent = l.parentId ? byId.get(l.parentId) : undefined;
      const value = parent ? `${pathOf(parent)} › ${l.name}` : l.name;
      paths.set(l.id, value);
      return value;
    };
    levels.forEach(pathOf);

    const direct = new Map<string, number>();
    for (const id of unitLocationIds)
      if (id) direct.set(id, (direct.get(id) ?? 0) + 1);
    const unitCount = new Map<string, number>();
    const countOf = (id: string): number => {
      const cached = unitCount.get(id);
      if (cached !== undefined) return cached;
      const total = (childrenOf.get(id) ?? []).reduce(
        (sum, c) => sum + countOf(c.id),
        direct.get(id) ?? 0,
      );
      unitCount.set(id, total);
      return total;
    };
    levels.forEach((l) => countOf(l.id));

    return { byId, childrenOf, roots, paths, unitCount };
  }, [levels, unitLocationIds]);

  // Levels reached only because an ancestor is selected.
  const covered = useMemo(() => {
    const set = new Set<string>();
    const walk = (id: string) => {
      for (const c of childrenOf.get(id) ?? []) {
        set.add(c.id);
        walk(c.id);
      }
    };
    selected.forEach(walk);
    return set;
  }, [selected, childrenOf]);

  const descendantsOf = (id: string): Set<string> => {
    const out = new Set<string>();
    const walk = (current: string) => {
      for (const c of childrenOf.get(current) ?? []) {
        out.add(c.id);
        walk(c.id);
      }
    };
    walk(id);
    return out;
  };

  const toggle = (id: string, checked: boolean) => {
    if (!checked) return onChange(selected.filter((s) => s !== id));
    // A parent absorbs any of its descendants already picked.
    const absorbed = descendantsOf(id);
    onChange([...selected.filter((s) => !absorbed.has(s)), id]);
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const unitCountLabel = (count: number) =>
    t(
      count === 1
        ? "announcements.form.levelUnit"
        : "announcements.form.levelUnits",
      { count },
    );

  const row = (l: LevelOption, opts: { depth: number; showPath: boolean }) => {
    const isCovered = covered.has(l.id);
    const kids = childrenOf.get(l.id) ?? [];
    const isOpen = expanded.has(l.id);
    return (
      <div key={l.id}>
        <div
          className="flex items-center gap-1"
          style={{ paddingLeft: opts.depth * 20 }}
        >
          {opts.showPath ? (
            <span className="size-5 shrink-0" />
          ) : kids.length > 0 ? (
            <button
              type="button"
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              onClick={() => toggleExpanded(l.id)}
              aria-label={l.name}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <IconChevronDown className="size-4" />
              ) : (
                <IconChevronRight className="size-4" />
              )}
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          <Checkbox
            checked={selected.includes(l.id) || isCovered}
            onCheckedChange={(checked) => toggle(l.id, checked)}
            disabled={disabled || isCovered}
            label={
              <span className="flex flex-col leading-tight">
                <span>
                  {l.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {l.type}
                  </span>
                </span>
                {opts.showPath && l.parentId && (
                  <span className="text-xs text-muted-foreground">
                    {paths.get(l.parentId)}
                  </span>
                )}
              </span>
            }
          />
          <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">
            {isCovered
              ? t("announcements.form.levelIncluded")
              : unitCountLabel(unitCount.get(l.id) ?? 0)}
          </span>
        </div>
        {!opts.showPath &&
          isOpen &&
          kids.map((c) => row(c, { depth: opts.depth + 1, showPath: false }))}
      </div>
    );
  };

  const needle = normalizeForSearch(query);
  const matches = needle
    ? levels.filter((l) =>
        normalizeForSearch(`${paths.get(l.id) ?? l.name} ${l.type}`).includes(
          needle,
        ),
      )
    : [];

  return (
    <div className="space-y-2">
      <Input
        placeholder={t("announcements.form.levelSearch")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
            >
              {paths.get(id) ?? byId.get(id)?.name}
              <button
                type="button"
                className="rounded-full hover:bg-muted"
                onClick={() => toggle(id, false)}
                disabled={disabled}
                aria-label={t("common.delete")}
              >
                <IconX className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
        {levels.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("announcements.form.noLevels")}
          </p>
        )}
        {needle
          ? matches
              .slice(0, MAX_SEARCH_RESULTS)
              .map((l) => row(l, { depth: 0, showPath: true }))
          : roots.map((l) => row(l, { depth: 0, showPath: false }))}
        {needle && matches.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("announcements.form.levelNoMatches")}
          </p>
        )}
        {needle && matches.length > MAX_SEARCH_RESULTS && (
          <p className="text-xs text-muted-foreground">
            {t("announcements.form.levelRefine")}
          </p>
        )}
      </div>
    </div>
  );
}
