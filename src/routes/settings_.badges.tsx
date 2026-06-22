import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Award, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { awardManualBadge, type BadgeTriggerType } from "@/lib/badge-engine";
import { getErrorMessage } from "@/lib/family-data";

export const Route = createFileRoute("/settings_/badges")({
  head: () => ({ meta: [{ title: "Badge Builder — Yummy Points" }] }),
  component: BadgeBuilderPage,
});

type FamilyMember = {
  family_id: string;
};

type Family = {
  id: string;
  point_name: string;
};

type Child = {
  id: string;
  name: string;
};

type ManagedBadge = {
  id: string;
  family_id: string | null;
  name: string;
  description: string;
  icon: string;
  trigger_type: BadgeTriggerType;
  trigger_value: number;
  is_active: boolean;
};

type BadgeDraft = {
  name: string;
  description: string;
  icon: string;
  trigger_type: BadgeTriggerType;
  trigger_value: number;
};

const triggerLabels: Record<BadgeTriggerType, string> = {
  total_points_earned: "Total points earned",
  rewards_redeemed: "Rewards redeemed",
  treats_missed: "Number of treats missed",
  manual_award: "Manual award",
};

const emptyDraft: BadgeDraft = {
  name: "",
  description: "",
  icon: "⭐",
  trigger_type: "total_points_earned",
  trigger_value: 1,
};

