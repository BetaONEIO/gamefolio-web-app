import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function FeaturesSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="features" title="Features & Genre" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount}>
      <FieldRow {...fp} fieldName="keyFeatures" label="Key Features" type="tag-array" />
      <FieldRow {...fp} fieldName="genres" label="Genres" type="tag-array" />
      <FieldRow {...fp} fieldName="tags" label="Tags" type="tag-array" />
    </Section>
  );
}
