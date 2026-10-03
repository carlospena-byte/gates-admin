/**
 * Records many payments from a CSV file, each with its own amount, date,
 * method and reference. Three steps: pick the file (with a prefilled
 * template to start from), review a server-side validation of every row,
 * then import the valid ones. Invalid rows never block the rest; they are
 * listed so they can be fixed and re-uploaded.
 */

import { IconDownload, IconUpload } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import { downloadCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/utils";
import { parsePaymentImport } from "@/lib/paymentImport";
import type {
  PaymentImportResponse,
  PaymentImportRow,
  PaymentImportRowResult,
} from "@/types/billing.types";

type Step = "upload" | "preview" | "done";

interface ImportPaymentsDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadTemplate: () => void;
  /** Validates (dryRun) or records the rows; null when the call itself failed. */
  onImport: (rows: PaymentImportRow[], dryRun: boolean) => Promise<PaymentImportResponse | null>;
}

export function ImportPaymentsDialog({
  open,
  isSubmitting,
  onOpenChange,
  onDownloadTemplate,
  onImport,
}: ImportPaymentsDialogProps) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileError, setFileError] = useState<string | null>(null);
  const [rows, setRows] = useState<PaymentImportRow[]>([]);
  const [results, setResults] = useState<PaymentImportRowResult[]>([]);
  const [imported, setImported] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep("upload");
    setFileError(null);
    setRows([]);
    setResults([]);
    setImported(0);
  }, [open]);

  const rowByNumber = useMemo(() => new Map(rows.map((r) => [r.row, r])), [rows]);
  const valid = results.filter((r) => r.ok);
  const invalid = results.filter((r) => !r.ok);
  const validTotal = valid.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const describeRow = (result: PaymentImportRowResult) => {
    const source = rowByNumber.get(result.row);
    const label = [source?.unit, source?.charge, source?.period].filter(Boolean).join(" · ");
    return label || source?.installment_id || "—";
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);

    const parsed = parsePaymentImport(await file.text());
    if (parsed.fatal) {
      setFileError(t(`billing.import.fatal.${parsed.fatal}`));
      return;
    }

    let serverResults: PaymentImportRowResult[] = [];
    if (parsed.rows.length) {
      const response = await onImport(parsed.rows, true);
      if (!response) return;
      serverResults = response.results;
    }
    setRows(parsed.rows);
    setResults([...parsed.rejected, ...serverResults].sort((a, b) => a.row - b.row));
    setStep("preview");
  };

  const handleConfirm = async () => {
    const validRows = valid.map((r) => rowByNumber.get(r.row)).filter((r): r is PaymentImportRow => !!r);
    const response = await onImport(validRows, false);
    if (!response) return;
    // The real run re-validates, so rows can still fail (e.g. someone else
    // paid the installment in between); report what actually happened.
    setImported(response.results.filter((r) => r.ok).length);
    setResults((prev) => [
      ...prev.filter((r) => !r.ok),
      ...response.results.filter((r) => !r.ok),
    ]);
    setStep("done");
  };

  const handleDownloadErrors = () => {
    downloadCsv(
      `pagos-con-errores-${new Date().toISOString().slice(0, 10)}.csv`,
      [t("billing.import.col.row"), t("billing.import.col.detail"), t("billing.import.col.status")],
      invalid.map((r) => [r.row, describeRow(r), t(`billing.import.error.${r.error ?? "invalid_value"}`)]),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("billing.import.title")}</DialogTitle>
          <DialogDescription>
            {step === "upload" && t("billing.import.description")}
            {step === "preview" &&
              t("billing.import.summary", { valid: valid.length, invalid: invalid.length, total: results.length })}
            {step === "done" && t("billing.import.done", { count: imported })}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="grid gap-4">
            <div className="rounded-gates-lg border p-4">
              <p className="text-sm font-medium">{t("billing.import.step1")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("billing.import.templateHint")}</p>
              <Button variant="outline" className="mt-3" onClick={onDownloadTemplate}>
                <IconDownload className="mr-1 h-4 w-4" /> {t("billing.import.template")}
              </Button>
            </div>
            <div className="rounded-gates-lg border p-4">
              <p className="text-sm font-medium">{t("billing.import.step2")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("billing.import.fileHint")}</p>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button className="mt-3" onClick={() => fileInput.current?.click()} disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="sm" /> : <IconUpload className="mr-1 h-4 w-4" />}
                {t("billing.import.chooseFile")}
              </Button>
              {fileError && <p className="mt-2 text-sm text-destructive">{fileError}</p>}
            </div>
          </div>
        )}

        {(step === "preview" || step === "done") && (
          <div className="max-h-[50vh] overflow-auto rounded-gates-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("billing.import.col.row")}</TableHead>
                  <TableHead>{t("billing.import.col.detail")}</TableHead>
                  <TableHead className="text-right">{t("billing.import.col.amount")}</TableHead>
                  <TableHead>{t("billing.import.col.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(step === "done" ? invalid : results).map((result) => (
                  <TableRow key={result.row}>
                    <TableCell>{result.row}</TableCell>
                    <TableCell>{describeRow(result)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(result.ok ? result.amount : rowByNumber.get(result.row)?.amount)}
                    </TableCell>
                    <TableCell>
                      {result.ok ? (
                        <Badge variant="success">{t("billing.import.ready")}</Badge>
                      ) : (
                        <Badge variant="destructive">{t(`billing.import.error.${result.error ?? "invalid_value"}`)}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {step === "done" && invalid.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {t("billing.import.noErrors")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")} disabled={isSubmitting}>
                {t("common.back")}
              </Button>
              <Button onClick={handleConfirm} disabled={isSubmitting || valid.length === 0}>
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  t("billing.import.confirm", { count: valid.length, total: formatCurrency(validTotal) })
                )}
              </Button>
            </>
          )}
          {step === "done" && (
            <>
              {invalid.length > 0 && (
                <Button variant="outline" onClick={handleDownloadErrors}>
                  <IconDownload className="mr-1 h-4 w-4" /> {t("billing.import.downloadErrors")}
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
