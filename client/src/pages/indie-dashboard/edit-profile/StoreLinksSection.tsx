import { FieldRow, Section } from "./FieldRow";
import type { SectionWrapperProps } from "./types";

export function StoreLinksSection({ profile, fieldMeta, onSave, onRevert, isSaving, open, onToggle, filledCount, totalCount }: SectionWrapperProps) {
  const fp = { profile, fieldMeta, onSave, onRevert, isSaving };
  return (
    <Section id="stores" title="Store Links" open={open} onToggle={onToggle} filledCount={filledCount} totalCount={totalCount}>
      <p className="text-[10px] text-white/30 pb-2">
        Store IDs enable automatic import and sync. Slug/URL pairs let visitors jump straight to your store pages.
      </p>
      <FieldRow {...fp} fieldName="steamAppId" label="Steam App ID" type="text" />
      <FieldRow {...fp} fieldName="steamUrl" label="Steam Store URL" type="url" />
      <FieldRow {...fp} fieldName="epicSlug" label="Epic Games Slug" type="text" />
      <FieldRow {...fp} fieldName="epicUrl" label="Epic Store URL" type="url" />
      <FieldRow {...fp} fieldName="itchUrl" label="itch.io URL" type="url" />
    </Section>
  );
}
