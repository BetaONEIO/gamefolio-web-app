import React from 'react';
import { resolveProfileTheme, type ProfileThemeValues } from './profile-theme';

/** Theme artwork is shared by the profile page and static compositions. */
export function ProfileThemeAtmosphere({ profile }: { profile: ProfileThemeValues }) {
  const theme = resolveProfileTheme(profile).theme;
  if (profile.profileBackgroundImageUrl || !theme || theme.slug === 'default') return null;
  return <div className="profile-theme-atmosphere" aria-hidden="true" style={{ backgroundImage: theme.assets.decorativeOverlay || 'none' }} />;
}
