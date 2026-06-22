import { supabase } from "@/integrations/supabase/client";

export type BadgeTriggerType =
  | "total_points_earned"
  | "rewards_redeemed"
  | "treats_missed"
  | "manual_award";

export type AwardedBadge = {
  name: string;
  icon: string | null;
};

type ChildBadgeDefinition = {
  id: string;
  name: string;
  icon: string | null;
  trigger_type: string;
  trigger_value: number;
};

type ChildBadgeRow = {
  badge_id: string;
};

type ChildTotals = {
  total_points_earned: number;
  total_rewards_redeemed: number;
};

export async function awardEligibleBadges({
  familyId,
  childId,
}: {
  familyId: string;
  childId: string;
}) {
  const { data: child, error: childError } = await supabase
    .from("children")
    .select("total_points_earned, total_rewards_redeemed")
    .eq("family_id", familyId)
    .eq("id", childId)
    .single<ChildTotals>();

  if (childError) throw childError;

  const { count: treatsMissedCount, error: treatsMissedError } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .eq("type", "points_added");

  if (treatsMissedError) throw treatsMissedError;

  const { data: badges, error: badgesError } = await supabase
    .from("badges")
    .select("id, name, icon, trigger_type, trigger_value")
    .eq("is_active", true)
    .or(`family_id.is.null,family_id.eq.${familyId}`);

  if (badgesError) throw badgesError;

  const supportedBadges = ((badges ?? []) as ChildBadgeDefinition[]).filter((badge) =>
    isAutomaticTriggerType(badge.trigger_type),
  );

  if (supportedBadges.length === 0) return [];

  const { data: existingRows, error: existingError } = await supabase
    .from("child_badges")
    .select("badge_id")
    .eq("child_id", childId);

  if (existingError) throw existingError;

  const existingBadgeIds = new Set(
    ((existingRows ?? []) as ChildBadgeRow[]).map((row) => row.badge_id),
  );
  const earnedBadges = supportedBadges.filter(
    (badge) =>
      !existingBadgeIds.has(badge.id) &&
      getCurrentTriggerValue(badge.trigger_type, child, treatsMissedCount ?? 0) >=
        badge.trigger_value,
  );

  if (earnedBadges.length === 0) return [];

  const { error: insertError } = await supabase.from("child_badges").insert(
    earnedBadges.map((badge) => ({
      child_id: childId,
      badge_id: badge.id,
    })),
  );

  if (insertError) throw insertError;

  return earnedBadges.map((badge) => ({
    name: badge.name,
    icon: badge.icon,
  }));
}

export async function awardManualBadge({ childId, badgeId }: { childId: string; badgeId: string }) {
  const { data: existingBadge, error: existingError } = await supabase
    .from("child_badges")
    .select("id")
    .eq("child_id", childId)
    .eq("badge_id", badgeId)
    .maybeSingle<{ id: string }>();

  if (existingError) throw existingError;
  if (existingBadge) return false;

  const { error: insertError } = await supabase.from("child_badges").insert({
    child_id: childId,
    badge_id: badgeId,
  });

  if (insertError) throw insertError;
  return true;
}

function isAutomaticTriggerType(
  triggerType: string,
): triggerType is Exclude<BadgeTriggerType, "manual_award"> {
  return (
    triggerType === "total_points_earned" ||
    triggerType === "rewards_redeemed" ||
    triggerType === "treats_missed"
  );
}

function getCurrentTriggerValue(
  triggerType: string,
  child: ChildTotals,
  treatsMissedCount: number,
) {
  if (triggerType === "total_points_earned") return child.total_points_earned;
  if (triggerType === "rewards_redeemed") return child.total_rewards_redeemed;
  if (triggerType === "treats_missed") return treatsMissedCount;
  return 0;
}
