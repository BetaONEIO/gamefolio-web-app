// Cloudflare Worker: seo-fallback
//
// Bound to gamefolio.com routes. Compensates for the undeployable marketing
// repo by rewriting the SPA shell HTML coming back from origin into a
// per-route static page (unique title/description/canonical/og/json-ld and
// real <main> content) so AdSense crawlers see distinct pages instead of
// the same shell repeated everywhere.
//
// Unknown routes pass through unchanged so the SPA can handle them.

const ORIGIN = "https://gamefolio.com";
const OG_IMAGE = ORIGIN + "/favicon.png";

const SOCIAL_SAMEAS = [
  "https://x.com/GamefolioGG",
  "https://www.facebook.com/gamefoliogg",
  "https://www.tiktok.com/@gamefoliogg",
  "https://www.youtube.com/@Gamefolio_",
  "https://discord.gg/AaknCAYNnp",
];

const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Gamefolio",
  url: ORIGIN,
  logo: OG_IMAGE,
  description:
    "A community platform for gaming content creators, streamers, and indie game developers.",
  sameAs: SOCIAL_SAMEAS,
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const NAV =
  '<header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:48px;flex-wrap:wrap;gap:16px;">' +
  '<a href="/" style="color:#22c55e;font-weight:700;font-size:24px;text-decoration:none;">Gamefolio</a>' +
  '<nav>' +
  '<a href="/games" style="color:#cbd5e1;margin-left:24px;text-decoration:none;">Featured Games</a>' +
  '<a href="/streamers" style="color:#cbd5e1;margin-left:24px;text-decoration:none;">Featured Streamers</a>' +
  '<a href="/blog" style="color:#cbd5e1;margin-left:24px;text-decoration:none;">Blog</a>' +
  '<a href="/contact" style="color:#cbd5e1;margin-left:24px;text-decoration:none;">Contact</a>' +
  '</nav>' +
  '</header>';

const FOOTER =
  '<footer style="margin-top:80px;padding-top:32px;border-top:1px solid rgba(34,197,94,0.2);font-size:14px;color:#94a3b8;">' +
  '<p style="margin:0 0 12px 0;">' +
  '<a href="/privacy-policy" style="color:#94a3b8;text-decoration:none;margin-right:24px;">Privacy Policy</a>' +
  '<a href="/terms-of-service" style="color:#94a3b8;text-decoration:none;margin-right:24px;">Terms of Service</a>' +
  '<a href="/contact" style="color:#94a3b8;text-decoration:none;">Contact Us</a>' +
  '</p>' +
  '<p style="margin:0;">&copy; 2026 Gamefolio. All rights reserved. Play, Create, Share.</p>' +
  '</footer>';

const SHELL_OPEN =
  '<div style="background:#0a0e0a;color:#e2e8f0;font-family:\'Space Grotesk\',\'Inter\',system-ui,sans-serif;min-height:100vh;padding:48px 24px;line-height:1.6;">' +
  '<div style="max-width:960px;margin:0 auto;">';
const SHELL_CLOSE = '</div></div>';

function shell(mainHtml) {
  return SHELL_OPEN + NAV + '<main>' + mainHtml + '</main>' + FOOTER + SHELL_CLOSE;
}

const STYLE_H1 = 'font-size:40px;line-height:1.15;margin:0 0 24px 0;font-weight:700;';
const STYLE_H2 = 'font-size:26px;margin:48px 0 16px 0;font-weight:700;';
const STYLE_P = 'font-size:18px;color:#cbd5e1;margin:0 0 20px 0;max-width:760px;';
const STYLE_UL = 'font-size:18px;color:#cbd5e1;padding-left:24px;margin:0 0 24px 0;max-width:760px;';
const STYLE_STRONG = 'color:#22c55e;';
const STYLE_CTA = 'display:inline-block;background:#22c55e;color:#0a0e0a;padding:14px 28px;border-radius:8px;font-weight:700;text-decoration:none;margin-right:12px;';
const STYLE_LINK = 'color:#22c55e;';
const STYLE_LINK_BTN = 'color:#22c55e;padding:14px 0;text-decoration:none;font-weight:700;';

