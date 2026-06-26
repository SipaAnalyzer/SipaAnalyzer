import { supabase } from "./supabaseClient";
import { recordAuditLog } from "@/utils/auditLogs";

/**
 * Petit adaptateur temporaire :
 * ton ancien code continue d'appeler base44.entities.Property.list(),
 * mais derrière, ça utilise Supabase.
 */

const TABLES = {
  Property: "properties",
  Analysis: "analysis",
  Comment: "comments",
  Favorite: "favorites",
  UserPermission: "user_permissions",
};

const mapSort = (sort) => {
  if (!sort) {
    return { column: "created_at", ascending: false };
  }

  if (sort.startsWith("-")) {
    const rawColumn = sort.slice(1);
    const column = rawColumn === "created_date" ? "created_at" : rawColumn;

    return {
      column,
      ascending: false,
    };
  }

  return {
    column: sort === "created_date" ? "created_at" : sort,
    ascending: true,
  };
};

const normalizeRecord = (record) => {
  if (!record) return record;

  return {
    ...record,
    created_date: record.created_date || record.created_at,
  };
};

const normalizeRecords = (records) => {
  if (!Array.isArray(records)) return [];
  return records.map(normalizeRecord);
};

const cleanDataBeforeSave = (data = {}) => {
  const cleaned = { ...data };

  // Base44 utilisait souvent created_date.
  // Supabase utilise created_at.
  delete cleaned.created_date;

  // On évite de modifier les champs générés automatiquement.
  delete cleaned.created_at;

  return cleaned;
};

const withAuditFallback = async (operation, payload) => {
  const result = await operation(payload);
  const missingColumn = /column .* does not exist|Could not find .* column|schema cache/i.test(
    result.error?.message || ""
  );

  if (!missingColumn) {
    return result;
  }

  const fallback = { ...payload };
  delete fallback.created_by_id;
  delete fallback.updated_by_id;
  delete fallback.updated_at;

  return operation(fallback);
};

const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};

const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
};

const AUDIT_PREFIX = "__audit__";

const AUDIT_FIELDS = {
  properties: {
    nom_bien: "Nom du bien",
    adresse: "Adresse",
    ville: "Ville",
    canton: "Canton",
    pays: "Pays",
    annee_construction: "Année de construction",
    surface: "Surface",
    nombre_logements: "Nombre de logements",
    lien_annonce: "Lien annonce",
    latitude: "Latitude",
    longitude: "Longitude",
    statut: "Statut",
  },
  analysis: {
    prix_bien: "Prix du bien",
    versement_initial: "Versement initial",
    amortissement_5_ans: "Amortissement sur 5 ans",
    honoraires_sipa: "Honoraires Sipa Immobilier SA",
    frais_dossier_bancaire: "Frais de dossier bancaire",
    fonds_propres: "Fonds propres",
    hypotheque: "Hypothèque",
    revenus_locatifs: "Revenus locatifs",
    charges_operationnelles: "Charges opérationnelles",
    interets_hypothecaires: "Intérêt hypothécaire",
    gestion: "Honoraires de gestion",
    impot: "Impôt",
    banque_a_taux_hypothecaire: "Banque A - taux",
    banque_a_amortissement_annuel: "Banque A - amortissement",
    banque_a_evaluation: "Banque A - évaluation",
    banque_b_taux_hypothecaire: "Banque B - taux",
    banque_b_amortissement_annuel: "Banque B - amortissement",
    banque_b_evaluation: "Banque B - évaluation",
    statut: "Statut",
  },
};

const normalizeAuditValue = (value) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") return Number(value.toFixed(6));
  return String(value);
};

const buildAuditChanges = (table, before = {}, after = {}, submitted = {}) => {
  const fields = AUDIT_FIELDS[table];
  if (!fields) return [];

  return Object.entries(fields)
    .filter(([key]) => Object.prototype.hasOwnProperty.call(submitted, key))
    .map(([key, label]) => ({
      field: key,
      label,
      before: before?.[key] ?? "",
      after: after?.[key] ?? "",
    }))
    .filter(
      (change) =>
        normalizeAuditValue(change.before) !== normalizeAuditValue(change.after)
    );
};

const recordAuditChanges = async ({ table, id, before, after, submitted }) => {
  const changes = buildAuditChanges(table, before, after, submitted);
  if (changes.length === 0) return;

  const propertyId =
    table === TABLES.Property ? id : after?.property_id || before?.property_id;

  if (!propertyId) return;

  const user = await getCurrentUser();
  const payload = {
    type: table === TABLES.Property ? "property_update" : "analysis_update",
    entity_table: table,
    entity_id: id,
    actor_id: user?.id || null,
    actor_name: user?.user_metadata?.full_name || user?.email || "Utilisateur",
    changes,
  };

  const commentPayload = {
    property_id: propertyId,
    commentaire: `${AUDIT_PREFIX}${JSON.stringify(payload)}`,
    author_name: "SIPA Analyzer",
    created_by_id: user?.id,
  };

  const result = await supabase.from(TABLES.Comment).insert(commentPayload);
  if (!result.error) return;

  const fallback = { ...commentPayload };
  delete fallback.created_by_id;
  await supabase.from(TABLES.Comment).insert(fallback);
};

