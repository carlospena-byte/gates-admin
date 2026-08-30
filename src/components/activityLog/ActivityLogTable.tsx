/**
 * Read-only, filterable view of audit_logs for one residential. Filters
 * (entity/action/actor/date range) run client-side over the already-loaded
 * page of logs; expanding a row shows the changed fields.
 */

import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import type { AuditAction, AuditLogWithActor } from "@/types/audit.types";

interface ActivityLogTableProps {
  logs: AuditLogWithActor[];
  isLoading: boolean;
}

const ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

const ACTION_BADGE_VARIANT: Record<AuditAction, "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at", "residential_id"]);

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function formatEntityName(tableName: string): string {
  return tableName
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

interface DetailRow {
  field: string;
  before?: string;
  after?: string;
}

function getDetailRows(log: AuditLogWithActor): DetailRow[] {
  if (log.action === "INSERT") {
    return Object.entries(log.new_data ?? {})
      .filter(([field]) => !HIDDEN_FIELDS.has(field))
      .map(([field, value]) => ({ field, after: formatValue(value) }));
  }

  if (log.action === "DELETE") {
    return Object.entries(log.old_data ?? {})
      .filter(([field]) => !HIDDEN_FIELDS.has(field))
      .map(([field, value]) => ({ field, before: formatValue(value) }));
  }

  const oldData = log.old_data ?? {};
  const newData = log.new_data ?? {};
  const fields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const rows: DetailRow[] = [];
  for (const field of fields) {
    if (HIDDEN_FIELDS.has(field)) continue;
    if (JSON.stringify(oldData[field]) === JSON.stringify(newData[field])) continue;
    rows.push({ field, before: formatValue(oldData[field]), after: formatValue(newData[field]) });
  }
  return rows;
}

export function ActivityLogTable({ logs, isLoading }: ActivityLogTableProps) {
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const entityOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.table_name))).sort(),
    [logs],
  );

  const actorOptions = useMemo(() => {
    const emails = new Set(logs.map((l) => l.profiles?.email ?? "System"));
    return Array.from(emails).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTime = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 : null;

    return logs.filter((log) => {
      if (entityFilter !== "all" && log.table_name !== entityFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (actorFilter !== "all" && (log.profiles?.email ?? "System") !== actorFilter) return false;

      const createdAt = new Date(log.created_at).getTime();
      if (fromTime !== null && createdAt < fromTime) return false;
      if (toTime !== null && createdAt >= toTime) return false;

      return true;
    });
  }, [logs, entityFilter, actionFilter, actorFilter, dateFrom, dateTo]);

  const {
    paginatedData: paginatedLogs,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    currentPage,
    setCurrentPage,
  } = usePaginatedSortedData({
    data: filteredLogs,
    defaultSortField: "created_at",
    defaultSortOrder: "desc",
    itemsPerPage: 15,
  });

  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger label="Entity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {entityOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {formatEntityName(name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger label="Action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="INSERT">Created</SelectItem>
            <SelectItem value="UPDATE">Updated</SelectItem>
            <SelectItem value="DELETE">Deleted</SelectItem>
          </SelectContent>
        </Select>

        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger label="User">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {actorOptions.map((email) => (
              <SelectItem key={email} value={email}>
                {email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : totalItems === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No activity matches these filters.</div>
      ) : (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead className="w-[160px]">When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const details = getDetailRows(log);
                  const isExpanded = expandedRows.has(log.id);
                  return (
                    <Fragment key={log.id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleExpanded(log.id)}
                            disabled={details.length === 0}
                          >
                            {details.length === 0 ? null : isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{log.profiles?.email ?? "System"}</TableCell>
                        <TableCell>
                          <Badge variant={ACTION_BADGE_VARIANT[log.action]}>{ACTION_LABELS[log.action]}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatEntityName(log.table_name)}</TableCell>
                      </TableRow>
                      {isExpanded ? (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/50 py-3">
                            <div className="px-4 space-y-1">
                              {details.map((row) => (
                                <div key={row.field} className="text-sm">
                                  <span className="font-medium">{row.field}:</span>{" "}
                                  {row.before !== undefined && row.after !== undefined ? (
                                    <span className="text-muted-foreground">
                                      {row.before} <span aria-hidden>→</span> {row.after}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">{row.before ?? row.after}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
