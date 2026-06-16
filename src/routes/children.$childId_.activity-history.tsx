import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSettings, getFirstPointsThreshold } from "@/lib/admin-settings";
import { getErrorMessage, loadChildForUser, type Child, type Family } from "@/lib/family-data";

export const Route = createFileRoute("/children/$childId_/activity-history")({
  head: () => ({ meta: [{ title: "Activity History — Yummy Points" }] }),
  component: ActivityHistoryPage,
});

type Transaction = {
  id: string;
  type: string;
  points_change: number;
  note: string | null;
  created_at: string;
};

type ChildBadge = {
  earned_at: string;
  badges: { name: string } | { name: string }[] | null;
};

type ActivityRow = Transaction & {
  activityName: string;
  badgeName: string | null;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function ActivityHistoryPage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadActivityHistory() {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }

      const { child: loadedChild, family: loadedFamily } = await loadChildForUser(childId, user.id);

      const { data: loadedTransactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("id, type, points_change, note, created_at")
        .eq("child_id", loadedChild.id)
        .eq("family_id", loadedFamily.id)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;

      const { data: loadedBadges, error: badgesError } = await supabase
        .from("child_badges")
        .select("earned_at, badges(name)")
        .eq("child_id", loadedChild.id);

      if (badgesError) throw badgesError;

      if (isMounted) {
        setChild(loadedChild);
        setFamily(loadedFamily);
        setTransactions((loadedTransactions ?? []) as Transaction[]);
        setUnlockedBadges(extractBadgeNames((loadedBadges ?? []) as ChildBadge[]));
        setLoading(false);
      }
    }

    loadActivityHistory().catch((err: unknown) => {
      if (isMounted) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [childId, navigate]);

  const rows = useMemo(
    () => buildActivityRows(transactions, unlockedBadges),
    [transactions, unlockedBadges],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading activity history…</p>
      </div>
    );
  }

  if (!child || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">
              Activity history could not load
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error ?? "We could not load this child's activity history."}
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
            <CardTitle className="text-2xl text-foreground">Activity History</CardTitle>
            <p className="text-sm text-muted-foreground">Logged activity for {child.name}.</p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-secondary/50 bg-secondary/15 px-4 py-8 text-center text-sm font-medium text-secondary-foreground">
                No activity logged yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Points earned</TableHead>
                    <TableHead>Badge unlocked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-foreground">
                        {formatDate(row.created_at)}
                      </TableCell>
                      <TableCell>{row.activityName}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {row.points_change > 0 ? "+" : ""}
                        {row.points_change} {family.point_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.badgeName ? (
                          <span className="rounded-full bg-sunshine/30 px-2.5 py-1 text-xs font-semibold text-sunshine-foreground">
                            {row.badgeName}
                          </span>
                        ) : (
                          "No badge"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

type EarnedBadge = {
  name: string;
  earnedAt: string;
};

function buildActivityRows(
  transactions: Transaction[],
  unlockedBadges: EarnedBadge[],
): ActivityRow[] {
  const firstPointsThreshold = getFirstPointsThreshold(getAdminSettings());
  const chronologicalTransactions = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const firstPointsBadge = unlockedBadges.find((badge) => badge.name === "First Points");
  const firstPointsTransactionId = firstPointsBadge
    ? getFirstPointsTransactionId(
        chronologicalTransactions,
        firstPointsThreshold,
        firstPointsBadge.earnedAt,
      )
    : null;

  return transactions.map((transaction) => ({
    ...transaction,
    activityName: getActivityName(transaction),
    badgeName: transaction.id === firstPointsTransactionId ? "First Points" : null,
  }));
}

function extractBadgeNames(childBadges: ChildBadge[]) {
  return childBadges
    .flatMap((childBadge) =>
      [childBadge.badges ?? []].flat().map((badge) => ({
        name: badge.name,
        earnedAt: childBadge.earned_at,
      })),
    )
    .filter((badge) => Boolean(badge.name));
}

function getFirstPointsTransactionId(
  chronologicalTransactions: Transaction[],
  firstPointsThreshold: number,
  earnedAt: string,
) {
  const earnedAtTime = new Date(earnedAt).getTime();

  if (!Number.isNaN(earnedAtTime)) {
    const unlockTransaction = [...chronologicalTransactions]
      .reverse()
      .find(
        (transaction) =>
          transaction.type === "points_added" &&
          transaction.points_change > 0 &&
          new Date(transaction.created_at).getTime() <= earnedAtTime + 5000,
      );

    if (unlockTransaction) return unlockTransaction.id;
  }

  let runningPoints = 0;
  return chronologicalTransactions.find((transaction) => {
    if (transaction.type !== "points_added" || transaction.points_change <= 0) return false;

    runningPoints += transaction.points_change;
    return runningPoints >= firstPointsThreshold;
  })?.id;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function getActivityName(transaction: Transaction) {
  if (transaction.note?.trim()) return transaction.note;
  if (transaction.type === "points_added") return "Points added";
  return transaction.type.replaceAll("_", " ");
}
