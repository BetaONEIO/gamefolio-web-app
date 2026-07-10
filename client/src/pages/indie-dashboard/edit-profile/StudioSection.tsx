import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function StudioSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="studio" title="Studio" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount}>
      <FieldRow {...fp} fieldName="studioName" label="Studio Name" type="text" />
      <FieldRow {...fp} fieldName="studioFoundedYear" label="Founded Year" type="text" />
      <FieldRow {...fp} fieldName="studioTeamSize" label="Team Size" type="text" />
      <FieldRow {...fp} fieldName="studioWebsite" label="Studio Website" type="url" />
      <FieldRow {...fp} fieldName="studioCountry" label="Country" type="text" />
    </Section>
  );
}