const ROUTES = {
  "/": {
    title: "Gamefolio — Where Gaming Creators Build Their Audience",
    description:
      "Gamefolio is a community platform for gaming content creators, streamers, and indie game developers. Discover featured games, follow creators across Twitch, YouTube, Kick, and Rumble, and submit your own work.",
    main:
      '<h1 style="' + STYLE_H1 + '">Gamefolio &mdash; Where Gaming Creators Build Their Audience</h1>' +
      '<p style="' + STYLE_P + '">Gamefolio is a community platform purpose-built for gaming content creators, streamers, and indie game developers. Showcase your gameplay, connect with players who share your taste, and discover the indie titles shaping the next generation of gaming culture.</p>' +
      '<p style="' + STYLE_P + '">Whether you are a streamer growing your channel on Twitch, YouTube, Kick, or Rumble, a creator clipping highlight reels, or a developer launching a new title, Gamefolio gives you the tools to share your work, find collaborators, and reach the people who care.</p>' +
      '<h2 style="' + STYLE_H2 + '">What you can do on Gamefolio</h2>' +
      '<ul style="' + STYLE_UL + '">' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Featured Games</strong> &mdash; Discover indie titles hand-picked by the community, with developer interviews and gameplay reels.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Featured Streamers</strong> &mdash; Find creators across Twitch, YouTube, Kick, and Rumble whose content matches your vibe.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Submit Your Content</strong> &mdash; Get your game or your channel in front of the Gamefolio community.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Stay Updated</strong> &mdash; Read the Gamefolio blog for guides on streaming, content creation, and indie game development.</li>' +
      '</ul>' +
      '<p style="margin-top:32px;"><a href="/get-featured" style="' + STYLE_CTA + '">Submit your content</a><a href="/blog" style="' + STYLE_LINK_BTN + '">Read the blog &rarr;</a></p>' +
      '<h2 style="font-size:22px;margin:56px 0 12px 0;font-weight:700;">About Gamefolio</h2>' +
      '<p style="font-size:16px;color:#94a3b8;max-width:760px;margin:0 0 16px 0;">Gamefolio is built by Beta ONE Innovations and powered by SKALE. Our mission is to give gaming creators a home where their work is discoverable, their audience is reachable, and the indie games they champion get the attention they deserve.</p>',
    jsonLd: ORGANIZATION_JSONLD,
  },

  "/games": {
    title: "Featured Indie Games | Gamefolio",
    description:
      "Discover indie games hand-picked by the Gamefolio community. Browse new releases across action, RPG, roguelike, and platformer genres, with developer interviews and gameplay highlights.",
    main:
      '<h1 style="' + STYLE_H1 + '">Featured Indie Games</h1>' +
      '<p style="' + STYLE_P + '">Gamefolio\'s featured games program shines a spotlight on independent titles that deserve a wider audience. Each month our community surfaces the indie releases worth your time &mdash; from solo-developer passion projects to small-studio breakouts &mdash; and pairs them with developer interviews, gameplay reels, and creator commentary.</p>' +
      '<h2 style="' + STYLE_H2 + '">What we feature</h2>' +
      '<ul style="' + STYLE_UL + '">' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Action &amp; Shooters</strong> &mdash; Fast-paced indie titles, from arena FPS to roguelike action.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">RPGs &amp; Adventure</strong> &mdash; Story-driven games, CRPGs, narrative adventures, and ARPGs.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Platformers &amp; Metroidvanias</strong> &mdash; Tightly-designed jumpers and exploration-heavy worlds.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Strategy &amp; Sims</strong> &mdash; Builders, management games, 4X, and tactics.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Multiplayer &amp; Co-op</strong> &mdash; Indie games designed to play together.</li>' +
      '</ul>' +
      '<h2 style="' + STYLE_H2 + '">How games get featured</h2>' +
      '<p style="' + STYLE_P + '">We pick featured games based on three things: craft, community fit, and developer engagement. Titles do not need a huge marketing budget &mdash; we are specifically looking for indie work that has not already been blown up by the algorithm. Developers can submit their own games, and Gamefolio creators can nominate titles they are playing.</p>' +
      '<p style="margin-top:24px;"><a href="/get-featured" style="' + STYLE_CTA + '">Submit your game</a><a href="/streamers" style="' + STYLE_LINK_BTN + '">Browse featured streamers &rarr;</a></p>',
  },

  "/streamers": {
    title: "Featured Streamers | Gamefolio",
    description:
      "Find featured streamers and content creators across Twitch, YouTube, Kick, and Rumble on Gamefolio. Discover gaming creators by platform, genre, and style.",
    main:
      '<h1 style="' + STYLE_H1 + '">Featured Streamers</h1>' +
      '<p style="' + STYLE_P + '">Gamefolio\'s featured streamers list pulls together gaming creators across every major platform &mdash; Twitch, YouTube, Kick, and Rumble &mdash; with a focus on the people doing genuinely interesting work. Whether you want chill variety streams, competitive play, speedruns, indie game showcases, or first-look reviews, this is where to start.</p>' +
      '<h2 style="' + STYLE_H2 + '">Browse by platform</h2>' +
      '<ul style="' + STYLE_UL + '">' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Twitch</strong> &mdash; Live variety, esports, just-chatting, and category specialists.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">YouTube</strong> &mdash; Long-form gameplay, video essays, retrospectives, and reviews.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Kick</strong> &mdash; Live creators on the fast-growing newer platform.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Rumble</strong> &mdash; Independent gaming voices and longer-form content.</li>' +
      '</ul>' +
      '<h2 style="' + STYLE_H2 + '">How creators get featured</h2>' +
      '<p style="' + STYLE_P + '">We look at consistency, community vibe, and the actual quality of the content &mdash; not just follower counts. A 500-viewer streamer who runs a great chat and consistently surfaces good indie games is the kind of creator we want to highlight. Smaller creators are explicitly welcome to apply.</p>' +
      '<p style="' + STYLE_P + '">Featured creators get a profile on Gamefolio that pulls in their best clips, links out to their channels across every platform they stream on, and surfaces in the recommendations our community sees.</p>' +
      '<p style="margin-top:24px;"><a href="/get-featured" style="' + STYLE_CTA + '">Apply to be featured</a><a href="/games" style="' + STYLE_LINK_BTN + '">Browse featured games &rarr;</a></p>',
  },

  "/blog": {
    title: "Gamefolio Blog — Streaming, Indie Games & Content Creation",
    description:
      "Read the Gamefolio blog for guides on streaming, indie game development, and growing your gaming audience across Twitch, YouTube, Kick, and Rumble.",
    main:
      '<h1 style="' + STYLE_H1 + '">The Gamefolio Blog</h1>' +
      '<p style="' + STYLE_P + '">Practical, no-fluff writing for gaming creators, streamers, and indie developers. We cover the topics that actually matter when you are trying to grow an audience, ship a game, or build a community &mdash; not the surface-level "10 tips" stuff.</p>' +
      '<h2 style="' + STYLE_H2 + '">What we write about</h2>' +
      '<ul style="' + STYLE_UL + '">' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Streaming guides</strong> &mdash; Setup, OBS configs, multistreaming, Twitch vs Kick vs YouTube tradeoffs.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Content creation</strong> &mdash; Editing workflows, thumbnail strategy, hooks, and growing past the algorithm.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Indie game spotlights</strong> &mdash; Deep dives on indie titles worth your time, with developer commentary.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Creator economy</strong> &mdash; Sponsorships, monetization, contracts, and not getting screwed.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Community building</strong> &mdash; Discord moderation, sub goals, and turning lurkers into regulars.</li>' +
      '</ul>' +
      '<p style="' + STYLE_P + '">New posts go live regularly. Follow us on social to catch them as they drop, or check back here.</p>' +
      '<p style="margin-top:24px;"><a href="/contact" style="' + STYLE_CTA + '">Pitch a guest post</a></p>',
  },

  "/contact": {
    title: "Contact Gamefolio",
    description:
      "Get in touch with Gamefolio for partnerships, press inquiries, support, or to submit your game or channel for featuring on the platform.",
    main:
      '<h1 style="' + STYLE_H1 + '">Contact Gamefolio</h1>' +
      '<p style="' + STYLE_P + '">We are a small team and we read everything that comes in. Pick the right address below so it gets to the right person &mdash; that is the fastest way to a real reply.</p>' +
      '<h2 style="' + STYLE_H2 + '">Get in touch</h2>' +
      '<ul style="' + STYLE_UL + '">' +
      '<li style="margin-bottom:12px;"><strong style="' + STYLE_STRONG + '">General &amp; press</strong> &mdash; <a href="mailto:hello@gamefolio.com" style="' + STYLE_LINK + ';text-decoration:none;">hello@gamefolio.com</a></li>' +
      '<li style="margin-bottom:12px;"><strong style="' + STYLE_STRONG + '">Support</strong> &mdash; <a href="mailto:support@gamefolio.com" style="' + STYLE_LINK + ';text-decoration:none;">support@gamefolio.com</a></li>' +
      '<li style="margin-bottom:12px;"><strong style="' + STYLE_STRONG + '">Partnerships &amp; business</strong> &mdash; <a href="mailto:partnerships@gamefolio.com" style="' + STYLE_LINK + ';text-decoration:none;">partnerships@gamefolio.com</a></li>' +
      '<li style="margin-bottom:12px;"><strong style="' + STYLE_STRONG + '">Featured submissions</strong> &mdash; Use the <a href="/get-featured" style="' + STYLE_LINK + ';text-decoration:none;">Get Featured</a> page so we do not lose your details.</li>' +
      '</ul>' +
      '<h2 style="' + STYLE_H2 + '">Find us elsewhere</h2>' +
      '<p style="' + STYLE_P + '">We are active across most of the major platforms. Follow whichever you actually use:</p>' +
      '<ul style="' + STYLE_UL + '">' +
      '<li style="margin-bottom:6px;"><a href="https://x.com/GamefolioGG" style="' + STYLE_LINK + ';text-decoration:none;">X / Twitter</a></li>' +
      '<li style="margin-bottom:6px;"><a href="https://www.youtube.com/@Gamefolio_" style="' + STYLE_LINK + ';text-decoration:none;">YouTube</a></li>' +
      '<li style="margin-bottom:6px;"><a href="https://www.tiktok.com/@gamefoliogg" style="' + STYLE_LINK + ';text-decoration:none;">TikTok</a></li>' +
      '<li style="margin-bottom:6px;"><a href="https://www.facebook.com/gamefoliogg" style="' + STYLE_LINK + ';text-decoration:none;">Facebook</a></li>' +
      '<li style="margin-bottom:6px;"><a href="https://discord.gg/AaknCAYNnp" style="' + STYLE_LINK + ';text-decoration:none;">Discord community</a></li>' +
      '</ul>' +
      '<p style="font-size:14px;color:#94a3b8;margin-top:48px;">Gamefolio is operated by Beta ONE Innovations. Registered office details available on request.</p>',
  },

  "/get-featured": {
    title: "Submit Your Game or Channel to Gamefolio",
    description:
      "Submit your indie game or streaming channel to be featured on Gamefolio. Reach a community of gaming creators, streamers, and developers actively looking for new things to play and watch.",
    main:
      '<h1 style="' + STYLE_H1 + '">Get Featured on Gamefolio</h1>' +
      '<p style="' + STYLE_P + '">Gamefolio\'s featured slots are the front door for our community. Every featured game and streamer gets a profile that surfaces in our recommendations, gets written up in our blog, and reaches the creators and players who actually care about indie work.</p>' +
      '<h2 style="' + STYLE_H2 + '">Who should apply</h2>' +
      '<ul style="' + STYLE_UL + '">' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Indie game developers</strong> &mdash; Solo devs and small studios with a title in development, in early access, or recently launched.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Streamers</strong> &mdash; Live creators on Twitch, YouTube, Kick, or Rumble, regardless of follower count, who care about community and content quality.</li>' +
      '<li style="margin-bottom:8px;"><strong style="' + STYLE_STRONG + '">Content creators</strong> &mdash; Editors, video essayists, podcasters, and writers covering games.</li>' +
      '</ul>' +
      '<h2 style="' + STYLE_H2 + '">What we look for</h2>' +
      '<p style="' + STYLE_P + '">Craft and consistency over reach. We feature work that is genuinely interesting &mdash; original mechanics, distinct voice, real community engagement &mdash; not just whatever is already viral. Smaller creators are explicitly encouraged to apply; that is the point.</p>' +
      '<h2 style="' + STYLE_H2 + '">How to submit</h2>' +
      '<p style="' + STYLE_P + '">Email <a href="mailto:featured@gamefolio.com" style="' + STYLE_LINK + ';text-decoration:none;">featured@gamefolio.com</a> with a short pitch: who you are, what you make, links to your work, and one sentence on why Gamefolio\'s audience would care. We aim to reply within two weeks. If we feature you, we will loop you in on the timing.</p>' +
      '<p style="margin-top:24px;"><a href="mailto:featured@gamefolio.com" style="' + STYLE_CTA + '">Email your pitch</a></p>',
  },

  "/privacy-policy": {
    title: "Privacy Policy | Gamefolio",
    description:
      "Gamefolio's privacy policy: what personal data we collect, how we use it, who we share it with, and your rights under data protection law.",
    main:
      '<h1 style="' + STYLE_H1 + '">Privacy Policy</h1>' +
      '<p style="font-size:14px;color:#94a3b8;margin:0 0 24px 0;">Last updated: May 2026</p>' +
      '<p style="' + STYLE_P + '">This policy explains what personal data Gamefolio collects when you use our website and platform, how we use it, and the rights you have over your data. Gamefolio is operated by Beta ONE Innovations.</p>' +
      '<h2 style="' + STYLE_H2 + '">Information we collect</h2>' +
      '<p style="' + STYLE_P + '">We collect information you provide directly &mdash; for example when you create an account, submit your game or channel for featuring, or contact us. This typically includes name, email address, username, and any content you upload. When you use the platform we also collect technical information automatically: IP address, browser type, device identifiers, and usage logs.</p>' +
      '<h2 style="' + STYLE_H2 + '">How we use your information</h2>' +
      '<p style="' + STYLE_P + '">We use personal data to operate and improve the Gamefolio platform, authenticate your account, surface relevant content, communicate with you about updates and support, and meet legal obligations. We do not sell your personal data.</p>' +
      '<h2 style="' + STYLE_H2 + '">Cookies and analytics</h2>' +
      '<p style="' + STYLE_P + '">Gamefolio uses cookies and similar technologies for authentication, preferences, analytics, and advertising. You can control cookies through your browser settings. We use Google AdSense to display ads on parts of the site; AdSense uses cookies to serve ads based on your visits to this and other sites. You can opt out of personalised advertising via Google\'s <a href="https://adssettings.google.com" style="' + STYLE_LINK + ';text-decoration:none;">Ads Settings</a>.</p>' +
      '<h2 style="' + STYLE_H2 + '">Sharing</h2>' +
      '<p style="' + STYLE_P + '">We share data with service providers who help us run the platform (hosting, analytics, payments, customer support), and where required by law. We require providers to handle your data securely and only for the purposes we have contracted them for.</p>' +
      '<h2 style="' + STYLE_H2 + '">Your rights</h2>' +
      '<p style="' + STYLE_P + '">Depending on where you live, you may have rights to access, correct, delete, or export your personal data, and to object to or restrict certain processing. To exercise any of these rights, email <a href="mailto:privacy@gamefolio.com" style="' + STYLE_LINK + ';text-decoration:none;">privacy@gamefolio.com</a>.</p>' +
      '<h2 style="' + STYLE_H2 + '">Contact</h2>' +
      '<p style="' + STYLE_P + '">Questions about this policy? Email <a href="mailto:privacy@gamefolio.com" style="' + STYLE_LINK + ';text-decoration:none;">privacy@gamefolio.com</a>.</p>',
  },

  "/terms-of-service": {
    title: "Terms of Service | Gamefolio",
    description:
      "Terms of service for using Gamefolio's gaming community platform: account terms, content rules, intellectual property, acceptable use, and disclaimers.",
    main:
      '<h1 style="' + STYLE_H1 + '">Terms of Service</h1>' +
      '<p style="font-size:14px;color:#94a3b8;margin:0 0 24px 0;">Last updated: May 2026</p>' +
      '<p style="' + STYLE_P + '">These terms govern your use of Gamefolio, operated by Beta ONE Innovations. By using the platform you agree to these terms. If you do not agree, do not use the platform.</p>' +
      '<h2 style="' + STYLE_H2 + '">Your account</h2>' +
      '<p style="' + STYLE_P + '">You are responsible for keeping your account credentials secure and for everything that happens on your account. You must be old enough to use the service in your jurisdiction (typically 13+, or 16+ in some regions). We can suspend or terminate accounts that violate these terms.</p>' +
      '<h2 style="' + STYLE_H2 + '">Your content</h2>' +
      '<p style="' + STYLE_P + '">You retain ownership of any clips, screenshots, profile content, or other materials you upload. By posting on Gamefolio you grant us a worldwide, non-exclusive licence to host, display, distribute, and adapt that content for the purpose of operating and promoting the platform. You confirm you have the right to share whatever you upload.</p>' +
      '<h2 style="' + STYLE_H2 + '">Acceptable use</h2>' +
      '<p style="' + STYLE_P + '">Do not post anything illegal, infringing, hateful, harassing, or sexually explicit involving minors. Do not try to break, scrape, overload, or game the platform. Do not impersonate others. We can remove content and ban users at our discretion to keep the community usable.</p>' +
      '<h2 style="' + STYLE_H2 + '">Intellectual property</h2>' +
      '<p style="' + STYLE_P + '">Gamefolio\'s name, logo, design, code, and original content are owned by Beta ONE Innovations and protected by intellectual property laws. You cannot copy or redistribute platform materials without permission.</p>' +
      '<h2 style="' + STYLE_H2 + '">Disclaimers and liability</h2>' +
      '<p style="' + STYLE_P + '">Gamefolio is provided "as is", without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect or consequential damages arising from your use of the platform.</p>' +
      '<h2 style="' + STYLE_H2 + '">Changes</h2>' +
      '<p style="' + STYLE_P + '">We may update these terms from time to time. Material changes will be communicated via the platform or email. Continued use after changes means you accept the updated terms.</p>' +
      '<h2 style="' + STYLE_H2 + '">Contact</h2>' +
      '<p style="' + STYLE_P + '">Questions about these terms? Email <a href="mailto:legal@gamefolio.com" style="' + STYLE_LINK + ';text-decoration:none;">legal@gamefolio.com</a>.</p>',
  },
};

