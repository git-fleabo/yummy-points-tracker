import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Award, Gift, Sparkles, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage, loadChildForUser, type Child, type Family } from "@/lib/family-data";

export const Route = createFileRoute("/children/$childId_/journey")({
  head: () => ({ meta: [{ title: "Journey — Yummy Points" }] }),
  component: JourneyPage,
});

type RewardRelation = { name: string | null } | { name: string | null }[] | null;

type Transaction = {
  id: string;
  type: string;
  points_change: number;
  note: string | null;
  created_at: string;
  reward_template_id: string | null;
  reward_templates: RewardRelation;
};

type ChildBadge = {
  id: string;
  earned_at: string;
  badges: { name: string; icon: string | null } | { name: string; icon: string | null }[] | null;
};

type TimelineItem = {
  id: string;
  title: string;
  detail: string;
  note: string | null;
  date: string;
  variant: "points" | "reward" | "badge" | "default";
  icon: typeof Sparkles | typeof Gift | typeof Award | typeof Trophy;
};

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function JourneyPage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [childBadges, setChildBadges] = useState<ChildBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadJourney() {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const { child: loadedChild, family: loadedFamily } = await loadChildForUser(childId, user.id);
      const loadedTransactions = await loadTransactions(loadedChild.id, loadedFamily.id);
      const loadedBadges = await loadChildBadges(loadedChild.id);

      if (isMounted) {
        setChild(loadedChild);
        setFamily(loadedFamily);
        setTransactions(loadedTransactions);
        setChildBadges(loadedBadges);
        setLoading(false);
      }
    }

    loadJourney().catch((err: unknown) => {
      if (isMounted) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [childId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading journey...</p>
      </div>
    );
  }

  if (!child || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Journey could not load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error ?? "We could not load this child's journey."}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">
                <ArrowLeft aria-hidden="true" />
                Back to dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeline = [
    ...transactions.map((transaction) => buildTimelineItem(transaction, child, family)),
    ...childBadges.flatMap((badge) => buildBadgeTimelineItem(badge, child)),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/children/$childId" params={{ childId }}>
            <ArrowLeft aria-hidden="true" />
            Back to {child.name}
          </Link>
        </Button>

        <Card className="overflow-hidden border-teal-200/80 bg-gradient-to-br from-white via-teal-50/80 to-amber-50/70 shadow-md">
          <CardHeader className="relative">
            <div
              aria-hidden="true"
              className="absolute -right-12 -top-14 size-40 rounded-full bg-teal-200/50 blur-2xl"
            />
            <CardTitle className="relative flex items-center gap-2 text-2xl text-foreground">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-md shadow-secondary/20">
                <Trophy aria-hidden="true" className="size-5" />
              </span>
              {child.name}'s Yummy Journey
            </CardTitle>
            <p className="relative text-sm text-muted-foreground">
              A story of points saved, rewards chosen, and badges unlocked.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase text-muted-foreground">
                Current balance
              </p>
              <div className="mt-2 flex items-end gap-3">
                <p className="text-5xl font-semibold leading-none text-primary">
                  {child.current_balance}
                </p>
                <Sparkles aria-hidden="true" className="mb-1 size-6 text-accent-foreground" />
              </div>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{family.point_name}</p>
            </div>

            {timeline.length === 0 ? (
              <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/15 px-5 py-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles aria-hidden="true" className="size-6" />
                </div>
                <p className="mt-4 font-semibold text-foreground">No journey yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Add some points to begin.</p>
              </div>
            ) : (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Story so far</h2>
                <div className="relative space-y-3 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-px before:bg-border">
                  {timeline.map((item) => {
                    const style = getTimelineStyle(item.variant);

                    return (
                      <div
                        key={item.id}
                        className={`relative grid grid-cols-[auto_1fr] gap-3 rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${style.card}`}
                      >
                        <div
                          className={`z-10 flex size-10 items-center justify-center rounded-full shadow-sm ${style.icon}`}
                        >
                          <item.icon aria-hidden="true" className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{item.title}</p>
                              {item.note && (
                                <p className="mt-1 rounded-xl bg-white/60 px-3 py-2 text-sm text-muted-foreground">
                                  {item.note}
                                </p>
                              )}
                            </div>
                            <Badge variant={style.badgeVariant} className="w-fit">
                              {item.detail}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm font-medium text-muted-foreground">
                            {formatJourneyDate(item.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

async function loadTransactions(childId: string, familyId: string) {
  const { data: loadedTransactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("id, type, points_change, note, created_at, reward_template_id, reward_templates(name)")
    .eq("child_id", childId)
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (transactionsError) throw transactionsError;
  return (loadedTransactions ?? []) as Transaction[];
}

async function loadChildBadges(childId: string) {
  const { data: loadedBadges, error: badgesError } = await supabase
    .from("child_badges")
    .select("id, earned_at, badges(name, icon)")
    .eq("child_id", childId)
    .order("earned_at", { ascending: false });

  if (badgesError) throw badgesError;
  return (loadedBadges ?? []) as ChildBadge[];
}

function getTimelineStyle(variant: TimelineItem["variant"]) {
  switch (variant) {
    case "points":
      return {
        card: "border-rose-200 bg-gradient-to-br from-white via-rose-50 to-amber-50",
        icon: "bg-rose-200 text-rose-800",
        badgeVariant: "default" as const,
      };
    case "reward":
      return {
        card: "border-amber-200 bg-gradient-to-br from-white via-amber-50 to-white",
        icon: "bg-amber-200 text-amber-900",
        badgeVariant: "secondary" as const,
      };
    case "badge":
      return {
        card: "border-violet-200 bg-gradient-to-br from-white via-violet-50 to-teal-50",
        icon: "bg-violet-200 text-violet-900",
        badgeVariant: "default" as const,
      };
    default:
      return {
        card: "border-border bg-white/70",
        icon: "bg-primary/10 text-primary",
        badgeVariant: "secondary" as const,
      };
  }
}

function buildTimelineItem(transaction: Transaction, child: Child, family: Family): TimelineItem {
  if (transaction.type === "reward_redeemed") {
    const rewardName = getRewardName(transaction);
    const title = rewardName
      ? `${child.name} redeemed ${rewardName}`
      : `${child.name} redeemed a reward`;

    return {
      id: transaction.id,
      title,
      detail: `${Math.abs(transaction.points_change)} ${family.point_name} used`,
      note: null,
      date: transaction.created_at,
      variant: "reward",
      icon: Gift,
    };
  }

  if (transaction.type === "points_added") {
    return {
      id: transaction.id,
      title: `${child.name} earned ${transaction.points_change} ${family.point_name}`,
      detail: `+${transaction.points_change}`,
      note: transaction.note?.trim() || null,
      date: transaction.created_at,
      variant: "points",
      icon: Sparkles,
    };
  }

  return {
    id: transaction.id,
    title: transaction.note?.trim() || `${child.name}'s balance changed`,
    detail: formatPointChange(transaction.points_change, family.point_name),
    note: null,
    date: transaction.created_at,
    variant: transaction.points_change >= 0 ? "points" : "reward",
    icon: Sparkles,
  };
}

function getRewardName(transaction: Transaction) {
  const joinedReward = [transaction.reward_templates ?? []].flat()[0]?.name?.trim();
  if (joinedReward) return joinedReward;

  const note = transaction.note?.replace(/^redeemed:\s*/i, "").trim();
  return note || null;
}

function buildBadgeTimelineItem(childBadge: ChildBadge, child: Child): TimelineItem[] {
  const badge = [childBadge.badges ?? []].flat()[0];
  if (!badge) return [];

  return [
    {
      id: `badge-${childBadge.id}`,
      title: `${child.name} unlocked ${badge.name}`,
      detail: "Badge earned",
      note: badge.icon ? badge.icon : null,
      date: childBadge.earned_at,
      variant: "badge",
      icon: Award,
    },
  ];
}

function formatPointChange(points: number, pointName: string) {
  const absolutePoints = Math.abs(points);
  if (points < 0) return `${absolutePoints} ${pointName} used`;
  return `+${absolutePoints}`;
}

function formatJourneyDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (toDateKey(date) === toDateKey(today)) return "Today";
  if (toDateKey(date) === toDateKey(yesterday)) return "Yesterday";

  return longDateFormatter.format(date);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
