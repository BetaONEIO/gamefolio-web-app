import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function StoreSpecificSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="store-specific" title="Store-Specific Info" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount}>
      <p className="text-[10px] text-white/30 pb-2">
        Age ratings, language support, and content details shown on store pages and in listing metadata.
      </p>
      <FieldRow {...fp} fieldName="ageRating" label="Age Rating (e.g. PEGI 12, ESRB T)" type="text" />
      <FieldRow {...fp} fieldName="supportedLanguages" label="Supported Languages" type="tag-array" />
      <FieldRow {...fp} fieldName="contentDescriptors" label="Content Descriptors" type="tag-array" />
    </Section>
  );
}
