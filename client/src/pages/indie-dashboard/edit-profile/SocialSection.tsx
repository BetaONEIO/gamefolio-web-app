import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function SocialSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount, statusLabel, statusColor }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="social" title="Social & Contact" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount} statusLabel={statusLabel} statusColor={statusColor}>
      <FieldRow {...fp} fieldName="websiteUrl" label="Website URL" type="url" />
      <FieldRow {...fp} fieldName="twitterUrl" label="Twitter / X URL" type="url" />
      <FieldRow {...fp} fieldName="discordUrl" label="Discord URL" type="url" />
    </Section>
  );
}
