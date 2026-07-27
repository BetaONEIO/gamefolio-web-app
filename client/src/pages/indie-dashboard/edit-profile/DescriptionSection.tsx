import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function DescriptionSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount, statusLabel, statusColor }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="description" title="Description" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount} statusLabel={statusLabel} statusColor={statusColor}>
      <FieldRow {...fp} fieldName="shortDescription" label="Short Description" type="textarea" />
      <FieldRow {...fp} fieldName="fullDescription" label="Full Description" type="textarea" />
    </Section>
  );
}
