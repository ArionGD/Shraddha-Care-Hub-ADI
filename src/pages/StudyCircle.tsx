import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSessionBundle,
  fetchUpcomingSession,
  formatSessionDate,
  PROGRAMS,
  type StudyCircleProgram,
} from "@/lib/studycircle";
import { SessionViewer } from "@/components/studycircle/SessionViewer";

export default function StudyCircle() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("program");
  const program: StudyCircleProgram = requested === "kathamrita" ? "kathamrita" : "pathochokro";

  const current = useQuery({
    queryKey: ["study-circle-current", program],
    queryFn: () => fetchUpcomingSession(program),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!requested) {
      setParams({ program: "pathochokro" }, { replace: true });
    }
  }, [requested, setParams]);

  const sessionId = current.data?.id ?? null;
  const bundle = useQuery({
    queryKey: ["study-circle-bundle", sessionId],
    queryFn: () => fetchSessionBundle(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 5 * 60 * 1000,
  });

  const past = useQuery({
    queryKey: ["study-circle-past", program],
    queryFn: async () => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const { data, error } = await supabase
        .from("study_circle_sessions")
        .select("*")
        .eq("program_type", program)
        .eq("is_published", true)
        .lt("scheduled_date", today)
        .order("scheduled_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const otherProgram: StudyCircleProgram = program === "kathamrita" ? "pathochokro" : "kathamrita";

  return (
    <Layout>
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/20 py-12 lg:py-16 border-b">
        <div className="container max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
            <BookOpen className="h-3.5 w-3.5" />
            Hosla Senior Citizen Wellness
          </span>
          <h1 className="font-serif text-3xl lg:text-5xl font-bold text-foreground">
            Study Circle / পাঠচক্র সূচী
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground text-sm lg:text-base">
            সাপ্তাহিক পাঠচক্র ও রামকৃষ্ণ কথামৃত অধিবেশনের দায়িত্বপ্রাপ্ত ব্যক্তিবর্গ এবং সূচী।
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container max-w-4xl py-8 lg:py-12">
        <Tabs value={program} onValueChange={(v) => setParams({ program: v }, { replace: true })}>
          <TabsList className="grid h-auto w-full grid-cols-2 p-1 bg-muted/60 rounded-xl">
            <TabsTrigger
              value="pathochokro"
              className="py-3 text-sm sm:text-base font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg"
            >
              {PROGRAMS.pathochokro.labelBn} · বৃহস্পতিবার (Thu)
            </TabsTrigger>
            <TabsTrigger
              value="kathamrita"
              className="py-3 text-sm sm:text-base font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg"
            >
              {PROGRAMS.kathamrita.labelBn} · মঙ্গলবার (Tue)
            </TabsTrigger>
          </TabsList>

          <TabsContent value={program} className="mt-8 space-y-8">
            {current.isLoading || bundle.isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">সূচী লোড হচ্ছে…</p>
              </div>
            ) : bundle.data ? (
              <SessionViewer bundle={bundle.data} />
            ) : (
              <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <h2 className="text-xl font-bold text-foreground">পরবর্তী অধিবেশন এখনও নির্ধারিত হয়নি</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  অ্যাডমিন নতুন অধিবেশন প্রকাশ করলে তালিকাটি এখানে প্রদর্শিত হবে।
                </p>
              </div>
            )}

            {/* Past Sessions Accordion */}
            {past.data && past.data.length > 0 && (
              <div className="pt-6 border-t">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="past-sessions" className="border rounded-xl px-4 bg-card shadow-sm">
                    <AccordionTrigger className="text-base font-semibold py-4">
                      পূর্ববর্তী অধিবেশনসমূহ (Past 5 Sessions)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2 pb-3">
                        {past.data.map((s: StudyCircleSession) => (
                          <PastSessionItem
                            key={s.id}
                            sessionId={s.id}
                            title={s.title_bn}
                            date={formatSessionDate(s.scheduled_date)}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {/* Switch Program Link */}
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setParams({ program: otherProgram }, { replace: true })}
                className="gap-2 text-sm"
              >
                Switch to {PROGRAMS[otherProgram].labelBn} ({PROGRAMS[otherProgram].dayLabel})
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
}

function PastSessionItem({ sessionId, title, date }: { sessionId: string; title: string; date: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["study-circle-past-bundle", sessionId],
    queryFn: () => fetchSessionBundle(sessionId),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={sessionId} className="rounded-lg border px-4 bg-muted/20">
        <AccordionTrigger className="py-3 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-semibold text-sm">{title}</span>
            <span className="text-xs text-muted-foreground font-normal">{date}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading archive…
            </div>
          ) : data ? (
            <SessionViewer bundle={data} />
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