function normalizePath(p) {
  const lower = p.toLowerCase();
  const stripped = lower.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

function buildHeadInject(route, pathname) {
  const url = ORIGIN + (pathname === "/" ? "/" : pathname);
  const jsonLd = route.jsonLd || {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: route.title,
    description: route.description,
    url: url,
    isPartOf: { "@type": "WebSite", name: "Gamefolio", url: ORIGIN },
    publisher: ORGANIZATION_JSONLD,
  };
  return (
    '<link rel="canonical" href="' + esc(url) + '" />' +
    '<meta property="og:title" content="' + esc(route.title) + '" />' +
    '<meta property="og:description" content="' + esc(route.description) + '" />' +
    '<meta property="og:type" content="website" />' +
    '<meta property="og:url" content="' + esc(url) + '" />' +
    '<meta property="og:image" content="' + esc(OG_IMAGE) + '" />' +
    '<meta name="twitter:card" content="summary_large_image" />' +
    '<meta name="twitter:title" content="' + esc(route.title) + '" />' +
    '<meta name="twitter:description" content="' + esc(route.description) + '" />' +
    '<script type="application/ld+json">' + JSON.stringify(jsonLd) + '</script>'
  );
}

export default {
  async fetch(request) {
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const url = new URL(request.url);
    const route = ROUTES[normalizePath(url.pathname)];

    // Unknown route: leave the origin response untouched so the SPA can handle it.
    if (!route) return response;

    const headInject = buildHeadInject(route, url.pathname);
    const body = shell(route.main);

    return new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(route.title);
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute("content", route.description);
        },
      })
      .on("head", {
        element(el) {
          el.append(headInject, { html: true });
        },
      })
      .on("#root", {
        element(el) {
          el.setInnerContent(body, { html: true });
        },
      })
      .transform(response);
  },
};
