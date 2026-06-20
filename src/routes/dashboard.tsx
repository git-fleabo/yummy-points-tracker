import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LogOut, Plus, Settings, Sparkles, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAvatarColourClass } from "@/lib/avatar-colours";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Family Dashboard — Yummy Points" }] }),
  component: DashboardPage,
});

type Family = {
  id: string;
  name: string;
  point_name: string;
};

type FamilyMember = {
  family_id: string;
};

type Child = {
  id: string;
  name: string;
  avatar_icon: string | null;
  avatar_colour: string | null;
  current_balance: number;
  total_rewards_redeemed: number;
};

const defaultFamilyName = "My Family";
const defaultPointName = "Yummy Points";
const dashboardBuildMarker = "visual-refresh-89e9d78";

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String(err.message);
  }

  return "Could not load your family dashboard.";
}

function DashboardPage() {
  const navigate = useNavigate();
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [childName, setChildName] = useState("");
  const [childToRemove, setChildToRemove] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [removingChild, setRemovingChild] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isMounted) {
          setError(sessionError.message);
          setLoading(false);
        }
        return;
      }

      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const { family: loadedFamily, children: loadedChildren } = await loadFamilyDashboard(user.id);

      if (isMounted) {
        setFamily(loadedFamily);
        setChildren(loadedChildren);
        setLoading(false);
      }
    }

    loadDashboard().catch((err: unknown) => {
      if (isMounted) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function loadFamilyDashboard(userId: string) {
    const { data: existingMember, error: memberError } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<FamilyMember>();

    if (memberError) throw memberError;

    let loadedFamily: Family | null = null;

    if (existingMember) {
      const { data: existingFamily, error: familyLookupError } = await supabase
        .from("families")
        .select("id, name, point_name")
        .eq("id", existingMember.family_id)
        .single<Family>();

      if (familyLookupError) throw familyLookupError;
      loadedFamily = existingFamily;
    }

    if (!loadedFamily) {
      const createdFamily: Family = {
        id: crypto.randomUUID(),
        name: defaultFamilyName,
        point_name: defaultPointName,
      };

      const { error: familyError } = await supabase.from("families").insert(createdFamily);

      if (familyError) throw familyError;

      const { error: familyMemberError } = await supabase.from("family_members").insert({
        family_id: createdFamily.id,
        user_id: userId,
        role: "owner",
      });

      if (familyMemberError) throw familyMemberError;
      loadedFamily = createdFamily;
    }

    const { data: loadedChildren, error: childrenError } = await supabase
      .from("children")
      .select("id, name, avatar_icon, avatar_colour, current_balance, total_rewards_redeemed")
      .eq("family_id", loadedFamily.id)
      .order("created_at", { ascending: true });

    if (childrenError) throw childrenError;

    return {
      family: loadedFamily,
      children: loadedChildren ?? [],
    };
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = childName.trim();
    if (!family || !trimmedName) return;

    setError(null);
    setAddingChild(true);

    const { data: newChild, error: childError } = await supabase
      .from("children")
      .insert({
        family_id: family.id,
        name: trimmedName,
        avatar_icon: "⭐",
        avatar_colour: "soft-yellow",
      })
      .select("id, name, avatar_icon, avatar_colour, current_balance, total_rewards_redeemed")
      .single<Child>();

    setAddingChild(false);

    if (childError) {
      setError(childError.message);
      return;
    }

    setChildren((currentChildren) => [...currentChildren, newChild]);
    setChildName("");
  }

  async function handleRemoveChild() {
    if (!family || !childToRemove) return;

    setRemovingChild(true);
    setError(null);

    try {
      const { error: badgesError } = await supabase
        .from("child_badges")
        .delete()
        .eq("child_id", childToRemove.id);

      if (badgesError) throw badgesError;

      const { error: transactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("family_id", family.id)
        .eq("child_id", childToRemove.id);

      if (transactionsError) throw transactionsError;

      const { error: childError } = await supabase
        .from("children")
        .delete()
        .eq("family_id", family.id)
        .eq("id", childToRemove.id);

      if (childError) throw childError;

      setChildren((currentChildren) =>
        currentChildren.filter((child) => child.id !== childToRemove.id),
      );
      setChildToRemove(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRemovingChild(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading your family dashboard…</p>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Dashboard could not load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error ?? "We could not find your family dashboard yet."}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Test marker: {dashboardBuildMarker}
            </p>
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-8">
        <header className="sticky top-0 z-10 -mx-4 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-muted-foreground">{family.name}</p>
              <h1 className="truncate text-2xl font-semibold tracking-normal text-foreground sm:text-4xl">
                Yummy Points
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline" size="icon" aria-label="Settings">
                <Link to="/settings">
                  <Settings aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" onClick={handleSignOut} aria-label="Sign out">
                <LogOut aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl space-y-3">
              <Badge variant="secondary" className="w-fit">
                <Sparkles aria-hidden="true" className="mr-1 size-3" />
                {children.length} {children.length === 1 ? "child" : "children"}
              </Badge>
              <div>
                <h2 className="text-3xl font-semibold tracking-normal text-primary sm:text-5xl">
                  Turn missed treats into future treats.
                </h2>
                <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                  Track balances, redeem rewards, and keep each child's journey easy to manage.
                </p>
              </div>
            </div>

            <form className="w-full space-y-2 sm:max-w-xs" onSubmit={handleAddChild}>
              <Label htmlFor="child-name">Add a child</Label>
              <div className="flex gap-2">
                <Input
                  id="child-name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Name"
                  autoComplete="off"
                  className="bg-background"
                />
                <Button type="submit" disabled={addingChild || !childName.trim()} size="icon">
                  <Plus aria-hidden="true" />
                  <span className="sr-only">{addingChild ? "Adding child" : "Add child"}</span>
                </Button>
              </div>
            </form>
          </div>
        </section>

        {children.length === 0 ? (
          <div className="rounded-xl border border-dashed border-secondary/50 bg-secondary/15 px-4 py-10 text-center">
            <p className="font-semibold text-foreground">No children yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the first child above to start tracking points.
            </p>
          </div>
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card
                key={child.id}
                className="border-border bg-card shadow-sm transition-colors hover:border-primary/35 hover:shadow-md"
              >
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ${getAvatarColourClass(child.avatar_colour)}`}
                      >
                        {child.avatar_icon ?? "⭐"}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-foreground">
                          {child.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {child.total_rewards_redeemed} redeemed
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setChildToRemove(child)}
                      aria-label={`Remove ${child.name}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="rounded-xl bg-background/70 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Balance
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-primary">
                      {child.current_balance}
                    </p>
                    <p className="text-sm text-muted-foreground">{family.point_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild className="col-span-2">
                      <Link to="/children/$childId" params={{ childId: child.id }}>
                        <UserRound aria-hidden="true" />
                        Open
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <Link to="/children/$childId/add-points" params={{ childId: child.id }}>
                        Add points
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <Link to="/children/$childId/rewards" params={{ childId: child.id }}>
                        Rewards
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </main>

      <AlertDialog
        open={Boolean(childToRemove)}
        onOpenChange={(open) => !open && !removingChild && setChildToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {childToRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the child profile, unlocked badges, and activity history. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingChild}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removingChild}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleRemoveChild();
              }}
            >
              {removingChild ? "Removing…" : "Remove child"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
