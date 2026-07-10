import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function PlatformsSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="platforms" title="Platforms" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount}>
      <FieldRow {...fp} fieldName="platforms" label="Supported Platforms" type="platform-select" />
    </Section>
  );
}
