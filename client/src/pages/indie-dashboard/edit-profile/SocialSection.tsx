import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function SocialSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="social" title="Social & Contact" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount}>
      <FieldRow {...fp} fieldName="websiteUrl" label="Website URL" type="url" />
      <FieldRow {...fp} fieldName="twitterUrl" label="Twitter / X URL" type="url" />
      <FieldRow {...fp} fieldName="discordUrl" label="Discord URL" type="url" />
    </Section>
  );
}
