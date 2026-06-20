import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Gift, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage, loadChildForUser, type Child, type Family } from "@/lib/family-data";

export const Route = createFileRoute("/children/$childId_/rewards")({
  head: () => ({ meta: [{ title: "Rewards — Yummy Points" }] }),
  component: RewardsPage,
});

type RewardTemplate = {
  id: string;
  name: string;
  point_cost: number;
  is_active: boolean;
  child_id: string | null;
};

type RewardScope = "family" | "child";

type RewardStatus = {
  redeemed: boolean;
  firstRewardUnlocked: boolean;
};

type RewardBadge = {
  id: string;
  name: string;
  icon: string | null;
};

function RewardsPage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [rewards, setRewards] = useState<RewardTemplate[]>([]);
  const [rewardName, setRewardName] = useState("");
  const [rewardCost, setRewardCost] = useState("");
  const [rewardScope, setRewardScope] = useState<RewardScope>("family");
  const [selectedReward, setSelectedReward] = useState<RewardTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [rewardStatus, setRewardStatus] = useState<RewardStatus>({
    redeemed: false,
    firstRewardUnlocked: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRewards() {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const { child: loadedChild, family: loadedFamily } = await loadChildForUser(childId, user.id);
      const loadedRewards = await loadFamilyRewards(loadedFamily.id, loadedChild.id);

      if (isMounted) {
        setRewardStatus(readRewardStatus(childId));
        setChild(loadedChild);
        setFamily(loadedFamily);
        setRewards(loadedRewards);
        setLoading(false);
      }
    }

    loadRewards().catch((err: unknown) => {
      if (isMounted) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [childId, navigate]);

  async function handleCreateReward(e: React.FormEvent) {
    e.preventDefault();
    if (!family) return;

    const trimmedName = rewardName.trim();
    const cost = Number(rewardCost);
    if (!trimmedName || !Number.isInteger(cost) || cost <= 0) return;

    setSaving(true);
    setError(null);
    setRewardStatus({ redeemed: false, firstRewardUnlocked: false });

    const { data: createdReward, error: createError } = await supabase
      .from("reward_templates")
      .insert({
        family_id: family.id,
        name: trimmedName,
        point_cost: cost,
        is_active: true,
        child_id: rewardScope === "child" ? child.id : null,
      })
      .select("id, name, point_cost, is_active, child_id")
      .single<RewardTemplate>();

    setSaving(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    setRewards((currentRewards) => [...currentRewards, createdReward].sort(sortRewards));
    setRewardName("");
    setRewardCost("");
    setRewardScope("family");
  }

  async function handleRedeemReward() {
    if (!child || !family || !selectedReward) return;

    setRedeeming(true);
    setError(null);
    setRewardStatus({ redeemed: false, firstRewardUnlocked: false });

    try {
      const { error: transactionError } = await supabase.from("transactions").insert({
        family_id: family.id,
        child_id: child.id,
        type: "reward_redeemed",
        points_change: -selectedReward.point_cost,
        reward_template_id: selectedReward.id,
        note: selectedReward.name,
      });

      if (transactionError) throw transactionError;

      const firstRewardUnlocked = await awardFirstRewardBadgeIfNeeded(child.id);

      const { data: updatedChild, error: childError } = await supabase
        .from("children")
        .select(
          "id, family_id, name, avatar_icon, avatar_colour, current_balance, total_points_earned, total_rewards_redeemed",
        )
        .eq("id", child.id)
        .single<Child>();

      if (childError) throw childError;

      const refreshedRewards = await loadFamilyRewards(family.id, child.id);
      saveRewardStatus(child.id, { redeemed: true, firstRewardUnlocked });
      setChild(updatedChild);
      setRewards(refreshedRewards);
      setRewardStatus({ redeemed: true, firstRewardUnlocked });
      setSelectedReward(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading rewards…</p>
      </div>
    );
  }

  if (!child || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Rewards could not load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error ?? "We could not load rewards for this child."}
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
              <Gift aria-hidden="true" className="size-6 text-primary" />
              Rewards
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {child.name} has{" "}
              <span className="font-semibold text-primary">
                {child.current_balance} {family.point_name}
              </span>{" "}
              ready to spend.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {rewardStatus.redeemed && (
              <div className="space-y-3">
                <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                  🎁 Reward redeemed!
                </div>
                {rewardStatus.firstRewardUnlocked && (
                  <div className="rounded-lg border border-sunshine/60 bg-sunshine/20 px-4 py-3 text-sm font-semibold text-sunshine-foreground">
                    🎁 First Reward unlocked!
                  </div>
                )}
              </div>
            )}

            <form
              className="grid gap-3 sm:grid-cols-[1fr_9rem_13rem_auto]"
              onSubmit={handleCreateReward}
            >
              <div className="space-y-2">
                <Label htmlFor="reward-name">Reward</Label>
                <Input
                  id="reward-name"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  placeholder="Ice cream trip"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-cost">Cost</Label>
                <Input
                  id="reward-cost"
                  type="number"
                  min={1}
                  step={1}
                  value={rewardCost}
                  onChange={(e) => setRewardCost(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-scope">Who can use this reward?</Label>
                <Select
                  value={rewardScope}
                  onValueChange={(value) => setRewardScope(value as RewardScope)}
                >
                  <SelectTrigger id="reward-scope" className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family">Whole family</SelectItem>
                    <SelectItem value="child">This child only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={saving || !rewardName.trim() || Number(rewardCost) <= 0}
                className="self-end"
              >
                <Plus aria-hidden="true" />
                {saving ? "Adding…" : "Add"}
              </Button>
            </form>

            {rewards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/15 px-5 py-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Gift aria-hidden="true" className="size-6" />
                </div>
                <p className="mt-4 font-semibold text-foreground">
                  No rewards yet. Create one above.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <RewardSection
                  title="Available now"
                  emptyText="No rewards available yet."
                  rewards={rewards.filter((reward) => child.current_balance >= reward.point_cost)}
                  child={child}
                  family={family}
                  onRedeem={setSelectedReward}
                />
                <RewardSection
                  title="Saving towards"
                  emptyText="No saving goals right now."
                  rewards={rewards.filter((reward) => child.current_balance < reward.point_cost)}
                  child={child}
                  family={family}
                  onRedeem={setSelectedReward}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={Boolean(selectedReward)}
        onOpenChange={(open) => !open && setSelectedReward(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem reward?</DialogTitle>
            <DialogDescription>
              This will spend {selectedReward?.point_cost ?? 0} {family.point_name} from{" "}
              {child.name}'s balance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReward(null)} disabled={redeeming}>
              Cancel
            </Button>
            <Button onClick={handleRedeemReward} disabled={redeeming}>
              <Check aria-hidden="true" />
              {redeeming ? "Redeeming…" : "Redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RewardSection({
  title,
  emptyText,
  rewards,
  child,
  family,
  onRedeem,
}: {
  title: string;
  emptyText: string;
  rewards: RewardTemplate[];
  child: Child;
  family: Family;
  onRedeem: (reward: RewardTemplate) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary">{rewards.length}</Badge>
      </div>

      {rewards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/10 px-4 py-5 text-sm font-medium text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rewards.map((reward) => {
            const canAfford = child.current_balance >= reward.point_cost;
            const pointsNeeded = Math.max(reward.point_cost - child.current_balance, 0);

            return (
              <div
                key={reward.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-background/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{reward.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {reward.point_cost} {family.point_name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {getRewardScopeLabel(reward, child)}
                    </p>
                  </div>
                  <Badge variant={canAfford ? "default" : "secondary"}>
                    {canAfford ? "Ready" : `${pointsNeeded} more`}
                  </Badge>
                </div>

                {canAfford ? (
                  <Button type="button" onClick={() => onRedeem(reward)} className="mt-auto">
                    <Gift aria-hidden="true" />
                    Redeem
                  </Button>
                ) : (
                  <div className="mt-auto rounded-md bg-secondary/15 px-3 py-2 text-sm font-medium text-secondary-foreground">
                    {child.name} needs {pointsNeeded} more {family.point_name}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

async function loadFamilyRewards(familyId: string, childId: string) {
  const { data: loadedRewards, error: rewardsError } = await supabase
    .from("reward_templates")
    .select("id, name, point_cost, is_active, child_id")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .or(`child_id.is.null,child_id.eq.${childId}`)
    .order("point_cost", { ascending: true })
    .order("created_at", { ascending: true });

  if (rewardsError) throw rewardsError;
  return ((loadedRewards ?? []) as RewardTemplate[]).sort(sortRewards);
}

function getRewardScopeLabel(reward: RewardTemplate, child: Child) {
  return reward.child_id ? `Just for ${child.name}` : "Family reward";
}

async function awardFirstRewardBadgeIfNeeded(childId: string) {
  const { data: firstRewardBadge, error: badgeError } = await supabase
    .from("badges")
    .select("id, name, icon")
    .eq("name", "First Reward")
    .maybeSingle<RewardBadge>();

  if (badgeError) {
    console.error("Could not load First Reward badge.", badgeError);
    return false;
  }

  if (!firstRewardBadge) {
    console.error('Could not find "First Reward" badge.');
    return false;
  }

  const { data: existingChildBadge, error: existingBadgeError } = await supabase
    .from("child_badges")
    .select("id")
    .eq("child_id", childId)
    .eq("badge_id", firstRewardBadge.id)
    .maybeSingle<{ id: string }>();

  if (existingBadgeError) {
    console.error("Could not check First Reward badge.", existingBadgeError);
    return false;
  }

  if (existingChildBadge) return false;

  const { error: childBadgeError } = await supabase.from("child_badges").insert({
    child_id: childId,
    badge_id: firstRewardBadge.id,
  });

  if (childBadgeError) {
    console.error("Could not unlock First Reward badge.", childBadgeError);
    return false;
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      `badge-unlocked-${childId}`,
      JSON.stringify({ name: firstRewardBadge.name, icon: firstRewardBadge.icon }),
    );
  }

  return true;
}

function saveRewardStatus(childId: string, status: RewardStatus) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(`reward-redeemed-${childId}`, JSON.stringify(status));
}

function readRewardStatus(childId: string): RewardStatus {
  if (typeof window === "undefined") {
    return { redeemed: false, firstRewardUnlocked: false };
  }

  const storedStatus = window.sessionStorage.getItem(`reward-redeemed-${childId}`);
  window.sessionStorage.removeItem(`reward-redeemed-${childId}`);

  if (!storedStatus) return { redeemed: false, firstRewardUnlocked: false };

  try {
    const parsedStatus = JSON.parse(storedStatus) as Partial<RewardStatus>;
    return {
      redeemed: Boolean(parsedStatus.redeemed),
      firstRewardUnlocked: Boolean(parsedStatus.firstRewardUnlocked),
    };
  } catch {
    return { redeemed: true, firstRewardUnlocked: false };
  }
}

function sortRewards(a: RewardTemplate, b: RewardTemplate) {
  return a.point_cost - b.point_cost || a.name.localeCompare(b.name);
}
