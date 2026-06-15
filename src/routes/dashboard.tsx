import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Family Dashboard — Yummy Points" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
      } else {
        setChecked(true);
      }
    });
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (!checked) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl">Yummy Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">Logged in successfully</p>
          <Button onClick={handleSignOut} className="w-full">
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
