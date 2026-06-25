import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import {
  Activity,
  FileDown,
  LogIn,
  LogOut,
  Shield,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  UserPlus,
  Trash2,
  Link2,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { listAuditLogs } from '@/utils/auditLogs';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select as SelectRole, SelectContent as SelectRoleContent, SelectItem as SelectRoleItem, SelectTrigger as SelectRoleTrigger, SelectValue as SelectRoleValue } from '@/components/ui/select';
import moment from 'moment';

const LOG_LABELS = {
  login: { label: 'Connexion', icon: LogIn, className: 'text-emerald-400 bg-emerald-500/10' },
  logout: { label: 'Déconnexion', icon: LogOut, className: 'text-muted-foreground bg-secondary' },
  export_pdf: { label: 'Export PDF', icon: FileDown, className: 'text-amber-400 bg-amber-500/10' },
};

function AuditLogsPanel() {
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => listAuditLogs(120),
  });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Logs de connexion et d'export</h2>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
          Rafraîchir
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Aucun log enregistré pour le moment.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {logs.map((log) => {
            const cfg = LOG_LABELS[log.event_type] || {
              label: log.event_type || 'Événement',
              icon: Activity,
              className: 'text-primary bg-primary/10',
            };
            const Icon = cfg.icon;

            return (
              <div key={log.id || `${log.event_type}-${log.created_at}`} className="px-5 py-3 flex items-start gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.className}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{cfg.label}</p>
                    <span className="text-xs text-muted-foreground">
                      {moment(log.created_at).format('DD MMM YYYY, HH:mm')}
                    </span>
                    {log.storage === 'local' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        local
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.actor_name || log.actor_email || 'Utilisateur inconnu'}
                    {log.target_label ? ` · ${log.target_label}` : ''}
                  </p>

                  {log.metadata?.filename && (
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono truncate">
                      {log.metadata.filename}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ROLE_PRESETS = {
  en_attente: {
    role: 'en_attente',
    is_admin: false,
    can_view_properties: false,
    can_create_property: false,
    can_edit_property: false,
    can_delete_property: false,
    can_create_analysis: false,
    can_edit_analysis: false,
    can_delete_analysis: false,
    can_view_comparator: false,
    can_view_presentation: false,
    can_comment: false,
  },

  admin: {
    role: 'admin',
    is_admin: true,
    can_view_properties: true,
    can_create_property: true,
    can_edit_property: true,
    can_delete_property: true,
    can_create_analysis: true,
    can_edit_analysis: true,
    can_delete_analysis: true,
    can_view_comparator: true,
    can_view_presentation: true,
    can_comment: true,
  },

  direction: {
    role: 'direction',
    is_admin: false,
    can_view_properties: true,
    can_create_property: true,
    can_edit_property: true,
    can_delete_property: true,
    can_create_analysis: true,
    can_edit_analysis: true,
    can_delete_analysis: true,
    can_view_comparator: true,
    can_view_presentation: true,
    can_comment: true,
  },

  membre: {
    role: 'membre',
    is_admin: false,
    can_view_properties: true,
    can_create_property: false,
    can_edit_property: false,
    can_delete_property: false,
    can_create_analysis: false,
    can_edit_analysis: false,
    can_delete_analysis: false,
    can_view_comparator: true,
    can_view_presentation: true,
    can_comment: false,
  },
};

const ROLE_LABELS = {
  en_attente: 'En attente',
  admin: 'Admin',
  direction: 'Direction',
  membre: 'Membre',
};

const PERMISSION_LABELS = [
  { key: 'can_view_properties', label: 'Voir les biens' },
  { key: 'can_create_property', label: 'Créer des biens' },
  { key: 'can_edit_property', label: 'Modifier des biens' },
  { key: 'can_delete_property', label: 'Supprimer des biens' },
  { key: 'can_create_analysis', label: 'Créer des analyses' },
  { key: 'can_edit_analysis', label: 'Modifier des analyses' },
  { key: 'can_delete_analysis', label: 'Supprimer des analyses' },
  { key: 'can_view_comparator', label: 'Accéder au comparateur' },
  { key: 'can_view_presentation', label: 'Accéder à la présentation' },
  { key: 'can_comment', label: 'Commenter' },
];

function UserPermissionRow({ user, existingPerm, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState(() => {
    const role = normalizeRole(existingPerm?.role || (existingPerm?.is_admin ? 'admin' : 'en_attente'));
    const preset = ROLE_PRESETS[role] || ROLE_PRESETS.en_attente;

    return existingPerm
      ? { ...preset, ...existingPerm, role }
      : { ...ROLE_PRESETS.en_attente };
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const applyRole = (role) => {
    setPerms({ ...ROLE_PRESETS[role] });
  };

  const toggle = (key) => {
    setPerms((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(user.id, perms);
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement des permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDelete(user.id);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression de l'utilisateur");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {user.full_name?.[0] || user.email?.[0] || '?'}
          </div>

          <div className="text-left">
            <p className="font-medium text-sm">
              {user.full_name || 'Sans nom'}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.email || 'Email inconnu'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {ROLE_LABELS[perms.role] || 'Aucun rôle'}
          </span>

          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
            <Label className="text-sm">Rôle</Label>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <Button
                  key={role}
                  type="button"
                  variant={perms.role === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyRole(role)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Admin peut gérer les rôles et permissions. Direction a toutes les features sauf l’administration. Membre est en lecture seule.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERMISSION_LABELS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
              >
                <Label
                  className="text-sm cursor-pointer"
                  htmlFor={`${user.id}-${key}`}
                >
                  {label}
                </Label>

                <Switch
                  id={`${user.id}-${key}`}
                  checked={!!perms[key]}
                  onCheckedChange={() => toggle(key)}
                  disabled={perms.role === 'admin' || perms.role === 'en_attente'}
                />
              </div>
            ))}
          </div>

          {perms.role === 'admin' && (
            <p className="text-xs text-muted-foreground">
              Cet utilisateur est admin : toutes les permissions sont activées automatiquement.
            </p>
          )}

          <div className="flex justify-between gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Supprimer
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !perms.role}
                className="gap-2"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteRole, setInviteRole] = useState('membre');
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [inviteLinkEmail, setInviteLinkEmail] = useState('');

  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!isAdmin,
  });

  const {
    data: allPerms = [],
    isLoading: permissionsListLoading,
    error: permissionsError,
  } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: () => base44.entities.UserPermission.list(),
    enabled: !!isAdmin,
  });

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const otherUsers = users.filter((listedUser) => listedUser.id !== user?.id);

  const handleSavePermissions = async (userId, newPerms) => {
    const role = newPerms.role || 'en_attente';
    const preset = ROLE_PRESETS[role] || ROLE_PRESETS.en_attente;

    const payload = {
      ...preset,
      ...newPerms,
      user_id: userId,
      role,
      is_admin: role === 'admin',
    };

    if (role === 'admin') {
      Object.assign(payload, ROLE_PRESETS.admin);
    }

    const { error } = await supabase
      .from('user_permissions')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour des permissions');
      return;
    }

    await queryClient.invalidateQueries();
    await queryClient.refetchQueries();

    toast.success('Permissions mises à jour');
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm(
      "Supprimer définitivement cet utilisateur ?\n\nLe compte Supabase, le profil et les permissions seront supprimés."
    );

    if (!confirmed) return;

    const { error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: userId },
    });

    if (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression de l'utilisateur");
      return;
    }

    await queryClient.invalidateQueries();
    await queryClient.refetchQueries();

    toast.success("Utilisateur supprimé définitivement");
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;

    try {
      setInviting(true);
      await base44.users.inviteUser(inviteEmail, 'user');
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail('');
      await queryClient.invalidateQueries({ queryKey: ['all-users'] });
    } catch (error) {
      console.error(error);
      toast.error(
        "L'invitation automatique n'est pas encore configurée avec Supabase. Demande à l'utilisateur de créer son compte, puis il apparaîtra ici."
      );
    } finally {
      setInviting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    const params = new URLSearchParams({ role: inviteRole, email: inviteLinkEmail });
    const link = `${window.location.origin}/register?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(link);
      setInviteLinkCopied(true);
      toast.success(`Lien copié : ${link}`);
      setTimeout(() => setInviteLinkCopied(false), 3000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  if (usersLoading || permissionsListLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (usersError || permissionsError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-card rounded-xl border border-border p-6">
          <h1 className="font-display text-xl font-bold mb-2">
            Erreur Administration
          </h1>
          <pre className="text-xs bg-secondary/40 p-4 rounded-lg overflow-auto">
            {JSON.stringify(usersError || permissionsError, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />

        <div>
          <h1 className="font-display text-2xl font-bold">
            Administration
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les rôles et les permissions des utilisateurs.
          </p>
        </div>
      </div>

      <AuditLogsPanel />

      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">
            Ajouter un futur utilisateur
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Pour l'instant, l'invitation automatique Supabase n'est pas encore configurée.
          Le plus simple est de demander à l'utilisateur de créer son compte.
          Il apparaîtra ensuite ici, et tu pourras lui attribuer son rôle.
        </p>

        <div className="flex gap-3">
          <Input
            placeholder="adresse@email.com"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            className="bg-background border-border"
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleInvite();
            }}
          />

          <Button
            onClick={handleInvite}
            disabled={!inviteEmail || inviting}
            className="gap-2 shrink-0"
          >
            {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
            Inviter
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">
            Lien d'invitation avec rôle pré-défini
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Générez un lien d'inscription qui attribue automatiquement un rôle à l'utilisateur.
          L'utilisateur n'aura qu'à choisir son mot de passe.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Email de l'utilisateur</Label>
            <Input
              placeholder="email@example.com"
              value={inviteLinkEmail}
              onChange={(e) => setInviteLinkEmail(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Rôle à attribuer</Label>
            <SelectRole value={inviteRole} onValueChange={setInviteRole}>
              <SelectRoleTrigger className="bg-background border-border">
                <SelectRoleValue />
              </SelectRoleTrigger>
              <SelectRoleContent>
                {Object.entries(ROLE_LABELS).filter(([r]) => r !== 'en_attente').map(([role, label]) => (
                  <SelectRoleItem key={role} value={role}>{label}</SelectRoleItem>
                ))}
              </SelectRoleContent>
            </SelectRole>
          </div>

          <Button
            onClick={handleCopyInviteLink}
            disabled={!inviteLinkEmail}
            className="gap-2 shrink-0"
          >
            <Copy className="h-4 w-4" />
            Copier le lien
          </Button>
        </div>

        {inviteLinkCopied && (
          <p className="text-xs text-emerald-400">Lien copié dans le presse-papier</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />

          <h2 className="font-semibold text-sm">
            {otherUsers.length} utilisateur{otherUsers.length > 1 ? 's' : ''}
          </h2>
        </div>

        {otherUsers.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Aucun autre utilisateur pour l’instant.
            </p>
          </div>
        ) : (
          otherUsers.map((listedUser) => (
            <UserPermissionRow
              key={listedUser.id}
              user={listedUser}
              existingPerm={allPerms.find(
                (permission) => permission.user_id === listedUser.id
              )}
              onSave={handleSavePermissions}
              onDelete={handleDeleteUser}
            />
          ))
        )}
      </div>
    </div>
  );
}

function normalizeRole(role) {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');

  if (!normalized || normalized === 'aucun' || normalized === 'none' || normalized === 'null') {
    return 'en_attente';
  }

  if (normalized === 'pending') {
    return 'en_attente';
  }

  return normalized;
}
