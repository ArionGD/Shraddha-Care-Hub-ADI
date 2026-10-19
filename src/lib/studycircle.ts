import { supabase } from "@/integrations/supabase/client";
import { formatTime12 } from "@/lib/routine";

export type StudyCircleProgram = "kathamrita" | "pathochokro";

export interface StudyCircleSession {
  id: string;
  program_type: StudyCircleProgram;
  scheduled_date: string;
  start_time: string | null;
  status: "scheduled" | "cancelled";
  title_bn: string;
  note: string | null;
  meeting_link: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyCircleRole {
  id: string;
  session_id: string;
  role_name: string;
  display_order: number;
  created_at: string;
}

export interface StudyCircleRolePerformer {
  id: string;
  role_id: string;
  member_id: string | null;
  performer_name: string;
  is_guest: boolean;
  display_order: number;
  created_at: string;
}

export interface StudyCirclePart {
  id: string;
  session_id: string;
  part_number: number | null;
  item_type: "song" | "reading" | "prayer" | "other";
  description: string;
  reference_link: string | null;
  display_order: number;
  created_at: string;
}

export interface StudyCirclePartPerformer {
  id: string;
  part_id: string;
  member_id: string | null;
  performer_name: string;
  is_guest: boolean;
  display_order: number;
  created_at: string;
}

export interface RoleWithPerformers extends StudyCircleRole {
  performers: StudyCircleRolePerformer[];
}

export interface PartWithPerformers extends StudyCirclePart {
  performers: StudyCirclePartPerformer[];
}

export interface SessionBundle {
  session: StudyCircleSession;
  roles: RoleWithPerformers[];
  parts: PartWithPerformers[];
}

export const PROGRAMS: Record<StudyCircleProgram, {
  labelBn: string;
  shortLabel: string;
  accent: string;
  soft: string;
  dayLabel: string;
  defaultWeekday: number;
  defaultTime: string;
}> = {
  kathamrita: {
    labelBn: "রামকৃষ্ণ কথামৃত",
    shortLabel: "Kathamrita · Tuesday",
    accent: "text-orange-600 bg-orange-100 border-orange-300",
    soft: "bg-orange-50 text-orange-700 border-orange-200",
    dayLabel: "Tuesday",
    defaultWeekday: 2,
    defaultTime: "17:00",
  },
  pathochokro: {
    labelBn: "পাঠচক্র",
    shortLabel: "Pathochokro · Thursday",
    accent: "text-purple-600 bg-purple-100 border-purple-300",
    soft: "bg-purple-50 text-purple-700 border-purple-200",
    dayLabel: "Thursday",
    defaultWeekday: 4,
    defaultTime: "17:00",
  },
};

export const DEFAULT_ROLES = [
  "সভাপতি (President)",
  "সঞ্চালক (Conductor)",
  "পাঠক (Reader)",
  "উদ্বোধনী সঙ্গীত (Opening Song)",
];

export function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "long",
    timeZone: "Asia/Kolkata",
  });
}

export function displayTime(t: string | null): string {
  return t ? formatTime12(t) : "—";
}

export async function fetchUpcomingSession(
  program: StudyCircleProgram,
): Promise<StudyCircleSession | null> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const { data, error } = await supabase
    .from("study_circle_sessions")
    .select("*")
    .eq("program_type", program)
    .eq("is_published", true)
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as StudyCircleSession | null) ?? null;
}

export async function fetchSessionBundle(sessionId: string): Promise<SessionBundle> {
  const [
    { data: session, error: sErr },
    { data: roles, error: rErr },
    { data: parts, error: pErr },
  ] = await Promise.all([
    supabase.from("study_circle_sessions").select("*").eq("id", sessionId).single(),
    supabase.from("study_circle_roles").select("*").eq("session_id", sessionId).order("display_order"),
    supabase.from("study_circle_parts").select("*").eq("session_id", sessionId).order("display_order"),
  ]);

  if (sErr) throw sErr;
  if (rErr) throw rErr;
  if (pErr) throw pErr;

  const roleRows = (roles ?? []) as unknown as StudyCircleRole[];
  const partRows = (parts ?? []) as unknown as StudyCirclePart[];

  const roleIds = roleRows.map((r) => r.id);
  const partIds = partRows.map((p) => p.id);

  const [
    { data: rolePerfs, error: rpErr },
    { data: partPerfs, error: ppErr },
  ] = await Promise.all([
    roleIds.length
      ? supabase.from("study_circle_role_performers").select("*").in("role_id", roleIds).order("display_order")
      : Promise.resolve({ data: [] as unknown as StudyCircleRolePerformer[], error: null }),
    partIds.length
      ? supabase.from("study_circle_part_performers").select("*").in("part_id", partIds).order("display_order")
      : Promise.resolve({ data: [] as unknown as StudyCirclePartPerformer[], error: null }),
  ]);

  if (rpErr) throw rpErr;
  if (ppErr) throw ppErr;

  const rolePerformerRows = (rolePerfs ?? []) as unknown as StudyCircleRolePerformer[];
  const partPerformerRows = (partPerfs ?? []) as unknown as StudyCirclePartPerformer[];

  return {
    session: session as unknown as StudyCircleSession,
    roles: roleRows.map((role) => ({
      ...role,
      performers: rolePerformerRows.filter((p) => p.role_id === role.id),
    })),
    parts: partRows.map((part) => ({
      ...part,
      performers: partPerformerRows.filter((p) => p.part_id === part.id),
    })),
  };
}

export function getPerformerNames(
  performers: { performer_name: string }[],
): string {
  if (!performers.length) return "—";
  return performers.map((p) => p.performer_name).join(", ");
}

export function generateWhatsAppMessage(bundle: SessionBundle): string {
  const { session, roles, parts } = bundle;
  const meta = PROGRAMS[session.program_type];

  let msg = `🌸 *শ্রদ্ধা ওয়েলফেয়ার অ্যাসোসিয়েশন* 🌸\n`;
  msg += `📖 *${meta.labelBn}*\n`;
  msg += `📅 ${formatSessionDate(session.scheduled_date)}\n`;
  msg += `⏰ ${displayTime(session.start_time)}\n\n`;

  if (session.status === "cancelled") {
    msg += `⚠️ *বিশেষ বিজ্ঞপ্তি:* আজকের অধিবেশন স্থগিত রাখা হয়েছে।`;
    if (session.note) msg += ` ${session.note}`;
    msg += `\n`;
    return msg;
  }

  if (session.note) {
    msg += `📢 ${session.note}\n\n`;
  }

  msg += `*দায়িত্বপ্রাপ্ত:*\n`;
  for (const r of roles) {
    const names = getPerformerNames(r.performers);
    msg += `• ${r.role_name}: ${names}\n`;
  }

  if (parts.length > 0) {
    msg += `\n*সূচী:*\n`;
    for (const p of parts) {
      const num = p.part_number ? `[${p.part_number}] ` : "";
      const names = p.performers.length
        ? ` — _${getPerformerNames(p.performers)}_`
        : "";
      msg += `${num}${p.description}${names}\n`;
    }
  }

  if (session.meeting_link) {
    msg += `\n🔗 *লিংক:* ${session.meeting_link}\n`;
  }

  return msg;
}
