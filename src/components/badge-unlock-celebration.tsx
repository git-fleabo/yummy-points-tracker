import { BadgeCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type UnlockedBadge = {
  name: string;
  icon: string | null;
};

export function BadgeUnlockCelebration({
  badge,
  onDismiss,
}: {
  badge: UnlockedBadge;
  onDismiss?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-sunshine/70 bg-sunshine/20 px-4 py-4 text-sunshine-foreground shadow-sm">
      <div className="absolute right-4 top-4 text-sunshine/80">
        <Sparkles aria-hidden="true" className="size-5" />
      </div>
      <div className="flex items-center gap-4 pr-8">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-3xl shadow-sm ring-2 ring-sunshine/50">
          {badge.icon ? (
            <span aria-hidden="true">{badge.icon}</span>
          ) : (
            <BadgeCheck aria-hidden="true" className="size-8 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">New badge unlocked!</p>
          <p className="text-xl font-semibold tracking-normal text-foreground">{badge.name}</p>
        </div>
      </div>
      {onDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 size-8 text-sunshine-foreground hover:bg-sunshine/20"
          aria-label="Dismiss badge celebration"
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
