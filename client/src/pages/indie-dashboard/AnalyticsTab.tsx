import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3, TrendingUp, Users, Trophy } from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "../IndieDashboardPage";

interface AnalyticsData {
  joinsOverTime: Array<{ date: string; joins: number }>;
  topBounties: Array<{ id: number; title: string; participantCount: number; totalViews: number; totalXpAwarded: number }>;
  submissionStats: { total: number; approved: number; rejected: number; pending: number };
  topCreators: Array<{ id: number; username: string; avatarUrl: string | null; xpEarned: number; totalViews: number }>;
}

function MiniBarChart({ data }: { data: Array<{ date: string; joins: number }> }) {
  if (data.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No creator activity in the last 30 days.</div>;
  }
  const max = Math.max(...data.map((d) => d.joins), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{ height: `${(d.joins / max) * 100}%`, background: NEON, minHeight: "2px", opacity: 0.85 }}
            title={`${d.date}: ${d.joins} joins`}
          />
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsTab() {
  const { data, isLoading } = useQuery<AnalyticsData>({ queryKey: ["/api/games/indie/analytics"] });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} /></div>;
  }

  const d = data ?? {
    joinsOverTime: [], topBounties: [], topCreators: [],
    submissionStats: { total: 0, approved: 0, rejected: 0, pending: 0 },
  };

  const approvalRate = d.submissionStats.total > 0 ? Math.round((d.submissionStats.approved / d.submissionStats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="text-xl font-black text-white">{d.submissionStats.total}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Submissions</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="text-xl font-black" style={{ color: NEON }}>{approvalRate}%</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Approval Rate</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="text-xl font-black text-white">{d.submissionStats.pending}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Pending</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="text-xl font-black text-white">{d.submissionStats.rejected}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Rejected</div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: NEON }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Creator Joins (Last 30 Days)</h3>
        </div>
        <MiniBarChart data={d.joinsOverTime} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4" style={{ color: NEON }} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Bounties</h3>
          </div>
          {d.topBounties.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-6">No bounty data yet.</div>
          ) : (
            <div className="space-y-2">
              {d.topBounties.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-sm text-white truncate flex-1 mr-2">{b.title}</div>
                  <div className="text-xs text-gray-400 shrink-0">{b.totalViews.toLocaleString()} views · {b.participantCount} creators</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: NEON }} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Creators</h3>
          </div>
          {d.topCreators.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-6">No creator data yet.</div>
          ) : (
            <div className="space-y-2">
              {d.topCreators.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                  )}
                  <div className="flex-1 text-sm text-white truncate">{c.username}</div>
                  <div className="text-xs" style={{ color: NEON }}>{c.xpEarned.toLocaleString()} XP</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
