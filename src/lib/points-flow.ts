import { supabase } from "@/integrations/supabase/client";
import { getFirstPointsThreshold, type AdminSettings } from "@/lib/admin-settings";

type Badge = {
  id: string;
  name: string;
  icon: string | null;
};

export type AddPointsActivityResult = {
  unlockedFirstPoints: boolean;
  firstPointsAlreadyUnlocked: boolean;
  unlockedBadge: {
    name: string;
    icon: string | null;
  } | null;
};

export async function addPointsActivity({
  familyId,
  childId,
  currentBalance,
  points,
  note,
  settings,
  requireFirstPointsUnlock = false,
}: {
  familyId: string;
  childId: string;
  currentBalance: number;
  points: number;
  note: string | null;
  settings: AdminSettings;
  requireFirstPointsUnlock?: boolean;
}): Promise<AddPointsActivityResult> {
  if (!Number.isInteger(points) || points <= 0) {
    throw new Error("Points must be a positive whole number.");
  }

  const { error: transactionError } = await supabase.from("transactions").insert({
    family_id: familyId,
    child_id: childId,
    type: "points_added",
    points_change: points,
    note,
  });

  if (transactionError) throw transactionError;

  return awardFirstPointsBadgeIfNeeded({
    childId,
    currentBalance,
    points,
    settings,
    requireFirstPointsUnlock,
  });
}

async function awardFirstPointsBadgeIfNeeded({
  childId,
  currentBalance,
  points,
  settings,
  requireFirstPointsUnlock,
}: {
  childId: string;
  currentBalance: number;
  points: number;
  settings: AdminSettings;
  requireFirstPointsUnlock: boolean;
}): Promise<AddPointsActivityResult> {
  const firstPointsThreshold = getFirstPointsThreshold(settings);

  if (currentBalance + points < firstPointsThreshold) {
    if (requireFirstPointsUnlock) {
      throw new Error("The sample activity did not reach the First Points badge threshold.");
    }

    return {
      unlockedFirstPoints: false,
      firstPointsAlreadyUnlocked: false,
      unlockedBadge: null,
    };
  }

  const { data: firstPointsBadge, error: badgeError } = await supabase
    .from("badges")
    .select("id, name, icon")
    .eq("name", "First Points")
    .maybeSingle<Badge>();

  if (badgeError) {
    return handleBadgeError(
      "Could not load First Points badge.",
      badgeError,
      requireFirstPointsUnlock,
    );
  }

  if (!firstPointsBadge) {
    return handleBadgeError('Could not find "First Points" badge.', null, requireFirstPointsUnlock);
  }

  const { data: existingChildBadge, error: existingBadgeError } = await supabase
    .from("child_badges")
    .select("id")
    .eq("child_id", childId)
    .eq("badge_id", firstPointsBadge.id)
    .maybeSingle<{ id: string }>();

  if (existingBadgeError) {
    return handleBadgeError(
      "Could not check First Points badge.",
      existingBadgeError,
      requireFirstPointsUnlock,
    );
  }

  if (existingChildBadge) {
    if (requireFirstPointsUnlock) {
      throw new Error("This child already has the First Points badge.");
    }

    return {
      unlockedFirstPoints: false,
      firstPointsAlreadyUnlocked: true,
      unlockedBadge: null,
    };
  }

  const { error: childBadgeError } = await supabase.from("child_badges").insert({
    child_id: childId,
    badge_id: firstPointsBadge.id,
  });

  if (childBadgeError) {
    return handleBadgeError(
      "Could not unlock First Points badge.",
      childBadgeError,
      requireFirstPointsUnlock,
    );
  }

  return {
    unlockedFirstPoints: true,
    firstPointsAlreadyUnlocked: false,
    unlockedBadge: {
      name: firstPointsBadge.name,
      icon: firstPointsBadge.icon,
    },
  };
}

function handleBadgeError(
  message: string,
  error: unknown,
  shouldThrow: boolean,
): AddPointsActivityResult {
  if (shouldThrow) {
    if (error instanceof Error) throw error;
    throw new Error(message);
  }

  console.error(message, error);
  return {
    unlockedFirstPoints: false,
    firstPointsAlreadyUnlocked: false,
    unlockedBadge: null,
  };
}
