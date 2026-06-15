import { supabase } from "@/integrations/supabase/client";

export type Family = {
  id: string;
  name: string;
  point_name: string;
};

export type Child = {
  id: string;
  family_id: string;
  name: string;
  avatar_icon: string | null;
  current_balance: number;
};

export type ChildWithFamily = {
  child: Child;
  family: Family;
};

export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String(err.message);
  }

  return "Something went wrong.";
}

export async function loadChildForUser(childId: string, userId: string): Promise<ChildWithFamily> {
  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, family_id, name, avatar_icon, current_balance")
    .eq("id", childId)
    .maybeSingle<Child>();

  if (childError) throw childError;
  if (!child) throw new Error("Child not found.");

  const { data: membership, error: membershipError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("family_id", child.family_id)
    .eq("user_id", userId)
    .maybeSingle<{ family_id: string }>();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You do not have access to this child.");

  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id, name, point_name")
    .eq("id", child.family_id)
    .single<Family>();

  if (familyError) throw familyError;

  return { child, family };
}
