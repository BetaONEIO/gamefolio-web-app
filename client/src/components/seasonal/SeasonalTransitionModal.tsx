import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Gift,
  LockKeyhole,
  Trophy,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const BLOCKED_PATH_PREFIXES = [
  "/wallet",
  "/store",
  "/checkout",
  "/payment",
  "/reset-password",
  "/password-reset",
  "/forgot-password",
  "/account-recovery",
  "/verify-email",
  "/verify-code",
  "/oauth",
];

type SeasonalReward = {
  type: "gft" | "cosmetic";
  label: string;
  amount?: number;
  status?: string;
};

type SeasonalAnnouncement = {
  announcementId: string;
  seen: boolean;
  images: {
    seasonEndImage: string | null;
    summerRewardsImage: string | null;
    newSeasonImage: string | null;
  };
  previousSeason: {
    name: string;
    dateRange: string;
  };
  newSeason: {
    name: string;
    dateRange: string;
    rewardPool: number;
    currency: string;
    rewards: string[];
  };
  summerResult: {
    participated: boolean;
    finalRank: number | null;
    seasonXp: number;
    isTopTen: boolean;
    rewards: SeasonalReward[];
    payout: {
      amount: number;
      status: string;
      pending: boolean;
    } | null;
    payoutPending: boolean;
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function SlotPlaceholder({
  slot,
  label,
  src,
}: {
  slot: keyof SeasonalAnnouncement["images"];
  label: string;
  src?: string | null;
}) {
  return (
    <div
      data-seasonal-asset-slot={slot}
      className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-border/80 bg-background/60"
      aria-label={`${label} placeholder`}
    >
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="px-5 py-8 text-center">
          <CircleDot className="mx-auto mb-2 h-5 w-5 text-primary/80" aria-hidden="true" />
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">Season artwork coming soon</p>
        </div>
      )}
    </div>
  );
}

function RewardRow({ reward }: { reward: SeasonalReward }) {
  return (
    <li className="flex items-center gap-3 rounded-md border border-border/70 bg-background/50 px-3 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        {reward.type === "gft" ? (
          <Gift className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Check className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <span className="text-sm font-medium text-foreground">{reward.label}</span>
      {reward.status === "awarded" && (
        <span className="ml-auto text-xs text-primary">Awarded</span>
      )}
    </li>
  );
}

