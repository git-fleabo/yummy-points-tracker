import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, FlaskConical, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BadgeUnlockCelebration, type UnlockedBadge } from "@/components/badge-unlock-celebration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  point_name: string;
};

type TestChild = {
  id: string;
  name: string;
  current_balance: number;
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
  const [children, setChildren] = useState<TestChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setFamily(testData.family);
        setChildren(testData.children);
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

  async function refreshChildren() {
    if (!family) return;

    const { data: refreshedChildren, error: childrenError } = await supabase
      .from("children")
      .select("id, name, current_balance")
      .eq("family_id", family.id)
      .order("created_at", { ascending: true });

    if (childrenError) throw childrenError;
    setChildren((refreshedChildren ?? []) as TestChild[]);
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
      const child = getTestChild(children);
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

      const child = await getBadgeUnlockTestChild(children);
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
    if (
      !window.confirm("Reset all child point balances to 0? Activity history will stay in place.")
    ) {
      return;
    }

    await runTestAction("reset-points", async () => {
      if (!family) throw new Error("Family data is not ready yet.");

      const { error: resetError } = await supabase
        .from("children")
        .update({ current_balance: 0 })
        .eq("family_id", family.id);

      if (resetError) throw resetError;
      return { message: "Point balances were reset to 0 for this family." };
    });
  }

  async function handleResetBadges() {
    if (
      !window.confirm(
        "Reset all unlocked badges for this family? Activity history will stay in place.",
      )
    ) {
      return;
    }

    await runTestAction("reset-badges", async () => {
      await deleteChildBadges(children);
      return { message: "Unlocked badges were reset for this family." };
    });
  }

  async function handleClearActivityHistory() {
    if (!window.confirm("Clear all activity history for this family? This cannot be undone.")) {
      return;
    }

    await runTestAction("clear-history", async () => {
      if (!family) throw new Error("Family data is not ready yet.");

      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("family_id", family.id);

      if (deleteError) throw deleteError;
      await verifyActivityHistoryCleared(family.id);
      return { message: "Activity history was cleared for this family." };
    });
  }

  async function handleResetAllTestData() {
    if (
      !window.confirm(
        "Reset all test data for this family? This will clear activity history, reset badges, and set point balances to 0.",
      )
    ) {
      return;
    }

    await runTestAction("reset-all", async () => {
      if (!family) throw new Error("Family data is not ready yet.");

      const { error: deleteTransactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("family_id", family.id);

      if (deleteTransactionsError) throw deleteTransactionsError;
      await verifyActivityHistoryCleared(family.id);

      await deleteChildBadges(children);

      const { error: resetPointsError } = await supabase
        .from("children")
        .update({ current_balance: 0 })
        .eq("family_id", family.id);

      if (resetPointsError) throw resetPointsError;
      await verifyPointsReset(family.id);

      return { message: "All test data was reset for this family." };
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
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/dashboard">
            <ArrowLeft aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Admin Settings</CardTitle>
            <p className="text-sm text-muted-foreground">
              Point values and badge thresholds used for new activity.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-8" onSubmit={handleSave}>
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Activity point values</h2>
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

              <section className="space-y-4 rounded-lg border border-secondary/40 bg-secondary/10 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FlaskConical aria-hidden="true" className="size-5 text-secondary-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Test tools</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Admin-only helpers for checking points, badges, and Activity History. These are
                    for testing setup and cleanup, not normal daily use.
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Sample actions use {children[0]?.name ?? "the first child in this family"}.
                  </p>
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
                    disabled={!family || Boolean(testRunning)}
                  >
                    <Trash2 aria-hidden="true" />
                    {testRunning === "clear-history" ? "Clearing…" : "Clear activity history"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleResetAllTestData}
                    disabled={!family || Boolean(testRunning)}
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

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" disabled={saving}>
                  <Save aria-hidden="true" />
                  {saving ? "Saving…" : "Save settings"}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  <RotateCcw aria-hidden="true" />
                  Reset defaults
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

async function loadTestDataForUser(userId: string) {
  const { data: membership, error: membershipError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<FamilyMember>();

  if (membershipError) throw membershipError;
  if (!membership) return { family: null, children: [] };

  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id, point_name")
    .eq("id", membership.family_id)
    .single<TestFamily>();

  if (familyError) throw familyError;

  const { data: children, error: childrenError } = await supabase
    .from("children")
    .select("id, name, current_balance")
    .eq("family_id", family.id)
    .order("created_at", { ascending: true });

  if (childrenError) throw childrenError;

  return {
    family,
    children: (children ?? []) as TestChild[],
  };
}

function getTestChild(children: TestChild[]) {
  const child = children[0];
  if (!child) throw new Error("Add a child before using sample activity tools.");
  return child;
}

async function getBadgeUnlockTestChild(children: TestChild[]) {
  getTestChild(children);

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
    .in(
      "child_id",
      children.map((child) => child.id),
    )
    .eq("badge_id", firstPointsBadge.id);

  if (existingBadgeError) throw existingBadgeError;

  const childIdsWithBadge = new Set(
    (existingChildBadges ?? []).map((childBadge) => childBadge.child_id),
  );
  const childWithoutBadge = children.find((child) => !childIdsWithBadge.has(child.id));

  if (!childWithoutBadge) {
    throw new Error(
      "All children still have the First Points badge. Reset badges first; if you already did, the reset did not remove badge records.",
    );
  }

  return childWithoutBadge;
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

async function verifyActivityHistoryCleared(familyId: string) {
  const { data: remainingTransactions, error: remainingTransactionsError } = await supabase
    .from("transactions")
    .select("id")
    .eq("family_id", familyId)
    .limit(1);

  if (remainingTransactionsError) throw remainingTransactionsError;

  if ((remainingTransactions ?? []).length > 0) {
    throw new Error(
      "Activity history was not cleared. Check the database delete policy for transactions.",
    );
  }
}

async function verifyPointsReset(familyId: string) {
  const { data: childrenWithPoints, error: childrenError } = await supabase
    .from("children")
    .select("id")
    .eq("family_id", familyId)
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
