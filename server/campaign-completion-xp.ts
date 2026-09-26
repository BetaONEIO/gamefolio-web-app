type CampaignCompletionXpOptions = {
  instanceAmount?: unknown;
  templateAmount?: unknown;
  configuredAmount?: unknown;
  tierAmount?: unknown;
  multiplier?: unknown;
};

function positiveAmount(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function resolveCampaignCompletionXp({
  instanceAmount,
  templateAmount,
  configuredAmount,
  tierAmount,
  multiplier = 1,
}: CampaignCompletionXpOptions): number {
  const baseAmount = [
    positiveAmount(instanceAmount),
    positiveAmount(templateAmount),
    positiveAmount(configuredAmount),
    positiveAmount(tierAmount),
  ].find(amount => amount > 0) ?? 0;
  const parsedMultiplier = Number(multiplier ?? 1);
  const safeMultiplier = Number.isFinite(parsedMultiplier) && parsedMultiplier >= 0
    ? parsedMultiplier
    : 1;

  return Math.max(0, Math.round(baseAmount * safeMultiplier));
}