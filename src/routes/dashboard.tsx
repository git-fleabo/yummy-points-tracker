import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Plus, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  current_balance: number;
};

const defaultFamilyName = "My Family";
const defaultPointName = "Yummy Points";
const dashboardBuildMarker = "dashboard-debug-family-create-fix";

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
  const [loading, setLoading] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
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
      .select("id, name, avatar_icon, current_balance")
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
      .select("id, name, avatar_icon, current_balance")
      .single<Child>();

    setAddingChild(false);

    if (childError) {
      setError(childError.message);
      return;
    }

    setChildren((currentChildren) => [...currentChildren, newChild]);
    setChildName("");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <p className="text-sm text-muted-foreground">Loading your family dashboard…</p>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <Card className="w-full max-w-md border-[#f1dfba] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#3d2a1a]">Dashboard could not load</CardTitle>
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
    <div className="min-h-screen bg-[#fffaf0] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{family.name}</p>
            <div>
              <h1 className="text-4xl font-semibold tracking-normal text-[#3d2a1a]">
                Yummy Points
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Turn missed treats into future treats.
              </p>
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Test marker: {dashboardBuildMarker}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card className="border-[#f1dfba] bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Add a child</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={handleAddChild}
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="child-name">Child name</Label>
                <Input
                  id="child-name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Name"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" disabled={addingChild || !childName.trim()}>
                <Plus aria-hidden="true" />
                {addingChild ? "Adding…" : "Add child"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link
              key={child.id}
              to="/children/$childId"
              params={{ childId: child.id }}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full border-[#f1dfba] bg-white shadow-sm transition-colors hover:border-[#e7c985] hover:bg-[#fffdf8]">
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#fff0b8] text-2xl">
                      {child.avatar_icon ?? "⭐"}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[#3d2a1a]">{child.name}</h2>
                      <p className="text-sm text-muted-foreground">{family.point_name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current balance</p>
                    <p className="text-3xl font-semibold text-[#3d2a1a]">
                      {child.current_balance} {family.point_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-[#3d2a1a]">
                    <UserRound aria-hidden="true" className="size-4" />
                    Open child home
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
