import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage, loadChildForUser, type Child, type Family } from "@/lib/family-data";

export const Route = createFileRoute("/children/$childId_/add-points")({
  head: () => ({ meta: [{ title: "Add Points — Yummy Points" }] }),
  component: AddPointsPage,
});

const quickAddValues = [1, 2, 5, 10, 20];

type Badge = {
  id: string;
};

function AddPointsPage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(1);
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAddPoints() {
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
        setChild(loadedChild);
        setFamily(loadedFamily);
        setLoading(false);
      }
    }

    loadAddPoints().catch((err: unknown) => {
      if (isMounted) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [childId, navigate]);

  const customAmountValue = Number(customAmount);
  const amount = customAmount.trim() ? customAmountValue : selectedAmount;
  const canSave = Boolean(child && family && Number.isInteger(amount) && amount > 0);

  async function awardFirstPointsBadgeIfNeeded() {
    if (!child) return false;

    const { count, error: countError } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("child_id", child.id)
      .eq("type", "points_added");

    if (countError) throw countError;
    if (count !== 1) return false;

    const { data: firstPointsBadge, error: badgeError } = await supabase
      .from("badges")
      .select("id")
      .eq("trigger_type", "first_points")
      .single<Badge>();

    if (badgeError) throw badgeError;

    const { data: existingChildBadge, error: existingBadgeError } = await supabase
      .from("child_badges")
      .select("id")
      .eq("child_id", child.id)
      .eq("badge_id", firstPointsBadge.id)
      .maybeSingle<{ id: string }>();

    if (existingBadgeError) throw existingBadgeError;
    if (existingChildBadge) return false;

    const { error: childBadgeError } = await supabase.from("child_badges").insert({
      child_id: child.id,
      badge_id: firstPointsBadge.id,
    });

    if (childBadgeError) throw childBadgeError;

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!child || !family || !canSave) return;

    setSaving(true);
    setError(null);

    const { error: transactionError } = await supabase.from("transactions").insert({
      family_id: family.id,
      child_id: child.id,
      type: "points_added",
      points_change: amount,
      note: note.trim() || null,
    });

    if (transactionError) {
      setError(transactionError.message);
      setSaving(false);
      return;
    }

    try {
      const unlockedFirstPoints = await awardFirstPointsBadgeIfNeeded();
      navigate({
        to: "/children/$childId",
        params: { childId: child.id },
        search: { firstPoints: unlockedFirstPoints ? "1" : undefined },
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <p className="text-sm text-muted-foreground">Loading add points…</p>
      </div>
    );
  }

  if (!child || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <Card className="w-full max-w-md border-[#f1dfba] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#3d2a1a]">Add Points could not load</CardTitle>
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
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/children/$childId" params={{ childId }}>
            <ArrowLeft aria-hidden="true" />
            Back to {child.name}
          </Link>
        </Button>

        <Card className="border-[#f1dfba] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-[#3d2a1a]">Add Points</CardTitle>
            <p className="text-sm text-muted-foreground">
              {child.name} has {child.current_balance} {family.point_name}.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <Label>Quick add</Label>
                <div className="grid grid-cols-5 gap-2">
                  {quickAddValues.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={
                        !customAmount.trim() && selectedAmount === value ? "default" : "outline"
                      }
                      onClick={() => {
                        setSelectedAmount(value);
                        setCustomAmount("");
                      }}
                    >
                      +{value}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-amount">Custom amount</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points-note">Note</Label>
                <Textarea
                  id="points-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={!canSave || saving} className="w-full">
                <Check aria-hidden="true" />
                {saving ? "Saving…" : `Save +${amount} ${family.point_name}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
