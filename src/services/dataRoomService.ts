import { supabase } from "@/integrations/supabase/client";
import { auditService, notificationService } from "./notificationService";
import { engagementHelpers } from "./engagementService";
import { formatBytes, type DataRoomAccess, type DataRoomDoc } from "./types";

export const NDA_VERSION = "nda-v1";

export const dataRoomService = {
  async listDocuments(): Promise<DataRoomDoc[]> {
    const { data, error } = await supabase
      .from("data_room_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d) => ({
      id: d.id,
      startupId: d.startup_id,
      name: d.name,
      category: d.category,
      sizeBytes: Number(d.size_bytes ?? 0),
      size: formatBytes(Number(d.size_bytes ?? 0)),
      storagePath: d.storage_path,
      confidential: d.confidential,
      addedAt: d.created_at,
    }));
  },

  async listAccess(): Promise<DataRoomAccess[]> {
    const [{ data: rows, error }, { data: ndas }] = await Promise.all([
      supabase.from("data_room_access").select("*").order("requested_at", { ascending: false }),
      supabase.from("nda_records").select("startup_id,investor_id,accepted_name"),
    ]);
    if (error) throw error;
    const ndaMap = new Map((ndas ?? []).map((n) => [`${n.startup_id}:${n.investor_id}`, n.accepted_name]));
    return (rows ?? []).map((a) => {
      const signedName = ndaMap.get(`${a.startup_id}:${a.investor_id}`);
      return {
        id: a.id,
        startupId: a.startup_id,
        investorId: a.investor_id,
        status: a.status,
        ndaSigned: Boolean(signedName),
        ndaSignedName: signedName ?? "",
        requestedAt: a.requested_at,
        downloads: a.downloads,
      };
    });
  },

  async upload(startupId: string, file: File, category: string, confidential: boolean) {
    const path = `${startupId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("dataroom").upload(path, file, {
      contentType: file.type || "application/octet-stream",
    });
    if (uploadError) throw uploadError;
    const { error } = await supabase.from("data_room_documents").insert({
      startup_id: startupId,
      name: file.name,
      category,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type,
      confidential,
    });
    if (error) throw error;
    await auditService.log("document.uploaded", "startup", startupId, { name: file.name });
  },

  async remove(doc: DataRoomDoc) {
    if (doc.storagePath) await supabase.storage.from("dataroom").remove([doc.storagePath]);
    const { error } = await supabase.from("data_room_documents").delete().eq("id", doc.id);
    if (error) throw error;
    await auditService.log("document.deleted", "document", doc.id, { name: doc.name });
  },

  /** Signed, short-lived download link. Storage rules block anyone without access. */
  async downloadUrl(doc: DataRoomDoc) {
    if (!doc.storagePath) throw new Error("This document has no stored file.");
    const { data, error } = await supabase.storage
      .from("dataroom")
      .createSignedUrl(doc.storagePath, 120, { download: doc.name });
    if (error) throw error;
    return data.signedUrl;
  },

  async requestAccess(startupId: string, investorId: string, investorName: string) {
    const { error } = await supabase
      .from("data_room_access")
      .insert({ startup_id: startupId, investor_id: investorId, status: "pending" });
    if (error && error.code !== "23505") throw error;
    await notificationService.send(
      await engagementHelpers.ownerOfStartup(startupId),
      "dataroom",
      "Data-room access requested",
      `${investorName} requested access to your documents.`,
      startupId,
    );
    await auditService.log("dataroom.requested", "startup", startupId);
  },

  async setAccessStatus(id: string, status: DataRoomAccess["status"], investorId: string) {
    const { error } = await supabase
      .from("data_room_access")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await notificationService.send(
      await engagementHelpers.userOfInvestor(investorId),
      "dataroom",
      status === "granted" ? "Data-room access granted" : "Data-room access revoked",
      "",
      (await supabase.from("data_room_access").select("startup_id").eq("id", id).maybeSingle()).data?.startup_id,
    );
    await auditService.log(`dataroom.${status}`, "data_room_access", id);
  },

  async acceptNda(startupId: string, investorId: string, userId: string, name: string) {
    const { error } = await supabase.from("nda_records").insert({
      startup_id: startupId,
      investor_id: investorId,
      user_id: userId,
      version: NDA_VERSION,
      accepted_name: name,
    });
    if (error && error.code !== "23505") throw error;
    await auditService.log("nda.accepted", "startup", startupId, { version: NDA_VERSION });
  },

  async registerDownload(accessId: string, downloads: number) {
    await supabase.from("data_room_access").update({ downloads: downloads + 1 }).eq("id", accessId);
    await auditService.log("document.downloaded", "data_room_access", accessId);
  },
};
