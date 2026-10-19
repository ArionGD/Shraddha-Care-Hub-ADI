import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, UsersRound, Video, ExternalLink, AlertTriangle, BookOpen, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { displayTime, formatSessionDate, getPerformerNames, type SessionBundle } from "@/lib/studycircle";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function SessionViewer({ bundle }: { bundle: SessionBundle }) {
  const { session, roles, parts } = bundle;
  const { lang } = useI18n();
  const isBn = lang === "bn";
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: authSession } }) => {
      setIsAuthenticated(Boolean(authSession));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setIsAuthenticated(Boolean(currentSession));
    });

    return () => subscription.unsubscribe();
  }, []);

  const isCancelled = session.status === "cancelled";
  const sessionTitle = isBn ? session.title_bn : (session.title_en || session.title_bn);
  const sessionNote = isBn ? session.note : (session.note_en || session.note);

  return (
    <div className="space-y-6">
      {/* Session Header Card */}
      <Card className="overflow-hidden border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-accent/20 pb-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatSessionDate(session.scheduled_date, lang)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              {displayTime(session.start_time)}
            </span>
            {isCancelled && (
              <Badge variant="destructive" className="ml-auto uppercase text-xs tracking-wider">
                {isBn ? "স্থগিত / Cancelled" : "Cancelled"}
              </Badge>
            )}
          </div>

          <CardTitle className="text-2xl lg:text-3xl font-serif text-foreground">
            {sessionTitle}
          </CardTitle>

          {/* Cancellation or Special Announcement Banner */}
          {isCancelled && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{isBn ? "বিশেষ বিজ্ঞপ্তি (Notice)" : "Special Notice (Cancelled)"}</p>
                <p className="mt-1">
                  {sessionNote || (isBn ? "আজকের পাঠচক্র অধিবেশন অনিবার্য কারণে স্থগিত রাখা হয়েছে।" : "Today's session has been cancelled due to unavoidable circumstances.")}
                </p>
              </div>
            </div>
          )}

          {!isCancelled && sessionNote && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{isBn ? "বিজ্ঞপ্তি (Announcement)" : "Announcement"}</p>
                <p className="mt-1">{sessionNote}</p>
              </div>
            </div>
          )}

          {/* Meeting Link (Protected) */}
          {!isCancelled && session.meeting_link && (
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4 text-primary" />
                <span>{isBn ? "অনলাইন অধিবেশন (Online Video Session)" : "Online Video Session"}</span>
              </div>
              {isAuthenticated ? (
                <Button asChild size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
                  <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                    {isBn ? "অধিবেশনে যোগ দিন (Join)" : "Join Online Meeting"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {isBn ? "মিটিং লিংক কেবল সদস্যদের জন্য।" : "Meeting link available to members."}
                  </span>{" "}
                  <Link to="/auth" className="text-primary underline hover:opacity-80 font-medium">
                    {isBn ? "লগইন করুন" : "Sign in to join"}
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Leadership Roles */}
      <Card>
        <CardHeader className="border-b py-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            {isBn ? "দায়িত্বপ্রাপ্ত ব্যক্তিবর্গ (Leadership & Roles)" : "Leadership & Assigned Roles"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isBn ? "দায়িত্ব বণ্টন এখনও সম্পন্ন হয়নি।" : "Role assignments pending."}
            </p>
          ) : (
            <div className="divide-y rounded-xl border bg-card">
              {roles.map((role) => {
                const names = getPerformerNames(role.performers, lang);
                const roleName = isBn ? role.role_name : (role.role_name_en || role.role_name);
                return (
                  <div key={role.id} className="grid gap-2 p-3.5 sm:grid-cols-[minmax(200px,0.9fr)_1fr] items-center">
                    <div className="font-medium text-sm text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                      {roleName}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {names !== "—" ? names : <span className="text-xs italic opacity-60">{isBn ? "অনির্ধারিত" : "Not assigned"}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Programme Agenda Parts */}
      <Card>
        <CardHeader className="border-b py-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {isBn ? "অনুষ্ঠান সূচী ও পাঠ (Programme Agenda)" : "Programme Agenda & Readings"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {isBn ? "অনুষ্ঠান সূচী শীঘ্রই আপডেট করা হবে।" : "Programme schedule will be updated shortly."}
            </p>
          ) : (
            parts.map((part) => {
              const names = getPerformerNames(part.performers, lang);
              const isSong = part.item_type === "song";
              const isPrayer = part.item_type === "prayer";
              const isReading = part.item_type === "reading";
              const desc = isBn ? part.description : (part.description_en || part.description);

              return (
                <div key={part.id} className="rounded-xl border p-4 bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    {part.part_number !== null ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-sm text-primary">
                        {part.part_number}
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize font-semibold",
                            isSong && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
                            isReading && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                            isPrayer && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
                          )}
                        >
                          {isSong
                            ? (isBn ? "সঙ্গীত (Song)" : "Song")
                            : isReading
                            ? (isBn ? "পাঠ (Reading)" : "Reading")
                            : isPrayer
                            ? (isBn ? "প্রার্থনা (Prayer)" : "Prayer")
                            : (isBn ? "অন্যান্য" : "Other")}
                        </Badge>

                        {part.reference_link && (
                          <a
                            href={part.reference_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-auto"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {isBn ? "তথ্যসূত্র / গান" : "Lyrics / Reference"}
                          </a>
                        )}
                      </div>

                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-medium">
                        {desc || "—"}
                      </div>

                      {names !== "—" && (
                        <div className="mt-2.5 text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{isBn ? "অংশগ্রহণকারী:" : "Performer(s):"}</span>
                          <span>{names}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
