import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yummy Points" },
      { name: "description", content: "Track and reward your kids with Yummy Points." },
    ],
  }),
  component: () => <Navigate to="/login" />,
});
