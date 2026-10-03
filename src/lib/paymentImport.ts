/**
 * CSV side of the bulk payment import: the template an admin downloads
 * (prefilled with the open installments) and the parser for the file they
 * upload back. Parsing only checks the *shape* of each cell; resolving the
 * installment, balance and duplicates is the server's job
 * (import_charge_payments), so the preview can't drift from what gets saved.
 */

import { downloadCsv, parseCsv } from "@/lib/csv";
import type {
  Installment,
  PaymentImportRow,
  PaymentImportRowResult,
  PaymentMethod,
} from "@/types/billing.types";

export const IMPORT_MAX_ROWS = 500;

export const TEMPLATE_HEADER = [
  "id_cuota",
  "unidad",
  "cargo",
  "periodo",
  "saldo",
  "monto",
  "fecha_pago",
  "metodo",
  "referencia",
  "notas",
] as const;

type Column = "id_cuota" | "unidad" | "cargo" | "periodo" | "monto" | "fecha_pago" | "metodo" | "referencia" | "notas";

const ALIASES: Record<string, Column> = {
  id_cuota: "id_cuota",
  id: "id_cuota",
  installment_id: "id_cuota",
  unidad: "unidad",
  unit: "unidad",
  cargo: "cargo",
  concepto: "cargo",
  charge: "cargo",
  periodo: "periodo",
  period: "periodo",
  monto: "monto",
  importe: "monto",
  amount: "monto",
  fecha_pago: "fecha_pago",
  fecha: "fecha_pago",
  paid_on: "fecha_pago",
  date: "fecha_pago",
  metodo: "metodo",
  metodo_de_pago: "metodo",
  method: "metodo",
  referencia: "referencia",
  reference: "referencia",
  notas: "notas",
  notes: "notas",
};

const METHODS: Record<string, PaymentMethod> = {
  efectivo: "cash",
  cash: "cash",
  transferencia: "transfer",
  transfer: "transfer",
  cheque: "check",
  check: "check",
  otro: "other",
  other: "other",
};

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/** "$1,234.50", "1.234,50" and "1234,5" all -> number; anything else -> NaN. */
function parseAmount(raw: string): number {
  let text = raw.replace(/[$\s]/g, "");
  if (!text) return NaN;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    text = text.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    text = /,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
  }
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

/** YYYY-MM-DD or DD/MM/YYYY -> YYYY-MM-DD; anything else -> null. */
function parseDate(raw: string): string | null {
  const text = raw.trim();
  let year: number;
  let month: number;
  let day: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text))) {
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** YYYY-MM, YYYY-MM-DD or MM/YYYY -> YYYY-MM; anything else -> null. */
function parsePeriod(raw: string): string | null {
  const text = raw.trim();
  let match = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(text);
  let year: string;
  let month: string;
  if (match) {
    [year, month] = [match[1], match[2]];
  } else if ((match = /^(\d{1,2})\/(\d{4})$/.exec(text))) {
    [month, year] = [match[1], match[2]];
  } else {
    return null;
  }
  const m = Number(month);
  return m >= 1 && m <= 12 ? `${year}-${String(m).padStart(2, "0")}` : null;
}

export interface ParsedPaymentImport {
  /** Rows whose cells are well-formed, ready for the server to resolve. */
  rows: PaymentImportRow[];
  /** Rows rejected here, shaped like server results so the UI lists both alike. */
  rejected: PaymentImportRowResult[];
  /** Set when the file can't be used at all. */
  fatal: "empty" | "no_columns" | "too_many_rows" | null;
}

export function parsePaymentImport(text: string): ParsedPaymentImport {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], rejected: [], fatal: "empty" };

  const columns = new Map<Column, number>();
  table[0].forEach((header, index) => {
    const column = ALIASES[normalizeHeader(header)];
    if (column && !columns.has(column)) columns.set(column, index);
  });
  const hasIdentity = columns.has("id_cuota") || (columns.has("unidad") && columns.has("cargo") && columns.has("periodo"));
  if (!hasIdentity) return { rows: [], rejected: [], fatal: "no_columns" };

  const body = table.slice(1);
  if (body.length > IMPORT_MAX_ROWS) return { rows: [], rejected: [], fatal: "too_many_rows" };

  const rows: PaymentImportRow[] = [];
  const rejected: PaymentImportRowResult[] = [];

  body.forEach((cells, index) => {
    // Spreadsheet row number: the header is row 1.
    const row = index + 2;
    const cell = (column: Column) => (columns.has(column) ? (cells[columns.get(column)!] ?? "").trim() : "");
    const reject = (error: PaymentImportRowResult["error"]) => rejected.push({ row, ok: false, error });

    const item: PaymentImportRow = { row };
    const installmentId = cell("id_cuota");
    if (installmentId) item.installment_id = installmentId;
    item.unit = cell("unidad") || undefined;
    item.charge = cell("cargo") || undefined;

    const periodRaw = cell("periodo");
    if (periodRaw) {
      const period = parsePeriod(periodRaw);
      if (!period) return reject("invalid_value");
      item.period = period;
    }
    if (!item.installment_id && !(item.unit && item.charge && item.period)) return reject("installment_not_found");

    const amountRaw = cell("monto");
    if (amountRaw) {
      const amount = parseAmount(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) return reject("invalid_amount");
      item.amount = amount;
    }

    const dateRaw = cell("fecha_pago");
    if (dateRaw) {
      const date = parseDate(dateRaw);
      if (!date) return reject("invalid_value");
      item.paid_on = date;
    }

    const methodRaw = cell("metodo");
    if (methodRaw) {
      const method = METHODS[normalizeHeader(methodRaw)];
      if (!method) return reject("invalid_method");
      item.method = method;
    }

    item.reference = cell("referencia") || undefined;
    item.notes = cell("notas") || undefined;
    rows.push(item);
  });

  return { rows, rejected, fatal: null };
}

/** Downloads the template, one prefilled row per installment still open. */
export function downloadPaymentTemplate(
  filename: string,
  installments: Installment[],
  unitLabel: (unitId: string, fallback: string) => string,
): void {
  const open = installments
    .filter((i) => i.status !== "cancelled" && i.balance > 0)
    .sort((a, b) => unitLabel(a.unit_id, a.unit_name).localeCompare(unitLabel(b.unit_id, b.unit_name)));

  downloadCsv(
    filename,
    [...TEMPLATE_HEADER],
    // monto blank pays the full balance; fecha_pago blank means today; metodo blank records none.
    open.map((i) => [i.id, i.unit_name, i.charge_name, i.period.slice(0, 7), i.balance, "", "", "", "", ""]),
  );
}
