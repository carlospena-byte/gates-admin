/**
 * "Needs attention" stat row for the residential dashboard — replaces
 * vanity counts with operational numbers, per the audit. Plain Card tiles,
 * no new primitive.
 */

import { Card, CardContent } from "@/components/ui/card";
import type { OperationalMetrics } from "@/services";

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export function OperationalMetricsRow({ metrics }: { metrics: OperationalMetrics | null }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      <StatTile label="Active Properties" value={metrics.activeProperties} />
      <StatTile label="Active Residents" value={metrics.activeResidents} />
      <StatTile label="Visitors Today" value={metrics.visitorsToday} />
      <StatTile label="Currently Inside" value={metrics.visitorsInside} />
      <StatTile label="Reservations Today" value={metrics.reservationsToday} />
      <StatTile label="Open Incidents" value={metrics.openIncidents} />
      <StatTile label="Payments to Validate" value={metrics.paymentsPendingValidation} />
      <StatTile label="Pending Amount" value={`$${metrics.pendingAmount.toFixed(2)}`} />
    </div>
  );
}
