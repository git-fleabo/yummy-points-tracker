import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Award, Gift, Map, Sparkles, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage, loadChildForUser, type Child, type Family } from "@/lib/family-data";

export const Route = createFileRoute("/children/$childId_/journey")({
  head: () => ({ meta: [{ title: "Journey — Yummy Points" }] }),
  component: JourneyPage,
});

type Transaction = {
  id: string;
  type: string;
  points_change: number;
  note: string | null;
  created_at: string;
};

type ChildBadge = {
  earned_at: string;
  badges:
    | {
        name: string;
        description: string;
        icon: string | null;
      }
    | {
        name: string;
        description: string;
        icon: string | null;
      }[]
    | null;
};

type RewardTemplate = {
  id: string;
  name: string;
  point_cost: number;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function JourneyPage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [rewards, setRewards] = useState<RewardTemplate[]>([]);
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
      const [loadedTransactions, loadedBadges, loadedRewards] = await Promise.all([
        loadTransactions(loadedChild.id, loadedFamily.id),
        loadBadges(loadedChild.id),
        loadRewards(loadedFamily.id),
      ]);

      if (isMounted) {
        setChild(loadedChild);
        setFamily(loadedFamily);
        setTransactions(loadedTransactions);
        setBadges(loadedBadges);
        setRewards(loadedRewards);
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

  const journey = useMemo(() => {
    if (!child) return null;
    return buildJourney(child, transactions, badges, rewards);
  }, [child, transactions, badges, rewards]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading journey…</p>
      </div>
    );
  }

  if (!child || !family || !journey) {
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

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/children/$childId" params={{ childId }}>
            <ArrowLeft aria-hidden="true" />
            Back to {child.name}
          </Link>
        </Button>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
              <Map aria-hidden="true" className="size-6 text-primary" />
              Journey
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              A simple view of what {child.name} has earned, spent, and unlocked.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                icon={<Sparkles aria-hidden="true" />}
                label="Current balance"
                value={`${child.current_balance} ${family.point_name}`}
              />
              <StatCard
                icon={<Trophy aria-hidden="true" />}
                label="Total earned"
                value={`${child.total_points_earned} ${family.point_name}`}
              />
              <StatCard
                icon={<Gift aria-hidden="true" />}
                label="Rewards redeemed"
                value={String(child.total_rewards_redeemed)}
              />
            </div>

            {journey.nextReward ? (
              <div className="rounded-lg border border-secondary/40 bg-secondary/15 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-foreground">Next reward</p>
                    <h2 className="text-xl font-semibold text-foreground">
                      {journey.nextReward.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {journey.nextReward.point_cost} {family.point_name}
                    </p>
                  </div>
                  <Badge variant={journey.pointsUntilNextReward === 0 ? "default" : "secondary"}>
                    {journey.pointsUntilNextReward === 0
                      ? "Ready to redeem"
                      : `${journey.pointsUntilNextReward} to go`}
                  </Badge>
                </div>
                <Progress value={journey.nextRewardProgress} className="mt-4" />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/15 px-4 py-6 text-center text-sm font-medium text-secondary-foreground">
                Add rewards to show the next goal here.
              </div>
            )}

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Milestones</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {journey.milestones.map((milestone) => (
                  <div
                    key={milestone.name}
                    className="rounded-lg border border-border bg-background/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-sunshine text-sunshine-foreground">
                          <milestone.icon aria-hidden="true" className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{milestone.name}</h3>
                          <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        </div>
                      </div>
                      <Badge variant={milestone.complete ? "default" : "secondary"}>
                        {milestone.complete ? "Done" : "Next"}
                      </Badge>
                    </div>
                    <Progress value={milestone.progress} className="mt-4" />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Recent moments</h2>
              {journey.moments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/15 px-4 py-8 text-center text-sm font-medium text-secondary-foreground">
                  Add points or redeem a reward to begin the journey.
                </div>
              ) : (
                <div className="space-y-2">
                  {journey.moments.map((moment) => (
                    <div
                      key={moment.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{moment.title}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(moment.date)}</p>
                      </div>
                      <Badge variant={moment.variant}>{moment.detail}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

type EarnedBadge = {
  name: string;
  description: string;
  icon: string | null;
  earnedAt: string;
};

function buildJourney(
  child: Child,
  transactions: Transaction[],
  badges: EarnedBadge[],
  rewards: RewardTemplate[],
) {
  const nextReward =
    rewards.find((reward) => reward.point_cost >= child.current_balance) ?? rewards.at(-1) ?? null;
  const pointsUntilNextReward = nextReward
    ? Math.max(nextReward.point_cost - child.current_balance, 0)
    : 0;
  const nextRewardProgress = nextReward
    ? percentage(child.current_balance, nextReward.point_cost)
    : 0;

  return {
    nextReward,
    pointsUntilNextReward,
    nextRewardProgress,
    milestones: [
      {
        name: "First points",
        description: "Earn the first point balance.",
        complete: child.total_points_earned > 0,
        progress: child.total_points_earned > 0 ? 100 : 0,
        icon: Sparkles,
      },
      {
        name: "First badge",
        description: "Unlock a hidden badge.",
        complete: badges.length > 0,
        progress: badges.length > 0 ? 100 : 0,
        icon: Award,
      },
      {
        name: "Ten earned",
        description: "Reach 10 total points earned.",
        complete: child.total_points_earned >= 10,
        progress: percentage(child.total_points_earned, 10),
        icon: Trophy,
      },
      {
        name: "First reward",
        description: "Redeem a family reward.",
        complete: child.total_rewards_redeemed > 0,
        progress: child.total_rewards_redeemed > 0 ? 100 : 0,
        icon: Gift,
      },
    ],
    moments: buildMoments(transactions, badges).slice(0, 8),
  };
}

function buildMoments(transactions: Transaction[], badges: EarnedBadge[]) {
  return [
    ...transactions.map((transaction) => ({
      id: transaction.id,
      title: getTransactionTitle(transaction),
      detail:
        transaction.points_change > 0
          ? `+${transaction.points_change}`
          : String(transaction.points_change),
      date: transaction.created_at,
      variant:
        transaction.type === "reward_redeemed" ? ("secondary" as const) : ("default" as const),
    })),
    ...badges.map((badge) => ({
      id: `badge-${badge.name}-${badge.earnedAt}`,
      title: `${badge.icon ?? "Badge"} ${badge.name}`,
      detail: "Badge",
      date: badge.earnedAt,
      variant: "secondary" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function loadTransactions(childId: string, familyId: string) {
  const { data: loadedTransactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("id, type, points_change, note, created_at")
    .eq("child_id", childId)
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (transactionsError) throw transactionsError;
  return (loadedTransactions ?? []) as Transaction[];
}

async function loadBadges(childId: string) {
  const { data: loadedBadges, error: badgesError } = await supabase
    .from("child_badges")
    .select("earned_at, badges(name, description, icon)")
    .eq("child_id", childId);

  if (badgesError) throw badgesError;
  return extractBadges((loadedBadges ?? []) as ChildBadge[]);
}

async function loadRewards(familyId: string) {
  const { data: loadedRewards, error: rewardsError } = await supabase
    .from("reward_templates")
    .select("id, name, point_cost")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .order("point_cost", { ascending: true });

  if (rewardsError) throw rewardsError;
  return (loadedRewards ?? []) as RewardTemplate[];
}

function extractBadges(childBadges: ChildBadge[]) {
  return childBadges
    .flatMap((childBadge) =>
      [childBadge.badges ?? []].flat().map((badge) => ({
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: childBadge.earned_at,
      })),
    )
    .filter((badge) => Boolean(badge.name));
}

function getTransactionTitle(transaction: Transaction) {
  if (transaction.note?.trim()) return transaction.note;
  if (transaction.type === "points_added") return "Points added";
  if (transaction.type === "reward_redeemed") return "Reward redeemed";
  return transaction.type.replaceAll("_", " ");
}

function percentage(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((value / target) * 100), 100);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}
