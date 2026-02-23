import { useState } from "react";
import { ArrowLeft, Share2, Check, Copy, ExternalLink, Gift, TrendingUp, ShoppingCart, AlertTriangle, Clock } from "lucide-react";

type ActivityType = "reward" | "stake" | "purchase" | "unstake";
type ActivityStatus = "completed" | "pending" | "processing" | "failed";

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  time: string;
  status: "completed" | "current" | "pending";
}

interface ActivityDetailScreenProps {
  onBack: () => void;
  activity?: {
    id: string;
    type: ActivityType;
    title: string;
    status: ActivityStatus;
    amount: number;
    isPositive: boolean;
    date: string;
    time: string;
    transactionHash?: string;
    fromAddress?: string;
    toAddress?: string;
    networkFee?: string;
    paymentMethod?: string;
    warningMessage?: string;
  };
}

const defaultActivity = {
  id: "",
  type: "purchase" as ActivityType,
  title: "GFT Purchase",
  status: "pending" as ActivityStatus,
  amount: 0,
  isPositive: true,
  date: "",
  time: "",
  networkFee: "Free",
};

export default function ActivityDetailScreen({
  onBack,
  activity = defaultActivity,
}: ActivityDetailScreenProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "reward":
        return <Gift className="w-10 h-10" style={{ color: '#4ade80' }} />;
      case "stake":
      case "unstake":
        return <TrendingUp className="w-10 h-10" style={{ color: '#4ade80' }} />;
      case "purchase":
        return <ShoppingCart className="w-10 h-10" style={{ color: '#4ade80' }} />;
      default:
        return <Gift className="w-10 h-10" style={{ color: '#4ade80' }} />;
    }
  };

  const getStatusBadge = (status: ActivityStatus) => {
    const styles = {
      completed: {
        bg: 'rgba(20, 83, 45, 0.2)',
        border: 'rgba(74, 222, 128, 0.2)',
        color: '#4ade80',
        text: 'COMPLETED',
      },
      pending: {
        bg: 'rgba(234, 179, 8, 0.2)',
        border: 'rgba(234, 179, 8, 0.2)',
        color: '#eab308',
        text: 'PENDING',
      },
      processing: {
        bg: 'rgba(59, 130, 246, 0.2)',
        border: 'rgba(59, 130, 246, 0.2)',
        color: '#3b82f6',
        text: 'PROCESSING',
      },
      failed: {
        bg: 'rgba(239, 68, 68, 0.2)',
        border: 'rgba(239, 68, 68, 0.2)',
        color: '#ef4444',
        text: 'FAILED',
      },
    };

    const style = styles[status];

    return (
      <span
        className="text-xs font-bold uppercase px-3 py-1 rounded-full"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.color,
          letterSpacing: '0.6px',
        }}
      >
        {style.text}
      </span>
    );
  };

  return (
    <div
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: '#101D27' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 pt-12 pb-6"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 83, 45, 0.2) 0%, #101D27 100%)',
          borderBottom: '1px solid rgba(30, 41, 59, 0.3)',
        }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
          style={{ background: '#1e293b', border: '1px solid #1e293b' }}
        >
          <ArrowLeft className="w-6 h-6" style={{ color: '#f8fafc' }} />
        </button>

        <span className="text-xl font-bold" style={{ color: '#f8fafc' }}>
          Activity Details
        </span>

        <button
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
          style={{ background: '#1e293b', border: '1px solid #1e293b' }}
        >
          <Share2 className="w-5 h-5" style={{ color: '#f8fafc' }} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-6 max-w-[430px] mx-auto w-full gap-6">
        {/* Activity Summary */}
        <div className="flex flex-col items-center gap-4 py-6">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: '#1e293b',
              border: '1px solid #1e293b',
              boxShadow: '0 4px 6px -4px rgba(74, 222, 128, 0.05), 0 10px 15px -3px rgba(74, 222, 128, 0.05)',
            }}
          >
            {getActivityIcon(activity.type)}
          </div>

          {/* Title & Date */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold" style={{ color: '#f8fafc' }}>
              {activity.title}
            </h1>
            <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
              {activity.date}, {activity.time}
            </span>
          </div>

          {/* Amount */}
          <div className="flex items-end gap-2">
            <span
              className="text-3xl font-bold"
              style={{ color: activity.isPositive ? '#4ade80' : '#f8fafc' }}
            >
              {activity.isPositive ? '+' : '-'}{activity.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className="text-base font-bold pb-1"
              style={{ color: '#94a3b8' }}
            >
              GFT
            </span>
          </div>

          {/* Status Badge */}
          {getStatusBadge(activity.status)}
        </div>

        {/* Warning Card (if applicable) */}
        {activity.warningMessage && (
          <div
            className="flex gap-3 p-4 rounded-2xl"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239, 68, 68, 0.2)' }}
            >
              <AlertTriangle className="w-6 h-6" style={{ color: '#ef4444' }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold" style={{ color: '#ef4444' }}>
                Action Required
              </span>
              <span className="text-xs" style={{ color: 'rgba(239, 68, 68, 0.8)', lineHeight: '19.5px' }}>
                {activity.warningMessage}
              </span>
            </div>
          </div>
        )}

        {/* Status Timeline */}
        <div
          className="flex flex-col gap-6 p-6 rounded-2xl"
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid rgba(30, 41, 59, 0.2)',
          }}
        >
          <span
            className="text-xs font-bold uppercase"
            style={{ color: '#94a3b8', letterSpacing: '1.2px' }}
          >
            Status Timeline
          </span>

          <div className="flex flex-col">
            {(() => {
              const timeline: TimelineStep[] = [];
              if (activity.type === 'purchase') {
                timeline.push({ id: '1', title: 'Order Created', description: `Purchase initiated for ${activity.amount.toLocaleString()} GFT`, time: activity.time, status: 'completed' });
                if (activity.status === 'completed' || activity.status === 'processing') {
                  timeline.push({ id: '2', title: 'Payment Confirmed', description: 'Card payment verified', time: activity.time, status: 'completed' });
                } else {
                  timeline.push({ id: '2', title: 'Payment Confirmation', description: 'Awaiting payment', time: '', status: activity.status === 'pending' ? 'pending' : 'current' });
                }
                if (activity.status === 'completed') {
                  timeline.push({ id: '3', title: 'Tokens Delivered', description: 'GFT credited to your balance', time: activity.time, status: 'completed' });
                } else {
                  timeline.push({ id: '3', title: 'Token Delivery', description: 'GFT will be credited to your balance', time: '', status: 'pending' });
                }
              } else {
                timeline.push({ id: '1', title: activity.title, description: `${activity.amount.toLocaleString()} GFT`, time: activity.time, status: activity.status === 'completed' ? 'completed' : 'current' });
              }
              return timeline;
            })().map((step, index, arr) => (
              <div key={step.id} className="flex gap-4">
                {/* Timeline Line & Dot */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: step.status === 'completed' ? '#4ade80' : step.status === 'current' ? '#3b82f6' : '#1e293b',
                      boxShadow: '0 0 0 4px #101D27',
                    }}
                  >
                    {step.status === 'completed' && (
                      <Check className="w-3.5 h-3.5" style={{ color: '#101D27' }} />
                    )}
                    {step.status === 'current' && (
                      <Clock className="w-3.5 h-3.5" style={{ color: '#fff' }} />
                    )}
                  </div>
                  {index < arr.length - 1 && (
                    <div
                      className="w-0.5 h-8"
                      style={{ background: step.status === 'completed' ? '#4ade80' : '#1e293b' }}
                    />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex flex-col gap-0.5 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: '#f8fafc' }}>
                      {step.title}
                    </span>
                    <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                      {step.time}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    {step.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Details */}
        <div
          className="flex flex-col gap-4 p-6 rounded-2xl"
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid rgba(30, 41, 59, 0.2)',
          }}
        >
          <span
            className="text-xs font-bold uppercase"
            style={{ color: '#94a3b8', letterSpacing: '1.2px' }}
          >
            Transaction Details
          </span>

          {/* Transaction Hash */}
          {activity.transactionHash && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                Transaction Hash
              </span>
              <button
                onClick={() => handleCopy(activity.transactionHash!, 'hash')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <span
                  className="text-sm font-mono"
                  style={{ color: '#4ade80', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {activity.transactionHash}
                </span>
                {copied === 'hash' ? (
                  <Check className="w-4 h-4" style={{ color: '#4ade80' }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: '#4ade80' }} />
                )}
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="w-full h-px" style={{ background: 'rgba(30, 41, 59, 0.3)' }} />

          {/* From Address */}
          {activity.fromAddress && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                From
              </span>
              <span
                className="text-sm font-mono"
                style={{ color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {activity.fromAddress}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="w-full h-px" style={{ background: 'rgba(30, 41, 59, 0.3)' }} />

          {/* To Address */}
          {activity.toAddress && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                To
              </span>
              <span
                className="text-sm font-mono"
                style={{ color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {activity.toAddress}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="w-full h-px" style={{ background: 'rgba(30, 41, 59, 0.3)' }} />

          {/* Network Fee */}
          {activity.networkFee && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                Network Fee
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: activity.networkFee === 'Free' ? '#4ade80' : '#f8fafc' }}
              >
                {activity.networkFee}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="w-full h-px" style={{ background: 'rgba(30, 41, 59, 0.3)' }} />

          {/* Payment Method */}
          {activity.paymentMethod && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                Payment Method
              </span>
              <span className="text-sm font-bold" style={{ color: '#f8fafc' }}>
                {activity.paymentMethod}
              </span>
            </div>
          )}
        </div>

        {/* View on Explorer Button */}
        <button
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-slate-700"
          style={{
            background: '#1e293b',
            border: '1px solid #1e293b',
            color: '#f8fafc',
          }}
        >
          <ExternalLink className="w-5 h-5" />
          View on Explorer
        </button>
      </div>
    </div>
  );
}
