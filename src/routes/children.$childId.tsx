import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Gift, History, Map, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
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
  const [showFirstPoints, setShowFirstPoints] = useState(false);
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

        if (unlockedBadge === "first-points") {
          setShowFirstPoints(true);
          sessionStorage.removeItem(badgeStorageKey);
        } else {
          setShowFirstPoints(false);
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
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <p className="text-sm text-muted-foreground">Loading child home…</p>
      </div>
    );
  }

  if (!child || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <Card className="w-full max-w-md border-[#f1dfba] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#3d2a1a]">Child home could not load</CardTitle>
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
    <div className="min-h-screen bg-[#fffaf0] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/dashboard">
            <ArrowLeft aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>

        {showFirstPoints && (
          <div className="rounded-md border border-[#f1dfba] bg-white px-4 py-3 text-sm font-medium text-[#3d2a1a] shadow-sm">
            🌟 First Points unlocked!
          </div>
        )}

        <Card className="border-[#f1dfba] bg-white shadow-sm">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-[#fff0b8] text-3xl">
                {child.avatar_icon ?? "⭐"}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-normal text-[#3d2a1a]">
                  {child.name}
                </h1>
                <p className="text-sm text-muted-foreground">{family.name}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Current balance</p>
              <p className="text-4xl font-semibold text-[#3d2a1a]">
                {child.current_balance} {family.point_name}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild>
                <Link to="/children/$childId/add-points" params={{ childId: child.id }}>
                  <Plus aria-hidden="true" />
                  Add Points
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/children/$childId/activity-history" params={{ childId: child.id }}>
                  <History aria-hidden="true" />
                  Activity History
                </Link>
              </Button>
              <Button variant="secondary" disabled>
                <Gift aria-hidden="true" />
                Rewards coming soon
              </Button>
              <Button variant="secondary" disabled>
                <Map aria-hidden="true" />
                Journey coming soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
