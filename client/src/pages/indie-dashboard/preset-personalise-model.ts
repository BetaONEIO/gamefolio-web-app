import {
  CAMPAIGN_COMMERCIAL_MODEL,
  getPresetObjectiveSnapshot,
  getPresetSubmissionEstimate,
} from "@shared/campaign-commercial-model";

export function getPresetPersonaliseSummary(slug: string, displayName: string) {
  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find(item => item.slug === slug);
  if (!preset) return null;
  const estimate = getPresetSubmissionEstimate(preset);
  const objectives = getPresetObjectiveSnapshot(preset);
  return {
    title: displayName,
    applicationDays: preset.applicationPeriodDays,
    completionDays: preset.campaignDurationDays,
    creatorRange: estimate ? `${estimate.creatorMin}–${estimate.creatorMax}` : "—",
    submissionRange: estimate ? `Approximately ${estimate.submissionMin}–${estimate.submissionMax}` : "—",
    deliverablesPerCreator: Object.values(objectives).reduce((sum, count) => sum + count, 0),
  };
}

export function getPresetDecisionBlocker(input: {
  title: string;
  accessChoice: string | null | undefined;
  fullKeyCount?: number | null;
  demoKeyCount?: number | null;
  noKeyConfirmed: boolean;
  startType: "asap" | "scheduled";
  scheduledDate: string;
  scheduledTime: string;
  launchIsValid: boolean;
}): string | null {
  if (!input.title.trim()) return "Add a campaign title to continue.";
  if (!input.accessChoice) return "Choose how creators will access your game.";
  if (input.accessChoice === "full_game_upfront" && input.fullKeyCount == null) {
    return "Check full-game key availability before selecting this option.";
  }
  if (input.accessChoice === "private_playtest" && input.demoKeyCount == null) {
    return "Check demo or playtest key availability before selecting this option.";
  }
  if (input.accessChoice === "full_game_upfront" && input.fullKeyCount === 0) {
    return "Add full-game keys before selecting this option.";
  }
  if (input.accessChoice === "private_playtest" && input.demoKeyCount === 0) {
    return "Add demo or playtest keys before selecting this option.";
  }
  if (
    (input.accessChoice === "free_to_play" || input.accessChoice === "public_demo") &&
    !input.noKeyConfirmed
  ) return "Confirm no-key access in your game profile.";
  if (input.startType === "scheduled") {
    if (!input.scheduledDate || !input.scheduledTime) return "Select a launch date and time.";
    if (!input.launchIsValid) return "Choose a future launch date and time.";
  }
  return null;
}
export function getInitialGameAccess(input: {
  existingChoice?: string | null; preferred?: string | null; isFree?: boolean;
  fullCount?: number; demoCount?: number;
}): string | null {
  if (input.existingChoice) return input.existingChoice;
  if (input.preferred === "free_to_play" || input.preferred === "public_demo") return input.preferred;
  if (input.isFree) return "free_to_play";
  if (input.preferred === "full_game_upfront" && (input.fullCount ?? 0) > 0) return input.preferred;
  if (input.preferred === "private_playtest" && (input.demoCount ?? 0) > 0) return input.preferred;
  return null;
}
