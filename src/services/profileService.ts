import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import type { ProfileRecord, Role } from "./types";

export const profileService = {
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,email,organization")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      organization: data.organization,
    };
  },

  async getRole(userId: string): Promise<Role | null> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const role = data?.role;
    if (role === "student" || role === "investor" || role === "university") return role;
    return null;
  },

  async updateProfile(userId: string, patch: Partial<ProfileRecord>) {
    const payload: TablesUpdate<"profiles"> = {};
    Object.assign(payload, {
      ...(patch.fullName !== undefined && { full_name: patch.fullName }),
      ...(patch.organization !== undefined && { organization: patch.organization }),
      ...(patch.email !== undefined && { email: patch.email }),
    });
    if (Object.keys(payload).length === 0) return;
    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) throw error;
  },
};

export const authService = {
  async signUp(input: {
    email: string;
    password: string;
    fullName: string;
    organization: string;
    role: Role;
  }) {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          full_name: input.fullName,
          organization: input.organization,
          role: input.role,
        },
      },
    });
    if (error) throw error;
  },

  async signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async signOut() {
    await supabase.auth.signOut();
  },
};
