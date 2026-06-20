import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  FlaskConical,
  Gift,
  Palette,
  Pencil,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BadgeUnlockCelebration, type UnlockedBadge } from "@/components/badge-unlock-celebration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminSettings,
  getFirstPointsThreshold,
  resetAdminSettings,
  saveAdminSettings,
  type AdminSettings,
} from "@/lib/admin-settings";
import { getErrorMessage } from "@/lib/family-data";
import { addPointsActivity } from "@/lib/points-flow";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Admin Settings — Yummy Points" }] }),
  component: SettingsPage,
});

type FamilyMember = {
  family_id: string;
};

type TestFamily = {
  id: string;
  name: string;
  point_name: string;
};

type TestChild = {
  id: string;
  name: string;
  avatar_icon: string | null;
  avatar_colour: string | null;
  current_balance: number;
  total_points_earned: number;
  total_rewards_redeemed: number;
};

type RewardTemplate = {
  id: string;
  name: string;
  point_cost: number;
  is_active: boolean;
};

type TestActionResult = {
  message: string;
  childId?: string;
  unlockedBadge?: UnlockedBadge | null;
};

function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings>(() => getAdminSettings());
  const [family, setFamily] = useState<TestFamily | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [pointName, setPointName] = useState("");
  const [signedInEmail, setSignedInEmail] = useState("");
  const [children, setChildren] = useState<TestChild[]>([]);
  const [rewards, setRewards] = useState<RewardTemplate[]>([]);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState("");
  const [selectedTestChildId, setSelectedTestChildId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFamily, setSavingFamily] = useState(false);
  const [savingRewardId, setSavingRewardId] = useState<string | null>(null);
  const [savingChildId, setSavingChildId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testRunning, setTestRunning] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!sessionData.session?.user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const testData = await loadTestDataForUser(sessionData.session.user.id);

      if (isMounted) {
        setSettings(getAdminSettings());
        setSignedInEmail(sessionData.session.user.email ?? "");
        setFamily(testData.family);
        setFamilyName(testData.family?.name ?? "");
        setPointName(testData.family?.point_name ?? "");
        setChildren(testData.children);
        setRewards(testData.rewards);
        setSelectedTestChildId((currentChildId) =>
          getAvailableChildId(testData.children, currentChildId),
        );
        setLoading(false);
      }
    }

    loadSettings().catch((err: unknown) => {
      if (isMounted) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  function updateActivityName(id: string, name: string) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      activityPointValues: currentSettings.activityPointValues.map((activity) =>
        activity.id === id ? { ...activity, name } : activity,
      ),
    }));
    setSaved(false);
  }

  function updateActivityPoints(id: string, points: string) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      activityPointValues: currentSettings.activityPointValues.map((activity) =>
        activity.id === id ? { ...activity, points: Number(points) } : activity,
      ),
    }));
    setSaved(false);
  }

  function updateBadgeThreshold(id: string, threshold: string) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      badgeRules: currentSettings.badgeRules.map((badgeRule) =>
        badgeRule.id === id ? { ...badgeRule, threshold: Number(threshold) } : badgeRule,
      ),
    }));
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const savedSettings = saveAdminSettings(settings);
      setSettings(savedSettings);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings(resetAdminSettings());
    setSaved(true);
    setError(null);
  }

  async function handleSaveFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!family) return;

    const nextFamilyName = familyName.trim();
    const nextPointName = pointName.trim();
    if (!nextFamilyName || !nextPointName) return;

    setSavingFamily(true);
    setSaved(false);
    setError(null);

    try {
      const { data: updatedFamily, error: familyError } = await supabase
        .from("families")
        .update({
          name: nextFamilyName,
          point_name: nextPointName,
        })
        .eq("id", family.id)
        .select("id, name, point_name")
        .single<TestFamily>();

      if (familyError) throw familyError;

      setFamily(updatedFamily);
      setFamilyName(updatedFamily.name);
      setPointName(updatedFamily.point_name);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingFamily(false);
    }
  }

  async function refreshChildren() {
    if (!family) return;

    const { data: refreshedChildren, error: childrenError } = await supabase
      .from("children")
      .select(
        "id, name, avatar_icon, avatar_colour, current_balance, total_points_earned, total_rewards_redeemed",
      )
      .eq("family_id", family.id)
      .order("created_at", { ascending: true });

    if (childrenError) throw childrenError;
    const nextChildren = (refreshedChildren ?? []) as TestChild[];
    setChildren(nextChildren);
    setSelectedTestChildId((currentChildId) => getAvailableChildId(nextChildren, currentChildId));
  }

  async function handleCreateReward(e: React.FormEvent) {
    e.preventDefault();
    if (!family) return;

    const trimmedName = newRewardName.trim();
    const cost = Number(newRewardCost);
    if (!trimmedName || !Number.isInteger(cost) || cost <= 0) return;

    setSavingRewardId("new");
    setSaved(false);
    setError(null);

    try {
      const { data: createdReward, error: createError } = await supabase
        .from("reward_templates")
        .insert({
          family_id: family.id,
          name: trimmedName,
          point_cost: cost,
          is_active: true,
        })
        .select("id, name, point_cost, is_active")
        .single<RewardTemplate>();

      if (createError) throw createError;

      setRewards((currentRewards) => [...currentRewards, createdReward].sort(sortRewards));
      setNewRewardName("");
      setNewRewardCost("");
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRewardId(null);
    }
  }

  function updateRewardDraft(id: string, field: "name" | "point_cost", value: string) {
    setRewards((currentRewards) =>
      currentRewards.map((reward) =>
        reward.id === id
          ? {
              ...reward,
              [field]: field === "point_cost" ? Number(value) : value,
            }
          : reward,
      ),
    );
    setSaved(false);
  }

  async function handleSaveReward(reward: RewardTemplate) {
    if (!family) return;

    const trimmedName = reward.name.trim();
    const cost = Number(reward.point_cost);
    if (!trimmedName || !Number.isInteger(cost) || cost <= 0) return;

    setSavingRewardId(reward.id);
    setSaved(false);
    setError(null);

    try {
      const { data: updatedReward, error: updateError } = await supabase
        .from("reward_templates")
        .update({ name: trimmedName, point_cost: cost })
        .eq("family_id", family.id)
        .eq("id", reward.id)
        .select("id, name, point_cost, is_active")
        .single<RewardTemplate>();

      if (updateError) throw updateError;

      setRewards((currentRewards) =>
        currentRewards
          .map((currentReward) =>
            currentReward.id === updatedReward.id ? updatedReward : currentReward,
          )
          .sort(sortRewards),
      );
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRewardId(null);
    }
  }

  async function handleHideReward(reward: RewardTemplate) {
    if (!family) return;

    if (!window.confirm(`Hide "${reward.name}" from reward choices? Past activity will stay.`)) {
      return;
    }

    setSavingRewardId(reward.id);
    setSaved(false);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("reward_templates")
        .update({ is_active: false })
        .eq("family_id", family.id)
        .eq("id", reward.id);

      if (updateError) throw updateError;

      setRewards((currentRewards) =>
        currentRewards.filter((currentReward) => currentReward.id !== reward.id),
      );
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRewardId(null);
    }
  }

  function updateChildDraft(
    id: string,
    field: "name" | "avatar_icon" | "avatar_colour",
    value: string,
  ) {
    setChildren((currentChildren) =>
      currentChildren.map((child) => (child.id === id ? { ...child, [field]: value } : child)),
    );
    setSaved(false);
  }

  async function handleSaveChildProfile(child: TestChild) {
    if (!family) return;

    const trimmedName = child.name.trim();
    const trimmedIcon = child.avatar_icon?.trim() || "⭐";
    const avatarColour = child.avatar_colour || "soft-yellow";
    if (!trimmedName) return;

    setSavingChildId(child.id);
    setSaved(false);
    setError(null);

    try {
      const { data: updatedChild, error: updateError } = await supabase
        .from("children")
        .update({
          name: trimmedName,
          avatar_icon: trimmedIcon,
          avatar_colour: avatarColour,
        })
        .eq("family_id", family.id)
        .eq("id", child.id)
        .select(
          "id, name, avatar_icon, avatar_colour, current_balance, total_points_earned, total_rewards_redeemed",
        )
        .single<TestChild>();

      if (updateError) throw updateError;

      setChildren((currentChildren) =>
        currentChildren.map((currentChild) =>
          currentChild.id === updatedChild.id ? updatedChild : currentChild,
        ),
      );
      setSelectedTestChildId((currentChildId) =>
        currentChildId === updatedChild.id ? updatedChild.id : currentChildId,
      );
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingChildId(null);
    }
  }

  async function runTestAction(actionId: string, action: () => Promise<TestActionResult>) {
    setTestRunning(actionId);
    setError(null);
    setTestStatus(null);

    try {
      const result = await action();
      await refreshChildren();
      setTestStatus(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTestRunning(null);
    }
  }

  async function handleAddSampleActivity() {
    await runTestAction("sample-activity", async () => {
      const child = getSelectedTestChild(children, selectedTestChildId);
      if (!family) throw new Error("Family data is not ready yet.");
      const samplePoints = settings.activityPointValues[0]?.points ?? 1;

      const result = await addPointsActivity({
        familyId: family.id,
        childId: child.id,
        currentBalance: child.current_balance,
        points: samplePoints,
        note: "Test sample activity",
        settings,
      });

      return {
        message: "Sample activity added",
        childId: child.id,
        unlockedBadge: result.unlockedBadge,
      };
    });
  }

  async function handleAddBadgeUnlockingActivity() {
    await runTestAction("badge-activity", async () => {
      if (!family) throw new Error("Family data is not ready yet.");

      const child = await getBadgeUnlockTestChild(
        getSelectedTestChild(children, selectedTestChildId),
      );
      const firstPointsThreshold = getFirstPointsThreshold(settings);
      const pointsNeeded = Math.max(firstPointsThreshold - child.current_balance, 1);

      const result = await addPointsActivity({
        familyId: family.id,
        childId: child.id,
        currentBalance: child.current_balance,
        points: pointsNeeded,
        note: "Test badge-unlocking activity",
        settings,
        requireFirstPointsUnlock: true,
      });

      return {
        message: "Sample badge activity added",
        childId: child.id,
        unlockedBadge: result.unlockedBadge,
      };
    });
  }

  async function handleResetPoints() {
    const child = getSelectedTestChild(children, selectedTestChildId);

    if (
      !window.confirm(
        `Reset ${child.name}'s point balance to 0? Activity history will stay in place.`,
      )
    ) {
      return;
    }

    await runTestAction("reset-points", async () => {
      if (!family) throw new Error("Family data is not ready yet.");

      const { error: resetError } = await supabase
        .from("children")
        .update({ current_balance: 0 })
        .eq("family_id", family.id)
        .eq("id", child.id);

      if (resetError) throw resetError;
      await verifyPointsReset(family.id, child.id);
      return { message: `${child.name}'s point balance was reset to 0.` };
    });
  }

  async function handleResetBadges() {
    const child = getSelectedTestChild(children, selectedTestChildId);

    if (
      !window.confirm(
        `Reset unlocked badges for ${child.name}? Activity history will stay in place.`,
      )
    ) {
      return;
    }

    await runTestAction("reset-badges", async () => {
      await deleteChildBadges([child]);
      return { message: `${child.name}'s unlocked badges were reset.` };
    });
  }

  async function handleClearActivityHistory() {
    const child = getSelectedTestChild(children, selectedTestChildId);

    if (!window.confirm(`Clear ${child.name}'s activity history? This cannot be undone.`)) {
      return;
    }

    await runTestAction("clear-history", async () => {
      if (!family) throw new Error("Family data is not ready yet.");

      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("family_id", family.id)
        .eq("child_id", child.id);

      if (deleteError) throw deleteError;
      await verifyActivityHistoryCleared(family.id, child.id);
      return { message: `${child.name}'s activity history was cleared.` };
    });
  }

  async function handleResetAllTestData() {
    const child = getSelectedTestChild(children, selectedTestChildId);

    if (
      !window.confirm(
        `Reset all test data for ${child.name}? This will clear activity history, reset badges, and set the point balance to 0.`,
      )
    ) {
      return;
    }

    await runTestAction("reset-all", async () => {
      if (!family) throw new Error("Family data is not ready yet.");

      const { error: deleteTransactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("family_id", family.id)
        .eq("child_id", child.id);

      if (deleteTransactionsError) throw deleteTransactionsError;
      await verifyActivityHistoryCleared(family.id, child.id);

      await deleteChildBadges([child]);

      const { error: resetPointsError } = await supabase
        .from("children")
        .update({ current_balance: 0 })
        .eq("family_id", family.id)
        .eq("id", child.id);

      if (resetPointsError) throw resetPointsError;
      await verifyPointsReset(family.id, child.id);

      return { message: `All test data was reset for ${child.name}.` };
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 pb-8">
        <header className="sticky top-0 z-10 -mx-4 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Family controls</p>
              <h1 className="truncate text-2xl font-semibold tracking-normal text-foreground sm:text-4xl">
                Settings
              </h1>
            </div>
            <Button asChild variant="outline" size="icon" aria-label="Back to dashboard">
              <Link to="/dashboard">
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </header>

        <Tabs defaultValue="family" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted p-1 sm:grid-cols-5">
            <TabsTrigger value="family" className="gap-2 py-2">
              <UsersRound aria-hidden="true" className="size-4" />
              Family
            </TabsTrigger>
            <TabsTrigger value="children" className="gap-2 py-2">
              <Palette aria-hidden="true" className="size-4" />
              Children
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2 py-2">
              <Gift aria-hidden="true" className="size-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="points" className="gap-2 py-2">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Points
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2 py-2">
              <FlaskConical aria-hidden="true" className="size-4" />
              Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="family" className="space-y-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">Account</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The email currently signed in on this device.
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Signed in as</p>
                  <p className="mt-1 break-all text-lg font-semibold text-foreground">
                    {signedInEmail || "Email unavailable"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
                  <Settings2 aria-hidden="true" className="size-6 text-primary" />
                  Family settings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Naming and labels used across the app.
                </p>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={handleSaveFamily}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="family-name">Family name</Label>
                      <Input
                        id="family-name"
                        value={familyName}
                        onChange={(e) => {
                          setFamilyName(e.target.value);
                          setSaved(false);
                        }}
                        placeholder="My Family"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="point-name">Point name</Label>
                      <Input
                        id="point-name"
                        value={pointName}
                        onChange={(e) => {
                          setPointName(e.target.value);
                          setSaved(false);
                        }}
                        placeholder="Yummy Points"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={savingFamily || !familyName.trim() || !pointName.trim()}
                  >
                    <Save aria-hidden="true" />
                    {savingFamily ? "Saving..." : "Save family settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <section className="grid gap-3 sm:grid-cols-2">
              {futureSettings.map((setting) => (
                <div
                  key={setting.title}
                  className="rounded-xl border border-dashed border-secondary/50 bg-secondary/10 p-4"
                >
                  <p className="font-semibold text-foreground">{setting.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{setting.description}</p>
                </div>
              ))}
            </section>
          </TabsContent>

          <TabsContent value="children">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
                  <Palette aria-hidden="true" className="size-6 text-primary" />
                  Child profiles
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update each child's display name, icon, and profile colour.
                </p>
              </CardHeader>
              <CardContent>
                {children.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/15 px-4 py-8 text-center text-sm font-medium text-secondary-foreground">
                    Add a child on the dashboard before editing profiles.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {children.map((child) => (
                      <section
                        key={child.id}
                        className="grid gap-4 rounded-lg border border-secondary/40 bg-secondary/10 p-4 lg:grid-cols-[auto_1fr]"
                      >
                        <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                          <div
                            className={`flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm ${getAvatarColourClass(child.avatar_colour)}`}
                          >
                            {child.avatar_icon || "⭐"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {child.current_balance} {family?.point_name ?? "points"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {child.total_rewards_redeemed} rewards redeemed
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[1fr_110px_170px_auto]">
                          <div className="space-y-2">
                            <Label htmlFor={`${child.id}-profile-name`}>Name</Label>
                            <Input
                              id={`${child.id}-profile-name`}
                              value={child.name}
                              onChange={(e) => updateChildDraft(child.id, "name", e.target.value)}
                              autoComplete="off"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${child.id}-profile-icon`}>Icon</Label>
                            <Input
                              id={`${child.id}-profile-icon`}
                              value={child.avatar_icon ?? ""}
                              onChange={(e) =>
                                updateChildDraft(child.id, "avatar_icon", e.target.value)
                              }
                              maxLength={4}
                              placeholder="⭐"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${child.id}-profile-colour`}>Colour</Label>
                            <Select
                              value={child.avatar_colour ?? "soft-yellow"}
                              onValueChange={(value) =>
                                updateChildDraft(child.id, "avatar_colour", value)
                              }
                            >
                              <SelectTrigger id={`${child.id}-profile-colour`} className="bg-card">
                                <SelectValue placeholder="Choose a colour" />
                              </SelectTrigger>
                              <SelectContent>
                                {avatarColourOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleSaveChildProfile(child)}
                            disabled={savingChildId === child.id || !child.name.trim()}
                            className="self-end"
                          >
                            <Save aria-hidden="true" />
                            {savingChildId === child.id ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
                  <Gift aria-hidden="true" className="size-6 text-primary" />
                  Reward management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add, edit, or hide the rewards children can redeem.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form
                  className="grid gap-3 rounded-lg border border-secondary/40 bg-secondary/10 p-4 sm:grid-cols-[1fr_9rem_auto]"
                  onSubmit={handleCreateReward}
                >
                  <div className="space-y-2">
                    <Label htmlFor="settings-new-reward-name">New reward</Label>
                    <Input
                      id="settings-new-reward-name"
                      value={newRewardName}
                      onChange={(e) => setNewRewardName(e.target.value)}
                      placeholder="Movie night"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-new-reward-cost">Cost</Label>
                    <Input
                      id="settings-new-reward-cost"
                      type="number"
                      min={1}
                      step={1}
                      value={newRewardCost}
                      onChange={(e) => setNewRewardCost(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      savingRewardId === "new" ||
                      !newRewardName.trim() ||
                      Number(newRewardCost) <= 0
                    }
                    className="self-end"
                  >
                    <Gift aria-hidden="true" />
                    {savingRewardId === "new" ? "Adding..." : "Add reward"}
                  </Button>
                </form>

                {rewards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/15 px-4 py-8 text-center text-sm font-medium text-secondary-foreground">
                    Add the first family reward here, or from any child's Rewards screen.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((reward) => (
                      <section
                        key={reward.id}
                        className="grid gap-3 rounded-lg border border-border bg-background/60 p-4 sm:grid-cols-[1fr_9rem_auto_auto]"
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`${reward.id}-reward-name`}>Reward</Label>
                          <Input
                            id={`${reward.id}-reward-name`}
                            value={reward.name}
                            onChange={(e) => updateRewardDraft(reward.id, "name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${reward.id}-reward-cost`}>Cost</Label>
                          <Input
                            id={`${reward.id}-reward-cost`}
                            type="number"
                            min={1}
                            step={1}
                            value={reward.point_cost}
                            onChange={(e) =>
                              updateRewardDraft(reward.id, "point_cost", e.target.value)
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleSaveReward(reward)}
                          disabled={
                            savingRewardId === reward.id ||
                            !reward.name.trim() ||
                            Number(reward.point_cost) <= 0
                          }
                          className="self-end"
                        >
                          <Pencil aria-hidden="true" />
                          {savingRewardId === reward.id ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleHideReward(reward)}
                          disabled={savingRewardId === reward.id}
                          className="self-end"
                        >
                          <Trash2 aria-hidden="true" />
                          Hide
                        </Button>
                      </section>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">Point rules</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Point values and badge thresholds used for new activity.
                </p>
              </CardHeader>
              <CardContent>
                <form className="space-y-8" onSubmit={handleSave}>
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Activity point values
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        These appear as activity choices on Add Points.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {settings.activityPointValues.map((activity) => (
                        <div
                          key={activity.id}
                          className="grid gap-3 rounded-lg border border-secondary/40 bg-secondary/10 p-3 sm:grid-cols-[1fr_140px]"
                        >
                          <div className="space-y-2">
                            <Label htmlFor={`${activity.id}-name`}>Activity name</Label>
                            <Input
                              id={`${activity.id}-name`}
                              value={activity.name}
                              onChange={(e) => updateActivityName(activity.id, e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${activity.id}-points`}>Points</Label>
                            <Input
                              id={`${activity.id}-points`}
                              type="number"
                              min={1}
                              step={1}
                              value={activity.points}
                              onChange={(e) => updateActivityPoints(activity.id, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Badge rules</h2>
                      <p className="text-sm text-muted-foreground">
                        Thresholds are checked when new points are saved.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {settings.badgeRules.map((badgeRule) => (
                        <div
                          key={badgeRule.id}
                          className="grid gap-3 rounded-lg border border-sunshine/50 bg-sunshine/15 p-3 sm:grid-cols-[1fr_160px]"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{badgeRule.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Unlocks when the child reaches this point total.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${badgeRule.id}-threshold`}>Threshold</Label>
                            <Input
                              id={`${badgeRule.id}-threshold`}
                              type="number"
                              min={1}
                              step={1}
                              value={badgeRule.threshold}
                              onChange={(e) => updateBadgeThreshold(badgeRule.id, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" disabled={saving}>
                      <Save aria-hidden="true" />
                      {saving ? "Saving..." : "Save point rules"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleReset}>
                      <RotateCcw aria-hidden="true" />
                      Reset defaults
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
                  <FlaskConical aria-hidden="true" className="size-6 text-secondary-foreground" />
                  Test tools
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Admin-only helpers for checking points, badges, and Activity History.
                </p>
              </CardHeader>
              <CardContent>
                <section className="space-y-4">
                  <div className="grid gap-2 sm:max-w-xs">
                    <Label htmlFor="test-child">Test child</Label>
                    <Select
                      value={selectedTestChildId}
                      onValueChange={setSelectedTestChildId}
                      disabled={children.length === 0 || Boolean(testRunning)}
                    >
                      <SelectTrigger id="test-child" className="bg-card">
                        <SelectValue placeholder="Choose a child" />
                      </SelectTrigger>
                      <SelectContent>
                        {children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddSampleActivity}
                      disabled={!family || children.length === 0 || Boolean(testRunning)}
                    >
                      <FlaskConical aria-hidden="true" />
                      {testRunning === "sample-activity" ? "Adding…" : "Add sample activity"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddBadgeUnlockingActivity}
                      disabled={!family || children.length === 0 || Boolean(testRunning)}
                    >
                      <BadgeCheck aria-hidden="true" />
                      {testRunning === "badge-activity"
                        ? "Adding…"
                        : "Add sample badge-unlocking activity"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetPoints}
                      disabled={!family || children.length === 0 || Boolean(testRunning)}
                    >
                      <RotateCcw aria-hidden="true" />
                      {testRunning === "reset-points" ? "Resetting…" : "Reset points"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetBadges}
                      disabled={!family || children.length === 0 || Boolean(testRunning)}
                    >
                      <RotateCcw aria-hidden="true" />
                      {testRunning === "reset-badges" ? "Resetting…" : "Reset badges"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearActivityHistory}
                      disabled={!family || children.length === 0 || Boolean(testRunning)}
                    >
                      <Trash2 aria-hidden="true" />
                      {testRunning === "clear-history" ? "Clearing…" : "Clear activity history"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleResetAllTestData}
                      disabled={!family || children.length === 0 || Boolean(testRunning)}
                    >
                      <Trash2 aria-hidden="true" />
                      {testRunning === "reset-all" ? "Resetting…" : "Reset all test data"}
                    </Button>
                  </div>

                  {children.length === 0 && (
                    <div className="rounded-md border border-sunshine/50 bg-sunshine/15 px-4 py-3 text-sm text-sunshine-foreground">
                      Add a child on the dashboard before using sample activity tools.
                    </div>
                  )}

                  {testStatus && (
                    <div className="space-y-3">
                      {testStatus.unlockedBadge && (
                        <BadgeUnlockCelebration badge={testStatus.unlockedBadge} />
                      )}
                      <div className="flex flex-col gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success sm:flex-row sm:items-center sm:justify-between">
                        <span>{testStatus.message}</span>
                        {testStatus.childId && (
                          <Button asChild size="sm" variant="outline" className="w-fit bg-card">
                            <Link
                              to="/children/$childId/activity-history"
                              params={{ childId: testStatus.childId }}
                            >
                              View Activity History
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {saved && (
            <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
              Settings saved.
            </div>
          )}
        </Tabs>
      </main>
    </div>
  );
}

const futureSettings = [
  {
    title: "Family members",
    description: "Invites and parent roles can be added without crowding the dashboard.",
  },
  {
    title: "Data controls",
    description: "Export and deeper reset options can stay separate from daily use.",
  },
];

async function loadTestDataForUser(userId: string) {
  const { data: membership, error: membershipError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<FamilyMember>();

  if (membershipError) throw membershipError;
  if (!membership) return { family: null, children: [], rewards: [] };

  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id, name, point_name")
    .eq("id", membership.family_id)
    .single<TestFamily>();

  if (familyError) throw familyError;

  const { data: children, error: childrenError } = await supabase
    .from("children")
    .select(
      "id, name, avatar_icon, avatar_colour, current_balance, total_points_earned, total_rewards_redeemed",
    )
    .eq("family_id", family.id)
    .order("created_at", { ascending: true });

  if (childrenError) throw childrenError;

  const { data: rewards, error: rewardsError } = await supabase
    .from("reward_templates")
    .select("id, name, point_cost, is_active")
    .eq("family_id", family.id)
    .eq("is_active", true)
    .order("point_cost", { ascending: true })
    .order("created_at", { ascending: true });

  if (rewardsError) throw rewardsError;

  return {
    family,
    children: (children ?? []) as TestChild[],
    rewards: ((rewards ?? []) as RewardTemplate[]).sort(sortRewards),
  };
}

const avatarColourOptions = [
  { value: "ocean", label: "Ocean" },
  { value: "sky", label: "Sky" },
  { value: "violet", label: "Violet" },
  { value: "coral", label: "Coral" },
  { value: "amber", label: "Amber" },
  { value: "leaf", label: "Leaf" },
  { value: "soft-yellow", label: "Sunshine" },
];

function getAvatarColourClass(colour: string | null) {
  switch (colour) {
    case "ocean":
      return "bg-blue-600 text-white ring-2 ring-blue-200";
    case "mint":
    case "leaf":
      return "bg-emerald-500 text-white ring-2 ring-emerald-200";
    case "sky":
      return "bg-sky-400 text-sky-950 ring-2 ring-sky-100";
    case "pink":
    case "coral":
      return "bg-rose-500 text-white ring-2 ring-rose-200";
    case "lavender":
    case "violet":
      return "bg-violet-500 text-white ring-2 ring-violet-200";
    case "amber":
      return "bg-amber-400 text-amber-950 ring-2 ring-amber-100";
    case "soft-yellow":
    default:
      return "bg-sunshine text-sunshine-foreground ring-2 ring-sunshine/50";
  }
}

function sortRewards(a: RewardTemplate, b: RewardTemplate) {
  return a.point_cost - b.point_cost || a.name.localeCompare(b.name);
}

function getTestChild(children: TestChild[]) {
  const child = children[0];
  if (!child) throw new Error("Add a child before using test tools.");
  return child;
}

function getAvailableChildId(children: TestChild[], selectedChildId: string) {
  if (children.some((child) => child.id === selectedChildId)) return selectedChildId;
  return children[0]?.id ?? "";
}

function getSelectedTestChild(children: TestChild[], selectedChildId: string) {
  const child = children.find((currentChild) => currentChild.id === selectedChildId);
  if (child) return child;
  return getTestChild(children);
}

async function getBadgeUnlockTestChild(child: TestChild) {
  const { data: firstPointsBadge, error: badgeError } = await supabase
    .from("badges")
    .select("id")
    .eq("name", "First Points")
    .maybeSingle<{ id: string }>();

  if (badgeError) throw badgeError;
  if (!firstPointsBadge) throw new Error('Could not find the "First Points" badge.');

  const { data: existingChildBadges, error: existingBadgeError } = await supabase
    .from("child_badges")
    .select("child_id")
    .eq("child_id", child.id)
    .eq("badge_id", firstPointsBadge.id);

  if (existingBadgeError) throw existingBadgeError;

  if ((existingChildBadges ?? []).length > 0) {
    throw new Error(
      `${child.name} already has the First Points badge. Reset this child's badges first; if you already did, the reset did not remove badge records.`,
    );
  }

  return child;
}

async function deleteChildBadges(children: TestChild[]) {
  const childIds = children.map((child) => child.id);
  if (childIds.length === 0) return;

  const badgeIdsBeforeDelete = await loadChildBadgeIds(childIds);
  if (badgeIdsBeforeDelete.length === 0) {
    clearPendingBadgeCelebrations(childIds);
    return;
  }

  const { error: deleteError } = await supabase
    .from("child_badges")
    .delete()
    .in("child_id", childIds);

  if (deleteError) throw deleteError;

  const remainingBadgeIds = await loadChildBadgeIds(childIds);
  if (remainingBadgeIds.length > 0) {
    throw new Error(
      "Badge reset did not remove badge records. Check the database delete policy for child_badges.",
    );
  }

  clearPendingBadgeCelebrations(childIds);
}

async function loadChildBadgeIds(childIds: string[]) {
  const { data: childBadges, error: childBadgesError } = await supabase
    .from("child_badges")
    .select("id")
    .in("child_id", childIds);

  if (childBadgesError) throw childBadgesError;
  return (childBadges ?? []).map((childBadge) => childBadge.id);
}

async function verifyActivityHistoryCleared(familyId: string, childId: string) {
  const { data: remainingTransactions, error: remainingTransactionsError } = await supabase
    .from("transactions")
    .select("id")
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .limit(1);

  if (remainingTransactionsError) throw remainingTransactionsError;

  if ((remainingTransactions ?? []).length > 0) {
    throw new Error(
      "Activity history was not cleared. Check the database delete policy for transactions.",
    );
  }
}

async function verifyPointsReset(familyId: string, childId: string) {
  const { data: childrenWithPoints, error: childrenError } = await supabase
    .from("children")
    .select("id")
    .eq("family_id", familyId)
    .eq("id", childId)
    .gt("current_balance", 0)
    .limit(1);

  if (childrenError) throw childrenError;

  if ((childrenWithPoints ?? []).length > 0) {
    throw new Error("Point balances were not reset.");
  }
}

function clearPendingBadgeCelebrations(childIds: string[]) {
  if (typeof window === "undefined") return;

  childIds.forEach((childId) => {
    window.sessionStorage.removeItem(`badge-unlocked-${childId}`);
  });
}
