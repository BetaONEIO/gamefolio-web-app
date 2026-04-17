import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2, Check, AlertTriangle, RefreshCw, Clock, X, Eye, EyeOff, Undo2 } from "lucide-react";
import { SKALE_EXPLORER_BASE_URL } from "../../../../config/web3";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PaymentStatus = "pending" | "processing" | "consumed" | "refunded" | "failed";

interface MintPayment {
  id: number;
  payerAddress: string;
  paymentTxHash: string;
  quantity: number;
  amountGft: number;
  status: PaymentStatus;
  mintTxHash: string | null;
  tokenIds: number[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
  dismissedAt: string | null;
  refundTxHash: string | null;
  refundStatus: "success" | "failed" | null;
  refundReason: string | null;
}

interface MyPaymentsResponse {
  payments: MintPayment[];
  dismissedCount: number;
}

const STATUS_META: Record<
  PaymentStatus,
  { label: string; color: string; bg: string; border: string; icon: typeof Check }
> = {
  pending: {
    label: "Pending",
    color: "text-[#fbbf24]",
    bg: "bg-[#fbbf24]/10",
    border: "border-[#fbbf24]/30",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    color: "text-[#fbbf24]",
    bg: "bg-[#fbbf24]/10",
    border: "border-[#fbbf24]/30",
    icon: Loader2,
  },
  consumed: {
    label: "Minted",
    color: "text-[#4ade80]",
    bg: "bg-[#4ade80]/10",
    border: "border-[#4ade80]/30",
    icon: Check,
  },
  refunded: {
    label: "Refunded",
    color: "text-[#60a5fa]",
    bg: "bg-[#60a5fa]/10",
    border: "border-[#60a5fa]/30",
    icon: RefreshCw,
  },
  failed: {
    label: "Refund Pending",
    color: "text-[#ef4444]",
    bg: "bg-[#ef4444]/10",
    border: "border-[#ef4444]/30",
    icon: AlertTriangle,
  },
};

function shortHash(hash: string): string {
  if (!hash) return "";
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatDate(value: string): string {
  try {
    const d = new Date(value);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function ExplorerLink({ hash, label }: { hash: string; label: string }) {
  return (
    <a
      href={`${SKALE_EXPLORER_BASE_URL}/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-[10px] font-mono text-[#94a3b8] hover:text-[#4ade80] transition-colors"
      data-testid={`link-explorer-${hash.slice(0, 10)}`}
    >
      <span className="uppercase tracking-wider font-bold not-italic">{label}:</span>
      <span>{shortHash(hash)}</span>
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function PaymentRow({
  payment,
  onDismiss,
  onRestore,
  isMutating,
}: {
  payment: MintPayment;
  onDismiss: (id: number) => void;
  onRestore: (id: number) => void;
  isMutating: boolean;
}) {
  const meta = STATUS_META[payment.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const spinning = payment.status === "processing" || payment.status === "pending";
  const isDismissed = !!payment.dismissedAt;

  return (
    <div
      className={`bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col gap-3 ${
        isDismissed ? "opacity-60" : ""
      }`}
      data-testid={`payment-row-${payment.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-[#f8fafc]">
            {payment.quantity} NFT{payment.quantity === 1 ? "" : "s"} · {payment.amountGft.toLocaleString()} GFT
          </span>
          <span className="text-[10px] text-[#94a3b8]">
            {formatDate(payment.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 ${meta.bg} ${meta.border} border rounded-full px-2.5 py-1`}
            data-testid={`status-badge-${payment.status}`}
          >
            <Icon className={`h-3 w-3 ${meta.color} ${spinning ? "animate-spin" : ""}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          {isDismissed ? (
            <button
              type="button"
              onClick={() => onRestore(payment.id)}
              disabled={isMutating}
              className="flex items-center gap-1 rounded-full border border-[#1e293b] bg-[#1e293b]/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#334155] transition-colors disabled:opacity-50"
              data-testid={`button-restore-${payment.id}`}
              aria-label="Restore entry"
              title="Restore entry"
            >
              <Undo2 className="h-3 w-3" />
              Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDismiss(payment.id)}
              disabled={isMutating}
              className="flex items-center gap-1 rounded-full border border-[#1e293b] bg-[#1e293b]/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#334155] transition-colors disabled:opacity-50"
              data-testid={`button-dismiss-${payment.id}`}
              aria-label="Dismiss entry"
              title="Hide this entry"
            >
              <X className="h-3 w-3" />
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <ExplorerLink hash={payment.paymentTxHash} label="Payment" />
        {payment.mintTxHash && (
          <ExplorerLink hash={payment.mintTxHash} label="Mint" />
        )}
        {payment.refundTxHash && (
          <ExplorerLink hash={payment.refundTxHash} label="Refund" />
        )}
      </div>

      {payment.status === "consumed" && payment.tokenIds.length > 0 && (
        <div className="text-[11px] text-[#94a3b8]">
          Token{payment.tokenIds.length === 1 ? "" : "s"}:{" "}
          <span className="text-[#f8fafc] font-mono">
            #{payment.tokenIds.join(", #")}
          </span>
        </div>
      )}

      {payment.status === "refunded" && (
        <div className="text-[11px] text-[#94a3b8] leading-relaxed">
          The mint didn't complete on-chain, so your {payment.amountGft.toLocaleString()} GFT was
          automatically returned to your wallet.
          {payment.refundReason && (
            <span className="block mt-1 text-[10px] text-[#64748b]">
              Reason: {payment.refundReason}
            </span>
          )}
        </div>
      )}

      {payment.status === "failed" && (
        <div className="text-[11px] text-[#fca5a5] leading-relaxed">
          The mint failed and the automatic refund hasn't confirmed yet. Our team has been notified
          and will resolve this shortly.
          {payment.refundReason && (
            <span className="block mt-1 text-[10px] text-[#94a3b8]">
              Reason: {payment.refundReason}
            </span>
          )}
        </div>
      )}

      {(payment.status === "pending" || payment.status === "processing") && (
        <div className="text-[11px] text-[#94a3b8] leading-relaxed">
          Your payment is being processed. If anything goes wrong, your GFT will be automatically
          returned to your wallet.
        </div>
      )}
    </div>
  );
}

export default function RecentMintActivity() {
  const { toast } = useToast();
  const [showDismissed, setShowDismissed] = useState(false);

  // Use the default endpoint for the active view so the server's LIMIT 20
  // applies to non-dismissed rows only (otherwise older active entries could
  // be hidden behind 20 newer dismissed ones). When the user opts in to view
  // dismissed entries, switch to includeDismissed=true — note the server
  // still caps the response at 20 rows total ("recent activity"), but those
  // 20 are now drawn from the combined active + dismissed set. The response
  // always includes dismissedCount so the toggle can be surfaced even if the
  // active view is empty.
  const { data, isLoading, isError } = useQuery<MyPaymentsResponse>({
    queryKey: ["/api/mint/my-payments", { includeDismissed: showDismissed }],
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/mint/my-payments/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mint/my-payments"] });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't dismiss entry",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/mint/my-payments/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mint/my-payments"] });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't restore entry",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const payments = data?.payments ?? [];
  const dismissedCount = data?.dismissedCount ?? 0;
  const isMutating = dismissMutation.isPending || restoreMutation.isPending;

  if (isLoading) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-3xl p-5 flex items-center gap-3">
        <Loader2 className="h-4 w-4 text-[#94a3b8] animate-spin" />
        <span className="text-xs text-[#94a3b8]">Loading recent mint activity…</span>
      </div>
    );
  }

  if (isError) {
    return null;
  }

  // Hide the section entirely only when the user has no mint history at all
  // (no active and no dismissed entries). Otherwise keep the header and
  // toggle visible so dismissed entries are always reachable — even if the
  // user has dismissed every active entry.
  if (payments.length === 0 && dismissedCount === 0) {
    return null;
  }

  const showToggle = dismissedCount > 0 || showDismissed;

  return (
    <div className="flex flex-col gap-3" data-testid="recent-mint-activity">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[1.2px]">
          Recent Mint Activity
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#64748b]">
            {showDismissed ? `All ${payments.length}` : `Last ${payments.length}`}
          </span>
          {showToggle && (
            <button
              type="button"
              onClick={() => setShowDismissed((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider hover:text-[#f8fafc] transition-colors"
              data-testid="button-toggle-dismissed"
            >
              {showDismissed ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  Hide dismissed
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  Show dismissed ({dismissedCount})
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {payments.length === 0 ? (
        <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 text-[11px] text-[#94a3b8]">
          {showDismissed
            ? "No entries to show."
            : "All entries are dismissed. Use \"Show dismissed\" to view them."}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {payments.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              onDismiss={(id) => dismissMutation.mutate(id)}
              onRestore={(id) => restoreMutation.mutate(id)}
              isMutating={isMutating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
