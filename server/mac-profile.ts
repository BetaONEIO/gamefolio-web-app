import { UserWithStats } from "@shared/schema";

// ---------------------------------------------------------------------------
// "Mac the cat" — hidden easter-egg profile.
//
// Mac is the founder's cat. Visiting /mac (or /@mac) renders this synthetic
// profile; it is NOT a real row in the users table (same trick as the demo
// user, see ./demo-user.ts) so it never shows up in search, suggestions, or
// leaderboards. The first time a signed-in user lands here they get a one-time
// 5,000 XP bonus — see the /api/mac/discover route in routes.ts.
// ---------------------------------------------------------------------------

// Reserved synthetic id (demo user is 999; keep Mac distinct and out of the
// way of real serial ids).
export const MAC_USER_ID = 998;
export const MAC_BONUS_XP = 5000;

export const getMacUserWithStats = (): UserWithStats => {
  return {
    id: MAC_USER_ID,
    username: "mac",
    // password is stripped before the API responds; harmless placeholder.
    password: "",
    email: null,
    emailVerified: true,
    displayName: "Mac 🐾",
    bio:
      "Pro napper, part-time pro gamer. 9 lives, mostly spent respawning. " +
      "Powered by CAT FUEL™ and MEOW CHIPS 🐟. I knocked your controller off " +
      "the table mid-ranked — you're welcome. GG, hooman. 🎮",
    avatarUrl: "/attached_assets/mac-gamer.png",
    bannerUrl: "/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg",
    // Dark + amber (CAT FUEL can) theming to match the avatar.
    backgroundColor: "#0A0A0A",
    cardColor: "#161616",
    accentColor: "#F5A623",
    primaryColor: "#0A0A0A",
    avatarBorderColor: "#F5A623",
    layoutStyle: "grid",
    // Funny gamer-cat handles.
    steamUsername: "MacAttack",
    xboxUsername: "ZoomiesGG",
    playstationUsername: "NoScopeMeow",
    twitterUsername: "realmaccat",
    youtubeUsername: "MacPlaysGames",
    discordUsername: "mac",
    epicUsername: "TheRealMac",
    nintendoUsername: "MeowserKart",
    userType: "Professional Gamer,Content Creator",
    showUserType: true,
    ageRange: "25-34",
    authProvider: "local",
    externalId: null,
    role: "user",
    status: "active",
    isPro: true,
    isPartner: false,
    isAmbassador: false,
    level: 99,
    totalXP: 999999,
    lastLoginAt: null,
    bannedReason: null,
    messagingEnabled: false, // Mac does not reply. He is a cat.
    isPrivate: false,
    createdAt: new Date(2020, 0, 1),
    updatedAt: new Date(),
    _count: {
      followers: 9001,
      following: 1,
      clips: 0,
      clipViews: 0,
    },
    // The remaining UserWithStats fields are optional/nullable for rendering;
    // cast through unknown so we only have to specify the ones that matter.
  } as unknown as UserWithStats;
};