const createEntity = (table) => ({
  async list(sort = "-created_date", limit = 100) {
    const { column, ascending } = mapSort(sort);

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(column, { ascending })
      .limit(limit);

    if (error) {
      console.error(`[Supabase] list error on ${table}:`, error);
      throw error;
    }

    return normalizeRecords(data);
  },

  async get(id) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`[Supabase] get error on ${table}:`, error);
      throw error;
    }

    return normalizeRecord(data);
  },

  async filter(filters = {}, sort = "-created_date", limit = 100) {
    const { column, ascending } = mapSort(sort);

    let query = supabase
      .from(table)
      .select("*")
      .order(column, { ascending })
      .limit(limit);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;

    if (error) {
      console.error(`[Supabase] filter error on ${table}:`, error);
      throw error;
    }

    return normalizeRecords(data);
  },

  async create(data) {
    const payload = cleanDataBeforeSave(data);
    const userId = await getCurrentUserId();

    if (userId && payload.created_by_id === undefined) {
      payload.created_by_id = userId;
    }

    const { data: created, error } = await withAuditFallback(
      (nextPayload) =>
        supabase
          .from(table)
          .insert(nextPayload)
          .select()
          .single(),
      payload
    );

    if (error) {
      console.error(`[Supabase] create error on ${table}:`, error);
      throw error;
    }

    return normalizeRecord(created);
  },

  async update(id, data) {
    const payload = cleanDataBeforeSave(data);
    const userId = await getCurrentUserId();
    const shouldAudit = table === TABLES.Property || table === TABLES.Analysis;
    const { data: beforeUpdate } = shouldAudit
      ? await supabase.from(table).select("*").eq("id", id).single()
      : { data: null };

    if (userId && payload.updated_by_id === undefined) {
      payload.updated_by_id = userId;
    }

    if (payload.updated_at === undefined) {
      payload.updated_at = new Date().toISOString();
    }

    const { data: updated, error } = await withAuditFallback(
      (nextPayload) =>
        supabase
          .from(table)
          .update(nextPayload)
          .eq("id", id)
          .select()
          .single(),
      payload
    );

    if (error) {
      console.error(`[Supabase] update error on ${table}:`, error);
      throw error;
    }

    if (shouldAudit) {
      await recordAuditChanges({
        table,
        id,
        before: beforeUpdate,
        after: updated,
        submitted: payload,
      });
    }

    return normalizeRecord(updated);
  },

  async delete(id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[Supabase] delete error on ${table}:`, error);
      throw error;
    }

    return true;
  },
});

export const base44 = {
  entities: {
    Property: createEntity(TABLES.Property),
    Analysis: createEntity(TABLES.Analysis),
    Comment: createEntity(TABLES.Comment),
    Favorite: createEntity(TABLES.Favorite),
    UserPermission: createEntity(TABLES.UserPermission),

    User: {
      async list() {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[Supabase] user list error:", error);
          throw error;
        }

        return normalizeRecords(data);
      },
    },
  },

  auth: {
    async me() {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("[Supabase] auth me error:", error);
        throw error;
      }

      return data.user;
    },

    async loginViaEmailPassword(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[Supabase] login error:", error);
        throw error;
      }

      await recordAuditLog({
        eventType: "login",
        targetType: "auth",
        targetLabel: email,
        metadata: { provider: "email" },
      });

      return data;
    },

    async register({ email, password }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("[Supabase] register error:", error);
        throw error;
      }

      return data;
    },

    async verifyOtp({ email, otpCode }) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "signup",
      });

      if (error) {
        console.error("[Supabase] verify OTP error:", error);
        throw error;
      }

      return {
        access_token: data.session?.access_token,
        session: data.session,
        user: data.user,
      };
    },

    setToken() {
      // Avec Supabase, la session est gérée automatiquement.
      return true;
    },

    async resendOtp(email) {
      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        console.error("[Supabase] resend OTP error:", error);
        throw error;
      }

      return data;
    },

    async logout(redirectUrl = "/login") {
      await recordAuditLog({
        eventType: "logout",
        targetType: "auth",
        metadata: { redirectUrl },
      });

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("[Supabase] logout error:", error);
        throw error;
      }

      window.location.href = redirectUrl || "/login";
    },

    redirectToLogin(redirectUrl = "/login") {
      window.location.href = redirectUrl || "/login";
    },

    async loginWithProvider(provider, redirectPath = "/") {
      const redirectTo = `${window.location.origin}${redirectPath}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error("[Supabase] OAuth login error:", error);
        throw error;
      }

      return data;
    },

    async resetPasswordRequest(email) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("[Supabase] reset password request error:", error);
        throw error;
      }

      return data;
    },

    async resetPassword({ newPassword }) {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("[Supabase] reset password error:", error);
        throw error;
      }

      return data;
    },
  },

  integrations: {
    Core: {
      async InvokeLLM(payload) {
        const { data, error } = await supabase.functions.invoke("ai-insights", {
          body: payload,
        });

        if (error) {
          let details = "";

          try {
            details = await error.context?.json?.();
          } catch {
            try {
              details = await error.context?.text?.();
            } catch {
              details = "";
            }
          }

          const detailMessage =
            typeof details === "string" ? details : details?.error;

          console.error("[Supabase] AI insights error:", error);
          throw new Error(
            detailMessage ||
            error.message ||
              "Impossible de générer l'analyse IA pour le moment."
          );
        }

        return data;
        /*
        return {
          analysis_text:
            "L'analyse IA est désactivée temporairement pendant la migration vers Supabase.",
        };
        */
      },
    },
  },

  users: {
    async inviteUser(email) {
      console.warn(
        "Invitation automatique non configurée côté frontend. Utilisateur demandé :",
        email
      );

      throw new Error(
        "Invitation utilisateur non configurée. Pour l'instant, demandez à l'utilisateur de créer son compte, puis attribuez-lui ses permissions dans le panel admin."
      );
    },
  },
};
