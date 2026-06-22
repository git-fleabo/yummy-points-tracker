import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Award, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage, loadChildForUser, type Child, type Family } from "@/lib/family-data";

export const Route = createFileRoute("/children/$childId_/badges")({
  head: () => ({ meta: [{ title: "Badges — Yummy Points" }] }),
  component: BadgesPage,
});

type BadgeDefinition = {
  id: string;
  family_id: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
};

type ChildBadge = {
  earned_at: string;
  badges: BadgeDefinition | BadgeDefinition[] | null;
};

type GalleryBadge = {
  key: string;
  name: string;
  description: string;
  icon: string | null;
  earnedAt: string | null;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function BadgesPage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<ChildBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBadges() {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const { child: loadedChild, family: loadedFamily } = await loadChildForUser(childId, user.id);

      const { data: loadedDefinitions, error: badgeError } = await supabase
        .from("badges")
        .select("id, family_id, name, description, icon, is_active")
        .or(`family_id.is.null,family_id.eq.${loadedFamily.id}`)
        .order("family_id", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true });

      if (badgeError) throw badgeError;

      const { data: loadedEarnedBadges, error: childBadgeError } = await supabase
        .from("child_badges")
        .select("earned_at, badges(id, family_id, name, description, icon, is_active)")
        .eq("child_id", loadedChild.id);

      if (childBadgeError) throw childBadgeError;

      if (isMounted) {
        setChild(loadedChild);
        setFamily(loadedFamily);
        setBadgeDefinitions((loadedDefinitions ?? []) as BadgeDefinition[]);
        setEarnedBadges((loadedEarnedBadges ?? []) as ChildBadge[]);
        setLoading(false);
      }
    }

    loadBadges().catch((err: unknown) => {
      if (isMounted) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [childId, navigate]);

  const galleryBadges = useMemo(
    () => buildGalleryBadges(badgeDefinitions, earnedBadges),
    [badgeDefinitions, earnedBadges],
  );
  const earnedCount = galleryBadges.filter((badge) => badge.earnedAt).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading badges…</p>
      </div>
    );
  }

  if (!child || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Badges could not load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error ?? "We could not load this child's badges."}
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

        <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-100 via-rose-50 to-teal-100 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles aria-hidden="true" className="size-4" />
                Badge Gallery
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                {child.name}'s badges
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Celebrate the milestones {child.name} has unlocked while earning and spending{" "}
                {family.point_name}.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 px-5 py-4 text-center shadow-sm">
              <p className="text-4xl font-semibold text-primary">{earnedCount}</p>
              <p className="text-sm font-medium text-muted-foreground">
                of {galleryBadges.length} earned
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {earnedCount === 0 && (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-100/70 px-4 py-6 text-center text-sm font-semibold text-amber-950">
            No badges yet. Earn points to unlock the first one.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          {galleryBadges.map((badge) => (
            <BadgeCard key={badge.key} badge={badge} />
          ))}
        </section>
      </main>
    </div>
  );
}

function BadgeCard({ badge }: { badge: GalleryBadge }) {
  const isEarned = Boolean(badge.earnedAt);

  return (
    <article
      className={
        isEarned
          ? "rounded-2xl border border-amber-200 bg-card p-5 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-slate-100/80 p-5 opacity-75 shadow-sm grayscale"
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={
            isEarned
              ? "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-sunshine text-3xl text-sunshine-foreground shadow-sm ring-4 ring-amber-100"
              : "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-3xl text-slate-500 shadow-sm"
          }
        >
          {badge.icon ? (
            <span aria-hidden="true">{badge.icon}</span>
          ) : isEarned ? (
            <Award aria-hidden="true" className="size-8" />
          ) : (
            <LockKeyhole aria-hidden="true" className="size-7" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">{badge.name}</h2>
            <span
              className={
                isEarned
                  ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
                  : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
              }
            >
              {isEarned ? "Earned" : "Locked"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{badge.description}</p>
          <p className="mt-4 text-sm font-medium text-foreground">
            {isEarned && badge.earnedAt ? `Earned ${formatDate(badge.earnedAt)}` : "Keep going!"}
          </p>
        </div>
      </div>
    </article>
  );
}

function buildGalleryBadges(
  badgeDefinitions: BadgeDefinition[],
  childBadges: ChildBadge[],
): GalleryBadge[] {
  const definitionsById = new Map(badgeDefinitions.map((badge) => [badge.id, badge]));
  const earnedById = new Map<string, string>();
  const earnedArchivedBadges: GalleryBadge[] = [];

  childBadges.forEach((childBadge) => {
    const badges = [childBadge.badges ?? []].flat();
    badges.forEach((badge) => {
      earnedById.set(badge.id, childBadge.earned_at);
      if (!definitionsById.has(badge.id)) {
        earnedArchivedBadges.push({
          key: badge.id,
          name: badge.name,
          description: badge.description ?? "Archived badge.",
          icon: badge.icon,
          earnedAt: childBadge.earned_at,
        });
      }
    });
  });

  return [
    ...badgeDefinitions
      .filter((badge) => badge.is_active)
      .map((badge) => ({
        key: badge.id,
        name: badge.name,
        description: badge.description ?? "Badge milestone.",
        icon: badge.icon,
        earnedAt: earnedById.get(badge.id) ?? null,
      })),
    ...earnedArchivedBadges,
  ];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return dateFormatter.format(date);
}
