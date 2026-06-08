import { supabase } from "./supabaseClient";

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

    const { data: created, error } = await supabase
      .from(table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error(`[Supabase] create error on ${table}:`, error);
      throw error;
    }

    return normalizeRecord(created);
  },

  async update(id, data) {
    const payload = cleanDataBeforeSave(data);

    const { data: updated, error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[Supabase] update error on ${table}:`, error);
      throw error;
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
      async InvokeLLM() {
        return {
          analysis_text:
            "L'analyse IA est désactivée temporairement pendant la migration vers Supabase.",
        };
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