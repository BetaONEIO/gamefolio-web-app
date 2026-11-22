import { useState, type ChangeEventHandler, type ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, Eye, Gamepad2, ImagePlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { BannerUploadPreview } from "@/components/BannerUploadPreview";
import { BackgroundUploadPreview } from "@/components/BackgroundUploadPreview";
import { StudioLogo } from "@/components/indie/StudioLogo";
import { StudioBannerArtwork } from "@/components/indie/StudioBannerArtwork";
import { studioBannerSources } from "@shared/studio-banner";
import IndieDeveloperProfile, { type StudioGame, type StudioLinks } from "@/pages/IndieDeveloperProfile";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { getQueryFn } from "@/lib/queryClient";
import { DEFAULT_PROFILE_THEME } from "@shared/profile-theme";
import type { UserWithStats } from "@shared/schema";

export type StudioProfileDraft = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  hideBanner: boolean;
  backgroundColor: string;
  accentColor: string;
  profileBackgroundImageUrl: string;
  profileBackgroundTheme: string;
  profileBackgroundGradient: boolean;
  profileBackgroundGradientCss: string;
  profileBackgroundPositionX: string;
  profileBackgroundPositionY: string;
  profileBackgroundZoom: string;
  profileBackgroundDesktopX: string;
  profileBackgroundDesktopY: string;
  profileBackgroundDesktopZoom: string;
};

type Props = {
  user: UserWithStats;
  draft: StudioProfileDraft;
  onChange: (patch: Partial<StudioProfileDraft>) => void;
  avatarPreview: string;
  borderColor: string;
  onBorderColorChange: (color: string) => void;
  onAvatarChange: ChangeEventHandler<HTMLInputElement>;
  onCancelAvatar: () => void;
  onSave: () => void;
  hasChanges: boolean;
  saving: boolean;
  saved: boolean;
};

