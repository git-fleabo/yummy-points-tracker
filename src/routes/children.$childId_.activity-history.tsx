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
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
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
        .select("badges(name)")
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
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <p className="text-sm text-muted-foreground">Loading activity history…</p>
      </div>
    );
  }

  if (!child || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-4">
        <Card className="w-full max-w-md border-[#f1dfba] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#3d2a1a]">
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
    <div className="min-h-screen bg-[#fffaf0] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/children/$childId" params={{ childId }}>
            <ArrowLeft aria-hidden="true" />
            Back to {child.name}
          </Link>
        </Button>

        <Card className="border-[#f1dfba] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-[#3d2a1a]">Activity History</CardTitle>
            <p className="text-sm text-muted-foreground">Logged activity for {child.name}.</p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {rows.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#f1dfba] bg-[#fffdf8] px-4 py-8 text-center text-sm text-muted-foreground">
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
                      <TableCell className="font-medium text-[#3d2a1a]">
                        {formatDate(row.created_at)}
                      </TableCell>
                      <TableCell>{row.activityName}</TableCell>
                      <TableCell className="text-right">
                        {row.points_change > 0 ? "+" : ""}
                        {row.points_change} {family.point_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.badgeName ?? "No badge"}
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

function buildActivityRows(transactions: Transaction[], unlockedBadges: string[]): ActivityRow[] {
  const firstPointsThreshold = getFirstPointsThreshold(getAdminSettings());
  const chronologicalTransactions = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  let runningPoints = 0;
  const firstPointsTransactionId = chronologicalTransactions.find((transaction) => {
    if (transaction.type !== "points_added" || transaction.points_change <= 0) return false;

    runningPoints += transaction.points_change;
    return runningPoints >= firstPointsThreshold;
  })?.id;

  return transactions.map((transaction) => ({
    ...transaction,
    activityName: getActivityName(transaction),
    badgeName:
      transaction.id === firstPointsTransactionId && unlockedBadges.includes("First Points")
        ? "First Points"
        : null,
  }));
}

function extractBadgeNames(childBadges: ChildBadge[]) {
  return childBadges
    .flatMap((childBadge) => childBadge.badges ?? [])
    .map((badge) => badge.name)
    .filter(Boolean);
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
