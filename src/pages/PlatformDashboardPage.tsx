import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/LoadingStates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navbar } from "@/components/Navbar";
import { authService, residentialService, type ResidentialWithOwner } from "@/services";
import { useSession } from "@/state/useSession";

export function PlatformDashboardPage() {
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [residentials, setResidentials] = useState<ResidentialWithOwner[]>([]);
  const [selectedResidentialId, setSelectedResidentialId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    residentialService
      .list()
      .then((result) => {
        if (!isMounted) return;
        if (result.success) {
          setResidentials(result.data);
          if (!selectedResidentialId && result.data.length) {
            setSelectedResidentialId(result.data[0].id);
          }
          return;
        }
        setError(result.error.message);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedResidentialId]);

  return (
    <div className="min-h-screen">
      <Navbar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />
      <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Admin</CardTitle>
            <CardDescription>Manage residential communities</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {isLoading ? (
              <TableSkeleton rows={4} columns={3} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="w-[120px] text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residentials.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.profiles?.email ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedResidentialId(r.id)}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!residentials.length ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        No residentials found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedResidentialId ? (
          <Card>
            <CardHeader>
              <CardTitle>Selected Residential</CardTitle>
              <CardDescription>{selectedResidentialId}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
