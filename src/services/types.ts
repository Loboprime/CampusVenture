/** Domain types shared by the service layer and the UI. */
import type { Stage } from "@/lib/demo-data";

export type Role = "student" | "investor" | "university";
export type ReviewStatus = "draft" | "pending" | "approved" | "rejected";

export interface StartupRecord {
  id: string;
  ownerId: string | null;
  name: string;
  tagline: string;
  sector: string;
  stage: Stage;
  location: string;
  university: string;
  teamSize: number;
  fundingRequired: number;
  revenue: boolean;
  monthlyUsers: number;
  problem: string;
  solution: string;
  businessModel: string;
  traction: string;
  videoUrl: string;
  deckPath: string | null;
  deckName: string;
  githubUrl: string;
  githubStars: number | null;
  githubForks: number | null;
  githubPushedAt: string | null;
  readiness: number;
  status: ReviewStatus;
  reviewNote: string;
  verified: boolean;
  views: number;
  isDemo: boolean;
  updatedAt: string;
}

export interface InvestorRecord {
  id: string;
  userId: string | null;
  name: string;
  organization: string;
  type: string;
  sectors: string[];
  stages: Stage[];
  ticketMin: number;
  ticketMax: number;
  geography: string;
  thesis: string;
  verified: boolean;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface ConnectionRequest {
  id: string;
  startupId: string;
  investorId: string;
  kind: "connection" | "dataroom";
  status: "pending" | "accepted" | "declined" | "cancelled";
  at: string;
  investorName?: string;
  investorOrganization?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  startupId: string;
  investorId: string;
  from: "student" | "investor";
  text: string;
  at: string;
  readByStudent: boolean;
  readByInvestor: boolean;
}

export interface Meeting {
  id: string;
  startupId: string;
  investorId: string;
  title: string;
  at: string;
  minutes: number;
  status: "requested" | "confirmed" | "declined" | "cancelled";
  requestedBy: "student" | "investor";
}

export interface DataRoomDoc {
  id: string;
  startupId: string;
  name: string;
  category: string;
  size: string;
  sizeBytes: number;
  storagePath: string | null;
  confidential: boolean;
  addedAt: string;
}

export interface DataRoomAccess {
  id: string;
  startupId: string;
  investorId: string;
  status: "pending" | "granted" | "revoked";
  ndaSigned: boolean;
  ndaSignedName: string;
  requestedAt: string;
  downloads: number;
}

export interface Program {
  id: string;
  name: string;
  cohort: string;
  seats: number;
  enrolled: string[];
  mentor: string;
  status: "open" | "running" | "closed" | "archived";
  startsOn: string;
}

export interface StudentRecord {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  branch: string;
  year: string;
  university: string;
  startupId: string | null;
  verified: boolean;
}

export interface ProfileRecord {
  id: string;
  fullName: string;
  email: string;
  organization: string;
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
