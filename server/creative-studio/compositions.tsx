import React from 'react';
import { PROFILE_FONT_MAP, FONT_EFFECT_MAP } from '../../shared/profile-typography';
import { ProfileThemeAtmosphere } from '../../shared/profile-theme-atmosphere';
import { profileThemeStyle, resolveProfileTheme } from '../../shared/profile-theme';
import type { StudioComposition, StudioProfile } from '../../shared/creative-studio';

const number = (value: number) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
export function GamefolioExportBackground({ image }: { image?: string }) {
  return <div className="export-background">{image ? <img src={image} alt="" /> : <><div className="export-grid" /><div className="export-stripe" /><span className="export-cross cross-one">+</span><span className="export-cross cross-two">+</span></>}</div>;
}
function Identity({ profile: p, size = 210 }: { profile: StudioProfile; size?: number }) {
  const calibration = p.frameCalibration;
  const scale = calibration ? ((1 + calibration.overlap) / calibration.innerDiameter) * calibration.sizeAdjustment : 1.6;
  const frameStyle: React.CSSProperties = { width: `${scale * 80}%`, height: `${scale * 80}%`, left: `${50 + (0.5 - (calibration?.ringCenterX ?? 0.5)) * scale * 80}%`, top: `${50 + (0.5 - (calibration?.ringCenterY ?? 0.5)) * scale * 80}%`, transform: 'translate(-50%, -50%)' };
  return <div className="identity" style={{ width: size, height: size, fontSize: size * 0.22 }}>
    <div className="identity-photo" style={{ borderColor: resolveProfileTheme(p).avatarBorderColor, borderWidth: p.avatarBorder ? 0 : 3 }}>{p.avatar ? <img src={p.avatar} alt="" /> : <span>{p.username.slice(0, 2).toUpperCase()}</span>}</div>
    {p.avatarBorder && <img className="identity-frame" style={frameStyle} src={p.avatarBorder} alt="" />}
    {p.profileBorder && <img className="identity-frame" src={p.profileBorder} alt="" />}
  </div>;
}
function ProfileThemeSurface({ profile: p, children }: { profile: StudioProfile; children: React.ReactNode }) {
  const theme = resolveProfileTheme(p);
  return <section className={`profile-theme-scope profile-theme-catalog studio-profile ${theme.theme?.slug === 'towerdog_pixel_surge' ? 'profile-theme-towerdog' : ''}`} data-profile-theme={theme.theme?.slug} data-profile-animation="none" style={{ ...profileThemeStyle(p), background: p.profileBackgroundImageUrl ? `url("${p.profileBackgroundImageUrl}") center/cover` : theme.theme?.profileBackgroundGradientCss || p.profileBackgroundGradientCss || theme.backgroundColor } as React.CSSProperties}>
    <ProfileThemeAtmosphere profile={p} />
    <div className="profile-foreground">{children}</div>
  </section>;
}
export function ProfileExport({ data }: { data: StudioComposition }) {
  const p = data.profile!;
  const font = p.profileFont && p.profileFont !== 'default' ? PROFILE_FONT_MAP[p.profileFont] : undefined;
  const nameStyle: React.CSSProperties = { fontFamily: font?.family, fontSize: font ? 62 * font.scale : undefined, textShadow: FONT_EFFECT_MAP[p.profileFontEffect || 'none'], color: resolveProfileTheme(p).theme?.light ? resolveProfileTheme(p).accentColor : p.profileFontColor || undefined };
  return <ProfileThemeSurface profile={p}>
    {p.banner && <img className="profile-banner" src={p.banner} alt="" />}
    <div className="profile-main"><Identity profile={p} /><div className="profile-copy">
      <div className="eyebrow">GAMEFOLIO PLAYER</div>
      {p.nameTag && <img className="name-tag" src={p.nameTag} alt="Equipped name tag" />}
      <h2 data-fit style={nameStyle}>{p.displayName}{p.verificationBadge && <img className="verification" src={p.verificationBadge} alt="Equipped verification badge" />}</h2>
      <p className="handle" data-fit>@{p.username}</p><div className="level">LEVEL {number(p.level)}</div>
    </div></div>
    <div className="profile-stats">{[[p.xp,'XP'],[p.stats!.views,'VIEWS'],[p.stats!.posts,'POSTS'],[p.stats!.followers,'FOLLOWERS']].map(([value,label]) => <div key={String(label)}><strong data-fit>{number(Number(value))}</strong><span>{label}</span></div>)}</div>
  </ProfileThemeSurface>;
}
export function LeaderboardExport({ data }: { data: StudioComposition }) {
  const o = data.request;
  return <div className={`leaderboard rows-${data.entries!.length > 5 ? 'ten' : 'five'}`}>{data.entries!.map(entry => <div className="leaderboard-row" key={entry.profile.id} style={{ borderLeftColor: resolveProfileTheme(entry.profile).accentColor }}>
    {o.showRank && <span className="rank">{String(entry.rank).padStart(2, '0')}</span>}
    {o.showAvatar && <Identity profile={entry.profile} size={data.entries!.length > 5 ? 52 : 82} />}
    {o.showUsername && <div className="row-name" data-fit>{entry.profile.displayName}<small>@{entry.profile.username}</small></div>}
    {o.showBadge && entry.profile.verificationBadge && <img className="verification" src={entry.profile.verificationBadge} alt="Equipped badge" />}
    {o.showXp && <div className="row-xp">{number(entry.xp)}<small>XP</small></div>}
  </div>)}</div>;
}
export function GamefolioCardExport({ data }: { data: StudioComposition }) {
  return <section className="game-card"><div className="game-art">{data.game!.image ? <img src={data.game!.image} alt="" /> : <div className="art-missing">Artwork unavailable</div>}</div><div className="game-copy"><span className="eyebrow">GAMEFOLIO / GAME COLLECTION</span><h2 data-fit>{data.game!.name}</h2><div className="game-rule" /><p>YOUR GAMES.<br />YOUR MOMENTS.</p><span className="game-address">app.gamefolio.com</span></div></section>;
}
export function ExportCanvas({ data }: { data: StudioComposition }) {
  return <main id="export-canvas"><GamefolioExportBackground image={data.background} /><div className="export-safe"><header><div className="wordmark">GAMEFOLIO<span>■</span></div><span className="edition">{data.request.type === 'profile' ? 'PLAYER SPOTLIGHT' : data.request.type === 'game' ? 'GAME SPOTLIGHT' : 'THE LEADERBOARD'}</span></header><div className="composition-title">{data.request.type === 'leaderboard' && <h1 data-fit>{data.title}</h1>}<p>{data.request.type === 'leaderboard' ? data.subtitle : 'PLAY. CREATE. CONNECT.'}</p></div><div className="composition">{data.request.type === 'profile' ? <ProfileExport data={data} /> : data.request.type === 'leaderboard' ? <LeaderboardExport data={data} /> : <GamefolioCardExport data={data} />}</div><footer><span>THE HOME OF YOUR GAMING IDENTITY</span><span>app.gamefolio.com</span></footer></div></main>;
}
export const compositionCss = `
*{box-sizing:border-box}html,body{margin:0;padding:0;width:1920px;height:1080px;overflow:hidden;color:#f5f6f2;font-family:'Space Grotesk',sans-serif}#export-canvas{position:relative;width:1920px;height:1080px;overflow:hidden;background:#0b0d0b}.export-background{position:absolute;inset:0;background:#0b0d0b}.export-background>img{width:100%;height:100%;object-fit:cover}.export-grid{position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,transparent 0 79px,#ffffff05 79px 80px),repeating-linear-gradient(90deg,transparent 0 79px,#ffffff05 79px 80px)}.export-stripe{position:absolute;right:80px;top:0;bottom:0;width:14px;background:#b7ff18;opacity:.35;transform:skew(-18deg)}.export-cross{position:absolute;color:#b7ff18;font-size:24px}.cross-one{left:55px;top:515px}.cross-two{right:65px;bottom:65px}.export-safe{position:absolute;inset:100px;display:flex;flex-direction:column}header{display:flex;align-items:center;justify-content:space-between;height:65px}.wordmark{font-size:44px;font-weight:700;letter-spacing:-2px}.wordmark span{font-size:24px;color:#b7ff18;margin-left:12px}.edition,footer{font-size:17px;letter-spacing:3px;color:#bec5b9}.composition-title{margin:20px 0}.composition-title h1{max-height:70px;font-size:62px;line-height:1.1;letter-spacing:-2px;margin:0;overflow-wrap:anywhere}.composition-title p{font-size:18px;letter-spacing:3px;color:#b7ff18;margin:8px 0}.composition{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}footer{display:flex;justify-content:space-between;margin-top:26px;font-size:15px;letter-spacing:2px}.studio-profile{position:relative;overflow:hidden;width:1440px;border:1px solid var(--profile-theme-border);border-radius:28px;color:var(--profile-theme-text);font-family:var(--profile-theme-font),'Space Grotesk',sans-serif}.profile-foreground{position:relative;z-index:1}.profile-banner{width:100%;height:155px;object-fit:cover;display:block}.profile-main{padding:40px 60px;display:flex;align-items:center;gap:55px}.identity{position:relative;flex-shrink:0}.identity-photo{position:absolute;inset:10%;border:3px solid;border-radius:50%;overflow:hidden;background:#171b16;display:flex;align-items:center;justify-content:center}.identity-photo img{width:100%;height:100%;object-fit:cover}.identity-photo span{font:700 1em 'Space Grotesk',sans-serif;color:#f5f6f2}.identity-frame{position:absolute;width:100%;height:100%;object-fit:contain;inset:0}.profile-copy h2{max-height:132px}.profile-copy{min-width:0;flex:1}.eyebrow{font-size:15px;letter-spacing:4px;color:var(--profile-theme-accent,#b7ff18)}h2{margin:12px 0;font-size:62px;line-height:1.05;letter-spacing:-2px;overflow-wrap:anywhere}.handle{max-height:32px;font-size:24px;opacity:.8;overflow-wrap:anywhere;margin:8px 0}.level{display:inline-block;margin-top:18px;padding:10px 18px;background:var(--profile-theme-button-bg);color:var(--profile-theme-button-text);font-size:20px;font-weight:700}.name-tag{height:42px;max-width:360px;object-fit:contain;object-position:left;margin-top:12px}.verification{width:32px;height:32px;object-fit:contain;vertical-align:middle;margin-left:14px}.profile-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--profile-theme-stats-bg);color:var(--profile-theme-stats-text);padding:26px 50px;gap:20px}.profile-stats strong{max-height:44px;display:block;font-size:34px;letter-spacing:-1px;overflow-wrap:anywhere}.profile-stats span{display:block;font-size:14px;letter-spacing:3px;margin-top:8px;opacity:.75}.leaderboard{width:100%;display:flex;flex-direction:column;gap:12px}.leaderboard-row{display:flex;align-items:center;gap:26px;min-height:108px;padding:12px 30px;background:#151a14;border-left:5px solid #b7ff18}.rank{font-size:40px;font-weight:700;color:#b7ff18;min-width:65px}.row-name{max-height:82px;font-size:30px;font-weight:700;min-width:0;flex:1;overflow-wrap:anywhere}.row-name small,.row-xp small{display:block;font-size:14px;font-weight:400;letter-spacing:1px;color:#a7b0a2;margin-top:3px}.row-xp{font-size:35px;text-align:right;margin-left:auto;white-space:nowrap}.rows-ten{gap:6px}.rows-ten .leaderboard-row{min-height:56px;height:56px;padding:3px 24px;gap:18px}.rows-ten .row-name{font-size:21px;max-height:46px}.rows-ten .row-name small{display:none}.rows-ten .rank,.rows-ten .row-xp{font-size:24px}.rows-ten .row-xp small{display:inline;margin-left:8px}.game-card{width:1460px;height:590px;display:grid;grid-template-columns:500px 1fr;background:#141a12;border:1px solid #b7ff1833;border-radius:24px;overflow:hidden}.game-art{background:#20271c}.game-art img{height:100%;width:100%;object-fit:cover}.art-missing{display:flex;align-items:center;justify-content:center;height:100%;color:#a7b0a2;font-size:24px}.game-copy{min-width:0;min-height:0;padding:55px;display:flex;flex-direction:column;justify-content:center}.game-copy h2{font-size:65px;max-height:235px;overflow-wrap:anywhere}.game-rule{height:4px;background:#b7ff18;width:75px;margin:25px 0}.game-copy p{font-size:25px;line-height:1.5;margin:0;letter-spacing:2px}.game-address{margin-top:22px;color:#a7b0a2;font-size:18px}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.profile-theme-atmosphere{animation:none!important;opacity:.65!important}
`;

