import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Lock, Mail, UserPlus } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

const ROLE_PRESETS = {
  admin: {
    role: "admin",
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
    role: "direction",
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
  staff: {
    role: "staff",
    is_admin: false,
    can_view_properties: true,
    can_create_property: true,
    can_edit_property: true,
    can_delete_property: false,
    can_create_analysis: true,
    can_edit_analysis: true,
    can_delete_analysis: false,
    can_view_comparator: true,
    can_view_presentation: true,
    can_comment: true,
  },
  membre: {
    role: "membre",
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
  admin: "Admin",
  direction: "Direction",
  staff: "Staff",
  membre: "Membre",
};

export default function Register() {
  const urlParams = new URLSearchParams(window.location.search);
  const rawRole = urlParams.get("role");
  const inviteRole = (rawRole === "admin" || rawRole === "super_admin") ? null : rawRole;
  const inviteEmail = urlParams.get("email") || "";

  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [assignedRole, setAssignedRole] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const result = await base44.auth.register({ email, password });

      if (inviteRole && ROLE_PRESETS[inviteRole]) {
        const userId = result?.user?.id;
        if (userId) {
          const preset = ROLE_PRESETS[inviteRole];
          const { error: permError } = await supabase
            .from("user_permissions")
            .upsert({ user_id: userId, ...preset }, { onConflict: "user_id" });
          if (permError) {
            console.error("[Register] role assignment error:", permError);
          } else {
            setAssignedRole(ROLE_LABELS[inviteRole] || inviteRole);
          }
        }
      }

      setAccountCreated(true);
    } catch (err) {
      setError(err.message || "La création du compte a échoué.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  if (accountCreated) {
    return (
      <AuthLayout
        icon={CheckCircle2}
        title="Compte créé"
        subtitle={assignedRole ? "Votre accès est déjà configuré" : "Votre accès doit être validé par un administrateur"}
      >
        <div className="rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          {assignedRole ? (
            <>Compte créé avec succès. Le rôle <strong>{assignedRole}</strong> vous a été attribué automatiquement. Vous pouvez dès à présent vous connecter.</>
          ) : (
            "Compte créé avec succès. Veuillez contacter votre administrateur afin qu'il vous attribue un rôle, puis rechargez la page."
          )}
        </div>

        <Button className="w-full h-12 font-medium" asChild>
          <Link to="/login">Aller à la connexion</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title={inviteEmail ? "Vous êtes invité" : "Créer un compte"}
      subtitle={inviteEmail ? "Choisissez votre mot de passe pour finaliser votre inscription" : "Créez votre accès SIPA Analyzer"}
      footer={
        <>
          Vous avez déjà un compte ?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      {inviteRole && ROLE_LABELS[inviteRole] && (
        <div className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-center">
          Rôle attribué : <strong>{ROLE_LABELS[inviteRole]}</strong>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continuer avec Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">ou</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus={!inviteEmail}
              placeholder="vous@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="pl-10 h-12"
              disabled={!!inviteEmail}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus={!!inviteEmail}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création du compte...
            </>
          ) : (
            "Créer le compte"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
