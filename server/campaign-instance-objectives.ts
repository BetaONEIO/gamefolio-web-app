/**
 * Campaign instances keep their own objective snapshot. The template bounty
 * rows remain the stable submission targets (and therefore provide ids), but
 * their display fields must come from the instance snapshot when one exists.
 */
export function mergeInstanceObjectives(templateBounties: any[], snapshotValue: any): any[] {
  let snapshot = snapshotValue;
  if (typeof snapshotValue === "string") {
    try { snapshot = JSON.parse(snapshotValue); } catch { /* Legacy snapshot without objectives. */ }
  }
  const definitions = Array.isArray(snapshot)
    ? snapshot
    : Array.isArray(snapshot?.objectives) ? snapshot.objectives : [];
  // An explicitly saved empty list means no objectives. Only older,
  // non-objective snapshot shapes may fall back to template rows.
  if (!Array.isArray(snapshot) && !Array.isArray(snapshot?.objectives)) {
    return templateBounties.filter((objective: any) => Number(objective.quantity ?? 0) > 0);
  }

  return definitions.map((definition: any, index: number) => {
    const contentType = definition.content_type ?? definition.contentType ?? definition.type;
    const order = Number(definition.completion_order ?? definition.completionOrder ?? index);
    const template = (definition.id != null
      ? templateBounties.find((candidate: any) => Number(candidate.id) === Number(definition.id))
      : null) ?? templateBounties.find((candidate: any) =>
      Number(candidate.completion_order ?? 0) === order ||
      (contentType && candidate.content_type === contentType && !definitions
        .slice(0, index)
        .some((previous: any) => (previous.content_type ?? previous.contentType ?? previous.type) === candidate.content_type)),
    ) ?? templateBounties[index];
    return {
      ...(template ?? {}),
      ...definition,
      // Snapshot ids are the stable submission targets. Never manufacture a
      // new id from array position or silently retarget an objective.
      id: definition.id ?? template?.id,
      content_type: contentType ?? template?.content_type,
      completion_order: Number.isFinite(order) ? order : index,
      mandatory: definition.mandatory == null ? template?.mandatory : Boolean(definition.mandatory),
      quantity: definition.quantity == null ? template?.quantity : Number(definition.quantity),
      xp_reward: definition.xp_reward ?? definition.xpReward ?? template?.xp_reward,
    };
  }).filter((objective: any) =>
    (objective.content_type || objective.title || objective.id) &&
    Number(objective.quantity ?? 0) > 0,
  );
}
