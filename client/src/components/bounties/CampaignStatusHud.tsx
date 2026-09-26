import type { CSSProperties } from "react";
import "./CampaignStatusHud.css";

export type CampaignStatusHudState =
  | "under_review"
  | "complete"
  | "changes_requested"
  | "rejected"
  | "ended";

const labels: Record<CampaignStatusHudState, string> = {
  under_review: "Under Review",
  complete: "Campaign Complete",
  changes_requested: "Changes Requested",
  rejected: "Campaign Rejected",
  ended: "Campaign Ended",
};

type Props = {
  state: CampaignStatusHudState;
  accent: string;
  className?: string;
};

export function CampaignStatusHud({ state, accent, className = "" }: Props) {
  const style = { "--campaign-hud-accent": accent } as CSSProperties;

  return (
    <section
      className={`campaign-status-hud ${className}`}
      data-state={state}
      role="status"
      aria-label={labels[state]}
      style={style}
    >
      <span className="campaign-status-hud__frame" aria-hidden="true">
        <span className="campaign-status-hud__surface" />
      </span>
      <span className="campaign-status-hud__slashes" aria-hidden="true" />
      <span className="campaign-status-hud__crosshair" aria-hidden="true">+</span>
      <span className="campaign-status-hud__segments" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <h2 className="campaign-status-hud__title">{labels[state]}</h2>
    </section>
  );
}