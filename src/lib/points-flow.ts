import { supabase } from "@/integrations/supabase/client";
import type { AdminSettings } from "@/lib/admin-settings";
import { awardEligibleBadges } from "@/lib/badge-engine";

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
  points,
  note,
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

  const earnedBadges = await awardEligibleBadges({ familyId, childId });
  const firstPointsBadge = earnedBadges.find((badge) => badge.name === "First Points") ?? null;

  if (requireFirstPointsUnlock && !firstPointsBadge) {
    throw new Error(
      "This child already has the First Points badge or did not reach its threshold.",
    );
  }

  return {
    unlockedFirstPoints: Boolean(firstPointsBadge),
    firstPointsAlreadyUnlocked: false,
    unlockedBadge: firstPointsBadge,
  };
}
