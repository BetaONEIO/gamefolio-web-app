import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function PlatformsSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount, statusLabel, statusColor }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="platforms" title="Platforms" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount} statusLabel={statusLabel} statusColor={statusColor}>
      <FieldRow {...fp} fieldName="platforms" label="Supported Platforms" type="platform-select" />
    </Section>
  );
}
