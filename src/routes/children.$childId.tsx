import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Award, Gift, Map, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { BadgeUnlockCelebration, type UnlockedBadge } from "@/components/badge-unlock-celebration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAvatarColourClass } from "@/lib/avatar-colours";
import { getErrorMessage, loadChildForUser, type Child, type Family } from "@/lib/family-data";

export const Route = createFileRoute("/children/$childId")({
  head: () => ({ meta: [{ title: "Child Home — Yummy Points" }] }),
  component: ChildHomePage,
});

function ChildHomePage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [unlockedBadge, setUnlockedBadge] = useState<UnlockedBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadChildHome() {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const { child: loadedChild, family: loadedFamily } = await loadChildForUser(childId, user.id);

      if (isMounted) {
        const badgeStorageKey = `badge-unlocked-${childId}`;
        const unlockedBadge = sessionStorage.getItem(badgeStorageKey);

        if (unlockedBadge) {
          setUnlockedBadge(parseUnlockedBadge(unlockedBadge));
          sessionStorage.removeItem(badgeStorageKey);
        } else {
          setUnlockedBadge(null);
        }

        setChild(loadedChild);
        setFamily(loadedFamily);
        setLoading(false);
      }
    }

    loadChildHome().catch((err: unknown) => {
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
        <p className="text-sm text-muted-foreground">Loading child home…</p>
      </div>
    );
  }

  if (!child || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Child home could not load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error ?? "We could not load this child."}
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
          <Link to="/dashboard">
            <ArrowLeft aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>

        {unlockedBadge && (
          <BadgeUnlockCelebration badge={unlockedBadge} onDismiss={() => setUnlockedBadge(null)} />
        )}

        <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-100 via-rose-50 to-teal-100 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className={`flex size-16 shrink-0 items-center justify-center rounded-2xl text-4xl shadow-sm ${getAvatarColourClass(child.avatar_colour)}`}
              >
                {child.avatar_icon ?? "⭐"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-muted-foreground">{family.name}</p>
                <h1 className="truncate text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                  {child.name}
                </h1>
              </div>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 px-5 py-4 shadow-sm sm:min-w-56">
              <p className="text-sm font-medium text-muted-foreground">Current balance</p>
              <p className="mt-1 text-4xl font-semibold text-primary">{child.current_balance}</p>
              <p className="text-sm text-muted-foreground">{family.point_name}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {homeActions.map((action) => (
            <Link
              key={action.title}
              to={action.to}
              params={{ childId: child.id }}
              className={`group rounded-xl border p-4 shadow-sm transition-colors hover:border-primary/40 ${action.cardClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex size-11 items-center justify-center rounded-xl ${action.iconClass}`}
                >
                  <action.icon aria-hidden="true" className="size-5" />
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{action.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </section>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Sparkles aria-hidden="true" className="size-5 text-primary" />
              At a glance
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">Total earned</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {child.total_points_earned} {family.point_name}
              </p>
            </div>
            <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">Rewards redeemed</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {child.total_rewards_redeemed}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

const homeActions = [
  {
    title: "Add Points",
    description: "Save a missed treat or moment.",
    to: "/children/$childId/add-points" as const,
    icon: Plus,
    cardClass: "border-rose-200 bg-rose-50 hover:bg-rose-100/70",
    iconClass: "bg-rose-200 text-rose-700",
  },
  {
    title: "Rewards",
    description: "See what is ready and what is next.",
    to: "/children/$childId/rewards" as const,
    icon: Gift,
    cardClass: "border-amber-200 bg-amber-50 hover:bg-amber-100/70",
    iconClass: "bg-amber-200 text-amber-800",
  },
  {
    title: "Badges",
    description: "Celebrate unlocked milestones.",
    to: "/children/$childId/badges" as const,
    icon: Award,
    cardClass: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70",
    iconClass: "bg-emerald-200 text-emerald-800",
  },
  {
    title: "Journey",
    description: "Follow earned points, rewards, and badges.",
    to: "/children/$childId/journey" as const,
    icon: Map,
    cardClass: "border-violet-200 bg-violet-50 hover:bg-violet-100/70",
    iconClass: "bg-violet-200 text-violet-800",
  },
];

function parseUnlockedBadge(value: string): UnlockedBadge {
  if (value === "first-points") return { name: "First Points", icon: null };

  try {
    const badge = JSON.parse(value) as Partial<UnlockedBadge>;

    if (typeof badge.name === "string" && badge.name.trim()) {
      return {
        name: badge.name,
        icon: typeof badge.icon === "string" && badge.icon.trim() ? badge.icon : null,
      };
    }
  } catch {
    return { name: "First Points", icon: null };
  }

  return { name: "First Points", icon: null };
}
