import { FieldRow, Section } from "./FieldRow";
import { RELEASE_STATUS_OPTIONS, type SectionWrapperProps } from "./types";

export function BasicInfoSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="basic" title="Basic Info" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount}>
      <FieldRow {...fp} fieldName="gameName" label="Game Name" type="text" />
      <FieldRow {...fp} fieldName="releaseStatus" label="Release Status" type="select" selectOptions={RELEASE_STATUS_OPTIONS} />
      <FieldRow {...fp} fieldName="releaseDate" label="Release Date" type="text" />
      <FieldRow {...fp} fieldName="price" label="Price" type="text" />
    </Section>
  );
}
