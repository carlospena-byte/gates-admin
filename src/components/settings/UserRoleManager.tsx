/**
 * Settings > Users panel — list members, change roles, remove, and add a
 * member by email (via the find_profile_id_by_email RPC). Same shape as
 * UnitTypeSettingsPanel: a plain container, no own Card (SettingsPage
 * already wraps sections in one).
 */

import { useEffect, useState } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconKey,
  IconPencil,
  IconRefresh,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import {
  guardService,
  residentialUserService,
  type ResidentialUserWithProfile,
} from "@/services";
import { isGuardEmail } from "@/lib/guardAccount";
import { requireSupabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import { useSession } from "@/state/useSession";
import type { ResidentialRole } from "@/types/database.types";

const generatePin = () =>
  String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(
    4,
    "0",
  );

const memberName = (m: ResidentialUserWithProfile) =>
  [m.profiles?.first_name, m.profiles?.last_name].filter(Boolean).join(" ");

const ALL_ROLES: ResidentialRole[] = ["owner", "admin", "security", "member"];
// Matches the "residential_users: admin manage limited" RLS policy exactly.
const ADMIN_ASSIGNABLE_ROLES: ResidentialRole[] = [
  "admin",
  "security",
  "member",
];

export function UserRoleSettingsPanel({
  residentialId,
  currentRole,
}: {
  residentialId: string;
  currentRole: ResidentialRole;
}) {
  const { t } = useI18n();
  const { session } = useSession();
  const currentUserId = session?.user.id;
  const [editing, setEditing] = useState<ResidentialUserWithProfile | null>(
    null,
  );
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPin, setEditPin] = useState("");
  const [members, setMembers] = useState<ResidentialUserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newRole, setNewRole] = useState<ResidentialRole>("admin");
  const [activeSheet, setActiveSheet] = useState<"member" | "guard" | null>(
    null,
  );

  const [guardFirstName, setGuardFirstName] = useState("");
  const [guardLastName, setGuardLastName] = useState("");
  const [guardUsername, setGuardUsername] = useState("");
  const [guardPin, setGuardPin] = useState("");
  const [residentialCode, setResidentialCode] = useState<string | null>(null);
  const [issuedPin, setIssuedPin] = useState<{
    name: string;
    username: string;
    code: string;
    pin: string;
  } | null>(null);
  const [pinCopied, setPinCopied] = useState(false);

  const assignableRoles =
    currentRole === "owner" ? ALL_ROLES : ADMIN_ASSIGNABLE_ROLES;
  // Security accounts are created with a username + PIN, so they get their own form.
  const emailRoles = assignableRoles.filter(
    (r) => r !== "security" && r !== "member",
  );
  const pinValid = /^\d{4}$/.test(guardPin);
  const editingIsGuard =
    isGuardEmail(editing?.profiles?.email) && editing?.role === "security";
  const editPinValid = editPin === "" || /^\d{4}$/.test(editPin);

  // Guards sign in with this code, so the admin needs to see it.
  useEffect(() => {
    let cancelled = false;
    void requireSupabase()
      .from("residentials")
      .select("code")
      .eq("id", residentialId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setResidentialCode(data?.code ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [residentialId]);

  const load = async () => {
    setIsLoading(true);
    const result =
      await residentialUserService.listByResidential(residentialId);
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
    if (!email.trim() || !firstName.trim() || !lastName.trim()) return;
    setIsSubmitting(true);

    const lookup = await residentialUserService.findUserIdByEmail(email.trim());
    if (!lookup.success) {
      setIsSubmitting(false);
      toast.error(lookup.error.message);
      return;
    }
    if (!lookup.data) {
      setIsSubmitting(false);
      toast.error(t("settings.users.noAccountFound"));
      return;
    }

    const result = await residentialUserService.add(
      residentialId,
      lookup.data,
      newRole,
    );
    if (!result.success) {
      setIsSubmitting(false);
      toast.error(result.error.message);
      return;
    }

    const nameResult = await residentialUserService.setName(
      residentialId,
      lookup.data,
      firstName.trim(),
      lastName.trim(),
    );
    setIsSubmitting(false);
    if (!nameResult.success) toast.error(nameResult.error.message);

    toast.success(t("settings.users.memberAdded"));
    setEmail("");
    setFirstName("");
    setLastName("");
    setActiveSheet(null);
    await load();
  };

  const handleCreateGuard = async () => {
    if (!guardFirstName.trim() || !guardLastName.trim() || !pinValid) return;
    setIsSubmitting(true);
    const result = await guardService.createGuard({
      residentialId,
      firstName: guardFirstName.trim(),
      lastName: guardLastName.trim(),
      username: guardUsername.trim() || undefined,
      pin: guardPin,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("settings.guards.created"));
    setIssuedPin({
      name: `${guardFirstName.trim()} ${guardLastName.trim()}`,
      username: result.data.username,
      code: result.data.code,
      pin: result.data.pin,
    });
    setPinCopied(false);
    setGuardFirstName("");
    setGuardLastName("");
    setGuardUsername("");
    setGuardPin("");
    setActiveSheet(null);
    await load();
  };

  const copyPin = async () => {
    if (!issuedPin) return;
    try {
      await navigator.clipboard.writeText(issuedPin.pin);
      setPinCopied(true);
    } catch {
      /* clipboard unavailable: the PIN is on screen to read out */
    }
  };

  const openEdit = (member: ResidentialUserWithProfile) => {
    setEditing(member);
    setEditFirst(member.profiles?.first_name ?? "");
    setEditLast(member.profiles?.last_name ?? "");
    setEditPhone(member.profiles?.phone ?? "");
    setEditPin("");
  };

  const handleSaveEdit = async () => {
    if (!editing || !editFirst.trim() || !editLast.trim() || !editPinValid)
      return;
    setIsSubmitting(true);
    const result = await residentialUserService.updateProfile(
      residentialId,
      editing.user_id,
      {
        firstName: editFirst.trim(),
        lastName: editLast.trim(),
        phone: editPhone.trim(),
      },
    );
    if (!result.success) {
      setIsSubmitting(false);
      toast.error(result.error.message);
      return;
    }
    if (editPin && editingIsGuard) {
      const pinResult = await guardService.resetPin(
        residentialId,
        editing.user_id,
        editPin,
      );
      if (!pinResult.success) {
        setIsSubmitting(false);
        toast.error(pinResult.error.message);
        return;
      }
    }
    setIsSubmitting(false);
    toast.success(t("settings.users.edit.saved"));
    setEditing(null);
    await load();
  };

  const handleToggleActive = async (userId: string, active: boolean) => {
    // Optimistic: flip the switch now, roll back if the RPC refuses.
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, is_active: active } : m)),
    );
    const result = await residentialUserService.setActive(
      residentialId,
      userId,
      active,
    );
    if (!result.success) {
      toast.error(result.error.message);
      await load();
      return;
    }
    toast.success(
      t(active ? "settings.users.activated" : "settings.users.deactivated"),
    );
  };

  const handleRoleChange = async (userId: string, role: ResidentialRole) => {
    setIsSubmitting(true);
    const result = await residentialUserService.updateRole(
      residentialId,
      userId,
      role,
    );
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    await load();
  };

  const handleRemove = (userId: string, memberEmail: string) => {
    confirmDeleteToast(memberEmail, async () => {
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
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              {t("settings.users.add")}
              <IconChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {emailRoles.map((r) => (
              <DropdownMenuItem
                key={r}
                onClick={() => {
                  setNewRole(r);
                  setActiveSheet("member");
                }}
              >
                {t(`role.${r}` as MessageKey)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setActiveSheet("guard")}>
              {t("role.security")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Sheet
        open={activeSheet === "member"}
        onOpenChange={(open) => setActiveSheet(open ? "member" : null)}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{t("settings.users.addMember.title")}</SheetTitle>
            <SheetDescription>
              {t("settings.users.addMember.description")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <Select
              value={newRole}
              onValueChange={(v) => setNewRole(v as ResidentialRole)}
              disabled={isSubmitting}
            >
              <SelectTrigger label={t("common.role")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`role.${r}` as MessageKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              label={t("common.firstName")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label={t("common.lastName")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label={t("settings.users.addByEmail.label")}
              type="email"
              placeholder={t("settings.users.addByEmail.placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setActiveSheet(null)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                isSubmitting ||
                !email.trim() ||
                !firstName.trim() ||
                !lastName.trim()
              }
            >
              {isSubmitting ? <Spinner size="sm" /> : t("common.add")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={activeSheet === "guard"}
        onOpenChange={(open) => setActiveSheet(open ? "guard" : null)}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{t("settings.guards.sheetTitle")}</SheetTitle>
            <SheetDescription>
              {t("settings.guards.description")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <Input
              label={t("common.firstName")}
              value={guardFirstName}
              onChange={(e) => setGuardFirstName(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label={t("common.lastName")}
              value={guardLastName}
              onChange={(e) => setGuardLastName(e.target.value)}
              disabled={isSubmitting}
            />
            {residentialCode && (
              <div className="rounded-lg border bg-gates-subtle p-3">
                <p className="text-xs text-muted-foreground">
                  {t("settings.guards.code")}
                </p>
                <p className="font-mono text-lg font-semibold">
                  {residentialCode}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.guards.codeHint")}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Input
                label={t("settings.guards.usernameLabel")}
                value={guardUsername}
                onChange={(e) => setGuardUsername(e.target.value)}
                autoComplete="off"
                disabled={isSubmitting}
              />
              <p className="px-1 text-xs text-muted-foreground">
                {t("settings.guards.usernameHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    label={t("settings.guards.pinLabel")}
                    value={guardPin}
                    onChange={(e) =>
                      setGuardPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isSubmitting}
                  onClick={() => setGuardPin(generatePin())}
                  title={t("settings.guards.generatePin")}
                  aria-label={t("settings.guards.generatePin")}
                >
                  <IconRefresh className="h-4 w-4" />
                </Button>
              </div>
              <p
                className={`px-1 text-xs ${pinValid || guardPin === "" ? "text-muted-foreground" : "text-destructive"}`}
              >
                {pinValid || guardPin === ""
                  ? t("settings.guards.pinHint")
                  : t("settings.guards.pinInvalid")}
              </p>
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setActiveSheet(null)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateGuard}
              disabled={
                isSubmitting ||
                !guardFirstName.trim() ||
                !guardLastName.trim() ||
                !pinValid
              }
            >
              {isSubmitting ? (
                <Spinner size="sm" />
              ) : (
                t("settings.guards.create")
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div>
        {issuedPin && (
          <div className="rounded-lg border border-dashed bg-gates-subtle p-4">
            <p className="text-sm font-semibold">
              {t("settings.guards.pinTitle", { name: issuedPin.name })}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {issuedPin.code && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.guards.code")}
                  </p>
                  <p className="font-mono text-lg font-semibold">
                    {issuedPin.code}
                  </p>
                </div>
              )}
              {issuedPin.username && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.guards.username")}
                  </p>
                  <p className="font-mono text-lg font-semibold">
                    {issuedPin.username}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">PIN</p>
                <p className="font-mono text-lg font-semibold tracking-[0.3em]">
                  {issuedPin.pin}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={copyPin}>
                {pinCopied ? (
                  <IconCheck className="mr-1 h-4 w-4" />
                ) : (
                  <IconCopy className="mr-1 h-4 w-4" />
                )}
                {pinCopied
                  ? t("settings.guards.copied")
                  : t("settings.guards.copy")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIssuedPin(null)}
              >
                {t("settings.guards.dismiss")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("settings.guards.pinWarning")}
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : members.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {t("settings.users.empty")}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead>{t("common.role")}</TableHead>
                <TableHead>{t("settings.users.active")}</TableHead>
                <TableHead className="text-right">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const memberRole = member.role as ResidentialRole;
                const canEditThisRole =
                  currentRole === "owner" ||
                  ADMIN_ASSIGNABLE_ROLES.includes(memberRole);
                return (
                  <TableRow
                    key={member.user_id}
                    className={member.is_active ? undefined : "opacity-60"}
                  >
                    <TableCell className="text-sm font-medium">
                      {memberName(member) || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isGuardEmail(member.profiles?.email) ? (
                        <span className="font-mono">
                          {member.profiles?.username}
                        </span>
                      ) : (
                        (member.profiles?.email ??
                        t("settings.users.unknownEmail"))
                      )}
                    </TableCell>
                    <TableCell>
                      {canEditThisRole ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            handleRoleChange(
                              member.user_id,
                              v as ResidentialRole,
                            )
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((r) => (
                              <SelectItem
                                key={r}
                                value={r}
                                className="capitalize"
                              >
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
                    <TableCell>
                      <Switch
                        checked={member.is_active}
                        onCheckedChange={(checked) =>
                          handleToggleActive(member.user_id, checked)
                        }
                        disabled={
                          isSubmitting ||
                          !canEditThisRole ||
                          memberRole === "owner" ||
                          member.user_id === currentUserId
                        }
                        aria-label={t("settings.users.active")}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        {/* Reset PIN sits first; non-guards keep an empty slot so Edit/Delete line up in every row. */}
                        {isGuardEmail(member.profiles?.email) &&
                        memberRole === "security" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSubmitting}
                            onClick={() => openEdit(member)}
                            title={t("settings.guards.resetPin")}
                            aria-label={t("settings.guards.resetPin")}
                          >
                            <IconKey className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span
                            className="inline-block h-9 w-10"
                            aria-hidden="true"
                          />
                        )}
                        {canEditThisRole && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSubmitting}
                            onClick={() => openEdit(member)}
                            title={t("settings.users.edit.action")}
                            aria-label={t("settings.users.edit.action")}
                          >
                            <IconPencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canEditThisRole && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSubmitting}
                            onClick={() =>
                              handleRemove(
                                member.user_id,
                                (isGuardEmail(member.profiles?.email)
                                  ? member.profiles?.username
                                  : member.profiles?.email) ??
                                  (memberName(member) ||
                                    t("settings.users.unnamedMember")),
                              )
                            }
                          >
                            <DeleteIcon />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{t("settings.users.edit.title")}</SheetTitle>
            <SheetDescription>
              {editing
                ? t(`role.${editing.role as ResidentialRole}` as MessageKey)
                : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <Input
              label={t("common.firstName")}
              value={editFirst}
              onChange={(e) => setEditFirst(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label={t("common.lastName")}
              value={editLast}
              onChange={(e) => setEditLast(e.target.value)}
              disabled={isSubmitting}
            />
            {editingIsGuard ? (
              <Input
                label={t("settings.guards.username")}
                value={editing?.profiles?.username ?? ""}
                disabled
                readOnly
              />
            ) : (
              <Input
                label={t("common.email")}
                value={editing?.profiles?.email ?? ""}
                disabled
                readOnly
              />
            )}
            <Input
              label={t("common.phone")}
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              disabled={isSubmitting}
            />
            {editingIsGuard && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      label={t("settings.guards.newPinLabel")}
                      value={editPin}
                      onChange={(e) =>
                        setEditPin(
                          e.target.value.replace(/\D/g, "").slice(0, 4),
                        )
                      }
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="off"
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isSubmitting}
                    onClick={() => setEditPin(generatePin())}
                    title={t("settings.guards.generatePin")}
                    aria-label={t("settings.guards.generatePin")}
                  >
                    <IconRefresh className="h-4 w-4" />
                  </Button>
                </div>
                <p
                  className={`px-1 text-xs ${editPinValid ? "text-muted-foreground" : "text-destructive"}`}
                >
                  {editPinValid
                    ? t("settings.guards.newPinHint")
                    : t("settings.guards.pinInvalid")}
                </p>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                isSubmitting ||
                !editFirst.trim() ||
                !editLast.trim() ||
                !editPinValid
              }
            >
              {isSubmitting ? (
                <Spinner size="sm" />
              ) : (
                t("settings.users.edit.save")
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
