import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminSettings,
  resetAdminSettings,
  saveAdminSettings,
  type AdminSettings,
} from "@/lib/admin-settings";
import { getErrorMessage } from "@/lib/family-data";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Admin Settings — Yummy Points" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings>(() => getAdminSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

      if (isMounted) {
        setSettings(getAdminSettings());
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf0] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/dashboard">
            <ArrowLeft aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>

        <Card className="border-[#f1dfba] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-[#3d2a1a]">Admin Settings</CardTitle>
            <p className="text-sm text-muted-foreground">
              Point values and badge thresholds used for new activity.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-8" onSubmit={handleSave}>
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#3d2a1a]">Activity point values</h2>
                  <p className="text-sm text-muted-foreground">
                    These appear as activity choices on Add Points.
                  </p>
                </div>

                <div className="space-y-3">
                  {settings.activityPointValues.map((activity) => (
                    <div
                      key={activity.id}
                      className="grid gap-3 rounded-md border border-[#f1dfba] bg-[#fffdf8] p-3 sm:grid-cols-[1fr_140px]"
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
                  <h2 className="text-lg font-semibold text-[#3d2a1a]">Badge rules</h2>
                  <p className="text-sm text-muted-foreground">
                    Thresholds are checked when new points are saved.
                  </p>
                </div>

                <div className="space-y-3">
                  {settings.badgeRules.map((badgeRule) => (
                    <div
                      key={badgeRule.id}
                      className="grid gap-3 rounded-md border border-[#f1dfba] bg-[#fffdf8] p-3 sm:grid-cols-[1fr_160px]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#3d2a1a]">{badgeRule.name}</p>
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

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {saved && (
                <div className="rounded-md border border-[#f1dfba] bg-[#fffdf8] px-4 py-3 text-sm font-medium text-[#3d2a1a]">
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
