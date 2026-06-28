import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Gift, PartyPopper } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { awardEligibleBadges } from "@/lib/badge-engine";
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
  reward_template_child_targets?: { child_id: string }[];
};



type RewardStatus = {
  redeemed: boolean;
  firstRewardUnlocked: boolean;
  rewardName: string | null;
  pointsSpent: number | null;
  updatedBalance: number | null;
};

type RedeemedReward = {
  id: string;
  points_change: number;
  note: string | null;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function RewardsPage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [rewards, setRewards] = useState<RewardTemplate[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [rewardStatus, setRewardStatus] = useState<RewardStatus>({
    redeemed: false,
    firstRewardUnlocked: false,
    rewardName: null,
    pointsSpent: null,
    updatedBalance: null,
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
      const loadedRedeemedRewards = await loadRedeemedRewards(loadedFamily.id, loadedChild.id);

      if (isMounted) {
        setRewardStatus(readRewardStatus(childId));
        setChild(loadedChild);
        setFamily(loadedFamily);
        setRewards(loadedRewards);
        setRedeemedRewards(loadedRedeemedRewards);
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
    setRewardStatus(createEmptyRewardStatus());

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

    if (child.current_balance < selectedReward.point_cost) {
      setError(
        `${child.name} needs ${selectedReward.point_cost - child.current_balance} more ${family.point_name} to redeem ${selectedReward.name}.`,
      );
      setSelectedReward(null);
      return;
    }

    setRedeeming(true);
    setError(null);
    setRewardStatus(createEmptyRewardStatus());

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

      const earnedBadges = await awardEligibleBadges({ familyId: family.id, childId: child.id });
      const firstRewardUnlocked = earnedBadges.some((badge) => badge.name === "First Reward");
      const firstEarnedBadge = earnedBadges[0] ?? null;

      if (firstEarnedBadge && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          `badge-unlocked-${child.id}`,
          JSON.stringify(firstEarnedBadge),
        );
      }

      const { data: updatedChild, error: childError } = await supabase
        .from("children")
        .select(
          "id, family_id, name, avatar_icon, avatar_colour, current_balance, total_points_earned, total_rewards_redeemed",
        )
        .eq("id", child.id)
        .single<Child>();

      if (childError) throw childError;

      const refreshedRewards = await loadFamilyRewards(family.id, child.id);
      const refreshedRedeemedRewards = await loadRedeemedRewards(family.id, child.id);
      const nextRewardStatus: RewardStatus = {
        redeemed: true,
        firstRewardUnlocked,
        rewardName: selectedReward.name,
        pointsSpent: selectedReward.point_cost,
        updatedBalance: updatedChild.current_balance,
      };

      saveRewardStatus(child.id, nextRewardStatus);
      setChild(updatedChild);
      setRewards(refreshedRewards);
      setRedeemedRewards(refreshedRedeemedRewards);
      setRewardStatus(nextRewardStatus);
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
                <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-4 text-success shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 animate-bounce items-center justify-center rounded-full bg-success text-success-foreground">
                      <PartyPopper aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {rewardStatus.rewardName
                          ? `${rewardStatus.rewardName} redeemed!`
                          : "Reward redeemed!"}
                      </p>
                      <p className="mt-1 text-sm text-success/90">
                        {rewardStatus.pointsSpent
                          ? `${child.name} spent ${rewardStatus.pointsSpent} ${family.point_name}. `
                          : ""}
                        Updated balance:{" "}
                        <span className="font-semibold">
                          {rewardStatus.updatedBalance ?? child.current_balance} {family.point_name}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
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

            <RedeemedRewardsHistory
              child={child}
              family={family}
              redeemedRewards={redeemedRewards}
            />
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
            <Button
              onClick={handleRedeemReward}
              disabled={
                redeeming ||
                Boolean(selectedReward && child.current_balance < selectedReward.point_cost)
              }
            >
              <Check aria-hidden="true" />
              {redeeming ? "Redeeming…" : "Redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RedeemedRewardsHistory({
  child,
  family,
  redeemedRewards,
}: {
  child: Child;
  family: Family;
  redeemedRewards: RedeemedReward[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Redeemed rewards</h2>
        <Badge variant="secondary">{redeemedRewards.length}</Badge>
      </div>

      {redeemedRewards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/10 px-4 py-5 text-sm font-medium text-muted-foreground">
          No rewards redeemed yet.
        </div>
      ) : (
        <div className="space-y-2">
          {redeemedRewards.map((reward) => (
            <div
              key={reward.id}
              className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-foreground">{getRedeemedRewardName(reward)}</p>
                <p className="text-sm text-muted-foreground">
                  Redeemed for {child.name} on {formatDate(reward.created_at)}
                </p>
              </div>
              <Badge variant="secondary" className="w-fit">
                {Math.abs(reward.points_change)} {family.point_name} spent
              </Badge>
            </div>
          ))}
        </div>
      )}
    </section>
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
    .select("id, name, point_cost, is_active, child_id, reward_template_child_targets(child_id)")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .order("point_cost", { ascending: true })
    .order("created_at", { ascending: true });

  if (rewardsError) throw rewardsError;
  return ((loadedRewards ?? []) as RewardTemplate[])
    .filter((reward) => isRewardAvailableForChild(reward, childId))
    .sort(sortRewards);
}

async function loadRedeemedRewards(familyId: string, childId: string) {
  const { data: loadedRedeemedRewards, error: redeemedRewardsError } = await supabase
    .from("transactions")
    .select("id, points_change, note, created_at")
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .eq("type", "reward_redeemed")
    .order("created_at", { ascending: false })
    .limit(5);

  if (redeemedRewardsError) throw redeemedRewardsError;
  return (loadedRedeemedRewards ?? []) as RedeemedReward[];
}

function getRewardScopeLabel(reward: RewardTemplate, child: Child) {
  const targetedChildren = reward.reward_template_child_targets ?? [];
  if (targetedChildren.length > 1) return "Selected children";
  if (targetedChildren.some((target) => target.child_id === child.id))
    return `Just for ${child.name}`;
  return reward.child_id ? `Just for ${child.name}` : "Family reward";
}

function isRewardAvailableForChild(reward: RewardTemplate, childId: string) {
  const targetedChildren = reward.reward_template_child_targets ?? [];
  if (targetedChildren.length > 0) {
    return targetedChildren.some((target) => target.child_id === childId);
  }

  return !reward.child_id || reward.child_id === childId;
}

function saveRewardStatus(childId: string, status: RewardStatus) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(`reward-redeemed-${childId}`, JSON.stringify(status));
}

function readRewardStatus(childId: string): RewardStatus {
  if (typeof window === "undefined") {
    return createEmptyRewardStatus();
  }

  const storedStatus = window.sessionStorage.getItem(`reward-redeemed-${childId}`);
  window.sessionStorage.removeItem(`reward-redeemed-${childId}`);

  if (!storedStatus) return createEmptyRewardStatus();

  try {
    const parsedStatus = JSON.parse(storedStatus) as Partial<RewardStatus>;
    return {
      redeemed: Boolean(parsedStatus.redeemed),
      firstRewardUnlocked: Boolean(parsedStatus.firstRewardUnlocked),
      rewardName: typeof parsedStatus.rewardName === "string" ? parsedStatus.rewardName : null,
      pointsSpent:
        typeof parsedStatus.pointsSpent === "number" && Number.isFinite(parsedStatus.pointsSpent)
          ? parsedStatus.pointsSpent
          : null,
      updatedBalance:
        typeof parsedStatus.updatedBalance === "number" &&
        Number.isFinite(parsedStatus.updatedBalance)
          ? parsedStatus.updatedBalance
          : null,
    };
  } catch {
    return { ...createEmptyRewardStatus(), redeemed: true };
  }
}

function createEmptyRewardStatus(): RewardStatus {
  return {
    redeemed: false,
    firstRewardUnlocked: false,
    rewardName: null,
    pointsSpent: null,
    updatedBalance: null,
  };
}

function getRedeemedRewardName(reward: RedeemedReward) {
  return reward.note?.trim() || "Reward redeemed";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function sortRewards(a: RewardTemplate, b: RewardTemplate) {
  return a.point_cost - b.point_cost || a.name.localeCompare(b.name);
}
