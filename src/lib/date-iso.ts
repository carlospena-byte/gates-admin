/** ISO calendar date, `yyyy-mm-dd`. Empty string means "no value". */
export type IsoDate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toIso(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIso(iso: IsoDate): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