const hexColor = /^#[\da-f]{6}$/i;
const surface = "rounded-2xl border border-[#303448] bg-[#101119] p-5 sm:p-6";
const secondaryButton = "border-[#303448] bg-[#171927] text-white hover:bg-[#242838]";

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const id = `studio-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input aria-label={`Choose ${label.toLowerCase()}`} type="color" value={hexColor.test(value) ? value : "#0F101B"} onChange={event => onChange(event.target.value)} className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-[#303448] bg-[#171927] p-1" />
        <Input id={id} value={value} onChange={event => onChange(event.target.value)} pattern="#[0-9a-fA-F]{6}" maxLength={7} className="font-mono" required />
      </div>
    </div>
  );
}

function GameRow({ game }: { game: StudioGame }) {
  const { signedUrl } = useSignedUrl(game.capsuleImageUrl || game.headerImageUrl || game.catalogImageUrl);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-[#292D3D] py-4 last:border-0">
      <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#171927]">
        {signedUrl && !failed ? <img src={signedUrl} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <Gamepad2 className="h-6 w-6 text-[#B9FF1A]" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold">{game.catalogGameName || game.gameName || game.title}</p>
        <p className="mt-1 text-sm text-slate-300">{game.isPrimary ? "Featured game" : "In your portfolio"}</p>
      </div>
      <Link href={`/game-dashboard?tab=game-profile&gameId=${game.id}`} className="rounded-lg border border-[#303448] bg-[#171927] px-3 py-2 text-sm font-semibold text-white hover:bg-[#242838]">Manage game</Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className={surface}><h2 className="mb-5 text-lg font-semibold">{title}</h2>{children}</section>;
}

export function StudioProfileSettings(props: Props) {
  const { user, draft, onChange, avatarPreview, borderColor, onBorderColorChange, onAvatarChange, onCancelAvatar, onSave, hasChanges, saving, saved } = props;
  const [showPreview, setShowPreview] = useState(false);
  const [uploadBanner, setUploadBanner] = useState(false);
  const [uploadBackground, setUploadBackground] = useState(false);
  const { data, isLoading, isError } = useQuery<{ games: StudioGame[]; studio: StudioLinks }>({
    queryKey: [`/api/games/indie/${user.username}/list`],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  const primaryGame = data?.games.find(game => game.isPrimary) || data?.games[0];
  const bannerSources = studioBannerSources(draft.bannerUrl, data?.games || []);
  const draftProfile = { ...user, ...draft, avatarUrl: avatarPreview || draft.avatarUrl, avatarBorderColor: borderColor };
  const validColours = [draft.backgroundColor, draft.accentColor, borderColor].every(colour => hexColor.test(colour));
  const setColor = (key: "backgroundColor" | "accentColor", value: string) => onChange({ [key]: value, profileBackgroundTheme: "default", profileBackgroundGradient: false, profileBackgroundGradientCss: "" });

  return (
    <div className="mx-auto w-full max-w-[1440px] text-white">
      <Link href={`/profile/${user.username}`} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to studio profile</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold sm:text-3xl">Studio Profile &amp; Appearance</h1><p className="mt-2 text-sm text-slate-300">Edit how your studio appears on Gamefolio.</p></div>
        <Button type="button" variant="outline" className={`${secondaryButton} xl:hidden`} aria-pressed={showPreview} onClick={() => setShowPreview(value => !value)}><Eye className="mr-2 h-4 w-4" />{showPreview ? "Hide preview" : "Show preview"}</Button>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <form className="min-w-0" onSubmit={event => { event.preventDefault(); if (validColours && draft.displayName.trim()) onSave(); }}>
          <Tabs defaultValue="profile" className="space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-3 bg-[#171927] p-1">
              <TabsTrigger value="profile">Studio profile</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="games">Your games</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-5">
              <Section title="Studio identity">
                <div className="mb-6 flex flex-wrap items-center gap-5">
                  <StudioLogo url={avatarPreview || draft.avatarUrl} name={draft.displayName || user.username} borderColor={hexColor.test(borderColor) ? borderColor : DEFAULT_PROFILE_THEME.avatarBorderColor} accentColor={hexColor.test(draft.accentColor) ? draft.accentColor : DEFAULT_PROFILE_THEME.accentColor} className="h-32 w-32" />
                  <div className="space-y-3">
                    <p className="font-medium">Studio logo</p>
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${secondaryButton}`}><Camera className="h-4 w-4" />{draft.avatarUrl || avatarPreview ? "Change logo" : "Upload logo"}<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" aria-label="Upload studio logo" className="sr-only" onChange={event => { onAvatarChange(event); event.target.value = ""; }} /></label>
                    {avatarPreview && <Button type="button" variant="ghost" onClick={onCancelAvatar}>Cancel logo change</Button>}
                    <p className="max-w-xs text-xs leading-5 text-slate-300">Square image, 400 × 400px or larger. JPG, PNG, WebP or GIF. Maximum 5MB.</p>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2"><Label htmlFor="studio-display-name">Studio / developer name</Label><Input id="studio-display-name" value={draft.displayName} maxLength={30} onChange={event => onChange({displayName:event.target.value})} placeholder="Your studio name" /><p className="text-xs text-slate-300">Your public name · @{user.username}</p></div>
                  <div className="space-y-2"><Label htmlFor="studio-bio">About the studio</Label><Textarea id="studio-bio" value={draft.bio} onChange={event => onChange({bio:event.target.value})} rows={4} placeholder="Introduce your studio and the games you make." /></div>
                </div>
              </Section>
              <Section title="Website & social links">
                <p className="text-sm leading-6 text-slate-300">Your public studio uses the links in your featured game’s settings.</p>
                {data?.studio && <ul className="my-4 space-y-2 text-sm text-slate-300">{[
                  ["Website", data.studio.studioWebsite || data.studio.websiteUrl], ["Discord", data.studio.discordUrl], ["X", data.studio.twitterUrl], ["YouTube", data.studio.youtubeUrl],
                ].filter(([,url]) => !!url).map(([label,url]) => <li key={label} className="break-words"><span className="font-medium text-white">{label}</span> · {url}</li>)}</ul>}
                <Link href={primaryGame ? `/game-dashboard?tab=game-profile&gameId=${primaryGame.id}` : "/game-dashboard?tab=game-profile"} className="mt-3 inline-block text-sm font-semibold text-[#B9FF1A] hover:underline">Edit studio links in game settings →</Link>
              </Section>
            </TabsContent>
            <TabsContent value="appearance" className="space-y-5">
              <Section title="Studio banner">
                <div className="mb-4 flex aspect-[3.5/1] items-center justify-center overflow-hidden rounded-xl bg-[#171927]">
                  <StudioBannerArtwork sources={bannerSources} className="h-full w-full object-cover" fallback={<div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-slate-300"><ImagePlus className="h-8 w-8" /><span>{bannerSources.length ? "Artwork could not load. Check the image in game settings." : "Add artwork in game settings or upload a banner."}</span></div>} />
                </div>
                <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" className={secondaryButton} onClick={() => setUploadBanner(true)}><ImagePlus className="mr-2 h-4 w-4" />{draft.bannerUrl ? "Change banner" : "Upload banner"}</Button>{draft.bannerUrl && <Button type="button" variant="outline" className={secondaryButton} onClick={() => onChange({bannerUrl:""})}>Use game artwork</Button>}</div>
                {!draft.bannerUrl && primaryGame && <p className="mt-3 text-sm text-slate-300">Using artwork from {primaryGame.catalogGameName || primaryGame.gameName || primaryGame.title}.</p>}
                <div className="mt-5 flex items-center justify-between gap-4"><Label htmlFor="studio-show-banner">Show banner on studio profile</Label><Switch id="studio-show-banner" checked={!draft.hideBanner} onCheckedChange={checked => onChange({hideBanner:!checked})} /></div>
              </Section>
              <Section title="Studio colours">
                <div className="grid gap-5 sm:grid-cols-2"><ColorField label="Background colour" value={draft.backgroundColor} onChange={value => setColor("backgroundColor",value)} /><ColorField label="Accent colour" value={draft.accentColor} onChange={value => setColor("accentColor",value)} /><ColorField label="Logo border colour" value={borderColor} onChange={value => { onBorderColorChange(value); onChange({profileBackgroundTheme:"default"}); }} /></div>
                {draft.profileBackgroundTheme !== "default" && <p className="mt-4 text-sm text-slate-300">Your saved theme is active. Choosing a colour switches to custom studio colours.</p>}
              </Section>
              <Section title="Background image">
                <p className="mb-4 text-sm text-slate-300">Optional. Use the crop controls to position your image for desktop and mobile.</p>
                <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" className={secondaryButton} onClick={() => setUploadBackground(true)}>{draft.profileBackgroundImageUrl ? "Change background image" : "Upload background image"}</Button>{draft.profileBackgroundImageUrl && <Button type="button" variant="outline" className={secondaryButton} onClick={() => onChange({profileBackgroundImageUrl:""})}>Use background colour</Button>}</div>
              </Section>
            </TabsContent>
            <TabsContent value="games">
              <Section title="Your game portfolio">
                <p className="mb-3 text-sm leading-6 text-slate-300">Artwork, descriptions, platforms and store links come from each game’s settings.</p>
                {isLoading ? <p role="status">Loading your games…</p> : isError ? <p role="alert">Games could not be loaded. Open Manage games to try again.</p> : data?.games.map(game => <GameRow key={game.id} game={game} />)}
                <Link href="/game-dashboard" className="mt-5 inline-block text-sm font-semibold text-[#B9FF1A] hover:underline">Manage games →</Link>
              </Section>
            </TabsContent>
          </Tabs>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#292D3D] pt-5">
            <p className="text-sm text-slate-300" role="status">{saved ? "Changes saved" : hasChanges ? "You have unsaved changes" : "All changes saved"}</p>
            <Button type="submit" disabled={saving || saved || !hasChanges || !validColours || !draft.displayName.trim()} className="bg-[#B9FF1A] font-semibold text-[#071018] hover:bg-[#CBFF5C] disabled:bg-[#293344] disabled:text-slate-300 disabled:opacity-100"><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save changes"}</Button>
          </div>
          {!validColours && <p role="alert" className="mt-3 text-sm text-red-300">Enter six-digit hex colours, such as #B9FF1A.</p>}
          <Link href="/settings/profile?accountTab=platforms" className="mt-5 inline-block text-sm text-slate-300 hover:text-white">Account connections &amp; payouts →</Link>
        </form>
        <aside className={`${showPreview ? "block" : "hidden xl:block"} min-w-0 xl:sticky xl:top-24`} aria-label="Studio profile preview">
          <p className="mb-3 text-sm font-semibold text-slate-300">Live studio preview</p>
          <div className="max-h-[680px] overflow-y-auto rounded-2xl border border-[#303448]" aria-hidden="true" ref={element => element?.setAttribute("inert", "")}>
            <IndieDeveloperProfile profile={draftProfile} isOwnProfile preview />
          </div>
        </aside>
      </div>
      {uploadBanner && <BannerUploadPreview currentBannerUrl={draft.bannerUrl} isPro={user.isPro === true} onUpload={bannerUrl => { onChange({bannerUrl}); setUploadBanner(false); }} onCancel={() => setUploadBanner(false)} />}
      {uploadBackground && <BackgroundUploadPreview onCancel={() => setUploadBackground(false)} onUpload={(url, mobile, desktop) => { onChange({profileBackgroundImageUrl:url, profileBackgroundPositionX:String(mobile.positionX), profileBackgroundPositionY:String(mobile.positionY), profileBackgroundZoom:String(mobile.zoom), profileBackgroundDesktopX:String(desktop.positionX), profileBackgroundDesktopY:String(desktop.positionY), profileBackgroundDesktopZoom:String(desktop.zoom)}); setUploadBackground(false); }} />}
    </div>
  );
}
