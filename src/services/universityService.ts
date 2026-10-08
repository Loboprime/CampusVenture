import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { auditService, notificationService } from "./notificationService";
import type { Program, StudentRecord } from "./types";

export const universityService = {
  async listStudents(): Promise<StudentRecord[]> {
    const { data, error } = await supabase.from("students").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map((s) => ({
      id: s.id,
      userId: s.user_id,
      name: s.name,
      email: s.email,
      branch: s.branch,
      year: s.year,
      university: s.university,
      startupId: null,
      verified: s.verified,
    }));
  },

  async setStudentVerified(id: string, verified: boolean, reviewerId: string, userId: string | null) {
    const { error } = await supabase
      .from("students")
      .update({
        verified,
        verified_by: verified ? reviewerId : null,
        verified_at: verified ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) throw error;
    await auditService.log("student.verification", "student", id, { verified });
    await notificationService.send(
      userId,
      "verification",
      verified ? "Your student record was verified" : "Your student verification was withdrawn",
      "",
    );
  },

  async updateOwnStudentRecord(id: string, patch: Partial<StudentRecord>) {
    const payload: TablesUpdate<"students"> = {};
    Object.assign(payload, {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.branch !== undefined && { branch: patch.branch }),
      ...(patch.year !== undefined && { year: patch.year }),
      ...(patch.university !== undefined && { university: patch.university }),
    });
    if (Object.keys(payload).length === 0) return;
    const { error } = await supabase.from("students").update(payload).eq("id", id);
    if (error) throw error;
  },
};

export const programService = {
  async list(): Promise<Program[]> {
    const [{ data: programs, error }, { data: enrollments }] = await Promise.all([
      supabase.from("programs").select("*").order("created_at", { ascending: false }),
      supabase.from("program_enrollments").select("program_id,startup_id"),
    ]);
    if (error) throw error;
    return (programs ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      cohort: p.cohort,
      seats: p.seats,
      mentor: p.mentor,
      status: p.status,
      startsOn: p.starts_on ?? "",
      enrolled: (enrollments ?? [])
        .filter((e) => e.program_id === p.id)
        .map((e) => e.startup_id),
    }));
  },

  async create(input: Omit<Program, "id" | "enrolled">, ownerId: string) {
    const { error } = await supabase.from("programs").insert({
      owner_id: ownerId,
      name: input.name,
      cohort: input.cohort,
      seats: input.seats,
      mentor: input.mentor,
      status: input.status,
      starts_on: input.startsOn || null,
    });
    if (error) throw error;
    await auditService.log("program.created", "program", undefined, { name: input.name });
  },

  async setStatus(id: string, status: Program["status"]) {
    const { error } = await supabase.from("programs").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async toggleEnrollment(programId: string, startupId: string, enrolled: boolean) {
    if (enrolled) {
      const { error } = await supabase
        .from("program_enrollments")
        .delete()
        .eq("program_id", programId)
        .eq("startup_id", startupId);
      if (error) throw error;
      return false;
    }
    const { error } = await supabase
      .from("program_enrollments")
      .insert({ program_id: programId, startup_id: startupId });
    if (error) {
      if (error.code === "23505") throw new Error("That startup is already enrolled.");
      throw new Error(error.message);
    }
    return true;
  },
};
