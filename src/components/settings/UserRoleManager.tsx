/**
 * Settings > Users panel — list members, change roles, remove, and add a
 * member by email (via the find_profile_id_by_email RPC). Same shape as
 * UnitTypeSettingsPanel: a plain container, no own Card (SettingsPage
 * already wraps sections in one).
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { residentialUserService, type ResidentialUserWithProfile } from "@/services";
import type { ResidentialRole } from "@/types/database.types";

const ALL_ROLES: ResidentialRole[] = ["owner", "admin", "security", "member"];
// Matches the "residential_users: admin manage limited" RLS policy exactly.
const ADMIN_ASSIGNABLE_ROLES: ResidentialRole[] = ["security", "member"];

export function UserRoleSettingsPanel({
  residentialId,
  currentRole,
}: {
  residentialId: string;
  currentRole: ResidentialRole;
}) {
  const [members, setMembers] = useState<ResidentialUserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<ResidentialRole>("member");

  const assignableRoles = currentRole === "owner" ? ALL_ROLES : ADMIN_ASSIGNABLE_ROLES;

  const load = async () => {
    setIsLoading(true);
    const result = await residentialUserService.listByResidential(residentialId);
    if (result.success) {
      setMembers(result.data);
    } else {
      toast.error(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentialId]);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);

    const lookup = await residentialUserService.findUserIdByEmail(email.trim());
    if (!lookup.success) {
      setIsSubmitting(false);
      toast.error(lookup.error.message);
      return;
    }
    if (!lookup.data) {
      setIsSubmitting(false);
      toast.error("No account found for that email — they need to sign in at least once first.");
      return;
    }

    const result = await residentialUserService.add(residentialId, lookup.data, newRole);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Member added");
    setEmail("");
    await load();
  };

  const handleRoleChange = async (userId: string, role: ResidentialRole) => {
    setIsSubmitting(true);
    const result = await residentialUserService.updateRole(residentialId, userId, role);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    await load();
  };

  const handleRemove = (userId: string, email: string) => {
    confirmDeleteToast(email, async () => {
      const result = await residentialUserService.remove(residentialId, userId);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await load();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <Input
          label="Add member by email"
          type="email"
          placeholder="someone@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="flex-1"
        />
        <Select value={newRole} onValueChange={(v) => setNewRole(v as ResidentialRole)} disabled={isSubmitting}>
          <SelectTrigger label="Role" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assignableRoles.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={isSubmitting || !email.trim()}>
          {isSubmitting ? <Spinner size="sm" /> : "Add"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : members.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No members yet.</div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const memberRole = member.role as ResidentialRole;
                const canEditThisRole = currentRole === "owner" || ADMIN_ASSIGNABLE_ROLES.includes(memberRole);
                return (
                  <TableRow key={member.user_id}>
                    <TableCell className="text-sm">{member.profiles?.email ?? "Unknown"}</TableCell>
                    <TableCell>
                      {canEditThisRole ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member.user_id, v as ResidentialRole)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((r) => (
                              <SelectItem key={r} value={r} className="capitalize">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditThisRole && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSubmitting}
                          onClick={() => handleRemove(member.user_id, member.profiles?.email ?? "this member")}
                        >
                          <DeleteIcon />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