function SeasonalTransitionModal({
  announcement,
  onComplete,
}: {
  announcement: SeasonalAnnouncement;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();
  const dialogTitleId = "seasonal-transition-title";
  const result = announcement.summerResult;
  const previousSeasonName = announcement.previousSeason.name;
  const newSeasonName = announcement.newSeason.name;

  const complete = () => {
    onComplete();
  };

  const goToAutumn = () => {
    complete();
    setLocation("/leaderboard");
  };

  const goToCollection = () => {
    complete();
    setLocation("/collection");
  };

  const stepContent = useMemo(() => {
    if (step === 0) {
      return {
        eyebrow: previousSeasonName,
        title: `${previousSeasonName} has ended`,
        description: result.payoutPending
          ? "The final leaderboard is locked, and eligible seasonal rewards are being finalised."
          : "The final leaderboard is locked and eligible seasonal rewards have been distributed.",
        image: (
          <SlotPlaceholder
            slot="seasonEndImage"
            label={`${previousSeasonName} ended`}
            src={announcement.images.seasonEndImage}
          />
        ),
        icon: <Trophy className="h-5 w-5" aria-hidden="true" />,
      };
    }

    if (step === 1) {
      const title = result.isTopTen
        ? `You finished #${result.finalRank}`
        : result.participated
          ? "Thanks for taking part"
          : `${previousSeasonName} was for everyone`;

      const description = result.isTopTen
        ? `You placed in the final ${previousSeasonName} top 10.`
        : result.participated
          ? `Your ${previousSeasonName} XP has been recorded. Seasonal cosmetics are reserved for the final top 10.`
          : `${previousSeasonName} has wrapped. Jump into ${newSeasonName} to start a new run.`;

      return {
        eyebrow: result.isTopTen ? "Your final result" : "Your Summer recap",
        title,
        description,
        image: (
          <SlotPlaceholder
            slot="summerRewardsImage"
            label={`${previousSeasonName} rewards`}
            src={announcement.images.summerRewardsImage}
          />
        ),
        icon: <Gift className="h-5 w-5" aria-hidden="true" />,
      };
    }

    return {
      eyebrow: newSeasonName,
      title: `${newSeasonName} has launched`,
      description: `A new season is live from ${announcement.newSeason.dateRange}. The season prize pool is ${formatNumber(announcement.newSeason.rewardPool)} ${announcement.newSeason.currency}.`,
      image: (
        <SlotPlaceholder
          slot="newSeasonImage"
            label={newSeasonName}
          src={announcement.images.newSeasonImage}
        />
      ),
      icon: <ArrowRight className="h-5 w-5" aria-hidden="true" />,
    };
  }, [announcement, newSeasonName, previousSeasonName, result, step]);

  return (
    <Dialog open onOpenChange={(open) => !open && complete()}>
      <DialogContent
        aria-describedby="seasonal-transition-description"
        className="max-h-[calc(100dvh-2rem)] max-w-[920px] overflow-y-auto border-border bg-card p-0 text-card-foreground sm:rounded-xl"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="relative">
          <div className="border-b border-border/80 px-5 pb-4 pt-5 sm:px-8 sm:pt-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {stepContent.icon}
              <span>{stepContent.eyebrow}</span>
            </div>
            <DialogTitle
              id={dialogTitleId}
              className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {stepContent.title}
            </DialogTitle>
            <DialogDescription
              id="seasonal-transition-description"
              className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base"
            >
              {stepContent.description}
            </DialogDescription>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-8 sm:py-7 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <div>{stepContent.image}</div>

            <div className="min-w-0">
              {step === 0 && (
                <div className="rounded-md border border-border/70 bg-background/40 p-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {previousSeasonName} is now part of your season history. Your final placement
                    and any confirmed rewards are shown in the next step.
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  {result.participated && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-border/70 bg-background/40 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Season XP</p>
                        <p className="mt-1 text-xl font-semibold text-foreground">
                          {formatNumber(result.seasonXp)}
                        </p>
                      </div>
                      {result.finalRank !== null && (
                        <div className="rounded-md border border-border/70 bg-background/40 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Final rank</p>
                          <p className="mt-1 text-xl font-semibold text-foreground">#{result.finalRank}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {result.isTopTen && result.rewards.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-foreground">Confirmed rewards</p>
                      <ul className="space-y-2" aria-label={`Confirmed ${previousSeasonName} rewards`}>
                        {result.rewards.map((reward) => (
                          <RewardRow key={`${reward.type}-${reward.label}`} reward={reward} />
                        ))}
                      </ul>
                      <Button
                        variant="link"
                        onClick={goToCollection}
                        className="mt-2 h-auto px-0 text-primary"
                      >
                        View Collection
                        <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  )}

                  {result.payoutPending && result.isTopTen && (
                    <div className="flex gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm leading-5 text-muted-foreground">
                      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        Your GFT distribution is being finalised. We’ll keep the record tied to your
                        account and won’t display an amount until it is confirmed.
                      </span>
                    </div>
                  )}

                  {!result.isTopTen && result.participated && (
                    <div className="rounded-md border border-border/70 bg-background/40 p-3 text-sm leading-5 text-muted-foreground">
                      Seasonal profile cosmetics are awarded only to the final {previousSeasonName} top 10.
                    </div>
                  )}

                  {!result.participated && (
                    <p className="text-sm leading-6 text-muted-foreground">
                      No {previousSeasonName} XP was recorded on this account, so there are no
                      personal seasonal rewards to display.
                    </p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="rounded-md border border-border/70 bg-background/40 p-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    The leaderboard is live now. Bring your clips, screenshots, and streaks into
                    the new season.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Keep an eye out for a few surprise rewards throughout the season.
                  </p>
                  {announcement.newSeason.rewards.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-foreground">Confirmed rewards</p>
                      <ul className="space-y-2">
                        {announcement.newSeason.rewards.map((reward) => (
                          <li key={reward} className="text-sm text-muted-foreground">{reward}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border/80 px-5 pb-1 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of 3`}>
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    item === step ? "w-7 bg-primary" : "w-1.5 bg-muted-foreground/35",
                  )}
                />
              ))}
              <span className="sr-only">Step {step + 1} of 3</span>
            </div>

            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              {step === 0 ? (
                <Button variant="secondary" onClick={complete} className="w-full sm:w-auto">
                  Close
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="w-full gap-2 sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </Button>
              )}

              {step < 2 ? (
                <Button
                  onClick={() => setStep((current) => Math.min(2, current + 1))}
                  className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  onClick={goToAutumn}
                  className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  View Autumn Assault
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SeasonalTransitionModalGate() {
  const { user } = useAuth();
  const { isOpen: isAuthModalOpen } = useAuthModal();
  const [location] = useLocation();
  const completedForSession = useRef(false);
  const announcementQueryKey = ["/api/seasonal-announcement", user?.id] as const;

  const blockedPath = BLOCKED_PATH_PREFIXES.some((prefix) => location.startsWith(prefix));
  const enabled = Boolean(
    user &&
    user.userType &&
    user.emailVerified === true &&
    !blockedPath &&
    !isAuthModalOpen,
  );
  const { data } = useQuery<SeasonalAnnouncement | null>({
    queryKey: announcementQueryKey,
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled,
    staleTime: Infinity,
    retry: false,
  });

  const acknowledge = useMutation({
    mutationFn: async (announcementId: string) => {
      await apiRequest("POST", "/api/seasonal-announcement/seen", { announcementId });
    },
    onSuccess: () => {
      queryClient.setQueryData<SeasonalAnnouncement | null>(
        announcementQueryKey,
        (current) => current ? { ...current, seen: true } : current,
      );
    },
  });

  useEffect(() => {
    completedForSession.current = false;
  }, [user?.id]);

  if (!enabled || !data || data.seen || completedForSession.current) return null;

  const handleComplete = () => {
    if (completedForSession.current) return;
    completedForSession.current = true;
    acknowledge.mutate(data.announcementId);
  };

  return <SeasonalTransitionModal announcement={data} onComplete={handleComplete} />;
}