function BadgeBuilderPage() {
  const navigate = useNavigate();
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [badges, setBadges] = useState<ManagedBadge[]>([]);
  const [newBadge, setNewBadge] = useState<BadgeDraft>(emptyDraft);
  const [selectedAwardChildId, setSelectedAwardChildId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBadgeBuilder() {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const loadedData = await loadBadgeBuilderData(user.id);

      if (isMounted) {
        setFamily(loadedData.family);
        setChildren(loadedData.children);
        setBadges(loadedData.badges);
        setSelectedAwardChildId(loadedData.children[0]?.id ?? "");
        setLoading(false);
      }
    }

    loadBadgeBuilder().catch((err: unknown) => {
      if (isMounted) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function refreshBadges(familyId: string) {
    const loadedBadges = await loadBadges(familyId);
    setBadges(loadedBadges);
  }

  async function handleCreateBadge(e: React.FormEvent) {
    e.preventDefault();
    if (!family) return;
    if (!newBadge.name.trim() || !newBadge.description.trim()) return;

    setSavingId("new");
    setError(null);
    setStatus(null);

    try {
      const { error: insertError } = await supabase.from("badges").insert({
        family_id: family.id,
        name: newBadge.name.trim(),
        description: newBadge.description.trim(),
        icon: newBadge.icon.trim() || "⭐",
        trigger_type: newBadge.trigger_type,
        trigger_value:
          newBadge.trigger_type === "manual_award" ? 1 : Number(newBadge.trigger_value),
        is_active: true,
      });

      if (insertError) throw insertError;
      await refreshBadges(family.id);
      setNewBadge(emptyDraft);
      setStatus("Badge created.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveBadge(badge: ManagedBadge) {
    if (!family || !badge.family_id) return;
    if (!badge.name.trim() || !badge.description.trim()) return;

    setSavingId(badge.id);
    setError(null);
    setStatus(null);

    try {
      const { error: updateError } = await supabase
        .from("badges")
        .update({
          name: badge.name.trim(),
          description: badge.description.trim(),
          icon: badge.icon.trim() || "⭐",
          trigger_type: badge.trigger_type,
          trigger_value: badge.trigger_type === "manual_award" ? 1 : Number(badge.trigger_value),
        })
        .eq("family_id", family.id)
        .eq("id", badge.id);

      if (updateError) throw updateError;
      await refreshBadges(family.id);
      setStatus("Badge saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleArchiveBadge(badge: ManagedBadge) {
    if (!family || !badge.family_id) return;
    if (!window.confirm(`Archive "${badge.name}"? Existing earned badges will stay visible.`)) {
      return;
    }

    setSavingId(badge.id);
    setError(null);
    setStatus(null);

    try {
      const { error: updateError } = await supabase
        .from("badges")
        .update({ is_active: false })
        .eq("family_id", family.id)
        .eq("id", badge.id);

      if (updateError) throw updateError;
      await refreshBadges(family.id);
      setStatus("Badge archived.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleManualAward(badge: ManagedBadge) {
    if (!selectedAwardChildId) return;

    setSavingId(`award-${badge.id}`);
    setError(null);
    setStatus(null);

    try {
      const awarded = await awardManualBadge({
        childId: selectedAwardChildId,
        badgeId: badge.id,
      });
      const child = children.find((currentChild) => currentChild.id === selectedAwardChildId);
      setStatus(
        awarded
          ? `${badge.name} awarded${child ? ` to ${child.name}` : ""}.`
          : `${child?.name ?? "This child"} already has ${badge.name}.`,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  function updateBadgeDraft(id: string, changes: Partial<ManagedBadge>) {
    setBadges((currentBadges) =>
      currentBadges.map((badge) => (badge.id === id ? { ...badge, ...changes } : badge)),
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading badge builder...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/settings">
            <ArrowLeft aria-hidden="true" />
            Back to settings
          </Link>
        </Button>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
              <Award aria-hidden="true" className="size-6 text-primary" />
              Badge Builder
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create milestone badges and manually award special badges.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {status && (
              <div className="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                {status}
              </div>
            )}

            <form
              className="grid gap-3 rounded-lg border border-secondary/40 bg-secondary/10 p-4 lg:grid-cols-[10rem_1fr_1fr_13rem_9rem_auto]"
              onSubmit={handleCreateBadge}
            >
              <BadgeFields
                draft={newBadge}
                disabled={false}
                idPrefix="new-badge"
                onChange={setNewBadge}
              />
              <Button
                type="submit"
                disabled={
                  savingId === "new" || !newBadge.name.trim() || !newBadge.description.trim()
                }
                className="self-end"
              >
                <Save aria-hidden="true" />
                {savingId === "new" ? "Creating..." : "Create"}
              </Button>
            </form>

            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Badge list</h2>
                  <p className="text-sm text-muted-foreground">
                    Built-in badges are shared defaults. Family badges can be edited or archived.
                  </p>
                </div>
                <div className="grid gap-2 sm:w-64">
                  <Label htmlFor="manual-award-child">Manual award child</Label>
                  <Select value={selectedAwardChildId} onValueChange={setSelectedAwardChildId}>
                    <SelectTrigger id="manual-award-child" className="bg-card">
                      <SelectValue placeholder="Choose child" />
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
              </div>

              <div className="space-y-3">
                {badges.map((badge) => {
                  const isFamilyBadge = Boolean(badge.family_id);
                  return (
                    <section
                      key={badge.id}
                      className="grid gap-3 rounded-lg border border-border bg-background/60 p-4 lg:grid-cols-[10rem_1fr_1fr_13rem_9rem_auto_auto]"
                    >
                      <BadgeFields
                        draft={badge}
                        disabled={!isFamilyBadge}
                        idPrefix={badge.id}
                        onChange={(nextDraft) => updateBadgeDraft(badge.id, nextDraft)}
                      />
                      <div className="flex flex-col justify-end gap-2">
                        <Badge variant={isFamilyBadge ? "default" : "secondary"} className="w-fit">
                          {isFamilyBadge ? "Family" : "Built-in"}
                        </Badge>
                        {badge.trigger_type === "manual_award" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleManualAward(badge)}
                            disabled={!selectedAwardChildId || savingId === `award-${badge.id}`}
                          >
                            Award
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-col justify-end gap-2">
                        <Button
                          type="button"
                          onClick={() => handleSaveBadge(badge)}
                          disabled={!isFamilyBadge || savingId === badge.id}
                        >
                          <Pencil aria-hidden="true" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleArchiveBadge(badge)}
                          disabled={!isFamilyBadge || savingId === badge.id}
                        >
                          <Trash2 aria-hidden="true" />
                          Archive
                        </Button>
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function BadgeFields({
  draft,
  disabled,
  idPrefix,
  onChange,
}: {
  draft: BadgeDraft;
  disabled: boolean;
  idPrefix: string;
  onChange: (draft: BadgeDraft) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-icon`}>Icon</Label>
        <Input
          id={`${idPrefix}-icon`}
          value={draft.icon}
          onChange={(e) => onChange({ ...draft, icon: e.target.value })}
          disabled={disabled}
          maxLength={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          disabled={disabled}
          className="min-h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-trigger`}>Trigger</Label>
        <Select
          value={draft.trigger_type}
          onValueChange={(value) => onChange({ ...draft, trigger_type: value as BadgeTriggerType })}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-trigger`} className="bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(triggerLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-target`}>Target</Label>
        <Input
          id={`${idPrefix}-target`}
          type="number"
          min={1}
          step={1}
          value={draft.trigger_type === "manual_award" ? 1 : draft.trigger_value}
          onChange={(e) => onChange({ ...draft, trigger_value: Number(e.target.value) })}
          disabled={disabled || draft.trigger_type === "manual_award"}
        />
      </div>
    </>
  );
}

async function loadBadgeBuilderData(userId: string) {
  const { data: membership, error: membershipError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<FamilyMember>();

  if (membershipError) throw membershipError;
  if (!membership) return { family: null, children: [], badges: [] };

  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id, point_name")
    .eq("id", membership.family_id)
    .single<Family>();

  if (familyError) throw familyError;

  const { data: children, error: childrenError } = await supabase
    .from("children")
    .select("id, name")
    .eq("family_id", family.id)
    .order("created_at", { ascending: true });

  if (childrenError) throw childrenError;

  const badges = await loadBadges(family.id);
  return {
    family,
    children: (children ?? []) as Child[],
    badges,
  };
}

async function loadBadges(familyId: string) {
  const { data: badges, error: badgesError } = await supabase
    .from("badges")
    .select("id, family_id, name, description, icon, trigger_type, trigger_value, is_active")
    .or(`family_id.is.null,family_id.eq.${familyId}`)
    .eq("is_active", true)
    .order("family_id", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (badgesError) throw badgesError;
  return (badges ?? []) as ManagedBadge[];
}
