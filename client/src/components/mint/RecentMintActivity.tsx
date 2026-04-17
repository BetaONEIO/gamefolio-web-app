import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Check, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { SKALE_EXPLORER_BASE_URL } from "../../../../config/web3";

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
  refundTxHash: string | null;
  refundStatus: "success" | "failed" | null;
  refundReason: string | null;
}

interface MyPaymentsResponse {
  payments: MintPayment[];
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

function PaymentRow({ payment }: { payment: MintPayment }) {
  const meta = STATUS_META[payment.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const spinning = payment.status === "processing" || payment.status === "pending";

  return (
    <div
      className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col gap-3"
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
        <div
          className={`flex items-center gap-1.5 ${meta.bg} ${meta.border} border rounded-full px-2.5 py-1`}
          data-testid={`status-badge-${payment.status}`}
        >
          <Icon className={`h-3 w-3 ${meta.color} ${spinning ? "animate-spin" : ""}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
            {meta.label}
          </span>
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
  const { data, isLoading, isError } = useQuery<MyPaymentsResponse>({
    queryKey: ["/api/mint/my-payments"],
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const payments = data?.payments ?? [];

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

  if (payments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3" data-testid="recent-mint-activity">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[1.2px]">
          Recent Mint Activity
        </span>
        <span className="text-[10px] text-[#64748b]">
          Last {payments.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {payments.map((p) => (
          <PaymentRow key={p.id} payment={p} />
        ))}
      </div>
    </div>
  );
}
