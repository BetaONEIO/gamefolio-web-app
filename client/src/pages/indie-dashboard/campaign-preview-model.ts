import { getPresetObjectiveSnapshot, type CommercialPreset } from '@shared/campaign-commercial-model';
export type PreviewAccess = 'demo' | 'full' | 'demo_to_full' | 'no_key';
export function previewCapacity(access: PreviewAccess, inventory: {demo?: number; full?: number}, requested: number) {
  const demo = Math.max(0, inventory.demo ?? 0), full = Math.max(0, inventory.full ?? 0);
  const limit = access === 'no_key' ? requested : access === 'demo' ? demo : access === 'full' ? full : Math.min(demo, full);
  return Math.max(0, Math.min(Math.floor(requested), limit));
}
export function campaignPreviewOutputs(preset: CommercialPreset, capacity: number) {
  const participationRatio = preset.estimatedCreatorMin != null && preset.estimatedCreatorMax ? preset.estimatedCreatorMin / preset.estimatedCreatorMax : 0;
  return Object.entries(getPresetObjectiveSnapshot(preset)).filter(([,quantity]) => quantity > 0).map(([type,quantity]) => ({
    type, min: Math.floor(capacity * participationRatio * quantity), max: capacity * quantity,
  }));
}
export function recommendCampaign(allowanceAvailable: boolean, noKey: boolean, inventory: {demo?: number;full?: number}) {
  return allowanceAvailable && (noKey || (inventory.demo ?? 0) > 0 || (inventory.full ?? 0) > 0) ? 'quick-creator' : 'content-boost';
}
