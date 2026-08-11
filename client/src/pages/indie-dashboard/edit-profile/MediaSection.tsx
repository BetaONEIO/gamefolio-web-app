import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function MediaSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount, statusLabel, statusColor }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="media" title="Edit Media URLs" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount} statusLabel={statusLabel} statusColor={statusColor}>
      <FieldRow {...fp} fieldName="headerImageUrl" label="Header Image URL" type="url" />
      <FieldRow {...fp} fieldName="capsuleImageUrl" label="Capsule / Thumbnail URL" type="url" />
      <FieldRow {...fp} fieldName="trailerUrl" label="Trailer URL" type="url" />
      <FieldRow {...fp} fieldName="screenshotUrls" label="Screenshot URLs" type="url-array" />
    </Section>
  );
}
