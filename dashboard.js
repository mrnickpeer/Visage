/**
 * dashboard.js - Visage Personal Identity Intelligence Workstation
 * Sister extension and tactical companion to Vantage.
 *
 * Implements the 7-Step Identity Reconnaissance Methodology:
 *  Step 1: Identity Scope Normalization & Permutations
 *  Step 2: Passive Username & Alias Matrix (140+ Platforms)
 *  Step 3: Cryptographic Identity (OpenPGP, Keybase, GitHub)
 *  Step 4: Breach & Leak Telemetry (HIBP, k-Anonymity, Pastes)
 *  Step 5: Person-Centric Dork Compiler
 *  Step 6: Public Records & Jurisdictional Intelligence (50 States + DC + PR)
 *  Step 7: Dossier Triage & Multi-Dialect Obsidian Export
 */

// Cross-browser polyfill
if (typeof browser === 'undefined') {
  var browser = globalThis.browser || globalThis.chrome;
}
if (!browser || !browser.storage || !browser.storage.local) {
  const memStore = {};
  browser = Object.assign(browser || {}, {
    storage: {
      local: {
        get: async (keys) => {
          const res = {};
          const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys || {}));
          for (const k of keyList) {
            try {
              const val = localStorage.getItem('visage_' + k);
              if (val !== null) res[k] = JSON.parse(val);
              else if (k in memStore) res[k] = memStore[k];
            } catch (e) {
              if (k in memStore) res[k] = memStore[k];
            }
          }
          return res;
        },
        set: async (items) => {
          for (const [k, v] of Object.entries(items || {})) {
            memStore[k] = v;
            try { localStorage.setItem('visage_' + k, JSON.stringify(v)); } catch (e) {}
          }
        },
        clear: async () => {
          for (const k of Object.keys(memStore)) delete memStore[k];
          try {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('visage_')) toRemove.push(key);
            }
            toRemove.forEach(k => localStorage.removeItem(k));
          } catch (e) {}
        }
      }
    },
    tabs: browser && browser.tabs ? browser.tabs : {
      create: ({ url }) => { window.open(url, '_blank'); }
    }
  });
}

// Helper: Split full name into first, middle, and last components
function splitFullName(fullName) {
  const clean = (fullName || '').trim();
  if (!clean) return { firstName: '', middleName: '', lastName: '' };
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' };
  } else if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  } else {
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  }
}

// Global Application State
const State = {
  auditMode: 'self',
  target: {
    firstName: '',
    middleName: '',
    lastName: '',
    name: '',
    handle: '',
    email: '',
    phone: '',
    location: '',
    org: ''
  },
  jurisdiction: {
    country: 'US',
    stateCode: 'NY',
    stateName: 'New York',
    county: 'New York County',
    city: 'New York City',
    resolvedText: 'New York County, New York'
  },
  auditLogs: [],
  matrixResults: {},
  cryptoResults: {
    pgp: [],
    keybase: null,
    github: null
  },
  savedProfiles: [],
  jurisdictionCache: {},
  stepProgress: {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false
  },
  deepScanActive: false
};

// -------------------------------------------------------------
// 140+ Platform Directory for Step 2 (Username Matrix)
// Strictly Alphabetized (A-Z)
// -------------------------------------------------------------
const PLATFORMS = [
  { name: '500px', cat: 'media', url: 'https://500px.com/p/{}', icon: '📸' },
  { name: 'About.me', cat: 'social', url: 'https://about.me/{}', icon: '🙋' },
  { name: 'AllTrails', cat: 'gaming', url: 'https://www.alltrails.com/members/{}', icon: '🥾' },
  { name: 'AniList', cat: 'gaming', url: 'https://anilist.co/user/{}/', icon: '🌸' },
  { name: 'Archive.org', cat: 'gaming', url: 'https://archive.org/details/@{}', icon: '🏛️', checkUrl: 'https://archive.org/advancedsearch.php?q=creator%3A%22{}%22&fl%5B%5D=identifier&rows=1&output=json', checkMode: 'archive' },
  { name: 'ArtStation', cat: 'media', url: 'https://www.artstation.com/{}', icon: '🖌️' },
  { name: 'Audius', cat: 'media', url: 'https://audius.co/{}', icon: '🎧' },
  { name: 'Bandcamp', cat: 'media', url: 'https://bandcamp.com/{}', icon: '🎪' },
  { name: 'Beacons.ai', cat: 'social', url: 'https://beacons.ai/{}', icon: '📡' },
  { name: 'Behance', cat: 'media', url: 'https://www.behance.net/{}', icon: '🎨' },
  { name: 'Bento.me', cat: 'social', url: 'https://bento.me/{}', icon: '🍱' },
  { name: 'BGG Forum', cat: 'chat', url: 'https://boardgamegeek.com/user/{}', icon: '🎲' },
  { name: 'Bitbucket', cat: 'dev', url: 'https://bitbucket.org/{}/', icon: '🪣' },
  { name: 'Bitcointalk', cat: 'chat', url: 'https://bitcointalk.org/index.php?action=profile;u={}', icon: '₿' },
  { name: 'Blogger', cat: 'social', url: 'https://{}.blogspot.com', icon: '🟧' },
  { name: 'Bluesky', cat: 'social', url: 'https://bsky.app/profile/{}.bsky.social', icon: '🦋', checkUrl: 'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={}.bsky.social', checkMode: 'bsky' },
  { name: 'BuyMeACoffee', cat: 'social', url: 'https://www.buymeacoffee.com/{}', icon: '☕' },
  { name: 'CashApp', cat: 'social', url: 'https://cash.app/${}', icon: '🟩' },
  { name: 'Chess.com', cat: 'media', url: 'https://www.chess.com/member/{}', icon: '♟️', checkUrl: 'https://api.chess.com/pub/player/{}', checkMode: 'json_status' },
  { name: 'Clubhouse', cat: 'social', url: 'https://www.clubhouse.com/@{}', icon: '👋' },
  { name: 'Codeberg', cat: 'dev', url: 'https://codeberg.org/{}', icon: '🏔️', checkUrl: 'https://codeberg.org/api/v1/users/{}', checkMode: 'json_status' },
  { name: 'Codecademy', cat: 'dev', url: 'https://www.codecademy.com/profiles/{}', icon: '💻' },
  { name: 'CodePen', cat: 'dev', url: 'https://codepen.io/{}', icon: '🖋️' },
  { name: 'CoinMarketCap', cat: 'social', url: 'https://coinmarketcap.com/community/profile/{}', icon: '🪙' },
  { name: 'CTFtime', cat: 'dev', url: 'https://ctftime.org/user/{}', icon: '🚩' },
  { name: 'Dailymotion', cat: 'media', url: 'https://www.dailymotion.com/{}', icon: '📽️' },
  { name: 'Dev.to', cat: 'dev', url: 'https://dev.to/{}', icon: '👩‍💻', checkUrl: 'https://dev.to/api/users/by_username?url={}', checkMode: 'devto' },
  { name: 'DeviantArt', cat: 'media', url: 'https://www.deviantart.com/{}', icon: '🎭' },
  { name: 'Devpost', cat: 'dev', url: 'https://devpost.com/{}', icon: '🚀' },
  { name: 'Discord Lookup', cat: 'chat', url: 'https://discord.id/?id={}', icon: '👾' },
  { name: 'Discourse', cat: 'chat', url: 'https://meta.discourse.org/u/{}/summary', icon: '💬', checkUrl: 'https://meta.discourse.org/u/{}.json', checkMode: 'json_status' },
  { name: 'Disqus', cat: 'chat', url: 'https://disqus.com/by/{}/', icon: '💬' },
  { name: 'DockerHub', cat: 'dev', url: 'https://hub.docker.com/u/{}', icon: '🐳', checkUrl: 'https://hub.docker.com/v2/users/{}/', checkMode: 'json_status' },
  { name: 'Dribbble', cat: 'media', url: 'https://dribbble.com/{}', icon: '🏀' },
  { name: 'Duolingo', cat: 'gaming', url: 'https://www.duolingo.com/profile/{}', icon: '🦉' },
  { name: 'eBay', cat: 'social', url: 'https://www.ebay.com/usr/{}', icon: '🛍️' },
  { name: 'Epic Games', cat: 'gaming', url: 'https://www.epicgames.com/id/{}', icon: '🎯' },
  { name: 'Etsy', cat: 'social', url: 'https://www.etsy.com/people/{}', icon: '🧶' },
  { name: 'Facebook', cat: 'social', url: 'https://www.facebook.com/{}', icon: '📘' },
  { name: 'Fiverr', cat: 'social', url: 'https://www.fiverr.com/{}', icon: '🟢' },
  { name: 'Flickr', cat: 'social', url: 'https://www.flickr.com/people/{}', icon: '📷' },
  { name: 'FreeCodeCamp', cat: 'dev', url: 'https://www.freecodecamp.org/{}', icon: '🔥' },
  { name: 'Gab', cat: 'social', url: 'https://gab.com/{}', icon: '🐸' },
  { name: 'Giphy', cat: 'media', url: 'https://giphy.com/{}', icon: '🎞️' },
  { name: 'Gist', cat: 'dev', url: 'https://gist.github.com/{}', icon: '📝' },
  { name: 'GitHub', cat: 'dev', url: 'https://github.com/{}', icon: '🐙', checkUrl: 'https://api.github.com/users/{}', checkMode: 'json_status' },
  { name: 'GitLab', cat: 'dev', url: 'https://gitlab.com/{}', icon: '🦊', checkUrl: 'https://gitlab.com/api/v4/users?username={}', checkMode: 'gitlab' },
  { name: 'Glitch', cat: 'dev', url: 'https://glitch.com/@{}', icon: '🎏' },
  { name: 'GOG', cat: 'gaming', url: 'https://www.gog.com/u/{}', icon: '👾' },
  { name: 'Goodreads', cat: 'media', url: 'https://www.goodreads.com/{}', icon: '📚' },
  { name: 'Gravatar', cat: 'social', url: 'https://gravatar.com/{}', icon: '👤', checkUrl: 'https://en.gravatar.com/{}.json', checkMode: 'gravatar' },
  { name: 'Guilded', cat: 'chat', url: 'https://www.guilded.gg/{}', icon: '🛡️' },
  { name: 'Habr', cat: 'chat', url: 'https://habr.com/en/users/{}/', icon: '📰' },
  { name: 'HackerNews', cat: 'dev', url: 'https://news.ycombinator.com/user?id={}', icon: '🟧', checkUrl: 'https://hacker-news.firebaseio.com/v0/user/{}.json', checkMode: 'json_val' },
  { name: 'HackerNoon', cat: 'chat', url: 'https://hackernoon.com/u/{}', icon: '🟩' },
  { name: 'HackTheBox', cat: 'dev', url: 'https://app.hackthebox.com/users/{}', icon: '📦' },
  { name: 'Hashnode', cat: 'dev', url: 'https://hashnode.com/@{}', icon: '📘' },
  { name: 'HuggingFace', cat: 'dev', url: 'https://huggingface.co/{}', icon: '🤗', checkUrl: 'https://huggingface.co/api/users/{}/overview', checkMode: 'json_status' },
  { name: 'Imgur', cat: 'media', url: 'https://imgur.com/user/{}', icon: '🖼️' },
  { name: 'Instagram', cat: 'social', url: 'https://www.instagram.com/{}/', icon: '📸' },
  { name: 'IRCCloud', cat: 'chat', url: 'https://www.irccloud.com/chat#!{}', icon: '☁️' },
  { name: 'Itch.io', cat: 'gaming', url: 'https://{}.itch.io', icon: '🕹️' },
  { name: 'Kaggle', cat: 'dev', url: 'https://www.kaggle.com/{}', icon: '📊' },
  { name: 'Keybase', cat: 'social', url: 'https://keybase.io/{}', icon: '🔑', checkUrl: 'https://keybase.io/_/api/1.0/user/lookup.json?usernames={}', checkMode: 'keybase' },
  { name: 'Kick', cat: 'media', url: 'https://kick.com/{}', icon: '🟢' },
  { name: 'Ko-fi', cat: 'social', url: 'https://ko-fi.com/{}', icon: '🍵' },
  { name: 'Last.fm', cat: 'media', url: 'https://www.last.fm/user/{}', icon: '📻' },
  { name: 'Launchpad', cat: 'dev', url: 'https://launchpad.net/~{}', icon: '🚀' },
  { name: 'LeetCode', cat: 'dev', url: 'https://leetcode.com/{}', icon: '🧠' },
  { name: 'Lemmy.world', cat: 'chat', url: 'https://lemmy.world/u/{}', icon: '🐭', checkUrl: 'https://lemmy.world/api/v3/user?username={}', checkMode: 'json_status' },
  { name: 'Letterboxd', cat: 'media', url: 'https://letterboxd.com/{}/', icon: '🍿' },
  { name: 'Lichess', cat: 'gaming', url: 'https://lichess.org/@/{}', icon: '♞', checkUrl: 'https://lichess.org/api/user/{}', checkMode: 'json_status' },
  { name: 'LinkedIn', cat: 'social', url: 'https://www.linkedin.com/in/{}', icon: '💼' },
  { name: 'Linktree', cat: 'social', url: 'https://linktr.ee/{}', icon: '🌲' },
  { name: 'LiveJournal', cat: 'social', url: 'https://{}.livejournal.com', icon: '✏️' },
  { name: 'Lobste.rs', cat: 'chat', url: 'https://lobste.rs/u/{}', icon: '🦞' },
  { name: 'MacRumors', cat: 'chat', url: 'https://forums.macrumors.com/members/{}/', icon: '🍏' },
  { name: 'Mastodon.social', cat: 'social', url: 'https://mastodon.social/@{}', icon: '🐘', checkUrl: 'https://mastodon.social/api/v1/accounts/lookup?acct={}', checkMode: 'json_status' },
  { name: 'Matrix', cat: 'chat', url: 'https://matrix.to/#/@{}:matrix.org', icon: '🟩' },
  { name: 'Medium', cat: 'social', url: 'https://medium.com/@{}', icon: '✍️' },
  { name: 'Minecraft (NameMC)', cat: 'gaming', url: 'https://namemc.com/profile/{}', icon: '🟩' },
  { name: 'Mixcloud', cat: 'media', url: 'https://www.mixcloud.com/{}/', icon: '🎧' },
  { name: 'MyAnimeList', cat: 'gaming', url: 'https://myanimelist.net/profile/{}', icon: '🎌' },
  { name: 'Myspace', cat: 'social', url: 'https://myspace.com/{}', icon: '📻' },
  { name: 'Nexus Mods', cat: 'gaming', url: 'https://www.nexusmods.com/users/{}', icon: '🔧' },
  { name: 'NPM', cat: 'dev', url: 'https://www.npmjs.com/~{}', icon: '📦', checkUrl: 'https://registry.npmjs.org/-/v1/search?text=maintainer:{}&size=1', checkMode: 'npm' },
  { name: 'OpenStreetMap', cat: 'social', url: 'https://www.openstreetmap.org/user/{}', icon: '🗺️' },
  { name: 'Overclock.net', cat: 'chat', url: 'https://www.overclock.net/members/{}/', icon: '⚙️' },
  { name: 'Packagist', cat: 'dev', url: 'https://packagist.org/users/{}/', icon: '🐘', checkUrl: 'https://packagist.org/packages/list.json?vendor={}', checkMode: 'packagist' },
  { name: 'Pastebin', cat: 'dev', url: 'https://pastebin.com/u/{}', icon: '📋' },
  { name: 'Patreon', cat: 'social', url: 'https://www.patreon.com/{}', icon: '🪙' },
  { name: 'PayPal', cat: 'social', url: 'https://www.paypal.com/paypalme/{}', icon: '🅿️' },
  { name: 'Pinterest', cat: 'social', url: 'https://www.pinterest.com/{}/', icon: '📌' },
  { name: 'PlayStation Network', cat: 'gaming', url: 'https://psnprofiles.com/{}', icon: '🎮' },
  { name: 'Polywork', cat: 'social', url: 'https://www.polywork.com/{}', icon: '🟣' },
  { name: 'Post.news', cat: 'social', url: 'https://post.news/@/{}', icon: '📫' },
  { name: 'ProductHunt', cat: 'dev', url: 'https://www.producthunt.com/@{}', icon: '😸' },
  { name: 'PyPI', cat: 'dev', url: 'https://pypi.org/user/{}', icon: '🐍' },
  { name: 'Quora', cat: 'social', url: 'https://www.quora.com/profile/{}', icon: '❓' },
  { name: 'Reddit', cat: 'social', url: 'https://www.reddit.com/user/{}/', icon: '🤖', errorString: 'nobody on Reddit goes by that name' },
  { name: 'Replit', cat: 'dev', url: 'https://replit.com/@{}', icon: '⚡' },
  { name: 'Revolt', cat: 'chat', url: 'https://revolt.chat', icon: '⚡' },
  { name: 'Roblox', cat: 'gaming', url: 'https://www.roblox.com/user.aspx?username={}', icon: '🧱' },
  { name: 'RubyGems', cat: 'dev', url: 'https://rubygems.org/profiles/{}', icon: '💎', checkUrl: 'https://rubygems.org/api/v1/owners/{}/gems.json', checkMode: 'rubygems' },
  { name: 'Rumble', cat: 'media', url: 'https://rumble.com/user/{}', icon: '🟢' },
  { name: 'Session', cat: 'chat', url: 'https://session.org', icon: '🛡️' },
  { name: 'Signal Lookup', cat: 'chat', url: 'https://signal.me/#u/{}', icon: '📶' },
  { name: 'Snapchat', cat: 'social', url: 'https://www.snapchat.com/add/{}', icon: '👻' },
  { name: 'SoundCloud', cat: 'media', url: 'https://soundcloud.com/{}', icon: '☁️' },
  { name: 'SourceForge', cat: 'dev', url: 'https://sourceforge.net/u/{}/profile', icon: '📁' },
  { name: 'Speedrun.com', cat: 'gaming', url: 'https://www.speedrun.com/user/{}', icon: '⏱️' },
  { name: 'Spotify', cat: 'media', url: 'https://open.spotify.com/user/{}', icon: '🟢' },
  { name: 'StackOverflow', cat: 'dev', url: 'https://stackoverflow.com/users/{}', icon: '🥞' },
  { name: 'Steam Community', cat: 'chat', url: 'https://steamcommunity.com/id/{}', icon: '🎮', probeRule: 'steam' },
  { name: 'Steam Profile', cat: 'gaming', url: 'https://steamcommunity.com/id/{}', icon: '🎮', probeRule: 'steam' },
  { name: 'Strava', cat: 'media', url: 'https://www.strava.com/athletes/{}', icon: '🏃' },
  { name: 'Substack', cat: 'social', url: 'https://{}.substack.com', icon: '📰' },
  { name: 'Telegram', cat: 'chat', url: 'https://t.me/{}', icon: '✈️', probeRule: 'telegram' },
  { name: 'Threads', cat: 'social', url: 'https://www.threads.net/@{}', icon: '🧵' },
  { name: 'TikTok', cat: 'media', url: 'https://www.tiktok.com/@{}', icon: '🎵' },
  { name: 'Tracker.gg', cat: 'gaming', url: 'https://tracker.gg/profile/{}', icon: '🎯' },
  { name: 'TradingView', cat: 'social', url: 'https://www.tradingview.com/u/{}/', icon: '📈' },
  { name: 'Trakt.tv', cat: 'gaming', url: 'https://trakt.tv/users/{}', icon: '📺' },
  { name: 'Trello', cat: 'dev', url: 'https://trello.com/u/{}', icon: '📋' },
  { name: 'Truth Social', cat: 'social', url: 'https://truthsocial.com/@{}', icon: '🔴' },
  { name: 'TryHackMe', cat: 'dev', url: 'https://tryhackme.com/p/{}', icon: '🎩' },
  { name: 'Tumblr', cat: 'social', url: 'https://{}.tumblr.com', icon: '📜' },
  { name: 'Twitch', cat: 'media', url: 'https://www.twitch.tv/{}', icon: '🟣' },
  { name: 'Unsplash', cat: 'media', url: 'https://unsplash.com/@{}', icon: '📷' },
  { name: 'Upwork', cat: 'social', url: 'https://www.upwork.com/freelancers/~{}', icon: '💼' },
  { name: 'Venmo', cat: 'social', url: 'https://venmo.com/u/{}', icon: '💳' },
  { name: 'Vero', cat: 'social', url: 'https://vero.co/{}', icon: '🟢' },
  { name: 'Vimeo', cat: 'media', url: 'https://vimeo.com/{}', icon: '🎬' },
  { name: 'VK', cat: 'social', url: 'https://vk.com/{}', icon: '🔵' },
  { name: 'WakaTime', cat: 'dev', url: 'https://wakatime.com/@{}', icon: '⏱️', checkUrl: 'https://wakatime.com/api/v1/users/{}', checkMode: 'wakatime' },
  { name: 'Wellfound', cat: 'dev', url: 'https://wellfound.com/u/{}', icon: '✌️' },
  { name: 'Wikipedia', cat: 'social', url: 'https://en.wikipedia.org/wiki/User:{}', icon: '📖', checkUrl: 'https://en.wikipedia.org/w/api.php?action=query&list=users&ususers={}&format=json&origin=*', checkMode: 'wikipedia' },
  { name: 'WordPress', cat: 'social', url: 'https://{}.wordpress.com', icon: '🌐' },
  { name: 'X / Twitter', cat: 'social', url: 'https://x.com/{}', icon: '𝕏' },
  { name: 'Xbox Gamertag', cat: 'gaming', url: 'https://account.xbox.com/en-us/profile?gamertag={}', icon: '🎮' },
  { name: 'XDA Developers', cat: 'chat', url: 'https://forum.xda-developers.com/m/{}', icon: '📱' },
  { name: 'YouTube', cat: 'media', url: 'https://www.youtube.com/@{}', icon: '▶️', errorString: '404 Not Found' },
];

// -------------------------------------------------------------
// Person-Centric Dork Presets for Step 5
// -------------------------------------------------------------
const DORK_PRESETS = [
  {
    id: 'resume',
    title: '📄 Curriculum Vitae, Resumes & Employment History',
    risk: 'EXECUTIVE EXPOSURE',
    riskBadge: 'HIGH EXPOSURE',
    whatLeaks: 'Personal home addresses, unlisted cell phone numbers, educational dates, previous employers, and proprietary project descriptions.',
    truePositive: 'Look for direct PDF/Word resumes hosted on university webspaces, personal domains, or corporate applicant tracking systems.',
    remediation: 'Remove public resume PDFs from personal websites and submit Google URL removal requests for cached personal contact information.',
    template: 'filetype:pdf "{name}" ("curriculum vitae" | resume | "work experience" | "employment history")',
    site: '',
    filetype: 'pdf',
    inurl: 'resume, cv',
    intitle: 'curriculum vitae, resume',
    exact: 'curriculum vitae, work experience',
    category: 'Curriculum Vitae / Resume'
  },
  {
    id: 'legal',
    title: '⚖️ Public Legal Records, Court Filings & Dockets',
    risk: 'LEGAL & REGULATORY',
    riskBadge: 'CRITICAL',
    whatLeaks: 'Civil lawsuits, bankruptcy filings, divorce records, criminal dockets, property liens, and corporate deposition transcripts.',
    truePositive: 'Official court docket numbers (e.g. "Case No. 24-CV-1234"), plaintiff/defendant designations, and judicial district headers.',
    remediation: 'File sealing petitions with relevant jurisdictional clerks for sensitive exhibits containing personal financial or identity information.',
    template: '"{name}" (docket | plaintiff | defendant | "court of" | "case no" | "memorandum of law")',
    site: '',
    filetype: 'pdf',
    inurl: 'docket, court, cases',
    intitle: 'memorandum, plaintiff',
    exact: 'docket, case no',
    category: 'Public Legal Record'
  },
  {
    id: 'corporate',
    title: '🏢 Corporate Registrations, SEC Filings & Officer Filings',
    risk: 'CORPORATE FOOTPRINT',
    riskBadge: 'HIGH EXPOSURE',
    whatLeaks: 'Directorships, registered agent addresses, LLC ownership, SEC Form 4 insider equity holdings, and beneficial ownership filings.',
    truePositive: 'Filings mentioning "Director", "President", "Managing Member", or SEC CIK numbers on official state corporation registries.',
    remediation: 'Utilize professional registered agent services rather than personal home addresses for state LLC and corporate annual reports.',
    template: '"{name}" (officer | director | shareholder | "form 4" | sec.gov | "statement of changes" | "articles of incorporation")',
    site: '',
    filetype: '',
    inurl: 'filings, officers, edgar',
    intitle: 'officer, director',
    exact: 'director, shareholder, sec.gov',
    category: 'Executive Exposure'
  },
  {
    id: 'conferences',
    title: '🎤 Keynotes, Conference Presentations & Slide Decks',
    risk: 'PROFESSIONAL FOOTPRINT',
    riskBadge: 'MEDIUM',
    whatLeaks: 'Public speaking dates, slide deck downloads, internal architecture diagrams shown at meetups, speaker biographies, and travel itineraries.',
    truePositive: 'Slide decks (PPTX/PDF) with speaker bio slides revealing personal email, internal architecture, or corporate project code names.',
    remediation: 'Audit speaker presentations for unredacted internal diagrams, staging URLs, or internal email conventions before publishing slides.',
    template: '(filetype:pdf OR filetype:pptx) "{name}" (speaker | keynote | conference | presentation | symposium)',
    site: '',
    filetype: 'pdf, pptx',
    inurl: 'slides, presentation, talks',
    intitle: 'presentation, speaker',
    exact: 'speaker, keynote',
    category: 'Conferences & Presentations'
  },
  {
    id: 'pastes',
    title: '🔑 Leaked Credentials, Pastes & Configuration Dumps',
    risk: 'CREDENTIAL COMPROMISE',
    riskBadge: 'CRITICAL',
    whatLeaks: 'Plaintext passwords, credential dumps, API keys, personal email combos, and compromised token lists.',
    truePositive: 'Audited email or username adjacent to password hashes, plaintext passwords, or compromised database headers.',
    remediation: 'Immediately rotate compromised credentials, invalidate active sessions, and enforce hardware MFA tokens.',
    template: '(site:pastebin.com OR site:rentry.co OR site:ghostbin.com OR site:justpaste.it) ("{email}" OR "{handle}" OR "{name}")',
    site: 'pastebin.com, rentry.co, ghostbin.com',
    filetype: '',
    inurl: '',
    intitle: '',
    exact: 'password, leak, dump',
    category: 'Leaked Credential'
  },
  {
    id: 'contact',
    title: '📱 Direct Contact Info, Phone Numbers & Home Address',
    risk: 'PII EXPOSURE',
    riskBadge: 'HIGH EXPOSURE',
    whatLeaks: 'Personal mobile numbers, home landlines, residential addresses, and private email addresses exposed on personal websites or directories.',
    truePositive: 'Full 10-digit phone numbers formatted as (XXX) XXX-XXXX or residential street addresses directly associated with audited profile name.',
    remediation: 'Submit opt-out and deletion requests to public data aggregators (Whitepages, FastPeopleSearch, BeenVerified).',
    template: '"{name}" ("phone" | "mobile" | "cell" | "tel" | "home address" | "residential")',
    site: '',
    filetype: '',
    inurl: 'contact, staff, directory',
    intitle: 'contact, staff',
    exact: 'cell, mobile, phone',
    category: 'Exposed PII (Phone/Address)'
  },
  {
    id: 'property',
    title: '🏘️ Property Assessor, Parcel & Real Estate Deeds',
    risk: 'RESIDENTIAL FOOTPRINT',
    riskBadge: 'HIGH EXPOSURE',
    whatLeaks: 'Residential home purchases, property tax assessments, mortgage amounts, parcel maps, and co-owner/spouse full legal names.',
    truePositive: 'County tax assessor parcel records, warranty deeds, or property search portals displaying owner-occupied status.',
    remediation: 'In many jurisdictions, high-risk individuals and judicial officers can request redaction under statutory privacy protections.',
    template: '"{name}" ("property assessment" | "parcel" | "deed" | "tax collector" | assessor | "real property")',
    site: '',
    filetype: '',
    inurl: 'assessor, parcel, property',
    intitle: 'property, parcel',
    exact: 'parcel, deed, assessor',
    category: 'Public Legal Record'
  },
  {
    id: 'academic',
    title: '🎓 Academic Theses, Dissertations & University Records',
    risk: 'BACKGROUND & HISTORY',
    riskBadge: 'MEDIUM',
    whatLeaks: 'Master theses, doctoral dissertations, personal acknowledgments thanking family members/friends, and exact graduation dates.',
    truePositive: 'Institutional university repository links with thesis PDFs containing personal acknowledgments sections.',
    remediation: 'Review public thesis frontmatter for personal family mentions or legacy personal contact information.',
    template: 'filetype:pdf "{name}" (thesis | dissertation | "advisor:" | "department of" | "in partial fulfillment")',
    site: '',
    filetype: 'pdf',
    inurl: 'theses, dissertation, dspace',
    intitle: 'thesis, dissertation',
    exact: 'dissertation, thesis',
    category: 'Academic Record'
  }
];

// -------------------------------------------------------------
// Methodology Step Explanations for Step Modal
// -------------------------------------------------------------
const STEP_EXPLANATIONS = {
  1: {
    title: 'Step 1: Identity Scope Normalization & Permutations',
    what: 'Establish the ground-truth seed identifiers for the individual: Legal full name, primary username handle, known personal or corporate emails, phone numbers, and geographical context. Visage parses the name into common permutation variations (e.g. First.Last, FLast, FirstL).',
    why: 'Individuals and executives frequently reuse slight variations of their personal username across different platforms or separate professional and personal identities using predictable naming conventions.',
    opsec: 'Local scoping is 100% client-side. No user input or identity details leave your browser during Step 1.'
  },
  2: {
    title: 'Step 2: Username & Alias Matrix (Passive Presence)',
    what: 'Test the audited handle and generated permutations across 140+ popular public developer, social, chat, media, and gaming platforms.',
    why: 'Discovers active digital presence and legacy accounts registered years ago that still link to old emails, forgotten photos, or personal interests.',
    opsec: 'Visage performs zero-touch passive status queries without requiring extension login. For platforms with strict anti-scraping protections, direct formatted review links allow manual inspection.'
  },
  3: {
    title: 'Step 3: Cryptographic Identity & Public Key Telemetry',
    what: 'Query OpenPGP keyservers (Ubuntu, Surfnet), Keybase public proofs, and GitHub Git commit signatures to extract verified identity links.',
    why: 'Engineers, executives, and security professionals sign Git commits or generate PGP keys with their primary email and frequently add secondary personal Gmail or college addresses to the same public key.',
    opsec: 'Queries public OpenPGP index APIs and GitHub public events with machine-readable endpoints.'
  },
  4: {
    title: 'Step 4: Credential Exposure & Leak Telemetry',
    what: 'Cross-reference audited emails and usernames against known public database compromises, infostealer malware logs, and pastebin credential dumps. Includes private in-browser k-Anonymity hash range checks.',
    why: 'Demonstrates credential reuse risk and confirms that an email was active during specific breach years (e.g. LinkedIn 2012, Dropbox, Canva).',
    opsec: 'The k-Anonymity password check hashes candidate passwords locally with SHA-1 and only sends a 5-character prefix, ensuring full cryptographic privacy.'
  },
  5: {
    title: 'Step 5: Public Footprint Query Compiler',
    what: 'Compile specialized search engine operators (filetype:, site:, intitle:, inurl:) specifically tuned for individuals to audit exposed resumes, court filings, presentations, and leaked documents.',
    why: 'Search engines index billions of PDFs and public records that are not linked on main corporate landing pages, establishing location and institutional anchors.',
    opsec: 'Search queries are opened directly in new tabs or copied. Use Verbatim search (&tbs=li:1) in Google to bypass algorithmic synonym dilution.'
  },
  6: {
    title: 'Step 6: Public Records & Jurisdictional Intelligence',
    what: 'Cross-reference county, state, and federal public directories: Recorder of Deeds, Property Tax Assessors, Unified Court Dockets, State LLC Registrations, Voter Rolls, Professional Licensing Boards, and Inmate Records.',
    why: 'Official government records provide sovereign ground truth, confirming primary residential physical addresses, legal property ownership, corporate directorships, marital assets, and legal civil judgments.',
    opsec: 'Visage utilizes direct official government links and Google verbatim site queries. All queries operate zero-touch without submitting non-public credential requests.'
  },
  7: {
    title: 'Step 7: Exposure Report & Markdown Export',
    what: 'Classify discovered items by risk severity (Critical, High, Medium, Low), record remediation notes, and generate a fully-structured Markdown report complete with Dataview metadata and callouts.',
    why: 'Provides a professional, auditable, and actionable digital footprint assessment report for executive protection, organizational risk reviews, and personal privacy hardening.',
    opsec: 'All audit records and notes remain stored in your local browser storage until explicitly exported by the analyst.'
  }
};

// -------------------------------------------------------------
// Utilities & DOM Helpers
// -------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success', durationMs = 2500) {
  const existing = document.getElementById('visage-toast');
  if (existing) existing.remove();

  let bg = '#8b5cf6'; // default purple (success)
  if (type === false || type === 'error') {
    bg = '#ef4444'; // red
  } else if (type === 'warning') {
    bg = '#f59e0b'; // amber
  } else if (type === 'info') {
    bg = '#3b82f6'; // blue
  }

  const toast = document.createElement('div');
  toast.id = 'visage-toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.background = bg;
  toast.style.color = '#fff';
  toast.style.padding = '10px 18px';
  toast.style.borderRadius = '6px';
  toast.style.fontSize = '12px';
  toast.style.fontWeight = '600';
  toast.style.boxShadow = '0 4px 14px rgba(0,0,0,0.4)';
  toast.style.zIndex = '9999';
  toast.style.maxWidth = '420px';
  toast.style.lineHeight = '1.4';
  toast.style.transition = 'opacity 0.3s';
  document.body.appendChild(toast);

  const duration = typeof type === 'number' ? type : durationMs;

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Utility: Open multiple tabs with staggered delays to protect against search engine bot detection / rate-limiting
async function openStaggeredTabs(urls, delayMs = 350) {
  if (!urls || urls.length === 0) return;
  if (urls.length > 2) {
    showToast(`⚡ Opening ${urls.length} tabs staggered by ${delayMs}ms to prevent bot detection / rate-limiting...`, 'info', 4000);
  }
  for (let i = 0; i < urls.length; i++) {
    browser.tabs.create({ url: urls[i] });
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

let pendingAuditTabAfterConsent = null;

// -------------------------------------------------------------
// Initialization & Storage
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigationTabs();
  setupIdentityTab();
  setupGuidanceToggle();
  setupEthicalCharterModal();
  setupAuditMode();
  setupPrivacyTab();
  setupScopeInputs();
  setupPermutations();
  setupMethodologyChecklist();
  setupMatrixTab();
  setupCryptoTab();
  setupBreachTab();
  setupDorkTab();
  setupRecordsTab();
  setupDossierTab();
  setupProfilesTab();
  setupCompanionPivot();

  // Ingest URL parameters if opened with ?name=...&email=...
  ingestUrlParameters();

  // Load persisted state
  await loadStoredData();
  updateUI();
});

// -------------------------------------------------------------
// Ingest URL Parameters (1-Click Pivot from Vantage or External)
// -------------------------------------------------------------
function ingestUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q') || '';
  const name = urlParams.get('name') || '';
  const first = urlParams.get('first') || urlParams.get('firstName') || '';
  const middle = urlParams.get('middle') || urlParams.get('middleName') || urlParams.get('mi') || '';
  const last = urlParams.get('last') || urlParams.get('lastName') || '';
  const email = urlParams.get('email') || '';
  const alias = urlParams.get('alias') || urlParams.get('handle') || '';
  const phone = urlParams.get('phone') || '';
  const org = urlParams.get('org') || '';

  let hasData = false;

  if (first) { State.target.firstName = first.trim(); hasData = true; }
  if (middle) { State.target.middleName = middle.trim(); hasData = true; }
  if (last) { State.target.lastName = last.trim(); hasData = true; }

  if (q) {
    if (q.includes('@')) {
      State.target.email = q.trim();
    } else {
      const parsed = splitFullName(q.trim());
      if (!State.target.firstName) State.target.firstName = parsed.firstName;
      if (!State.target.middleName) State.target.middleName = parsed.middleName;
      if (!State.target.lastName) State.target.lastName = parsed.lastName;
    }
    hasData = true;
  }
  if (name) {
    const parsed = splitFullName(name.trim());
    if (!State.target.firstName) State.target.firstName = parsed.firstName;
    if (!State.target.middleName) State.target.middleName = parsed.middleName;
    if (!State.target.lastName) State.target.lastName = parsed.lastName;
    hasData = true;
  }
  if (email) { State.target.email = email.trim(); hasData = true; }
  if (alias) { State.target.handle = alias.trim(); hasData = true; }
  if (phone) { State.target.phone = phone.trim(); hasData = true; }
  if (org) { State.target.org = org.trim(); hasData = true; }

  State.target.name = [State.target.firstName, State.target.middleName, State.target.lastName].filter(Boolean).join(' ');

  if (hasData) {
    applyTargetToInputs();
    generateHandlePermutations();
    updateLocationJurisdictionPreview();
    updateTargetCard();
    markStep(1, true);
    showToast(`Loaded profile: ${State.target.name || State.target.email || State.target.handle}`);
  }
}

// -------------------------------------------------------------
// Persistent Storage
// -------------------------------------------------------------
async function loadStoredData() {
  try {
    const data = await browser.storage.local.get(['auditLogs', 'savedProfiles', 'currentTarget', 'stepProgress', 'jurisdictionCache', 'auditMode']);
    if (data.auditMode) {
      State.auditMode = data.auditMode;
      const select = document.getElementById('audit-mode-select');
      if (select) {
        select.value = data.auditMode;
        applyAuditModeUI(data.auditMode);
      }
    }
    if (data.auditLogs) State.auditLogs = data.auditLogs;
    if (data.savedProfiles) State.savedProfiles = data.savedProfiles;
    if (data.jurisdictionCache) State.jurisdictionCache = data.jurisdictionCache;
    if (data.stepProgress) State.stepProgress = Object.assign({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false }, data.stepProgress);

    // If currentTarget stored and nothing in query string
    if (data.currentTarget && !State.target.name && !State.target.email && !State.target.handle) {
      State.target = Object.assign({ firstName: '', middleName: '', lastName: '' }, data.currentTarget);
      if (State.target.name && (!State.target.firstName || !State.target.lastName)) {
        const parsed = splitFullName(State.target.name);
        if (!State.target.firstName) State.target.firstName = parsed.firstName;
        if (!State.target.middleName) State.target.middleName = parsed.middleName;
        if (!State.target.lastName) State.target.lastName = parsed.lastName;
      }
      State.target.name = [State.target.firstName, State.target.middleName, State.target.lastName].filter(Boolean).join(' ');
      applyTargetToInputs();
      generateHandlePermutations();
      updateLocationJurisdictionPreview();
    }
    await checkDeepScanPermission();
  } catch (err) {
    console.error('Failed to load storage:', err);
  }
}

async function saveStoredData() {
  try {
    await browser.storage.local.set({
      auditLogs: State.auditLogs,
      savedProfiles: State.savedProfiles,
      currentTarget: State.target,
      stepProgress: State.stepProgress,
      jurisdictionCache: State.jurisdictionCache,
      auditMode: State.auditMode || 'self'
    });
  } catch (err) {
    console.error('Failed to persist state:', err);
  }
}

// -------------------------------------------------------------
// UI Updates & Tabs
// -------------------------------------------------------------
function updateUI() {
  renderIdentityTab();
  updateTargetCard();
  updateMethodologyChecklistUI();
  renderAuditLogs();
  renderProfilesList();
  renderMatrixGrid();
  renderDorkLibrary();
  renderPastesDorks();
  renderRecordsTab();
  const currentTab = document.querySelector('.tab-btn.active')?.getAttribute('data-target') || 'tab-identity';
  syncActiveStepToTab(currentTab);
}

function setupNavigationTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      switchTab(targetId);
    });
  });
  const currentTab = document.querySelector('.tab-btn.active')?.getAttribute('data-target') || 'tab-identity';
  syncActiveStepToTab(currentTab);
}

function switchTab(targetId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const activeBtn = document.querySelector(`.tab-btn[data-target="${targetId}"]`);
  const activeContent = document.getElementById(targetId);

  // If the active tab was hidden in self-mode (e.g. records or crypto), ensure its tab button is visible
  if (activeBtn) {
    activeBtn.style.display = '';
    activeBtn.classList.add('active');
  }
  if (activeContent) {
    activeContent.classList.add('active');
  }

  // Reset scroll on tab switch so tabs navigation and top of content are immediately visible
  const colRight = document.querySelector('.col-right');
  if (colRight) {
    colRight.scrollTop = 0;
  }

  // Keep guided methodology checklist step synchronized with active tab
  syncActiveStepToTab(targetId);

  if (targetId === 'tab-identity') {
    renderIdentityTab();
  } else if (targetId === 'tab-records') {
    const stateSelect = document.getElementById('jur-state-select');
    const countyInput = document.getElementById('jur-county-input');
    if (stateSelect && State.jurisdiction.stateCode) {
      stateSelect.value = State.jurisdiction.stateCode;
    }
    if (countyInput && (State.jurisdiction.city || State.jurisdiction.county)) {
      countyInput.value = State.jurisdiction.city || State.jurisdiction.county;
    }
    renderRecordsTab();
  }
}

function syncActiveStepToTab(targetId) {
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active-step'));

  let activeCardId = null;
  if (targetId === 'tab-identity') {
    activeCardId = 'step-1-card';
  } else if (targetId === 'tab-matrix') {
    activeCardId = 'step-2-card';
  } else if (targetId === 'tab-crypto') {
    activeCardId = 'step-3-card';
  } else if (targetId === 'tab-breach') {
    activeCardId = 'step-4-card';
  } else if (targetId === 'tab-dorks') {
    activeCardId = 'step-5-card';
  } else if (targetId === 'tab-records') {
    activeCardId = 'step-6-card';
  } else if (targetId === 'tab-privacy') {
    if (State.auditMode === 'self') {
      activeCardId = 'step-7-card';
    }
  } else if (targetId === 'tab-dossier') {
    if (State.auditMode === 'org') {
      activeCardId = 'step-7-card';
    }
  }

  if (activeCardId) {
    const card = document.getElementById(activeCardId);
    if (card) card.classList.add('active-step');
  }
}

function setupIdentityTab() {
  const btnSave = document.getElementById('btn-tab-id-save');
  const btnReset = document.getElementById('btn-tab-id-reset');
  const btnProceed = document.getElementById('btn-tab-id-proceed');
  const btnFocus = document.getElementById('btn-focus-composer');

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const realSaveBtn = document.getElementById('btn-save-profile');
      if (realSaveBtn) realSaveBtn.click();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const realResetBtn = document.getElementById('btn-reset-scope');
      if (realResetBtn) realResetBtn.click();
    });
  }

  if (btnProceed) {
    btnProceed.addEventListener('click', () => {
      switchTab('tab-matrix');
    });
  }

  if (btnFocus) {
    btnFocus.addEventListener('click', () => {
      const fInput = document.getElementById('target-first-name');
      if (fInput) {
        fInput.focus();
        fInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  // Jump to specific capabilities from overview cards
  document.querySelectorAll('.id-module-card[data-jump]').forEach(card => {
    card.addEventListener('click', () => {
      const jumpTarget = card.getAttribute('data-jump');
      if (jumpTarget) switchTab(jumpTarget);
    });
  });
}

function renderIdentityTab() {
  const target = State.target;
  const fullName = target.name || (target.firstName ? [target.firstName, target.middleName, target.lastName].filter(Boolean).join(' ') : '');
  const displayName = fullName || (target.handle ? `@${target.handle}` : 'No Profile Active');
  const targetMeta = target.handle ? `@${target.handle}` : (target.email || 'Fill target seeds in the left pane to initialize audit');

  const titleEl = document.getElementById('tab-id-target-name');
  const metaEl = document.getElementById('tab-id-target-meta');
  if (titleEl) titleEl.textContent = displayName;
  if (metaEl) metaEl.textContent = targetMeta;

  const nameEl = document.getElementById('id-val-name');
  const handleEl = document.getElementById('id-val-handle');
  const emailEl = document.getElementById('id-val-email');
  const phoneEl = document.getElementById('id-val-phone');
  const orgEl = document.getElementById('id-val-org');
  const locEl = document.getElementById('id-val-location');

  if (nameEl) nameEl.textContent = fullName || '—';
  if (handleEl) handleEl.textContent = target.handle ? `@${target.handle}` : '—';
  if (emailEl) emailEl.textContent = target.email || '—';
  if (phoneEl) phoneEl.textContent = target.phone || '—';
  if (orgEl) orgEl.textContent = target.org || '—';
  if (locEl) locEl.textContent = State.jurisdiction?.resolvedText || target.location || '—';
}

function setupGuidanceToggle() {
  const toggle = document.getElementById('toggle-guidance');
  const checklist = document.getElementById('guided-checklist');
  if (!toggle) return;

  toggle.addEventListener('change', () => {
    const isChecked = toggle.checked;
    if (isChecked) {
      document.body.classList.add('show-guidance');
    } else {
      document.body.classList.remove('show-guidance');
    }
    if (checklist) {
      checklist.style.display = isChecked ? '' : 'none';
    }
  });
}

// -------------------------------------------------------------
// STEP 1: IDENTITY SCOPE & COMPOSER
// -------------------------------------------------------------
function setupScopeInputs() {
  const fNameInput = document.getElementById('target-first-name');
  const mNameInput = document.getElementById('target-middle-name');
  const lNameInput = document.getElementById('target-last-name');
  const handleInput = document.getElementById('target-handle');
  const emailInput = document.getElementById('target-email');
  const phoneInput = document.getElementById('target-phone');
  const locInput = document.getElementById('target-location');
  const orgInput = document.getElementById('target-org');

  const onInputChange = () => {
    State.target.firstName = (fNameInput ? fNameInput.value : '').trim();
    State.target.middleName = (mNameInput ? mNameInput.value : '').trim();
    State.target.lastName = (lNameInput ? lNameInput.value : '').trim();
    State.target.name = [State.target.firstName, State.target.middleName, State.target.lastName].filter(Boolean).join(' ');

    State.target.handle = handleInput.value.trim().replace(/^@/, '');
    State.target.email = emailInput.value.trim();
    State.target.phone = phoneInput.value.trim();
    State.target.location = locInput.value.trim();
    State.target.org = orgInput.value.trim();

    updateLocationJurisdictionPreview();
    updateTargetCard();
    renderIdentityTab();
    saveStoredData();

    // Check if step 1 is satisfied
    if (State.target.name || State.target.handle || State.target.email) {
      markStep(1, true);
    }
  };

  // Smart multi-word / paste handler on First Name input
  if (fNameInput) {
    fNameInput.addEventListener('input', () => {
      const val = fNameInput.value;
      if (val.includes(' ') && lNameInput && !lNameInput.value.trim()) {
        const parsed = splitFullName(val);
        fNameInput.value = parsed.firstName;
        if (mNameInput && parsed.middleName) mNameInput.value = parsed.middleName;
        if (lNameInput && parsed.lastName) lNameInput.value = parsed.lastName;
      }
      onInputChange();
    });
  }
  if (mNameInput) mNameInput.addEventListener('input', onInputChange);
  if (lNameInput) lNameInput.addEventListener('input', onInputChange);
  handleInput.addEventListener('input', onInputChange);
  emailInput.addEventListener('input', onInputChange);
  phoneInput.addEventListener('input', onInputChange);
  locInput.addEventListener('input', onInputChange);
  orgInput.addEventListener('input', onInputChange);

  // Focus on any scope composer input highlights Step 1 card
  const scopeInputs = [fNameInput, mNameInput, lNameInput, handleInput, emailInput, phoneInput, locInput, orgInput];
  scopeInputs.forEach(input => {
    if (input) {
      input.addEventListener('focus', () => {
        document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active-step'));
        const step1Card = document.getElementById('step-1-card');
        if (step1Card) step1Card.classList.add('active-step');
      });
    }
  });

  // Jump to Records Desk
  const btnJumpRecords = document.getElementById('btn-jump-records');
  if (btnJumpRecords) {
    btnJumpRecords.addEventListener('click', () => {
      if (State.auditMode === 'self') {
        const consentModal = document.getElementById('consent-modal');
        const chkConsent = document.getElementById('chk-consent-confirm');
        const btnConfirmConsent = document.getElementById('btn-confirm-consent');
        if (consentModal) {
          pendingAuditTabAfterConsent = 'tab-records';
          if (chkConsent) chkConsent.checked = false;
          if (btnConfirmConsent) btnConfirmConsent.disabled = true;
          consentModal.style.display = 'flex';
          showToast('Public Records require Defensive Assessment mode authorization.', 'info');
          return;
        }
      }
      switchTab('tab-records');
      markStep(6, true);
    });
  }

  // Save Target Profile
  const btnSave = document.getElementById('btn-save-profile');
  btnSave.addEventListener('click', () => {
    if (!State.target.name && !State.target.handle && !State.target.email) {
      showToast('Please enter at least a name, handle, or email', false);
      return;
    }

    const existingIdx = State.savedProfiles.findIndex(p =>
      (p.name && p.name.toLowerCase() === State.target.name.toLowerCase()) ||
      (p.email && p.email.toLowerCase() === State.target.email.toLowerCase()) ||
      (p.handle && p.handle.toLowerCase() === State.target.handle.toLowerCase())
    );

    const profileData = {
      id: Date.now().toString(),
      ...State.target,
      savedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      State.savedProfiles[existingIdx] = profileData;
      showToast(`Updated profile for ${profileData.name || profileData.handle}`);
    } else {
      State.savedProfiles.unshift(profileData);
      showToast(`Saved profile for ${profileData.name || profileData.handle}`);
    }

    saveStoredData();
    renderProfilesList();
  });

  // Reset Scope
  const btnReset = document.getElementById('btn-reset-scope');
  btnReset.addEventListener('click', () => {
    State.target = { firstName: '', middleName: '', lastName: '', name: '', handle: '', email: '', phone: '', location: '', org: '' };
    State.jurisdiction = {
      country: 'US',
      stateCode: 'NY',
      stateName: 'New York',
      county: 'New York County',
      city: 'New York City',
      resolvedText: 'New York County, New York'
    };
    applyTargetToInputs();
    updateLocationJurisdictionPreview();
    updateTargetCard();
    document.getElementById('permutations-chips').innerHTML = '<span class="empty-hint">Click \'Permute Name\' to generate handle variations</span>';
    saveStoredData();
    showToast('Scope reset');
  });

  // Purge All Local Data
  const btnPurge = document.getElementById('btn-purge-data');
  if (btnPurge) {
    btnPurge.addEventListener('click', async () => {
      const ok = confirm(
        "⚠️ Purge All Visage Data?\n\n" +
        "This will permanently delete all saved target scopes, exposure findings, manual notes, and cached session data from your browser's local storage.\n\n" +
        "This action cannot be undone."
      );
      if (!ok) return;

      try {
        await browser.storage.local.clear();
        await browser.storage.local.set({ ethicalCharterAccepted: true });
      } catch (err) {
        console.error('Storage clear error:', err);
      }

      // Reset in-memory State
      State.target = { firstName: '', middleName: '', lastName: '', name: '', handle: '', email: '', phone: '', location: '', org: '' };
      State.jurisdiction = {
        country: 'US',
        stateCode: 'NY',
        stateName: 'New York',
        county: 'New York County',
        city: 'New York City',
        resolvedText: 'New York County, New York'
      };
      State.auditLogs = [];
      State.savedProfiles = [];
      State.cryptoResults = { pgp: [], keybase: null, github: null };
      State.matrixResults = {};
      State.jurisdictionCache = {};
      State.stepProgress = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false };

      applyTargetToInputs();
      updateLocationJurisdictionPreview();
      updateTargetCard();
      const permChips = document.getElementById('permutations-chips');
      if (permChips) permChips.innerHTML = '<span class="empty-hint">Click \'Permute Name\' to generate handle variations</span>';

      updateUI();
      showToast('All local Visage data and target scopes have been purged.');
    });
  }

  // Quick Pivots
  const pivotRevImg = document.getElementById('pivot-reverse-image');
  if (pivotRevImg) {
    pivotRevImg.addEventListener('click', () => {
      browser.tabs.create({ url: 'https://lens.google.com/' });
    });
  }

  const pivotWayback = document.getElementById('pivot-wayback');
  if (pivotWayback) {
    pivotWayback.addEventListener('click', () => {
      const query = State.target.handle || State.target.email || State.target.name;
      const url = query ? `https://web.archive.org/web/*/${encodeURIComponent(query)}` : 'https://archive.org/';
      browser.tabs.create({ url });
    });
  }

  const pivotGoogleTakedown = document.getElementById('pivot-google-takedown');
  if (pivotGoogleTakedown) {
    pivotGoogleTakedown.addEventListener('click', () => {
      browser.tabs.create({ url: 'https://support.google.com/websearch/troubleshooter/3111061' });
    });
  }

  const pivotPrivacyDesk = document.getElementById('pivot-privacy-desk');
  if (pivotPrivacyDesk) {
    pivotPrivacyDesk.addEventListener('click', () => {
      switchTab('tab-privacy');
    });
  }
}

// -------------------------------------------------------------
// Ethical Charter & Authorization Modal
// -------------------------------------------------------------
function setupEthicalCharterModal() {
  const modal = document.getElementById('ethical-modal');
  const btnOpen = document.getElementById('btn-open-charter');
  const btnClose = document.getElementById('btn-close-ethical-modal');
  const btnCloseSec = document.getElementById('btn-close-ethical-modal-secondary');
  const chkAccept = document.getElementById('chk-accept-charter');
  const btnAccept = document.getElementById('btn-accept-charter');

  if (!modal) return;

  function openModal() {
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', openModal);
  }

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCloseSec) btnCloseSec.addEventListener('click', closeModal);

  if (chkAccept && btnAccept) {
    chkAccept.addEventListener('change', () => {
      btnAccept.disabled = !chkAccept.checked;
    });

    btnAccept.addEventListener('click', async () => {
      try {
        await browser.storage.local.set({ ethicalCharterAccepted: true });
      } catch (err) {
        console.error('Failed to persist charter acceptance:', err);
      }
      closeModal();
      showToast('Ethical Charter acknowledged. Welcome to Visage.');
    });
  }

  // Check first-run status
  browser.storage.local.get(['ethicalCharterAccepted']).then(data => {
    if (!data.ethicalCharterAccepted) {
      openModal();
    } else {
      if (chkAccept) chkAccept.checked = true;
      if (btnAccept) btnAccept.disabled = false;
    }
  }).catch(err => {
    console.warn('Storage check error for ethical charter:', err);
  });
}

// -------------------------------------------------------------
// Audit Mode & Context Configuration
// -------------------------------------------------------------
function applyAuditModeUI(mode) {
  const banner = document.getElementById('defensive-banner');
  if (banner) banner.style.display = 'flex';
  const bannerIcon = document.getElementById('banner-icon');
  const bannerTitle = document.getElementById('banner-mode-title');
  const bannerDesc = document.getElementById('banner-mode-desc');
  const checklistSubtitle = document.getElementById('checklist-subtitle');
  const step1Badge = document.getElementById('step-1-badge');

  // Step cards
  const step3Card = document.getElementById('step-3-card');
  const step4Card = document.getElementById('step-4-card');
  const step5Card = document.getElementById('step-5-card');
  const step6Card = document.getElementById('step-6-card');
  const step7Card = document.getElementById('step-7-card');

  const step4BadgeNum = document.getElementById('step-4-badge-num');
  const step4Title = document.getElementById('step-4-title');
  const step4Desc = document.getElementById('step-4-desc');
  const stepBtn4 = document.getElementById('step-btn-4');

  const step5BadgeNum = document.getElementById('step-5-badge-num');
  const step5Title = document.getElementById('step-5-title');
  const step5Desc = document.getElementById('step-5-desc');
  const stepBtn5 = document.getElementById('step-btn-5');

  const step7BadgeNum = document.getElementById('step-7-badge-num');
  const step7Title = document.getElementById('step-7-title');
  const step7Desc = document.getElementById('step-7-desc');
  const stepBtn7 = document.getElementById('step-btn-7');

  // Nav tabs
  const tabIdentityBtn = document.querySelector('.tab-btn[data-target="tab-identity"]');
  const tabMatrixBtn = document.querySelector('.tab-btn[data-target="tab-matrix"]');
  const tabCryptoBtn = document.querySelector('.tab-btn[data-target="tab-crypto"]');
  const tabRecordsBtn = document.querySelector('.tab-btn[data-target="tab-records"]');
  const tabBreachBtn = document.querySelector('.tab-btn[data-target="tab-breach"]');
  const tabDorksBtn = document.querySelector('.tab-btn[data-target="tab-dorks"]');
  const tabPrivacyBtn = document.querySelector('.tab-btn[data-target="tab-privacy"]');
  const tabDossierBtn = document.querySelector('.tab-btn[data-target="tab-dossier"]');
  const tabProfilesBtn = document.querySelector('.tab-btn[data-target="tab-profiles"]');

  // Tab privacy headers
  const privacyTabTitle = document.getElementById('privacy-tab-title');
  const privacyTabDesc = document.getElementById('privacy-tab-desc');

  // Guidance toggle wrapper & checklist
  const guidanceToggleWrapper = document.getElementById('guidance-toggle-wrapper');
  const toggleGuidance = document.getElementById('toggle-guidance');
  const checklist = document.getElementById('guided-checklist');
  const tabsNav = document.getElementById('min-tabs-nav') || document.getElementById('main-tabs-nav') || document.querySelector('.tabs');

  if (mode === 'self') {
    // Hide #min-tabs-nav when Personal Privacy Self-Audit mode is selected
    if (tabsNav) {
      tabsNav.style.display = 'none';
    }

    // Hide guidance toggle in Personal Privacy Self-Audit mode and ensure checklist is visible
    if (guidanceToggleWrapper) {
      guidanceToggleWrapper.style.display = 'none';
    }
    if (toggleGuidance) {
      toggleGuidance.checked = true;
      toggleGuidance.disabled = true; // Lock into guided mode for self-audit
      document.body.classList.add('show-guidance');
    }
    if (checklist) {
      checklist.style.display = '';
    }

    // Banner styling - clean green with 10px top spacing in self-audit mode
    if (banner) {
      banner.classList.remove('banner-warning');
      banner.classList.add('banner-self');
      banner.style.marginTop = '10px';
    }
    if (bannerIcon) bannerIcon.textContent = '🛡️';
    if (bannerTitle) bannerTitle.textContent = 'Personal Privacy Self-Audit Workstation';
    if (bannerDesc) bannerDesc.textContent = 'You are conducting a defensive audit of your own digital footprint. Use findings to submit PII delisting requests, purge data broker aggregators, rotate exposed credentials, and harden your personal privacy perimeter.';

    // Checklist subtitle & composer badge
    if (checklistSubtitle) checklistSubtitle.textContent = 'Streamlined 5-Step Personal Privacy Audit';
    if (step1Badge) step1Badge.textContent = 'STEP 1: AUDIT SCOPE';

    // Hide Crypto and Public Records cards
    if (step3Card) step3Card.style.display = 'none';
    if (step6Card) step6Card.style.display = 'none';

    // Step 4 becomes Step 3 (Data Leaks)
    if (step4BadgeNum) step4BadgeNum.textContent = 'Step 3';
    if (step4Title) step4Title.textContent = 'Data Leaks';
    if (step4Desc) step4Desc.textContent = 'Breach checks & password leaks.';
    if (stepBtn4) stepBtn4.textContent = 'Check Leaks';

    // Step 5 becomes Step 4 (Google Exposure)
    if (step5BadgeNum) step5BadgeNum.textContent = 'Step 4';
    if (step5Title) step5Title.textContent = 'Google Exposure';
    if (step5Desc) step5Desc.textContent = 'Resumes, phone numbers & docs.';
    if (stepBtn5) stepBtn5.textContent = 'Search Google';

    // Step 7 becomes Step 5 (Clean Up & Opt-Out)
    if (step7BadgeNum) step7BadgeNum.textContent = 'Step 5';
    if (step7Title) step7Title.textContent = 'Clean Up & Opt-Out';
    if (step7Desc) step7Desc.textContent = 'Google delist & broker opt-out.';
    if (stepBtn7) stepBtn7.textContent = 'Opt-Out Desk';

    // Navigation tabs: hide technical tabs
    if (tabIdentityBtn) {
      tabIdentityBtn.style.display = '';
      tabIdentityBtn.textContent = 'Identity';
    }
    if (tabMatrixBtn) {
      tabMatrixBtn.style.display = '';
      tabMatrixBtn.textContent = 'Account Matrix';
    }
    if (tabCryptoBtn) tabCryptoBtn.style.display = 'none';
    if (tabRecordsBtn) tabRecordsBtn.style.display = 'none';
    if (tabBreachBtn) {
      tabBreachBtn.style.display = '';
      tabBreachBtn.textContent = 'Data Leaks';
    }
    if (tabDorksBtn) {
      tabDorksBtn.style.display = '';
      tabDorksBtn.textContent = 'Google Exposure';
    }
    if (tabPrivacyBtn) {
      tabPrivacyBtn.style.display = '';
      tabPrivacyBtn.textContent = 'Clean Up & Opt-Out';
    }
    if (tabDossierBtn) tabDossierBtn.style.display = '';
    if (tabProfilesBtn) tabProfilesBtn.style.display = '';

    // If currently viewing a hidden tab, switch to identity or matrix
    const currentTab = document.querySelector('.tab-btn.active')?.getAttribute('data-target');
    if (currentTab === 'tab-crypto' || currentTab === 'tab-records') {
      switchTab('tab-matrix');
    } else if (currentTab) {
      syncActiveStepToTab(currentTab);
    }

    // Privacy tab headers
    if (privacyTabTitle) privacyTabTitle.textContent = 'Clean Up & Opt-Out Desk';
    if (privacyTabDesc) privacyTabDesc.textContent = 'Take direct action on your audit findings: delist your PII from search engines, opt out of commercial data brokers, and download your personal action plan.';
  } else {
    // Show #min-tabs-nav in Defensive Exposure Assessment mode
    if (tabsNav) {
      tabsNav.style.display = '';
    }

    // Show guidance toggle in Defensive Exposure Assessment mode and sync checklist visibility
    if (guidanceToggleWrapper) {
      guidanceToggleWrapper.style.display = 'inline-flex';
    }
    if (toggleGuidance) {
      toggleGuidance.disabled = false;
      if (checklist) {
        checklist.style.display = toggleGuidance.checked ? '' : 'none';
      }
      if (toggleGuidance.checked) {
        document.body.classList.add('show-guidance');
      } else {
        document.body.classList.remove('show-guidance');
      }
    }

    // Banner styling - warm amber warning with default spacing below tabs
    if (banner) {
      banner.classList.remove('banner-self');
      banner.classList.add('banner-warning');
      banner.style.marginTop = '';
    }
    if (bannerIcon) bannerIcon.textContent = '🏢';
    if (bannerTitle) bannerTitle.textContent = 'Defensive Exposure Assessment Mode (Executive / Org)';
    if (bannerDesc) bannerDesc.textContent = 'Authorized security assessment mode active. Operating on third-party individuals or executive assets requires prior written authorization or explicit consent. All findings must remain confidential and strictly defensive.';

    // Checklist subtitle & composer badge
    if (checklistSubtitle) checklistSubtitle.textContent = 'Standard 7-Step Identity Privacy Assessment';
    if (step1Badge) step1Badge.textContent = 'STEP 1: TARGET SCOPE';

    // Show all 7 step cards
    if (step3Card) step3Card.style.display = '';
    if (step6Card) step6Card.style.display = '';

    // Step 4 is Credential Exposure
    if (step4BadgeNum) step4BadgeNum.textContent = 'Step 4';
    if (step4Title) step4Title.textContent = 'Credential Exposure';
    if (step4Desc) step4Desc.textContent = 'Leak checks & paste searches.';
    if (stepBtn4) stepBtn4.textContent = 'Check Leaks';

    // Step 5 is Search Footprint
    if (step5BadgeNum) step5BadgeNum.textContent = 'Step 5';
    if (step5Title) step5Title.textContent = 'Search Footprint';
    if (step5Desc) step5Desc.textContent = 'Public documents, resumes & filings.';
    if (stepBtn5) stepBtn5.textContent = 'Audit Footprint';

    // Step 7 is Exposure Report
    if (step7BadgeNum) step7BadgeNum.textContent = 'Step 7';
    if (step7Title) step7Title.textContent = 'Exposure Report';
    if (step7Desc) step7Desc.textContent = 'Findings triage & Markdown export.';
    if (stepBtn7) stepBtn7.textContent = 'Export Report';

    // Navigation tabs: show all with concise capability names
    if (tabIdentityBtn) {
      tabIdentityBtn.style.display = '';
      tabIdentityBtn.textContent = 'Identity';
    }
    if (tabMatrixBtn) {
      tabMatrixBtn.style.display = '';
      tabMatrixBtn.textContent = 'Accounts';
    }
    if (tabCryptoBtn) {
      tabCryptoBtn.style.display = '';
      tabCryptoBtn.textContent = 'Crypto';
    }
    if (tabRecordsBtn) {
      tabRecordsBtn.style.display = '';
      tabRecordsBtn.textContent = 'Public Records';
    }
    if (tabBreachBtn) {
      tabBreachBtn.style.display = '';
      tabBreachBtn.textContent = 'Credential Exposure';
    }
    if (tabDorksBtn) {
      tabDorksBtn.style.display = '';
      tabDorksBtn.textContent = 'Search Footprint';
    }
    if (tabPrivacyBtn) {
      tabPrivacyBtn.style.display = '';
      tabPrivacyBtn.textContent = 'Privacy Desk';
    }
    if (tabDossierBtn) tabDossierBtn.style.display = '';
    if (tabProfilesBtn) tabProfilesBtn.style.display = '';

    const currentTab = document.querySelector('.tab-btn.active')?.getAttribute('data-target');
    if (currentTab) {
      syncActiveStepToTab(currentTab);
    }

    // Privacy tab headers
    if (privacyTabTitle) privacyTabTitle.textContent = 'Privacy & Remediation Desk';
    if (privacyTabDesc) privacyTabDesc.textContent = 'Official search engine takedown forms, data broker opt-out portals, and digital defense resources.';
  }

  updatePrivacyHubFindingsPreview();
  updateMethodologyChecklistUI();
}

function updatePrivacyHubFindingsPreview() {
  const container = document.getElementById('privacy-hub-findings-preview');
  if (!container) return;

  const total = State.auditLogs.length;
  const confirmed = State.auditLogs.filter(l => l.status === 'confirmed').length;

  if (total > 0) {
    container.innerHTML = `
      <span>🔍 <strong>${total} Findings Recorded</strong> (${confirmed} confirmed hits). Delist exposed items below or export your customized remediation checklist.</span>
    `;
  } else {
    container.innerHTML = `
      <span>✨ <strong>No findings flagged yet.</strong> Run through Steps 2-4 to identify leaks, or use the direct search engine and data broker portals below to proactively scrub your identity.</span>
    `;
  }
}

function setupAuditMode() {
  const select = document.getElementById('audit-mode-select');
  const consentModal = document.getElementById('consent-modal');
  const chkConsent = document.getElementById('chk-consent-confirm');
  const btnConfirmConsent = document.getElementById('btn-confirm-consent');
  const btnCancelConsent = document.getElementById('btn-cancel-consent');
  const btnCloseConsent = document.getElementById('btn-close-consent-modal');

  if (!select) return;

  let consentAccepted = false;
  browser.storage.local.get(['orgConsentAcknowledged']).then(data => {
    if (data.orgConsentAcknowledged) {
      consentAccepted = true;
    }
  }).catch(e => {});

  function applyAuditMode(mode) {
    State.auditMode = mode;
    select.value = mode;
    applyAuditModeUI(mode);
    saveStoredData();
    showToast(`Audit context: ${mode === 'self' ? 'Personal Privacy Self-Audit' : 'Defensive Exposure Assessment'}`);
  }

  select.addEventListener('change', async () => {
    const selectedMode = select.value;

    if (selectedMode === 'org') {
      if (!consentAccepted) {
        try {
          const stored = await browser.storage.local.get(['orgConsentAcknowledged']);
          if (stored && stored.orgConsentAcknowledged) {
            consentAccepted = true;
          }
        } catch (e) {}
      }

      if (!consentAccepted) {
        // Prompt with consent modal before allowing the mode change
        if (consentModal) {
          if (chkConsent) chkConsent.checked = false;
          if (btnConfirmConsent) btnConfirmConsent.disabled = true;
          consentModal.style.display = 'flex';
        }
        return;
      }
    }

    applyAuditMode(selectedMode);
  });

  if (chkConsent && btnConfirmConsent) {
    chkConsent.addEventListener('change', () => {
      btnConfirmConsent.disabled = !chkConsent.checked;
    });

    btnConfirmConsent.addEventListener('click', async () => {
      consentAccepted = true;
      try {
        await browser.storage.local.set({ orgConsentAcknowledged: true });
      } catch (e) {
        console.error('Failed to save consent acknowledgment:', e);
      }
      if (consentModal) consentModal.style.display = 'none';
      applyAuditMode('org');
      if (pendingAuditTabAfterConsent) {
        switchTab(pendingAuditTabAfterConsent);
        if (pendingAuditTabAfterConsent === 'tab-records') markStep(6, true);
        pendingAuditTabAfterConsent = null;
      }
    });
  }

  function cancelConsent() {
    if (consentModal) consentModal.style.display = 'none';
    pendingAuditTabAfterConsent = null;
    select.value = 'self';
    applyAuditMode('self');
  }

  if (btnCancelConsent) btnCancelConsent.addEventListener('click', cancelConsent);
  if (btnCloseConsent) btnCloseConsent.addEventListener('click', cancelConsent);

  if (consentModal) {
    consentModal.addEventListener('click', (e) => {
      if (e.target === consentModal) {
        cancelConsent();
      }
    });
  }

  const btnDismissBanner = document.getElementById('btn-dismiss-banner');
  if (btnDismissBanner) {
    btnDismissBanner.addEventListener('click', () => {
      const banner = document.getElementById('defensive-banner');
      if (banner) banner.style.display = 'none';
    });
  }

  applyAuditModeUI(State.auditMode || 'self');
}

// -------------------------------------------------------------
// TAB 6: PRIVACY & REMEDIATION DESK
// -------------------------------------------------------------
function setupPrivacyTab() {
  const container = document.getElementById('tab-privacy');
  if (!container) return;

  container.querySelectorAll('.btn-open-external').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      if (url) {
        browser.tabs.create({ url });
      }
    });
  });

  const btnExportCsv = document.getElementById('btn-export-privacy-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      exportCsvDossier();
    });
  }

  const btnExportMd = document.getElementById('btn-export-privacy-md');
  if (btnExportMd) {
    btnExportMd.addEventListener('click', () => {
      exportObsidianMarkdown();
    });
  }

  updatePrivacyHubFindingsPreview();
}

function applyTargetToInputs() {
  if (State.target.name && (!State.target.firstName || !State.target.lastName)) {
    const parts = splitFullName(State.target.name);
    if (!State.target.firstName) State.target.firstName = parts.firstName;
    if (!State.target.middleName) State.target.middleName = parts.middleName;
    if (!State.target.lastName) State.target.lastName = parts.lastName;
  }
  const fInput = document.getElementById('target-first-name');
  const mInput = document.getElementById('target-middle-name');
  const lInput = document.getElementById('target-last-name');
  if (fInput) fInput.value = State.target.firstName || '';
  if (mInput) mInput.value = State.target.middleName || '';
  if (lInput) lInput.value = State.target.lastName || '';
  document.getElementById('target-handle').value = State.target.handle || '';
  document.getElementById('target-email').value = State.target.email || '';
  document.getElementById('target-phone').value = State.target.phone || '';
  document.getElementById('target-location').value = State.target.location || '';
  document.getElementById('target-org').value = State.target.org || '';
}

function updateTargetCard() {
  const displayName = document.getElementById('card-display-name');
  const displayMeta = document.getElementById('card-display-meta');
  const statAccounts = document.getElementById('stat-accounts');
  const statKeys = document.getElementById('stat-keys');
  const statBreaches = document.getElementById('stat-breaches');
  const statFindings = document.getElementById('stat-findings');

  const name = State.target.name || State.target.handle || State.target.email || 'No Profile Active';
  displayName.textContent = name;

  const metaParts = [];
  if (State.target.handle) metaParts.push(`@${State.target.handle}`);
  if (State.target.email) metaParts.push(State.target.email);
  if (State.target.location) metaParts.push(State.target.location);
  if (State.target.org) metaParts.push(State.target.org);

  displayMeta.textContent = metaParts.length > 0 ? metaParts.join(' • ') : 'Enter identity details above';

  // Stats
  const foundAccounts = Object.values(State.matrixResults).filter(r => r.status === 'found').length;
  statAccounts.textContent = foundAccounts;

  const foundKeys = (State.cryptoResults.pgp ? State.cryptoResults.pgp.length : 0) +
    (State.cryptoResults.github?.gpg_keys ? State.cryptoResults.github.gpg_keys.length : 0);
  statKeys.textContent = foundKeys;

  const breachCount = State.auditLogs.filter(l => l.category === 'Leaked Credential').length;
  statBreaches.textContent = breachCount;

  statFindings.textContent = State.auditLogs.length;

  // Update audit badge
  const tabBadge = document.getElementById('tab-audit-badge');
  if (tabBadge) tabBadge.textContent = State.auditLogs.length;
}

// -------------------------------------------------------------
// Permutations Generator
// -------------------------------------------------------------
function setupPermutations() {
  const btnGen = document.getElementById('btn-gen-perms');
  btnGen.addEventListener('click', generateHandlePermutations);
}

function generateHandlePermutations() {
  let first = (State.target.firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let middle = (State.target.middleName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let last = (State.target.lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const chipsContainer = document.getElementById('permutations-chips');

  if ((!first || !last) && State.target.name) {
    const parsed = splitFullName(State.target.name);
    if (parsed.firstName && parsed.lastName) {
      first = parsed.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      middle = parsed.middleName.toLowerCase().replace(/[^a-z0-9]/g, '');
      last = parsed.lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  }

  if (!first && !last) {
    chipsContainer.innerHTML = '<span class="empty-hint">Enter First and Last name above to permute</span>';
    return;
  }
  if (!first || !last) {
    chipsContainer.innerHTML = '<span class="empty-hint">Need both First and Last name to permute</span>';
    return;
  }

  const initialF = first[0] || '';
  const initialL = last[0] || '';
  const initialM = middle ? middle[0] : '';

  const perms = [
    `${first}${last}`,
    `${first}.${last}`,
    `${first}_${last}`,
    `${first}-${last}`,
    `${initialF}${last}`,
    `${initialF}.${last}`,
    `${initialF}_${last}`
  ];

  if (initialM) {
    perms.push(
      `${initialF}${initialM}${last}`,
      `${first}.${initialM}.${last}`,
      `${first}_${initialM}_${last}`,
      `${first}${initialM}${last}`,
      `${last}${initialF}${initialM}`
    );
  }

  perms.push(
    `${first}${initialL}`,
    `${first}.${initialL}`,
    `${last}${first}`,
    `${last}.${first}`,
    `${last}_${first}`,
    `${last}${initialF}`,
    `${first}${last}99`,
    `${first}${last}1`,
    `${initialF}${last}01`
  );

  chipsContainer.innerHTML = '';
  perms.forEach(p => {
    const chip = document.createElement('span');
    chip.className = 'perm-chip';
    chip.textContent = p;
    chip.title = `Click to set primary handle to '@${p}'`;
    chip.addEventListener('click', () => {
      document.getElementById('target-handle').value = p;
      State.target.handle = p;
      updateTargetCard();
      saveStoredData();
      showToast(`Set handle to: @${p}`);
      renderMatrixGrid();
    });
    chipsContainer.appendChild(chip);
  });
}

// -------------------------------------------------------------
// Guided Audit Methodology Checklist
// -------------------------------------------------------------
function setupMethodologyChecklist() {
  const stepActions = {
    1: () => {
      switchTab('tab-identity');
      const fInput = document.getElementById('target-first-name');
      if (fInput) {
        fInput.focus();
        fInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    2: () => switchTab('tab-matrix'),
    3: () => switchTab('tab-crypto'),
    4: () => switchTab('tab-breach'),
    5: () => switchTab('tab-dorks'),
    6: () => switchTab('tab-records'),
    7: () => {
      if (State.auditMode === 'self') {
        switchTab('tab-privacy');
        markStep(7, true);
      } else {
        switchTab('tab-dossier');
      }
    }
  };

  // Card-level click handlers for seamless navigation
  for (let i = 1; i <= 7; i++) {
    const card = document.getElementById(`step-${i}-card`);
    const btn = document.getElementById(`step-btn-${i}`);
    if (card) {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.step-help-btn')) return;
        if (stepActions[i]) stepActions[i]();
      });
    }
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (stepActions[i]) stepActions[i]();
      });
    }
  }

  // Minimize / Expand Checklist
  const btnToggle = document.getElementById('btn-toggle-checklist');
  const checklistSteps = document.getElementById('checklist-steps');
  if (btnToggle && checklistSteps) {
    btnToggle.addEventListener('click', () => {
      if (checklistSteps.style.display === 'none') {
        checklistSteps.style.display = 'grid';
        btnToggle.textContent = 'Minimize';
      } else {
        checklistSteps.style.display = 'none';
        btnToggle.textContent = 'Expand';
      }
    });
  }

  // Step Help Modals
  document.querySelectorAll('.step-help-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stepNum = btn.getAttribute('data-step');
      openStepModal(stepNum);
    });
  });

  // Modal Close
  const btnCloseStepModal = document.getElementById('btn-close-step-modal');
  if (btnCloseStepModal) {
    btnCloseStepModal.addEventListener('click', () => {
      const modal = document.getElementById('step-modal');
      if (modal) modal.style.display = 'none';
    });
  }
}

function openStepModal(stepNum) {
  let step = STEP_EXPLANATIONS[stepNum];
  if (stepNum === '7' && State.auditMode === 'self') {
    step = {
      title: 'Step 5: Clean Up & Opt-Out Desk',
      what: 'Submit official search engine de-indexing requests for personal PII, delist from major consumer data brokers, rotate exposed passwords, and download your personal privacy action checklist.',
      why: 'Auditing your identity is only the diagnostic phase. Directly delisting personal information permanently reduces your attack surface and eliminates unwanted public exposure.',
      opsec: 'All takedown and opt-out links connect directly to official consumer privacy portals. Visage stores zero telemetry.'
    };
  }
  if (!step) return;

  document.getElementById('modal-step-title').textContent = step.title;
  const body = document.getElementById('modal-step-body');
  body.innerHTML = `
    <div class="modal-desc-item">
      <div class="modal-desc-title">🎯 What is this step?</div>
      <div class="modal-desc-text">${escapeHtml(step.what)}</div>
    </div>
    <div class="modal-desc-item">
      <div class="modal-desc-title">💡 Why is it essential for identity OSINT?</div>
      <div class="modal-desc-text">${escapeHtml(step.why)}</div>
    </div>
    <div class="modal-desc-item">
      <div class="modal-desc-title">🛡️ Zero-Touch OPSEC & Ethics Standard</div>
      <div class="modal-desc-text">${escapeHtml(step.opsec)}</div>
    </div>
  `;
  document.getElementById('step-modal').style.display = 'flex';
}

function markStep(stepNum, completed = true) {
  State.stepProgress[stepNum] = completed;
  updateMethodologyChecklistUI();
  saveStoredData();
}

function updateMethodologyChecklistUI() {
  for (let i = 1; i <= 7; i++) {
    const card = document.getElementById(`step-${i}-card`);
    const status = document.getElementById(`step-${i}-status`);
    if (State.stepProgress[i]) {
      if (card) {
        card.classList.add('completed-step');
        card.classList.remove('active-step');
      }
      if (status) status.textContent = '✔';
    } else {
      if (card) card.classList.remove('completed-step');
      if (status) status.textContent = '⏳';
    }
  }

  const progressText = document.getElementById('checklist-progress-text');
  if (progressText) {
    if (State.auditMode === 'self') {
      const selfSteps = [1, 2, 4, 5, 7];
      const doneCount = selfSteps.filter(s => State.stepProgress[s]).length;
      progressText.textContent = `${doneCount} / 5 Done`;
      if (doneCount === 5) {
        progressText.style.background = '#10b981';
        progressText.style.color = '#fff';
      } else {
        progressText.style.background = '';
        progressText.style.color = '';
      }
    } else {
      let doneCount = 0;
      for (let i = 1; i <= 7; i++) {
        if (State.stepProgress[i]) doneCount++;
      }
      progressText.textContent = `${doneCount} / 7 Done`;
      if (doneCount === 7) {
        progressText.style.background = '#f59e0b';
        progressText.style.color = '#fff';
      } else {
        progressText.style.background = '';
        progressText.style.color = '';
      }
    }
  }
}

function updateMatrixCategoryCounts() {
  const counts = { all: PLATFORMS.length, dev: 0, social: 0, chat: 0, media: 0, gaming: 0 };
  PLATFORMS.forEach(p => {
    if (counts[p.cat] !== undefined) counts[p.cat]++;
  });
  const labels = {
    all: `All (${counts.all})`,
    dev: `Developer (${counts.dev})`,
    social: `Social & Microblog (${counts.social})`,
    chat: `Messaging & Forums (${counts.chat})`,
    media: `Media & Creative (${counts.media})`,
    gaming: `Gaming & Misc (${counts.gaming})`
  };
  document.querySelectorAll('#matrix-category-chips .cat-chip').forEach(chip => {
    const cat = chip.getAttribute('data-cat');
    if (labels[cat]) {
      chip.textContent = labels[cat];
    }
  });
}

// -------------------------------------------------------------
// STEP 2: USERNAME & ALIAS MATRIX
// -------------------------------------------------------------
function setupMatrixTab() {
  updateMatrixCategoryCounts();

  // Category chips
  const chips = document.querySelectorAll('.cat-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderMatrixGrid();
    });
  });

  // Search input & found filter
  document.getElementById('matrix-search-input').addEventListener('input', renderMatrixGrid);
  document.getElementById('matrix-filter-found').addEventListener('change', renderMatrixGrid);

  // Scan All Button
  document.getElementById('btn-matrix-check-all').addEventListener('click', runMatrixScan);

  // Deep Scan Toggle and Explainer Modal
  const btnDeepToggle = document.getElementById('btn-deep-scan-toggle');
  const btnBannerDeep = document.getElementById('btn-banner-deep-scan');
  const modalDeep = document.getElementById('modal-deep-scan');
  const btnCloseModal = document.getElementById('btn-close-deep-scan-modal');
  const btnKeepStandard = document.getElementById('btn-deep-scan-keep-standard');
  const btnGrant = document.getElementById('btn-deep-scan-grant');

  if (btnDeepToggle) {
    btnDeepToggle.addEventListener('click', () => {
      if (State.deepScanActive) {
        if (confirm('Deep Scan is currently active across 140+ platforms. Revoke host permissions and return to Standard Mode (22 open APIs)?')) {
          revokeDeepScanPermission();
        }
      } else {
        openDeepScanModal();
      }
    });
  }

  if (btnBannerDeep) {
    btnBannerDeep.addEventListener('click', () => {
      if (State.deepScanActive) {
        if (confirm('Revoke host permissions and return to Standard Mode?')) {
          revokeDeepScanPermission();
        }
      } else {
        openDeepScanModal();
      }
    });
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeDeepScanModal);
  }

  if (btnKeepStandard) {
    btnKeepStandard.addEventListener('click', () => {
      closeDeepScanModal();
      showToast('Standard Mode active (22 open APIs automated)', 'info');
    });
  }

  if (btnGrant) {
    btnGrant.addEventListener('click', async () => {
      await requestDeepScanPermission();
    });
  }

  if (modalDeep) {
    modalDeep.addEventListener('click', (e) => {
      if (e.target === modalDeep) {
        closeDeepScanModal();
      }
    });
  }

  // Copy Found URLs
  document.getElementById('btn-matrix-copy-found').addEventListener('click', () => {
    const foundUrls = Object.values(State.matrixResults)
      .filter(r => r.status === 'found')
      .map(r => r.url);

    if (foundUrls.length === 0) {
      showToast('No confirmed profiles found yet', false);
      return;
    }

    navigator.clipboard.writeText(foundUrls.join('\n'));
    showToast(`Copied ${foundUrls.length} profile URLs to clipboard`);
  });

  // Open Found URLs (Staggered to prevent rate-limiting)
  const btnMatrixOpenFound = document.getElementById('btn-matrix-open-found');
  if (btnMatrixOpenFound) {
    btnMatrixOpenFound.addEventListener('click', () => {
      const foundUrls = Object.values(State.matrixResults)
        .filter(r => r.status === 'found')
        .map(r => r.url);

      if (foundUrls.length === 0) {
        showToast('No confirmed profiles found yet. Run scan or mark hits first.', 'warning', 3500);
        return;
      }

      openStaggeredTabs(foundUrls, 350);
      markStep(2, true);
    });
  }

  // Add Found to Dossier
  document.getElementById('btn-matrix-add-audit').addEventListener('click', () => {
    const foundItems = Object.values(State.matrixResults).filter(r => r.status === 'found');
    if (foundItems.length === 0) {
      showToast('No confirmed profiles found to log', false);
      return;
    }

    let added = 0;
    foundItems.forEach(item => {
      if (!State.auditLogs.some(l => l.url === item.url)) {
        State.auditLogs.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
          target: State.target.name || State.target.handle || 'Unknown Target',
          title: `${item.platform} Profile: @${State.target.handle}`,
          category: 'Discovered Account',
          severity: 'medium',
          status: 'confirmed',
          url: item.url,
          notes: `Verified public presence on ${item.platform}.`,
          timestamp: new Date().toISOString()
        });
        added++;
      }
    });

    saveStoredData();
    renderAuditLogs();
    updateTargetCard();
    markStep(2, true);
    showToast(`Added ${added} accounts to dossier`);
  });
}

function renderMatrixGrid() {
  const container = document.getElementById('matrix-grid');
  if (!container) return;

  const activeCat = document.querySelector('.cat-chip.active')?.getAttribute('data-cat') || 'all';
  const searchTerm = document.getElementById('matrix-search-input')?.value.toLowerCase().trim() || '';
  const filterFoundOnly = document.getElementById('matrix-filter-found')?.checked || false;

  const currentHandle = State.target.handle || 'target';

  const filtered = PLATFORMS.filter(p => {
    if (activeCat !== 'all' && p.cat !== activeCat) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm)) return false;
    if (filterFoundOnly) {
      const res = State.matrixResults[p.name];
      if (!res || res.status !== 'found') return false;
    }
    return true;
  });

  filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">No matching platforms found.</div>';
    return;
  }

  container.innerHTML = filtered.map(p => {
    const targetUrl = p.url.replace('{}', encodeURIComponent(currentHandle));
    const result = State.matrixResults[p.name] || { status: 'unchecked' };

    let statusClass = 'status-unchecked';
    let statusText = 'Unchecked';

    if (result.status === 'found') {
      statusClass = 'status-found';
      statusText = 'Hit / Taken';
    } else if (result.status === 'available') {
      statusClass = 'status-available';
      statusText = 'Available';
    } else if (result.status === 'checking') {
      statusClass = 'status-checking';
      statusText = 'Checking...';
    } else if (result.status === 'error') {
      statusClass = 'status-error';
      statusText = 'Review Link';
    }

    const cardClass = result.status === 'found' ? 'found' : (result.status === 'available' ? 'available' : '');

    return `
      <div class="platform-card ${cardClass}" data-platform="${escapeHtml(p.name)}">
        <div class="platform-header">
          <div class="platform-identity">
            <span class="platform-icon">${p.icon}</span>
            <span class="platform-name">${escapeHtml(p.name)}</span>
          </div>
          <span class="status-pill ${statusClass}">${statusText}</span>
        </div>
        <a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener noreferrer" class="platform-url" title="${escapeHtml(targetUrl)}">
          ${escapeHtml(targetUrl)}
        </a>
        <div class="platform-actions">
          <button type="button" class="btn-micro btn-inspect-platform" data-url="${escapeHtml(targetUrl)}">Open Tab</button>
          <button type="button" class="btn-micro btn-log-platform" data-platform="${escapeHtml(p.name)}" data-url="${escapeHtml(targetUrl)}">Log Hit</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  container.querySelectorAll('.btn-inspect-platform').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.getAttribute('data-url');
      browser.tabs.create({ url });
    });
  });

  container.querySelectorAll('.btn-log-platform').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const platform = btn.getAttribute('data-platform');
      const url = btn.getAttribute('data-url');
      logManualHit(platform, url);
    });
  });
}

function logManualHit(platform, url) {
  State.matrixResults[platform] = { platform, status: 'found', url };

  if (!State.auditLogs.some(l => l.url === url)) {
    State.auditLogs.push({
      id: Date.now().toString(),
      target: State.target.name || State.target.handle || 'Unknown Target',
      title: `${platform} Account: @${State.target.handle || 'unknown'}`,
      category: 'Discovered Account',
      severity: 'medium',
      status: 'confirmed',
      url: url,
      notes: `Manually confirmed public account on ${platform}.`,
      timestamp: new Date().toISOString()
    });
  }

  saveStoredData();
  renderMatrixGrid();
  renderAuditLogs();
  updateTargetCard();
  markStep(2, true);
  showToast(`Logged ${platform} hit to dossier`);
}

function openDeepScanModal() {
  const modal = document.getElementById('modal-deep-scan');
  if (modal) modal.style.display = 'flex';
}

function closeDeepScanModal() {
  const modal = document.getElementById('modal-deep-scan');
  if (modal) modal.style.display = 'none';
}

async function checkDeepScanPermission() {
  if (typeof browser !== 'undefined' && browser.permissions && browser.permissions.contains) {
    try {
      const granted = await browser.permissions.contains({ origins: ['<all_urls>'] });
      State.deepScanActive = !!granted;
      updateDeepScanUI();
      return !!granted;
    } catch (_) {}
  }
  State.deepScanActive = false;
  updateDeepScanUI();
  return false;
}

function updateDeepScanUI() {
  const banner = document.getElementById('deep-scan-banner');
  const badge = document.getElementById('deep-scan-badge');
  const text = document.getElementById('deep-scan-text');
  const bannerBtn = document.getElementById('btn-banner-deep-scan');
  const toggleBtn = document.getElementById('btn-deep-scan-toggle');

  if (State.deepScanActive) {
    if (banner) {
      banner.classList.remove('standard-mode');
      banner.classList.add('deep-mode');
    }
    if (badge) {
      badge.textContent = '⚡ DEEP SCAN ACTIVE';
    }
    if (text) {
      text.innerHTML = '<strong>140+ platforms automated via local direct probing</strong> (100% client-side, zero external servers or proxies).';
    }
    if (bannerBtn) {
      bannerBtn.textContent = 'Revoke Permission';
      bannerBtn.style.background = 'rgba(239, 68, 68, 0.15)';
      bannerBtn.style.borderColor = '#ef4444';
      bannerBtn.style.color = '#fca5a5';
    }
    if (toggleBtn) {
      toggleBtn.textContent = '⚡ Deep Scan Active';
      toggleBtn.classList.add('btn-deep-active');
      toggleBtn.title = 'Deep Scan is active across 140+ platforms. Click to revoke permissions.';
    }
  } else {
    if (banner) {
      banner.classList.remove('deep-mode');
      banner.classList.add('standard-mode');
    }
    if (badge) {
      badge.textContent = 'STANDARD MODE';
    }
    if (text) {
      text.innerHTML = '<strong>22 Open APIs automated out-of-the-box</strong> (zero permissions required). Probing all 140+ platforms requires optional local browser permissions.';
    }
    if (bannerBtn) {
      bannerBtn.textContent = '⚡ Unlock Deep Scan (140+ Platforms)';
      bannerBtn.style.background = 'rgba(6, 182, 212, 0.15)';
      bannerBtn.style.borderColor = '#06b6d4';
      bannerBtn.style.color = '#67e8f9';
    }
    if (toggleBtn) {
      toggleBtn.textContent = '⚡ Enable Deep Scan';
      toggleBtn.classList.remove('btn-deep-active');
      toggleBtn.title = 'Configure Automated Deep Scan across 140+ platforms';
    }
  }
}

async function requestDeepScanPermission() {
  closeDeepScanModal();
  if (typeof browser !== 'undefined' && browser.permissions && browser.permissions.request) {
    try {
      const granted = await browser.permissions.request({ origins: ['<all_urls>'] });
      if (granted) {
        State.deepScanActive = true;
        updateDeepScanUI();
        showToast('⚡ Deep Scan unlocked! 140+ platforms now automated locally.');
        if (State.target.handle) {
          runMatrixScan();
        }
        return true;
      } else {
        showToast('Permission declined. Standard Mode active (22 open APIs).', false);
      }
    } catch (err) {
      console.error('Permission request failed:', err);
      showToast('Permission request cancelled or unsupported.', false);
    }
  }
  State.deepScanActive = false;
  updateDeepScanUI();
  return false;
}

async function revokeDeepScanPermission() {
  if (typeof browser !== 'undefined' && browser.permissions && browser.permissions.remove) {
    try {
      await browser.permissions.remove({ origins: ['<all_urls>'] });
      State.deepScanActive = false;
      updateDeepScanUI();
      showToast('Permissions revoked. Returned to Standard Mode (22 open APIs).');
      return;
    } catch (err) {
      console.error('Failed to revoke permission:', err);
    }
  }
  State.deepScanActive = false;
  updateDeepScanUI();
}

async function checkPlatformPresence(p, handle, deepScanActive) {
  const targetUrl = p.url.replace('{}', encodeURIComponent(handle));

  // 1. If platform has an open API endpoint, check it (works in both Standard & Deep Scan)
  if (p.checkUrl) {
    try {
      const queryUrl = p.checkUrl.replace('{}', encodeURIComponent(handle));
      const resp = await fetch(queryUrl, { cache: 'no-store' });

      if (p.checkMode === 'json_status') {
        if (resp.status === 200) return { platform: p.name, status: 'found', url: targetUrl };
        if (resp.status === 404 || resp.status === 400) return { platform: p.name, status: 'available', url: targetUrl };
        return { platform: p.name, status: 'error', url: targetUrl };
      }

      if (p.checkMode === 'json_val') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.id ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'keybase') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.them && val.them.length > 0 && val.them[0] ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'devto') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.username ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'wikipedia') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.query && val.query.users && val.query.users[0] && val.query.users[0].userid ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'bsky') {
        if (resp.status === 200) return { platform: p.name, status: 'found', url: targetUrl };
        if (resp.status === 400 || resp.status === 404) return { platform: p.name, status: 'available', url: targetUrl };
        return { platform: p.name, status: 'error', url: targetUrl };
      }

      if (p.checkMode === 'npm') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.total > 0 ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'packagist') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.packageNames && val.packageNames.length > 0 ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'gitlab') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return Array.isArray(val) && val.length > 0 ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'gravatar') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.entry && val.entry.length > 0 ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'rubygems') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return Array.isArray(val) && val.length > 0 ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'wakatime') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.data ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      if (p.checkMode === 'archive') {
        if (resp.status === 200) {
          const val = await resp.json().catch(() => null);
          return val && val.response && val.response.numFound > 0 ? { platform: p.name, status: 'found', url: targetUrl } : { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }
    } catch (_) {
      return { platform: p.name, status: 'error', url: targetUrl };
    }
  }

  // 2. If platform does NOT have an open API:
  // If Deep Scan is NOT active, mark as 'unchecked' with 1-click manual verification
  if (!deepScanActive) {
    return { platform: p.name, status: 'unchecked', url: targetUrl };
  }

  // 3. Deep Scan is active: probe URL via background worker or fetch
  const probeTarget = (p.probeUrl || p.url).replace('{}', encodeURIComponent(handle));
  try {
    let probeResult = null;
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
      probeResult = await browser.runtime.sendMessage({
        type: 'CHECK_URL',
        url: probeTarget,
        timeout: 4000
      }).catch(() => null);
    }

    if (!probeResult || !probeResult.ok) {
      // Fallback to direct fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch(probeTarget, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);
      const bodySnippet = await resp.text().catch(() => '');
      probeResult = {
        ok: true,
        status: resp.status,
        redirected: resp.redirected,
        url: resp.url,
        bodySnippet: bodySnippet.slice(0, 10000)
      };
    }

    if (probeResult && probeResult.ok) {
      const { status, bodySnippet } = probeResult;

      // Check specific error strings if defined
      if (p.errorString && bodySnippet && bodySnippet.includes(p.errorString)) {
        return { platform: p.name, status: 'available', url: targetUrl };
      }
      if (p.matchString && bodySnippet && bodySnippet.includes(p.matchString)) {
        return { platform: p.name, status: 'found', url: targetUrl };
      }

      // Check Steam profile
      if (p.probeRule === 'steam') {
        if (status === 200 && !bodySnippet.includes('The specified profile could not be found')) {
          return { platform: p.name, status: 'found', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      // Check Telegram
      if (p.probeRule === 'telegram') {
        if (status === 200 && !bodySnippet.includes('noindex, nofollow')) {
          return { platform: p.name, status: 'found', url: targetUrl };
        }
        return { platform: p.name, status: 'available', url: targetUrl };
      }

      // Standard status checks
      if (status === 200) {
        const lowerBody = (bodySnippet || '').toLowerCase();
        if (lowerBody.includes('<title>404') || lowerBody.includes('page not found') || lowerBody.includes('user not found')) {
          return { platform: p.name, status: 'available', url: targetUrl };
        }
        return { platform: p.name, status: 'found', url: targetUrl };
      } else if (status === 404 || status === 410) {
        return { platform: p.name, status: 'available', url: targetUrl };
      } else {
        return { platform: p.name, status: 'error', url: targetUrl };
      }
    }
  } catch (_) {
    return { platform: p.name, status: 'error', url: targetUrl };
  }

  return { platform: p.name, status: 'unchecked', url: targetUrl };
}

async function runMatrixScan() {
  const handle = State.target.handle.trim();
  if (!handle) {
    showToast('Please enter a username handle in the Scope panel first', false);
    return;
  }

  // Refresh permissions status before scanning
  await checkDeepScanPermission();

  const statusBar = document.getElementById('matrix-status-bar');
  const statusText = document.getElementById('matrix-status-text');
  const progressCount = document.getElementById('matrix-progress-count');
  const progressFill = document.getElementById('matrix-progress-fill');

  statusBar.style.display = 'flex';
  const total = PLATFORMS.length;
  let processed = 0;
  let foundCount = 0;

  // Concurrency pool of 6 parallel workers
  const concurrency = 6;
  const queue = [...PLATFORMS];

  async function worker() {
    while (queue.length > 0) {
      const p = queue.shift();
      statusText.textContent = `Probing ${p.name}...`;

      const result = await checkPlatformPresence(p, handle, State.deepScanActive);
      State.matrixResults[p.name] = result;
      if (result.status === 'found') foundCount++;

      processed++;
      progressCount.textContent = `${processed} / ${total}`;
      progressFill.style.width = `${Math.round((processed / total) * 100)}%`;
      renderMatrixGrid();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, PLATFORMS.length) }, () => worker());
  await Promise.all(workers);

  if (State.deepScanActive) {
    statusText.textContent = `⚡ Deep scan completed across 142 platforms. Confirmed hits: ${foundCount}`;
  } else {
    statusText.textContent = `Standard scan completed (22 open APIs checked). Confirmed hits: ${foundCount}.`;
  }

  markStep(2, true);
  updateTargetCard();
  saveStoredData();
}

// -------------------------------------------------------------
// STEP 3: CRYPTOGRAPHIC IDENTITY
// -------------------------------------------------------------
function setupCryptoTab() {
  const input = document.getElementById('crypto-query-input');
  const btnAll = document.getElementById('btn-fetch-crypto');
  const btnPgp = document.getElementById('btn-query-pgp');
  const btnKeybase = document.getElementById('btn-query-keybase');
  const btnGithub = document.getElementById('btn-query-github-keys');

  const getQuery = () => input.value.trim() || State.target.email || State.target.name || State.target.handle;

  btnPgp.addEventListener('click', () => queryOpenPGP(getQuery()));
  btnKeybase.addEventListener('click', () => queryKeybase(State.target.handle || getQuery()));
  btnGithub.addEventListener('click', () => queryGitHub(State.target.handle || getQuery()));

  btnAll.addEventListener('click', async () => {
    const q = getQuery();
    if (!q) {
      showToast('Enter name, email, or handle to query cryptographic registries', false);
      return;
    }
    await Promise.allSettled([
      queryOpenPGP(q),
      queryKeybase(State.target.handle || q),
      queryGitHub(State.target.handle || q)
    ]);
    markStep(3, true);
  });
}

async function queryOpenPGP(query) {
  if (!query) return;
  const status = document.getElementById('crypto-status');
  const container = document.getElementById('pgp-results-container');
  const countBadge = document.getElementById('pgp-keys-count');
  const serverChoice = document.getElementById('crypto-server-select').value;

  status.textContent = 'Querying OpenPGP Keyserver...';
  status.style.color = '#c084fc';

  const host = serverChoice === 'surf' ? 'https://pgp.surf.nl' : 'https://keyserver.ubuntu.com';
  const url = `${host}/pks/lookup?search=${encodeURIComponent(query)}&op=index&options=mr`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 404) {
        status.textContent = 'No PGP keys found for this query.';
        status.style.color = '#94a3b8';
        container.innerHTML = '<div class="empty-state">No matching public PGP keys returned from keyserver.</div>';
        countBadge.textContent = '0 keys';
        return;
      }
      if (resp.status === 429 || resp.status === 503) {
        status.textContent = `⚠️ Keyserver rate limit or temporary server load (HTTP ${resp.status}). Wait a moment.`;
        status.style.color = '#f59e0b';
        showToast(`⚠️ PGP Keyserver rate-limited or busy (HTTP ${resp.status}). Try SURFnet server or wait.`, 'warning', 5000);
        return;
      }
      throw new Error(`Keyserver error: HTTP ${resp.status}`);
    }

    const text = await resp.text();
    const keys = parseMachineReadablePGP(text);
    State.cryptoResults.pgp = keys;

    status.textContent = `Successfully retrieved ${keys.length} PGP key(s).`;
    status.style.color = '#10b981';
    countBadge.textContent = `${keys.length} keys`;

    renderPGPKeys(keys);
    updateTargetCard();
    markStep(3, true);
  } catch (err) {
    status.textContent = `PGP query failed: ${err.message}`;
    status.style.color = '#ef4444';
  }
}

// Parser for standard Machine-Readable (MR) OpenPGP index
function parseMachineReadablePGP(raw) {
  const lines = raw.split('\n');
  const keys = [];
  let currentKey = null;

  for (const line of lines) {
    const parts = line.trim().split(':');
    const type = parts[0];

    if (type === 'pub') {
      if (currentKey) keys.push(currentKey);
      const keyId = parts[1] || '';
      const algo = parts[2] || '';
      const keyLen = parts[3] || '';
      const createdUnix = parseInt(parts[4], 10);
      const expiresUnix = parseInt(parts[5], 10);

      currentKey = {
        keyId,
        algo,
        keyLen,
        created: createdUnix ? new Date(createdUnix * 1000).toISOString().split('T')[0] : 'Unknown',
        expires: expiresUnix ? new Date(expiresUnix * 1000).toISOString().split('T')[0] : 'None',
        flags: parts[6] || '',
        uids: []
      };
    } else if (type === 'uid' && currentKey) {
      // uid format: uid:escaped_uid_string:creationdate:expirationdate:flags
      const rawUid = parts[1] || '';
      const decodedUid = decodeURIComponent(rawUid.replace(/\\x([0-9A-Fa-f]{2})/g, '%$1'));

      // Extract email from UID
      const emailMatch = decodedUid.match(/<([^>]+)>/);
      const email = emailMatch ? emailMatch[1] : '';

      currentKey.uids.push({
        raw: decodedUid,
        email: email
      });
    }
  }

  if (currentKey) keys.push(currentKey);
  return keys;
}

function renderPGPKeys(keys) {
  const container = document.getElementById('pgp-results-container');
  if (!keys || keys.length === 0) {
    container.innerHTML = '<div class="empty-state">No PGP keys found.</div>';
    return;
  }

  container.innerHTML = keys.map(k => `
    <div class="pgp-key-card">
      <div class="pgp-key-top">
        <div>
          <span class="pgp-key-id">Key ID: 0x${escapeHtml(k.keyId)}</span>
          <span class="text-muted text-xs">(${escapeHtml(k.keyLen)} bit / Created: ${escapeHtml(k.created)} / Expires: ${escapeHtml(k.expires)})</span>
        </div>
        <button type="button" class="btn-micro btn-pgp-to-audit" data-keyid="${escapeHtml(k.keyId)}">Add Key to Dossier</button>
      </div>
      <div class="pgp-user-ids">
        ${k.uids.map(u => `
          <div class="pgp-uid">
            <div>
              <span>${escapeHtml(u.raw)}</span>
              ${u.email ? `<code class="uid-email">&lt;${escapeHtml(u.email)}&gt;</code>` : ''}
            </div>
            <div class="uid-actions">
              ${u.email ? `<button type="button" class="btn-micro btn-use-email" data-email="${escapeHtml(u.email)}" title="Adopt as target email">Use Email</button>` : ''}
              <button type="button" class="btn-micro btn-uid-to-audit" data-uid="${escapeHtml(u.raw)}" data-keyid="${escapeHtml(k.keyId)}">Log Identity</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Attach buttons
  container.querySelectorAll('.btn-use-email').forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-email');
      document.getElementById('target-email').value = email;
      State.target.email = email;
      updateTargetCard();
      saveStoredData();
      showToast(`Adopted email: ${email}`);
    });
  });

  container.querySelectorAll('.btn-pgp-to-audit').forEach(btn => {
    btn.addEventListener('click', () => {
      const keyId = btn.getAttribute('data-keyid');
      const key = keys.find(k => k.keyId === keyId);
      if (key) {
        State.auditLogs.push({
          id: Date.now().toString(),
          target: State.target.name || State.target.email || 'Target',
          title: `OpenPGP Public Key: 0x${key.keyId}`,
          category: 'Cryptographic Key',
          severity: 'medium',
          status: 'confirmed',
          url: `https://keyserver.ubuntu.com/pks/lookup?search=0x${key.keyId}&op=vindex`,
          notes: `Created: ${key.created}. Associated UIDs: ${key.uids.map(u => u.raw).join('; ')}`,
          timestamp: new Date().toISOString()
        });
        saveStoredData();
        renderAuditLogs();
        updateTargetCard();
        showToast('Logged PGP key to dossier');
      }
    });
  });

  container.querySelectorAll('.btn-uid-to-audit').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      const keyId = btn.getAttribute('data-keyid');
      State.auditLogs.push({
        id: Date.now().toString(),
        target: State.target.name || State.target.email || 'Target',
        title: `PGP Identity Proof: ${uid}`,
        category: 'Cryptographic Key',
        severity: 'info',
        status: 'confirmed',
        url: `https://keyserver.ubuntu.com/pks/lookup?search=0x${keyId}&op=vindex`,
        notes: `Linked to PGP Key ID 0x${keyId}`,
        timestamp: new Date().toISOString()
      });
      saveStoredData();
      renderAuditLogs();
      updateTargetCard();
      showToast('Logged PGP UID to dossier');
    });
  });
}

async function queryKeybase(handle) {
  if (!handle) return;
  const card = document.getElementById('keybase-card');
  const badge = document.getElementById('keybase-username-badge');
  const body = document.getElementById('keybase-body');

  try {
    const url = `https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(handle)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 429) {
        card.style.display = 'block';
        badge.textContent = 'Rate Limited (429)';
        body.innerHTML = '<div style="background: rgba(245, 158, 11, 0.12); border: 1px solid #f59e0b; border-radius: 6px; padding: 0.8rem; color: #fbbf24; font-size: 0.8rem;">⚠️ Keybase API rate limit reached. Please wait a moment before querying again.</div>';
        showToast('⚠️ Keybase API rate limit reached. Please wait a moment.', 'warning', 4000);
      }
      return;
    }

    const data = await resp.json();
    if (!data.them || data.them.length === 0 || !data.them[0]) {
      card.style.display = 'none';
      return;
    }

    const user = data.them[0];
    State.cryptoResults.keybase = user;

    badge.textContent = `@${user.basics?.username || handle}`;
    card.style.display = 'block';

    const proofs = user.proofs_summary?.by_presentation_group || {};
    const cryptoAddresses = user.cryptocurrency_addresses || {};

    let proofsHtml = '';
    for (const [service, proofList] of Object.entries(proofs)) {
      if (Array.isArray(proofList)) {
        proofList.forEach(p => {
          proofsHtml += `
            <div class="proof-item">
              <span class="proof-type">${escapeHtml(service)}</span>
              <span class="proof-value">${escapeHtml(p.nametag || p.service_username || '')}</span>
              ${p.human_url ? `<a href="${escapeHtml(p.human_url)}" target="_blank" rel="noopener noreferrer" class="proof-url">Verify Proof ↗</a>` : ''}
            </div>
          `;
        });
      }
    }

    // Add crypto addresses
    for (const [coin, addrs] of Object.entries(cryptoAddresses)) {
      if (Array.isArray(addrs)) {
        addrs.forEach(a => {
          proofsHtml += `
            <div class="proof-item">
              <span class="proof-type">Crypto: ${escapeHtml(coin)}</span>
              <span class="proof-value">${escapeHtml(a.address || '')}</span>
            </div>
          `;
        });
      }
    }

    body.innerHTML = `
      <div class="proofs-grid">
        ${proofsHtml || '<div class="empty-hint">No external proofs linked to this Keybase profile.</div>'}
      </div>
    `;

    // Add to audit button
    document.getElementById('btn-keybase-to-audit').onclick = () => {
      State.auditLogs.push({
        id: Date.now().toString(),
        target: State.target.name || State.target.handle || 'Target',
        title: `Keybase Verified Identity: @${user.basics?.username || handle}`,
        category: 'Cryptographic Key',
        severity: 'high',
        status: 'confirmed',
        url: `https://keybase.io/${encodeURIComponent(handle)}`,
        notes: `Bio: ${user.profile?.bio || 'None'}. Full Name: ${user.profile?.full_name || 'None'}. Linked proofs: ${Object.keys(proofs).join(', ')}`,
        timestamp: new Date().toISOString()
      });
      saveStoredData();
      renderAuditLogs();
      updateTargetCard();
      showToast('Added Keybase proofs to dossier');
    };

    updateTargetCard();
    markStep(3, true);
  } catch (err) {
    console.error('Keybase query failed:', err);
  }
}

async function queryGitHub(handle) {
  if (!handle) return;
  const card = document.getElementById('github-card');
  const badge = document.getElementById('github-user-badge');
  const body = document.getElementById('github-body');

  try {
    const userUrl = `https://api.github.com/users/${encodeURIComponent(handle)}`;
    const keysUrl = `https://api.github.com/users/${encodeURIComponent(handle)}/gpg_keys`;
    const eventsUrl = `https://api.github.com/users/${encodeURIComponent(handle)}/events/public`;

    const [userResp, gpgResp, eventsResp] = await Promise.allSettled([
      fetch(userUrl),
      fetch(keysUrl),
      fetch(eventsUrl)
    ]);

    if (userResp.status === 'fulfilled' && userResp.value.status === 403) {
      card.style.display = 'block';
      badge.textContent = 'Rate Limited (403)';
      body.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid #f59e0b; border-radius: 6px; padding: 0.8rem; color: #fbbf24; font-size: 0.8rem;">
          <strong style="display: flex; align-items: center; gap: 0.4rem;">⚠️ GitHub API Rate Limit Reached</strong>
          <p style="margin: 0.4rem 0 0 0; color: #d1d5db; line-height: 1.4;">
            GitHub limits unauthenticated API requests to 60 per hour per IP. Visage could not query <code>@${escapeHtml(handle)}</code> right now without credentials.
          </p>
          <div style="margin-top: 0.6rem;">
            <a href="https://github.com/${encodeURIComponent(handle)}" target="_blank" rel="noopener noreferrer" class="btn-micro" style="text-decoration: none; color: #fff; background: #374151; padding: 4px 8px; border-radius: 4px;">Open Profile on GitHub ↗</a>
          </div>
        </div>
      `;
      showToast('⚠️ GitHub API rate limit reached (60 req/hr limit). Open profile directly.', 'warning', 5000);
      return;
    }

    if (userResp.status !== 'fulfilled' || !userResp.value.ok) {
      card.style.display = 'none';
      return;
    }

    const userData = await userResp.value.json();
    let gpgKeys = [];
    if (gpgResp.status === 'fulfilled' && gpgResp.value.ok) {
      gpgKeys = await gpgResp.value.json();
    }

    // Extract unlisted commit emails from public events!
    const commitEmails = new Set();
    if (eventsResp.status === 'fulfilled' && eventsResp.value.ok) {
      const events = await eventsResp.value.json();
      if (Array.isArray(events)) {
        events.forEach(ev => {
          if (ev.payload && ev.payload.commits) {
            ev.payload.commits.forEach(c => {
              if (c.author && c.author.email && !c.author.email.includes('users.noreply.github.com')) {
                commitEmails.add(c.author.email);
              }
            });
          }
        });
      }
    }

    State.cryptoResults.github = {
      user: userData,
      gpg_keys: gpgKeys,
      commit_emails: Array.from(commitEmails)
    };

    badge.textContent = `@${userData.login}`;
    card.style.display = 'block';

    const commitEmailsList = Array.from(commitEmails);

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        <div style="display: flex; gap: 0.8rem; align-items: center;">
          <img src="${escapeHtml(userData.avatar_url)}" width="42" height="42" style="border-radius: 50%; border: 1px solid var(--border);">
          <div>
            <strong>${escapeHtml(userData.name || userData.login)}</strong>
            <div class="text-muted text-xs">Bio: ${escapeHtml(userData.bio || 'None')} • Company: ${escapeHtml(userData.company || 'None')} • Location: ${escapeHtml(userData.location || 'None')}</div>
          </div>
        </div>

        ${commitEmailsList.length > 0 ? `
          <div style="background: #181928; padding: 0.5rem; border-radius: 4px;">
            <span class="text-xs" style="color: #c084fc; font-weight: 600;">🎯 Unlisted Git Commit Emails Extracted from Public Events:</span>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.3rem;">
              ${commitEmailsList.map(em => `
                <code class="uid-email" style="font-size: 0.72rem; cursor: pointer;" title="Click to adopt email">${escapeHtml(em)}</code>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${gpgKeys.length > 0 ? `
          <div class="text-xs" style="color: #94a3b8; margin-top: 0.3rem;">
            <strong>GitHub GPG Signing Keys (${gpgKeys.length}):</strong>
            <ul style="margin-left: 1.2rem; margin-top: 0.2rem;">
              ${gpgKeys.map(k => `<li>Key ID: <code>${escapeHtml(k.key_id)}</code> (Emails: ${escapeHtml(k.emails ? k.emails.map(e => e.email).join(', ') : 'None')})</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    // Click on extracted email to adopt
    body.querySelectorAll('.uid-email').forEach(el => {
      el.addEventListener('click', () => {
        const em = el.textContent;
        document.getElementById('target-email').value = em;
        State.target.email = em;
        updateTargetCard();
        saveStoredData();
        showToast(`Adopted commit email: ${em}`);
      });
    });

    // Add to audit button
    document.getElementById('btn-github-to-audit').onclick = () => {
      State.auditLogs.push({
        id: Date.now().toString(),
        target: State.target.name || State.target.handle || 'Target',
        title: `GitHub Developer Profile: @${userData.login}`,
        category: 'Discovered Account',
        severity: 'high',
        status: 'confirmed',
        url: userData.html_url,
        notes: `Name: ${userData.name}. Company: ${userData.company}. Extracted Commit Emails: ${commitEmailsList.join(', ')}`,
        timestamp: new Date().toISOString()
      });
      saveStoredData();
      renderAuditLogs();
      updateTargetCard();
      showToast('Added GitHub identity to dossier');
    };

    updateTargetCard();
    markStep(3, true);
  } catch (err) {
    console.error('GitHub query failed:', err);
  }
}

// -------------------------------------------------------------
// STEP 4: BREACH & EXPOSURE TELEMETRY
// -------------------------------------------------------------
function setupBreachTab() {
  const emailInput = document.getElementById('breach-email-input');
  const btnCheck = document.getElementById('btn-check-hibp-status');
  const btnAll = document.getElementById('btn-audit-breaches-all');

  const getEmail = () => emailInput.value.trim() || State.target.email;

  btnCheck.addEventListener('click', () => checkBreachStatus(getEmail()));
  btnAll.addEventListener('click', () => {
    checkBreachStatus(getEmail());
    markStep(4, true);
  });

  // External Breach Portals
  document.getElementById('btn-open-hibp').addEventListener('click', () => {
    const em = getEmail();
    browser.tabs.create({ url: em ? `https://haveibeenpwned.com/account/${encodeURIComponent(em)}` : 'https://haveibeenpwned.com/' });
  });

  document.getElementById('btn-open-hudsonrock').addEventListener('click', () => {
    const em = getEmail();
    browser.tabs.create({ url: em ? `https://cavalier.hudsonrock.com/search?email=${encodeURIComponent(em)}` : 'https://cavalier.hudsonrock.com/' });
  });

  document.getElementById('btn-open-breachdir').addEventListener('click', () => {
    const em = getEmail();
    browser.tabs.create({ url: em ? `https://breachdirectory.org/?q=${encodeURIComponent(em)}` : 'https://breachdirectory.org/' });
  });

  document.getElementById('btn-open-dehashed').addEventListener('click', () => {
    const em = getEmail();
    browser.tabs.create({ url: em ? `https://www.dehashed.com/search?query=${encodeURIComponent(em)}` : 'https://www.dehashed.com/' });
  });

  document.getElementById('btn-log-hibp').addEventListener('click', () => {
    const em = getEmail();
    if (!em) return showToast('Enter an email first', false);
    State.auditLogs.push({
      id: Date.now().toString(),
      target: State.target.name || em,
      title: `HaveIBeenPwned Review: ${em}`,
      category: 'Leaked Credential',
      severity: 'high',
      status: 'investigating',
      url: `https://haveibeenpwned.com/account/${encodeURIComponent(em)}`,
      notes: 'Investigating potential public credential exposure in known data breaches.',
      timestamp: new Date().toISOString()
    });
    saveStoredData();
    renderAuditLogs();
    updateTargetCard();
    markStep(4, true);
    showToast('Logged HIBP review to dossier');
  });

  document.getElementById('btn-log-hudsonrock').addEventListener('click', () => {
    const em = getEmail();
    if (!em) return showToast('Enter an email first', false);
    State.auditLogs.push({
      id: Date.now().toString(),
      target: State.target.name || em,
      title: `Hudson Rock Stealer Review: ${em}`,
      category: 'Leaked Credential',
      severity: 'critical',
      status: 'investigating',
      url: `https://cavalier.hudsonrock.com/search?email=${encodeURIComponent(em)}`,
      notes: 'Investigating potential infostealer malware exposure (RedLine/Vidar).',
      timestamp: new Date().toISOString()
    });
    saveStoredData();
    renderAuditLogs();
    updateTargetCard();
    markStep(4, true);
    showToast('Logged Infostealer review to dossier');
  });

  // k-Anonymity SHA-1 Password Hash Range Checker
  setupKAnonymityChecker();
}

async function checkBreachStatus(email) {
  if (!email) {
    showToast('Please enter an email address to check', false);
    return;
  }
  // Open HIBP or show direct guidance
  showToast(`Opening HIBP verification for ${email}`);
  browser.tabs.create({ url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}` });
}

function setupKAnonymityChecker() {
  const inputPwd = document.getElementById('input-kanon-pwd');
  const btnCheck = document.getElementById('btn-kanon-check');
  const resultDiv = document.getElementById('kanon-result');

  btnCheck.addEventListener('click', async () => {
    const pwd = inputPwd.value;
    if (!pwd) {
      resultDiv.textContent = 'Please enter a password to test.';
      resultDiv.style.color = '#ef4444';
      return;
    }

    resultDiv.textContent = 'Computing SHA-1 hash and checking k-Anonymity range...';
    resultDiv.style.color = '#c084fc';

    try {
      // 100% Client-side SHA-1 hashing via subtle crypto
      const enc = new TextEncoder().encode(pwd);
      const hashBuf = await crypto.subtle.digest('SHA-1', enc);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArr.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      // Only send 5 characters of hash to API
      const resp = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!resp.ok) {
        if (resp.status === 429) {
          throw new Error('Pwned Passwords API rate limit reached (HTTP 429). Please wait a few seconds.');
        }
        throw new Error(`HTTP ${resp.status}`);
      }

      const body = await resp.text();
      const lines = body.split('\n');

      let matchCount = 0;
      for (const line of lines) {
        const [h, count] = line.trim().split(':');
        if (h === suffix) {
          matchCount = parseInt(count, 10);
          break;
        }
      }

      if (matchCount > 0) {
        resultDiv.innerHTML = `<span style="color: #ef4444; font-weight: 700;">⚠️ PWNED:</span> This password has appeared in known leaks <strong>${matchCount.toLocaleString()}</strong> times!`;
      } else {
        resultDiv.innerHTML = `<span style="color: #10b981; font-weight: 700;">✔ SAFE:</span> Not found in 800M+ pwned passwords database.`;
      }
      markStep(4, true);
    } catch (err) {
      resultDiv.textContent = `Check failed: ${err.message}`;
      resultDiv.style.color = '#ef4444';
    }
  });
}

function renderPastesDorks() {
  const container = document.getElementById('pastes-grid');
  if (!container) return;

  const target = State.target.email || State.target.handle || State.target.name || 'target';

  const pastes = [
    { title: 'Pastebin Credentials Dork', query: `site:pastebin.com "${target}" (password | credential | hash | leak)` },
    { title: 'Ghostbin Dump Mentions', query: `site:ghostbin.com "${target}"` },
    { title: 'Rentry Markdown Pastes', query: `site:rentry.co "${target}"` },
    { title: 'JustPaste.it Dumps', query: `site:justpaste.it "${target}"` },
    { title: 'GitHub Gist Secrets', query: `site:gist.github.com "${target}"` },
    { title: 'PasteFS & Paste Dumps', query: `"${target}" (site:pastebin.com | site:pastefs.com | site:pastee.org)` }
  ];

  container.innerHTML = pastes.map(p => `
    <div class="paste-item">
      <span class="paste-title">${escapeHtml(p.title)}</span>
      <span class="paste-query">${escapeHtml(p.query)}</span>
      <div style="display: flex; gap: 0.35rem; margin-top: 0.3rem;">
        <button type="button" class="btn-micro btn-search-paste" data-query="${escapeHtml(p.query)}">Search Google</button>
        <button type="button" class="btn-micro btn-copy-paste" data-query="${escapeHtml(p.query)}">Copy Query</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-search-paste').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      browser.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(q)}&tbs=li:1` });
    });
  });

  container.querySelectorAll('.btn-copy-paste').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.getAttribute('data-query'));
      showToast('Copied paste search query');
    });
  });
}

// -------------------------------------------------------------
// STEP 5: PERSON-CENTRIC DORK COMPILER
// -------------------------------------------------------------
function setupDorkTab() {
  const presetSelect = document.getElementById('dork-preset-select');
  const nameInput = document.getElementById('df-name');
  const siteInput = document.getElementById('df-site');
  const filetypeInput = document.getElementById('df-filetype');
  const inurlInput = document.getElementById('df-inurl');
  const intitleInput = document.getElementById('df-intitle');
  const exactInput = document.getElementById('df-exact');
  const output = document.getElementById('dork-query-output');
  const tokenCount = document.getElementById('dork-token-count');

  // Populate presets dropdown
  DORK_PRESETS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.title;
    presetSelect.appendChild(opt);
  });

  const compileQuery = () => {
    const name = nameInput.value.trim();
    const site = siteInput.value.trim();
    const filetype = filetypeInput.value.trim();
    const inurl = inurlInput.value.trim();
    const intitle = intitleInput.value.trim();
    const exact = exactInput.value.trim();

    const parts = [];

    if (site) {
      const sites = site.split(',').map(s => s.trim()).filter(Boolean);
      if (sites.length === 1) parts.push(`site:${sites[0]}`);
      else if (sites.length > 1) parts.push(`(${sites.map(s => `site:${s}`).join(' OR ')})`);
    }

    if (filetype) {
      const fts = filetype.split(',').map(f => f.trim()).filter(Boolean);
      if (fts.length === 1) parts.push(`filetype:${fts[0]}`);
      else if (fts.length > 1) parts.push(`(${fts.map(f => `filetype:${f}`).join(' OR ')})`);
    }

    if (inurl) {
      const urls = inurl.split(',').map(u => u.trim()).filter(Boolean);
      urls.forEach(u => parts.push(`inurl:${u}`));
    }

    if (intitle) {
      const titles = intitle.split(',').map(t => t.trim()).filter(Boolean);
      titles.forEach(t => parts.push(`intitle:"${t}"`));
    }

    if (name) {
      parts.push(name.startsWith('"') ? name : `"${name}"`);
    }

    if (exact) {
      const exacts = exact.split(',').map(e => e.trim()).filter(Boolean);
      exacts.forEach(e => parts.push(e.startsWith('"') ? e : `"${e}"`));
    }

    const query = parts.join(' ').trim();
    output.value = query;

    const words = query ? query.split(/\s+/).length : 0;
    tokenCount.textContent = `${words} words`;
    return query;
  };

  [nameInput, siteInput, filetypeInput, inurlInput, intitleInput, exactInput].forEach(el => {
    el.addEventListener('input', compileQuery);
  });

  // Preset Selection
  presetSelect.addEventListener('change', () => {
    const selId = presetSelect.value;
    const preset = DORK_PRESETS.find(p => p.id === selId);
    const card = document.getElementById('dork-guidance-card');

    if (!preset) {
      card.style.display = 'none';
      return;
    }

    // Fill guidance card
    card.style.display = 'flex';
    document.getElementById('dork-risk-badge').textContent = preset.riskBadge;
    document.getElementById('dork-card-title').textContent = preset.title;
    document.getElementById('dork-what-leaks').textContent = preset.whatLeaks;
    document.getElementById('dork-true-positive').textContent = preset.truePositive;
    document.getElementById('dork-remediation').textContent = preset.remediation;

    // Prefill form
    nameInput.value = State.target.name ? `"${State.target.name}"` : '';
    siteInput.value = preset.site;
    filetypeInput.value = preset.filetype;
    inurlInput.value = preset.inurl;
    intitleInput.value = preset.intitle;
    exactInput.value = preset.exact;

    compileQuery();
  });

  // Time Chips
  document.querySelectorAll('.temporal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.temporal-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Search Action
  document.getElementById('btn-dork-search').addEventListener('click', () => {
    const query = compileQuery();
    if (!query) return showToast('Query is empty', false);

    const engine = document.querySelector('input[name="dork-engine"]:checked')?.value || 'google';
    const time = document.querySelector('.temporal-chip.active')?.getAttribute('data-time') || 'any';
    const verbatim = document.getElementById('dork-verbatim')?.checked || false;

    let searchUrl = '';

    if (engine === 'google') {
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      if (verbatim) searchUrl += '&tbs=li:1';
      if (time !== 'any') {
        const timeParam = time === 'd' ? 'qdr:d' : (time === 'w' ? 'qdr:w' : (time === 'm' ? 'qdr:m' : 'qdr:y'));
        searchUrl += (verbatim ? `,${timeParam}` : `&tbs=${timeParam}`);
      }
    } else if (engine === 'bing') {
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    } else if (engine === 'ddg') {
      searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    } else if (engine === 'brave') {
      searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
    } else if (engine === 'yandex') {
      searchUrl = `https://yandex.com/search/?text=${encodeURIComponent(query)}`;
    }

    browser.tabs.create({ url: searchUrl });
    markStep(5, true);
  });

  // Copy Query
  document.getElementById('btn-dork-copy').addEventListener('click', () => {
    const query = output.value;
    if (!query) return;
    navigator.clipboard.writeText(query);
    showToast('Copied query to clipboard');
  });

  // Reset Fields
  document.getElementById('btn-dork-reset').addEventListener('click', () => {
    nameInput.value = '';
    siteInput.value = '';
    filetypeInput.value = '';
    inurlInput.value = '';
    intitleInput.value = '';
    exactInput.value = '';
    output.value = '';
    tokenCount.textContent = '0 words';
    presetSelect.value = '';
    document.getElementById('dork-guidance-card').style.display = 'none';
  });

  // Send Dork to Dossier
  document.getElementById('btn-dork-to-audit').addEventListener('click', () => {
    const query = output.value;
    if (!query) return showToast('Query is empty', false);

    State.auditLogs.push({
      id: Date.now().toString(),
      target: State.target.name || 'Profile',
      title: `Footprint Query: ${query.substring(0, 50)}...`,
      category: 'Search Index Query',
      severity: 'medium',
      status: 'investigating',
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=li:1`,
      notes: `Compiled query: ${query}`,
      timestamp: new Date().toISOString()
    });

    saveStoredData();
    renderAuditLogs();
    updateTargetCard();
    markStep(5, true);
    showToast('Logged query to exposure report');
  });

  // Launch all library dorks (Staggered to prevent CAPTCHAs)
  const btnLaunchAllDorks = document.getElementById('btn-launch-all-dorks');
  if (btnLaunchAllDorks) {
    btnLaunchAllDorks.addEventListener('click', () => {
      const targetName = State.target.name || 'First Last';
      const targetEmail = State.target.email || 'target@example.com';
      const targetHandle = State.target.handle || 'handle';

      const urls = DORK_PRESETS.map(p => {
        const compiled = p.template
          .replace(/{name}/g, targetName)
          .replace(/{email}/g, targetEmail)
          .replace(/{handle}/g, targetHandle);
        return `https://www.google.com/search?q=${encodeURIComponent(compiled)}&tbs=li:1`;
      });

      openStaggeredTabs(urls, 450);
      markStep(5, true);
    });
  }
}

function renderDorkLibrary() {
  const container = document.getElementById('dork-library-list');
  if (!container) return;

  const targetName = State.target.name || 'First Last';
  const targetEmail = State.target.email || 'target@example.com';
  const targetHandle = State.target.handle || 'handle';

  container.innerHTML = DORK_PRESETS.map(p => {
    const compiled = p.template
      .replace(/{name}/g, targetName)
      .replace(/{email}/g, targetEmail)
      .replace(/{handle}/g, targetHandle);

    return `
      <div class="dork-card">
        <div class="dork-card-header">
          <span class="dork-card-title">${escapeHtml(p.title)}</span>
          <span class="risk-badge" style="font-size: 0.6rem;">${escapeHtml(p.riskBadge)}</span>
        </div>
        <div class="dork-card-query">${escapeHtml(compiled)}</div>
        <div class="dork-card-actions">
          <button type="button" class="btn-micro btn-launch-library-dork" data-query="${escapeHtml(compiled)}">Search Google</button>
          <button type="button" class="btn-micro btn-copy-library-dork" data-query="${escapeHtml(compiled)}">Copy</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-launch-library-dork').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      browser.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(q)}&tbs=li:1` });
      markStep(5, true);
    });
  });

  container.querySelectorAll('.btn-copy-library-dork').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.getAttribute('data-query'));
      showToast('Copied query to clipboard');
    });
  });
}


// -------------------------------------------------------------
// JURISDICTION & PUBLIC RECORDS ENGINE (ALL 50 US STATES + DC + PR)
// -------------------------------------------------------------
const US_STATES = {
  AL: { name: 'Alabama', defaultCounty: 'Jefferson County', domain: 'alabama.gov', courtName: 'Alabama Judicial System (AlaFile)', courtUrl: 'https://v2.alacourt.com/', courtDesc: 'Statewide trial and appellate civil/criminal case records.', corpName: 'Alabama SOS Business Entity Records', corpUrl: 'https://arc-sos.state.al.us/CGI/CORPNAME.MBR/INPUT', corpDesc: 'Corporations, LLCs, registered agents, and officer filings.', licenseName: 'Alabama Professional Licensing Boards', licenseUrl: 'https://www.alabamainteractive.org/license_search/', licenseDesc: 'Medical, nursing, engineering, and professional credentials.', inmateName: 'Alabama DOC Inmate Search', inmateUrl: 'http://www.doc.state.al.us/InmateSearch', inmateDesc: 'State prison population and parole status.', voterName: 'Alabama Secretary of State (Voter View)', voterUrl: 'https://myinfo.alabamavotes.gov/voterview', voterDesc: 'Check active voter registration status, polling precinct, and county absentee election manager.' },
  AK: { name: 'Alaska', defaultCounty: 'Anchorage Municipality', domain: 'alaska.gov', courtName: 'Alaska Court System (CourtView)', courtUrl: 'https://records.courts.alaska.gov/', courtDesc: 'Superior and District court case records and dockets.', corpName: 'Alaska Division of Corporations', corpUrl: 'https://www.commerce.alaska.gov/cbp/main/search/entities', corpDesc: 'Business entity, LLC, and corporate officer registrations.', licenseName: 'Alaska Professional License Search', licenseUrl: 'https://www.commerce.alaska.gov/cbp/main/Search/ProfessionalLicense', licenseDesc: 'State-certified professional licenses and disciplinary actions.', inmateName: 'Alaska Dept of Corrections Inmate Info', inmateUrl: 'https://doc.alaska.gov/', inmateDesc: 'State detention and custody verification.', voterName: 'Alaska Division of Elections (Voter Information)', voterUrl: 'https://myvoterinformation.alaska.gov/', voterDesc: 'Official Alaska Division of Elections voter registration verification and polling district portal.' },
  AZ: { name: 'Arizona', defaultCounty: 'Maricopa County', domain: 'az.gov', courtName: 'Arizona Judicial Branch (Case Search)', courtUrl: 'https://apps.supremecourt.az.gov/publicaccess/', courtDesc: 'Superior, Justice, and City court civil/criminal dockets.', corpName: 'Arizona Corporation Commission (eCorp)', corpUrl: 'https://ecorp.azcc.gov/EntitySearch/Index', corpDesc: 'Articles of organization, LLC members, and statutory agents.', licenseName: 'Arizona e-Licensing Directory', licenseUrl: 'https://elicense.az.gov/', licenseDesc: 'State professional, healthcare, and trade licenses.', inmateName: 'Arizona Dept of Corrections Inmate Search', inmateUrl: 'https://corrections.az.gov/inmate-datasearch', inmateDesc: 'Inmate historical commitment records and status.', voterName: 'Arizona Secretary of State (Voter Information Portal)', voterUrl: 'https://my.arizona.vote/', voterDesc: 'Voter registration status, active early voting list, party registration, and precinct records.' },
  AR: { name: 'Arkansas', defaultCounty: 'Pulaski County', domain: 'arkansas.gov', courtName: 'Arkansas Judiciary (CourtConnect)', courtUrl: 'https://caseinfo.arcourts.gov/cconnect/', courtDesc: 'Circuit and District court case records and judgments.', corpName: 'Arkansas SOS Business Entity Search', corpUrl: 'https://www.sos.arkansas.gov/corps/search_all.php', corpDesc: 'Corporate officers, LLC filings, and assumed names.', licenseName: 'Arkansas Professional Licensing', licenseUrl: 'https://www.arkansas.gov/services/licensing/', licenseDesc: 'State board licensure verification.', inmateName: 'Arkansas DOC Inmate Population Search', inmateUrl: 'https://apps.ark.org/inmate_info/search.php', inmateDesc: 'Incarceration records and parole supervision.', voterName: 'Arkansas Secretary of State (VoterView)', voterUrl: 'https://www.voterview.ar-nova.org/voterview', voterDesc: 'Voter registration status, party affiliation, district assignments, and voting history.' },
  CA: { name: 'California', defaultCounty: 'Los Angeles County', domain: 'ca.gov', courtName: 'California Superior Courts Directory', courtUrl: 'https://www.courts.ca.gov/find-my-court.htm', courtDesc: 'Superior Courts across all 58 California counties.', corpName: 'California SOS BizFile Online', corpUrl: 'https://bizfileonline.sos.ca.gov/search/business', corpDesc: 'Statements of Information, LLC members, and CEO/CFO filings.', licenseName: 'California Dept of Consumer Affairs (DCA)', licenseUrl: 'https://search.dca.ca.gov/', licenseDesc: 'Medical, nursing, engineering, contractor, and CPA licenses.', inmateName: 'California CDCR Inmate Locator', inmateUrl: 'https://inmatelocator.cdcr.ca.gov/', inmateDesc: 'California state prison population search.', voterName: 'California Secretary of State (My Voter Status)', voterUrl: 'https://voterstatus.sos.ca.gov/', voterDesc: 'Official California voter registration status, political party preference, and polling location.' },
  CO: { name: 'Colorado', defaultCounty: 'Denver County', domain: 'colorado.gov', courtName: 'Colorado Judicial Branch (CoCourts)', courtUrl: 'https://www.courts.state.co.us/', courtDesc: 'District and County court civil and criminal dockets.', corpName: 'Colorado SOS Business Database', corpUrl: 'https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do', corpDesc: 'Articles of incorporation, registered agent, and periodic reports.', licenseName: 'Colorado DORA License Lookup', licenseUrl: 'https://apps.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx', licenseDesc: 'Division of Professions and Occupations licensee database.', inmateName: 'Colorado DOC Offender Search', inmateUrl: 'https://www.doc.state.co.us/oss/', inmateDesc: 'Offender location and conviction summary.', voterName: 'Colorado Secretary of State (GoVoteColorado)', voterUrl: 'https://www.govotecolorado.gov/', voterDesc: 'Colorado voter registration lookup, political party affiliation, and mail ballot status.' },
  CT: { name: 'Connecticut', defaultCounty: 'Hartford County', domain: 'ct.gov', courtName: 'Connecticut Judicial Branch (Case Look-up)', courtUrl: 'https://www.jud.ct.gov/jud2.htm', courtDesc: 'Civil, family, housing, and small claims case inquiry.', corpName: 'Connecticut business.ct.gov Entity Search', corpUrl: 'https://service.ct.gov/business/s/onlinebusinesssearch', corpDesc: 'Commercial recording division, business principals, and LLCs.', licenseName: 'Connecticut eLicense Lookup', licenseUrl: 'https://www.elicense.ct.gov/Lookup/LicenseLookup.aspx', licenseDesc: 'Department of Public Health and Consumer Protection licenses.', inmateName: 'Connecticut DOC Offender Information Search', inmateUrl: 'http://www.ctinmateinfo.state.ct.us/', inmateDesc: 'Inmate custody status and facility assignment.', voterName: 'Connecticut Secretary of the State (Voter Lookup)', voterUrl: 'https://portaldir.ct.gov/sots/LookUp.aspx', voterDesc: 'Voter registration status, party enrollment, and polling place verification.' },
  DE: { name: 'Delaware', defaultCounty: 'New Castle County', domain: 'delaware.gov', courtName: 'Delaware CourtConnect / Courts Portal', courtUrl: 'https://courts.delaware.gov/', courtDesc: 'Chancery, Superior, and Common Pleas court dockets.', corpName: 'Delaware Division of Corporations Entity Search', corpUrl: 'https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx', corpDesc: 'Corporate entity search (world capital of corporate charters).', licenseName: 'Delaware DELPROS Professional Regulation', licenseUrl: 'https://delpros.delaware.gov/OH_VerifyLicense', licenseDesc: 'Professional licensing verification.', inmateName: 'Delaware Dept of Correction', inmateUrl: 'https://doc.delaware.gov/', inmateDesc: 'Correctional facility inquiries.', voterName: 'Delaware Department of Elections (iVote Portal)', voterUrl: 'https://ivote.de.gov/', voterDesc: 'Delaware voter registration status, political party affiliation, and voting history profile.' },
  FL: { name: 'Florida', defaultCounty: 'Miami-Dade County', domain: 'myflorida.com', courtName: 'Florida Courts e-Filing Portal / County Clerk Hub', courtUrl: 'https://www.myflcourtaccess.com/', courtDesc: 'Unified civil and criminal court docket filing across 67 counties.', corpName: 'Florida Division of Corporations (Sunbiz.org)', corpUrl: 'https://search.sunbiz.org/Inquiry/CorporationSearch/ByName', corpDesc: 'Annual reports, managing members, officer names, and registered agents.', licenseName: 'Florida DBPR / DOH License Verification', licenseUrl: 'https://www.myfloridalicense.com/wl11.asp', licenseDesc: 'Department of Business & Professional Regulation and Health licenses.', inmateName: 'Florida Dept of Corrections Offender Search', inmateUrl: 'https://fdc.myflorida.com/offender-search', inmateDesc: 'State prison population, release dates, and supervision.', voterName: 'Florida Division of Elections (Voter Information Lookup)', voterUrl: 'https://registration.elections.myflorida.com/CheckVoterStatus', voterDesc: 'Official Florida voter registration status, party affiliation, and county supervisor of elections.' },
  GA: { name: 'Georgia', defaultCounty: 'Fulton County', domain: 'georgia.gov', courtName: 'Georgia Judicial Gateway / County Clerk Directory', courtUrl: 'https://georgiacourts.gov/', courtDesc: 'Superior, State, and Magistrate court directory.', corpName: 'Georgia Corporations Division (eCorp)', corpUrl: 'https://ecorp.sos.ga.gov/BusinessSearch', corpDesc: 'Entity officers, registered agent, and incorporation dates.', licenseName: 'Georgia Professional Licensing Boards', licenseUrl: 'https://verify.sos.ga.gov/verification/', licenseDesc: 'State verified professional licenses.', inmateName: 'Georgia DOC Offender Search', inmateUrl: 'https://gdc.georgia.gov/find-offender', inmateDesc: 'Georgia correctional institution inmate lookup.', voterName: 'Georgia Secretary of State (My Voter Page - MVP)', voterUrl: 'https://mvp.sos.ga.gov/s/', voterDesc: 'Georgia MVP voter registration status, polling precinct, and county board of registrars.' },
  HI: { name: 'Hawaii', defaultCounty: 'Honolulu County', domain: 'hawaii.gov', courtName: 'Hawaii State Judiciary (eCourt Kokua)', courtUrl: 'https://www.courts.state.hi.us/legal_references/records/jims_system_availability', courtDesc: 'Traffic, District, and Circuit court criminal & civil cases.', corpName: 'Hawaii BREG Business Registration', corpUrl: 'https://hbe.ehawaii.gov/documents/search.html', corpDesc: 'Business entity filings and registered agent information.', licenseName: 'Hawaii Professional & Vocational Licensing', licenseUrl: 'https://pvl.ehawaii.gov/pvlsearch/', licenseDesc: 'DCCA professional licensing verification.', inmateName: 'Hawaii Dept of Public Safety Inmate Info', inmateUrl: 'https://dps.hawaii.gov/', inmateDesc: 'State correctional custody inquiries.', voterName: 'Hawaii Office of Elections (Online Voter Registration)', voterUrl: 'https://olvr.hawaii.gov/', voterDesc: 'Hawaii voter registration verification and district ballot delivery status.' },
  ID: { name: 'Idaho', defaultCounty: 'Ada County', domain: 'idaho.gov', courtName: 'Idaho Judicial Branch (iCourt Portal)', courtUrl: 'https://mycourts.idaho.gov/', courtDesc: 'District and Magistrate court civil/criminal records.', corpName: 'Idaho SOS Business Search', corpUrl: 'https://sosbiz.idaho.gov/search/business', corpDesc: 'Business filings and corporate principals.', licenseName: 'Idaho DOPL License Search', licenseUrl: 'https://dopl.idaho.gov/', licenseDesc: 'Division of Occupational and Professional Licenses.', inmateName: 'Idaho DOC Offender Search', inmateUrl: 'https://www.idoc.idaho.gov/content/prisons/offender_search', inmateDesc: 'Offender status and disciplinary records.', voterName: 'Idaho Secretary of State (Vote Idaho Voter Portal)', voterUrl: 'https://voteidaho.gov/', voterDesc: 'Idaho voter registration lookup, political party affiliation, and county clerk verification.' },
  IL: { name: 'Illinois', defaultCounty: 'Cook County', domain: 'illinois.gov', courtName: 're:SearchIL / Illinois Courts Portal', courtUrl: 'https://researchil.tylerhost.net/', courtDesc: 'Unified Circuit Court case search across Illinois counties.', corpName: 'Illinois CyberDrive / SOS Corporation Database', corpUrl: 'https://apps.ilsos.gov/corporatellc/', corpDesc: 'Corporations, LLCs, managers, and registered office addresses.', licenseName: 'Illinois IDFPR License Lookup', licenseUrl: 'https://idfpr.illinois.gov/licenselookup/licenselookup.html', licenseDesc: 'Department of Financial and Professional Regulation.', inmateName: 'Illinois DOC Inmate Search', inmateUrl: 'https://idoc.illinois.gov/offender/inmatesearch.html', inmateDesc: 'Inmate commitment, custody, and parole dates.', voterName: 'Illinois State Board of Elections (Voter Lookup System)', voterUrl: 'https://ova.elections.il.gov/RegistrationLookup.aspx', voterDesc: 'Illinois SBE statewide voter registration verification and local election authority portal.' },
  IN: { name: 'Indiana', defaultCounty: 'Marion County', domain: 'in.gov', courtName: 'mycase.IN.gov (Indiana Judicial Branch)', courtUrl: 'https://mycase.in.gov/', courtDesc: 'Comprehensive statewide public access to court records.', corpName: 'Indiana INBiz Business Entity Search', corpUrl: 'https://bsd.sos.in.gov/publicbusinesssearch', corpDesc: 'Business filings, officers, and commercial records.', licenseName: 'Indiana PLA License Search', licenseUrl: 'https://www.in.gov/pla/license-search/', licenseDesc: 'Professional Licensing Agency verification portal.', inmateName: 'Indiana DOC Inmate Search', inmateUrl: 'https://www.in.gov/apps/indcorrection/ofs/ofs', inmateDesc: 'Department of Correction offender locator.', voterName: 'Indiana Election Division (Indiana Voters Portal)', voterUrl: 'https://indianavoters.in.gov/', voterDesc: 'Indiana voter registration status, county election administrator, and voting precinct.' },
  IA: { name: 'Iowa', defaultCounty: 'Polk County', domain: 'iowa.gov', courtName: 'Iowa Courts Online Search', courtUrl: 'https://www.iowacourts.state.ia.us/', courtDesc: 'Civil, criminal, probate, and traffic case search.', corpName: 'Iowa SOS Business Entities Search', corpUrl: 'https://sos.iowa.gov/search/business/search.aspx', corpDesc: 'Corporate and LLC registration filings.', licenseName: 'Iowa Professional Licensing Bureau', licenseUrl: 'https://plb.iowa.gov/', licenseDesc: 'State board credential verification.', inmateName: 'Iowa DOC Offender Search', inmateUrl: 'https://doc.iowa.gov/offender/search', inmateDesc: 'Inmate status and correctional records.', voterName: 'Iowa Secretary of State (Voter Registration Search)', voterUrl: 'https://sos.iowa.gov/elections/voterreg/regtovote/search.aspx', voterDesc: 'Iowa statewide voter registration verification and county auditor election records.' },
  KS: { name: 'Kansas', defaultCounty: 'Sedgwick County', domain: 'kansas.gov', courtName: 'Kansas District Court Public Access Portal', courtUrl: 'https://www.kscourts.org/Public/Court-Records', courtDesc: 'District and Appellate court records.', corpName: 'Kansas SOS Business Entity Search', corpUrl: 'https://www.kansas.gov/bess/flow/setup/search', corpDesc: 'Business entities, annual reports, and resident agents.', licenseName: 'Kansas Licensing Directory', licenseUrl: 'https://www.kansas.gov/business/licensing.html', licenseDesc: 'State regulatory and professional boards.', inmateName: 'Kansas KDOC Kaspar Offender Search', inmateUrl: 'https://kdocpub.doc.ks.gov/kasper/', inmateDesc: 'Kansas Department of Corrections offender search.', voterName: 'Kansas Secretary of State (VoterView Portal)', voterUrl: 'https://myvoteinfo.voteks.org/voterview', voterDesc: 'Kansas voter registration status, party affiliation, and county election officer profile.' },
  KY: { name: 'Kentucky', defaultCounty: 'Jefferson County', domain: 'ky.gov', courtName: 'Kentucky Court of Justice (CourtNet)', courtUrl: 'https://kycourts.gov/Pages/default.aspx', courtDesc: 'Statewide Circuit and District court records.', corpName: 'Kentucky SOS FastTrack Business Search', corpUrl: 'https://web.sos.ky.gov/ftsearch/', corpDesc: 'Corporate officers, members, and organizational documents.', licenseName: 'Kentucky Public Protection Cabinet Licensing', licenseUrl: 'https://oop.ky.gov/', licenseDesc: 'Occupations and professions licensure lookup.', inmateName: 'Kentucky KOOL Offender Online Lookup', inmateUrl: 'http://kool.corrections.ky.gov/', inmateDesc: 'Inmate incarceration and supervision records.', voterName: 'Kentucky State Board of Elections (Voter Information Portal)', voterUrl: 'https://vrsws.sos.ky.gov/vic/', voterDesc: 'Kentucky SBE voter registration status, political party affiliation, and precinct details.' },
  LA: { name: 'Louisiana', defaultCounty: 'Orleans Parish', domain: 'louisiana.gov', courtName: 'Louisiana Parish Clerk of Court Association', courtUrl: 'https://www.laclerks.org/', courtDesc: 'Directory of all 64 Louisiana Parish Clerk of Court offices.', corpName: 'Louisiana geauxBIZ Business Search', corpUrl: 'https://coraweb.sos.la.gov/commercialsearch/commercialsearch.aspx', corpDesc: 'Parish business charters, officers, and commercial registrations.', licenseName: 'Louisiana Professional Licensing Boards', licenseUrl: 'https://www.doa.la.gov/', licenseDesc: 'State licensing boards and commissions.', inmateName: 'Louisiana DOC Offender Locator (LAVNS)', inmateUrl: 'https://www.vinelink.com/', inmateDesc: 'Victim notification and custody tracking.', voterName: 'Louisiana Secretary of State (GeauxVote Voter Portal)', voterUrl: 'https://voterportal.sos.la.gov/', voterDesc: 'Louisiana voter status, parish registrar of voters, party affiliation, and voting district.' },
  ME: { name: 'Maine', defaultCounty: 'Cumberland County', domain: 'maine.gov', courtName: 'Maine Judicial Branch (re:SearchMaine)', courtUrl: 'https://www.courts.maine.gov/', courtDesc: 'District and Superior court civil and family records.', corpName: 'Maine SOS Corporate Name Search', corpUrl: 'https://icrs.informe.org/nei-sos-icrs/ICRS?MainPage=x', corpDesc: 'Corporate charters, LLC filings, and registered agents.', licenseName: 'Maine ALMS License Verification', licenseUrl: 'https://www.pfr.maine.gov/almsonline/almsquery/welcome.aspx', licenseDesc: 'Department of Professional and Financial Regulation.', inmateName: 'Maine DOC Adult Prisoner Search', inmateUrl: 'https://www.maine.gov/online/mdoc/search_and_display/', inmateDesc: 'Department of Corrections custody information.', voterName: 'Maine Elections Division (Voter Information Lookup)', voterUrl: 'https://www.maine.gov/sos/cec/elec/voter-info/', voterDesc: 'Maine voter eligibility, party enrollment verification, and municipal town clerk directory.' },
  MD: { name: 'Maryland', defaultCounty: 'Baltimore City', domain: 'maryland.gov', courtName: 'Maryland Judiciary Case Search', courtUrl: 'https://casesearch.courts.state.md.us/casesearch/', courtDesc: 'Comprehensive statewide District and Circuit court case inquiry.', corpName: 'Maryland Business Express (SDAT)', corpUrl: 'https://egov.maryland.gov/BusinessExpress/EntitySearch', corpDesc: 'State Dept of Assessments and Taxation business search.', licenseName: 'Maryland eLicensing Directory', licenseUrl: 'https://www.dllr.state.md.us/license/', licenseDesc: 'Occupational and professional license lookup.', inmateName: 'Maryland DPSCS Inmate Locator', inmateUrl: 'https://dpscs.maryland.gov/inmate/', inmateDesc: 'Division of Correction inmate locator.', voterName: 'Maryland State Board of Elections (Voter Lookup)', voterUrl: 'https://voterservices.elections.maryland.gov/VoterSearch', voterDesc: 'Maryland SBE registration status, political party affiliation, and county board of elections.' },
  MA: { name: 'Massachusetts', defaultCounty: 'Suffolk County', domain: 'mass.gov', courtName: 'MassCourts.org (Trial Court Case Search)', courtUrl: 'https://www.masscourts.org/', courtDesc: 'District, Superior, Probate, and Housing court public records.', corpName: 'Massachusetts Corporations Division', corpUrl: 'https://corp.sec.state.ma.us/corpweb/corpsearch/CorpSearch.aspx', corpDesc: 'Corporate entity database, officers, and resident agents.', licenseName: 'Massachusetts Division of Occupational Licensure', licenseUrl: 'https://www.mass.gov/check-a-license', licenseDesc: 'Consumer affairs professional license verification.', inmateName: 'Massachusetts DOC Inmate Locator', inmateUrl: 'https://www.mass.gov/how-to/locate-an-inmate', inmateDesc: 'Department of Correction inmate locator.', voterName: 'Massachusetts Secretary of the Commonwealth (Voter Search)', voterUrl: 'https://www.sec.state.ma.us/voterregistrationsearch/', voterDesc: 'Massachusetts voter status, political party enrollment, and municipal ward/precinct.' },
  MI: { name: 'Michigan', defaultCounty: 'Wayne County', domain: 'michigan.gov', courtName: 'Michigan MiCOURT Case Search', courtUrl: 'https://micourt.courts.michigan.gov/', courtDesc: 'Circuit, District, and Probate court public records.', corpName: 'Michigan LARA Corporation Database', corpUrl: 'https://cofs.lara.state.mi.us/Search/Search', corpDesc: 'Corporations, Securities & Commercial Licensing Bureau.', licenseName: 'Michigan LARA Professional Licensing (BPL)', licenseUrl: 'https://val.apps.lara.state.mi.us/', licenseDesc: 'Verify a license across health and occupational boards.', inmateName: 'Michigan DOC OTIS (Offender Tracking)', inmateUrl: 'https://mdocweb.state.mi.us/otis2/otis2.html', inmateDesc: 'Offender Tracking Information System.', voterName: 'Michigan Department of State (Voter Information Center)', voterUrl: 'https://mvic.sos.state.mi.us/Voter/Index', voterDesc: 'Michigan MVIC voter registration status, clerk office contacts, and precinct polling records.' },
  MN: { name: 'Minnesota', defaultCounty: 'Hennepin County', domain: 'mn.gov', courtName: 'Minnesota Public Access (MCRO)', courtUrl: 'https://publicaccess.courts.state.mn.us/', courtDesc: 'District court civil, family, and criminal case search.', corpName: 'Minnesota SOS Business Filings', corpUrl: 'https://mblsportal.sos.state.mn.us/Business/Search', corpDesc: 'Assumed names, corporations, and registered officers.', licenseName: 'Minnesota License Lookup', licenseUrl: 'https://mn.gov/elicense/', licenseDesc: 'Statewide professional credential lookup.', inmateName: 'Minnesota DOC Offender Locator', inmateUrl: 'https://coms.doc.state.mn.us/publicviewer', inmateDesc: 'Incarceration records and supervised release.', voterName: 'Minnesota Secretary of State (Voter Status Lookup)', voterUrl: 'https://mnvotes.sos.mn.gov/voterstatussearch.aspx', voterDesc: 'Minnesota official voter registration verification and county election official records.' },
  MS: { name: 'Mississippi', defaultCounty: 'Hinds County', domain: 'ms.gov', courtName: 'Mississippi Electronic Courts (MEC)', courtUrl: 'https://courts.ms.gov/', courtDesc: 'Chancery and Circuit court case filing system.', corpName: 'Mississippi SOS Business Services', corpUrl: 'https://corp.sos.ms.gov/corp/portal/c/page/corpBusinessIdSearch/portal.aspx', corpDesc: 'Corporate filings, officers, and LLC registration.', licenseName: 'Mississippi Professional Licensure', licenseUrl: 'https://www.ms.gov/business/licensing', licenseDesc: 'State licensing board directories.', inmateName: 'Mississippi DOC Inmate Search', inmateUrl: 'https://www.ms.gov/mdoc/inmate', inmateDesc: 'MDOC offender lookup.', voterName: "Mississippi Secretary of State (Y'all Vote Portal)", voterUrl: 'https://www.yallvote.sos.ms.gov/', voterDesc: 'Mississippi voter registration verification, circuit clerk directory, and precinct locator.' },
  MO: { name: 'Missouri', defaultCounty: 'St. Louis County', domain: 'mo.gov', courtName: 'Missouri Case.net', courtUrl: 'https://www.courts.mo.gov/casenet/base/welcome.do', courtDesc: 'Comprehensive public access to Missouri state courts dockets.', corpName: 'Missouri SOS Business Entity Search', corpUrl: 'https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx', corpDesc: 'Corporate records, LLC filings, and fictitious names.', licenseName: 'Missouri Division of Professional Registration', licenseUrl: 'https://pr.mo.gov/', licenseDesc: 'Licensee search across state regulatory boards.', inmateName: 'Missouri DOC Offender Web Search', inmateUrl: 'https://web.mo.gov/doc/offSearchWeb/', inmateDesc: 'Offender commitment and supervision status.', voterName: 'Missouri Secretary of State (Voter Registration Lookup)', voterUrl: 'https://voteroutreach.sos.mo.gov/portal/', voterDesc: 'Missouri SOS voter registration verification and county clerk / election authority contacts.' },
  MT: { name: 'Montana', defaultCounty: 'Yellowstone County', domain: 'mt.gov', courtName: 'Montana Courts Public Portal', courtUrl: 'https://courts.mt.gov/', courtDesc: 'Supreme Court and District court case records.', corpName: 'Montana SOS Business Search', corpUrl: 'https://biz.sosmt.gov/search/business', corpDesc: 'Business entity filings and registered agent lookups.', licenseName: 'Montana Professional Licensing', licenseUrl: 'https://ebiz.mt.gov/pol/', licenseDesc: 'Business and occupational licensing.', inmateName: 'Montana DOC Offender Search', inmateUrl: 'https://app.mt.gov/conweb/', inmateDesc: 'Correctional offender network.', voterName: 'Montana Secretary of State (My Voter Page)', voterUrl: 'https://prodvoterportal.mt.gov/WhereToVote.aspx', voterDesc: 'Montana voter registration verification, party affiliation, and county election office search.' },
  NE: { name: 'Nebraska', defaultCounty: 'Douglas County', domain: 'nebraska.gov', courtName: 'Nebraska Judicial Branch (JUSTICE)', courtUrl: 'https://www.nebraska.gov/justice/public/index.cgi', courtDesc: 'Trial court case search across 93 Nebraska counties.', corpName: 'Nebraska SOS Corporate Search', corpUrl: 'https://www.nebraska.gov/sos/corp/corpsearch.cgi', corpDesc: 'Corporate charters, trade names, and officers.', licenseName: 'Nebraska Licensee Lookup', licenseUrl: 'https://www.nebraska.gov/lis-search/', licenseDesc: 'Department of Health & Human Services licensure.', inmateName: 'Nebraska DCS Inmate Search', inmateUrl: 'https://dcs-inmatesearch.ne.gov/', inmateDesc: 'Department of Correctional Services inmate search.', voterName: 'Nebraska Secretary of State (VoterCheck Portal)', voterUrl: 'https://www.votercheck.necvr.ne.gov/', voterDesc: 'Nebraska voter registration status, party affiliation, and county election commission.' },
  NV: { name: 'Nevada', defaultCounty: 'Clark County', domain: 'nv.gov', courtName: 'Nevada District Courts / Appellate Portal', courtUrl: 'https://nvcourts.gov/', courtDesc: 'Judicial branch directory and county court access.', corpName: 'Nevada SilverFlume Business Portal', corpUrl: 'https://esos.nv.gov/EntitySearch/OnlineEntitySearch', corpDesc: 'Corporations, LLCs, managing members, and resident agents.', licenseName: 'Nevada Professional Boards', licenseUrl: 'https://nv.gov/', licenseDesc: 'Occupational licensing directory.', inmateName: 'Nevada DOC Offender Search', inmateUrl: 'https://ofdsearch.doc.nv.gov/', inmateDesc: 'Department of Corrections offender lookup.', voterName: 'Nevada Secretary of State (Registered Voter Services)', voterUrl: 'https://www.nvsos.gov/votersearch/', voterDesc: 'Nevada SOS voter registration lookup, party affiliation, and county registrar of voters.' },
  NH: { name: 'New Hampshire', defaultCounty: 'Hillsborough County', domain: 'nh.gov', courtName: 'New Hampshire Judicial Branch Portal', courtUrl: 'https://www.courts.nh.gov/', courtDesc: 'Circuit and Superior court case inquiries.', corpName: 'New Hampshire QuickStart Business Search', corpUrl: 'https://quickstart.sos.nh.gov/online/Account/LandingPage', corpDesc: 'Corporate and trade name database.', licenseName: 'New Hampshire OPLC License Verification', licenseUrl: 'https://nhlicenses.nh.gov/verifications/', licenseDesc: 'Office of Professional Licensure and Certification.', inmateName: 'New Hampshire DOC Inmate Locator', inmateUrl: 'https://www.nh.gov/nhdoc/', inmateDesc: 'State correctional inmate records.', voterName: 'New Hampshire Secretary of State (Voter Information Portal)', voterUrl: 'https://app.sos.nh.gov/voterinformation', voterDesc: 'New Hampshire voter registration status, party checklist, and town clerk directory.' },
  NJ: { name: 'New Jersey', defaultCounty: 'Bergen County', domain: 'nj.gov', courtName: 'New Jersey Courts eCourts Portal', courtUrl: 'https://www.njcourts.gov/public', courtDesc: 'Superior Court civil and criminal case records.', corpName: 'New Jersey Business Records Service', corpUrl: 'https://www.njportal.com/DOR/BusinessNameSearch/', corpDesc: 'Treasury division business and entity lookup.', licenseName: 'New Jersey Division of Consumer Affairs', licenseUrl: 'https://newjersey.mylicense.com/verification/', licenseDesc: 'Professional and occupational license verification.', inmateName: 'New Jersey DOC Offender Search', inmateUrl: 'https://www20.state.nj.us/DOC_Inmate/inmatesearch', inmateDesc: 'State correctional facility inmates.', voterName: 'New Jersey Division of Elections (Voter Search Portal)', voterUrl: 'https://voter.svrs.nj.gov/registration-check', voterDesc: 'New Jersey statewide voter registration lookup and county superintendent of elections records.' },
  NM: { name: 'New Mexico', defaultCounty: 'Bernalillo County', domain: 'nm.gov', courtName: 'New Mexico Case Lookup (NM Courts)', courtUrl: 'https://caselookup.nmcourts.gov/', courtDesc: 'Statewide District and Magistrate court dockets.', corpName: 'New Mexico SOS Business Services', corpUrl: 'https://portal.sos.state.nm.us/BFS/online/CorporationBusinessSearch', corpDesc: 'Entity charters, registered agents, and reports.', licenseName: 'New Mexico RLD Licensee Search', licenseUrl: 'https://www.rld.nm.gov/', licenseDesc: 'Regulation and Licensing Department directory.', inmateName: 'New Mexico Corrections Offender Search', inmateUrl: 'https://search.cd.nm.gov/', inmateDesc: 'Inmate and probationer tracking.', voterName: 'New Mexico Secretary of State (Voter Information Portal)', voterUrl: 'https://voterportal.servis.sos.state.nm.us/WhereToVote.aspx', voterDesc: 'New Mexico SOS voter registration verification, political party, and county clerk portal.' },
  NY: { name: 'New York', defaultCounty: 'New York County', domain: 'ny.gov', courtName: 'NYSCEF & WebCivil Supreme / Local Courts', courtUrl: 'https://iapps.courts.state.ny.us/webcivil/ecourtsMain', courtDesc: 'Unified Court System: Supreme Court, County Court, and local civil actions.', corpName: 'NY Dept of State Division of Corporations', corpUrl: 'https://apps.dos.ny.gov/publicInquiry/', corpDesc: 'Corporations, LLCs, assumed names, and registered agent addresses.', licenseName: 'NY Office of the Professions Verification', licenseUrl: 'https://www.op.nysed.gov/verification-search', licenseDesc: 'State-certified professionals: Physicians, Engineers, CPAs, Architects, Pharmacists.', inmateName: 'NY DOCCS Inmate Lookup', inmateUrl: 'https://nysdoccslookup.doccs.ny.gov/', inmateDesc: 'New York Department of Corrections and Community Supervision.', voterName: 'New York State Board of Elections (Voter Lookup)', voterUrl: 'https://voterlookup.elections.ny.gov/', voterDesc: 'Official NYS BOE voter registration status, county enrollment, political party, and voter history.' },
  NC: { name: 'North Carolina', defaultCounty: 'Mecklenburg County', domain: 'nc.gov', courtName: 'North Carolina Judicial Branch (eCourts Portal)', courtUrl: 'https://portal-nc.tylertech.cloud/Portal/', courtDesc: 'Superior and District court civil and criminal records.', corpName: 'North Carolina SOS Business Registration', corpUrl: 'https://www.sosnc.gov/search/index/corp', corpDesc: 'Corporate entity search, LLC managers, and annual reports.', licenseName: 'North Carolina Occupational Licensing Boards', licenseUrl: 'https://www.nc.gov/agencies/licensing-boards', licenseDesc: 'Professional licensing boards.', inmateName: 'North Carolina DPS Offender Public Information', inmateUrl: 'https://webapps.doc.state.nc.us/opi/offendersearch.do', inmateDesc: 'Offender public information search.', voterName: 'North Carolina State Board of Elections (Voter Search)', voterUrl: 'https://vt.ncsbe.gov/RegLkup/', voterDesc: 'Official NCSBE public voter registration search, voting history, party affiliation, and precinct records.' },
  ND: { name: 'North Dakota', defaultCounty: 'Cass County', domain: 'nd.gov', courtName: 'North Dakota Supreme & District Court Search', courtUrl: 'https://www.ndcourts.gov/public-access', courtDesc: 'Supreme Court and District court case access.', corpName: 'North Dakota FirstStop Business Search', corpUrl: 'https://firststop.sos.nd.gov/search/business', corpDesc: 'Entity charters, trade names, and officers.', licenseName: 'North Dakota License Directory', licenseUrl: 'https://www.nd.gov/', licenseDesc: 'State occupational boards.', inmateName: 'North Dakota DOCR Resident Search', inmateUrl: 'https://www.docr.nd.gov/', inmateDesc: 'Department of Corrections resident search.', voterName: 'North Dakota Secretary of State (Voting Portal)', voterUrl: 'https://vip.sos.nd.gov/', voterDesc: 'North Dakota Secretary of State voting information and county auditor election contacts.' },
  OH: { name: 'Ohio', defaultCounty: 'Franklin County', domain: 'ohio.gov', courtName: 'Ohio Supreme Court & County Clerk Portals', courtUrl: 'https://www.supremecourt.ohio.gov/', courtDesc: 'Ohio Judicial System case portal and county clerk directory.', corpName: 'Ohio SOS Business Entity Search', corpUrl: 'https://businesssearch.ohiosos.gov/', corpDesc: 'Registered businesses, trade names, and corporate filings.', licenseName: 'Ohio eLicense Center', licenseUrl: 'https://elicense.ohio.gov/oh_verifylicense', licenseDesc: 'State professional, medical, and commercial license lookup.', inmateName: 'Ohio ODRC Offender Search', inmateUrl: 'https://appgateway.drc.ohio.gov/OffenderSearch', inmateDesc: 'Department of Rehabilitation and Correction.', voterName: 'Ohio Secretary of State (Voter Search Portal)', voterUrl: 'https://voterlookup.ohiosos.gov/voterlookup.aspx', voterDesc: 'Ohio statewide voter registration lookup, party affiliation, and county board of elections.' },
  OK: { name: 'Oklahoma', defaultCounty: 'Oklahoma County', domain: 'ok.gov', courtName: 'Oklahoma State Courts Network (OSCN)', courtUrl: 'https://www.oscn.net/dockets/Search.aspx', courtDesc: 'Comprehensive public civil and criminal court dockets across Oklahoma.', corpName: 'Oklahoma SOS Business Entity Search', corpUrl: 'https://www.sos.ok.gov/corp/corpInquiryFind.aspx', corpDesc: 'Business entity filings and domestic filings.', licenseName: 'Oklahoma Professional Licensing Boards', licenseUrl: 'https://oklahoma.gov/', licenseDesc: 'State licensing credentials.', inmateName: 'Oklahoma DOC Offender Lookup (OK Offender)', inmateUrl: 'https://okoffender.doc.ok.gov/', inmateDesc: 'Offender lookup system.', voterName: 'Oklahoma State Election Board (OK Voter Portal)', voterUrl: 'https://okvoterportal.okelections.us/', voterDesc: 'Oklahoma voter registration verification, party affiliation, and county election board records.' },
  OR: { name: 'Oregon', defaultCounty: 'Multnomah County', domain: 'oregon.gov', courtName: 'Oregon Judicial Information Network (OJCIN)', courtUrl: 'https://www.courts.oregon.gov/services/online/pages/ojcin.aspx', courtDesc: 'Circuit court register of actions across Oregon.', corpName: 'Oregon SOS Business Registry Database', corpUrl: 'https://sos.oregon.gov/business/Pages/find.aspx', corpDesc: 'Business registry records, members, and officers.', licenseName: 'Oregon License Directory', licenseUrl: 'https://www.oregon.gov/business/pages/license-directory.aspx', licenseDesc: 'Occupational and professional licenses.', inmateName: 'Oregon DOC Offender Search', inmateUrl: 'https://docpub.state.or.us/OOS/intro.jsf', inmateDesc: 'Offender search system.', voterName: 'Oregon Secretary of State (My Vote Portal)', voterUrl: 'https://sos.oregon.gov/voting/pages/myvote.aspx', voterDesc: 'Oregon statewide voter registration lookup, party enrollment, and county clerk verification.' },
  PA: { name: 'Pennsylvania', defaultCounty: 'Philadelphia County', domain: 'pa.gov', courtName: 'Pennsylvania Unified Judicial System (UJS Portal)', courtUrl: 'https://ujsportal.pacourts.us/casesearch', courtDesc: 'Common Pleas, Magisterial District, and Appellate court dockets.', corpName: 'Pennsylvania Dept of State Business Search', corpUrl: 'https://www.corporations.pa.gov/search/corpsearch', corpDesc: 'Entity charters, officers, and commercial registrations.', licenseName: 'Pennsylvania PALS Professional License Search', licenseUrl: 'https://www.pals.pa.gov/#/page/search', licenseDesc: 'Bureau of Professional and Occupational Affairs.', inmateName: 'Pennsylvania DOC Inmate Locator', inmateUrl: 'http://inmatelocator.cor.pa.gov/', inmateDesc: 'State prison population lookup.', voterName: 'Pennsylvania Department of State (Voter Registration Status)', voterUrl: 'https://www.pavoterservices.pa.gov/pages/voterregistrationstatus.aspx', voterDesc: 'PA DOS voter registration status, party enrollment, and county board of elections.' },
  RI: { name: 'Rhode Island', defaultCounty: 'Providence County', domain: 'ri.gov', courtName: 'Rhode Island Judiciary Public Portal', courtUrl: 'https://publicportal.courts.ri.gov/PublicPortal/', courtDesc: 'Supreme, Superior, and District court dockets.', corpName: 'Rhode Island Corporate Database', corpUrl: 'http://business.sos.ri.gov/CorpWeb/CorpSearch/CorpSearch.aspx', corpDesc: 'Corporate filings, officers, and resident agents.', licenseName: 'Rhode Island License Verification', licenseUrl: 'https://health.ri.gov/find/licensees/', licenseDesc: 'Department of Health licensing.', inmateName: 'Rhode Island DOC Inmate Search', inmateUrl: 'http://www.doc.ri.gov/', inmateDesc: 'Department of Corrections lookup.', voterName: 'Rhode Island Department of State (Voter Information Center)', voterUrl: 'https://vote.sos.ri.gov/Home/UpdateVoterRecord', voterDesc: 'Rhode Island voter registration verification, party affiliation, and local board of canvassers.' },
  SC: { name: 'South Carolina', defaultCounty: 'Greenville County', domain: 'sc.gov', courtName: 'South Carolina Judicial Branch Case Records', courtUrl: 'https://www.sccourts.org/caseSearch/', courtDesc: 'County public index for civil, criminal, and family courts.', corpName: 'South Carolina SOS Business Entities', corpUrl: 'https://businessfilings.sc.gov/businessfiling/entity/search', corpDesc: 'Corporations, LLCs, and nonprofit records.', licenseName: 'South Carolina LLR Licensee Lookup', licenseUrl: 'https://verify.llronline.com/LicLookup/LookupMain.aspx', licenseDesc: 'Labor, Licensing and Regulation database.', inmateName: 'South Carolina SCDC Inmate Search', inmateUrl: 'https://public.doc.state.sc.us/scdc-public/', inmateDesc: 'Inmate search system.', voterName: 'South Carolina Election Commission (Check Voter Registration)', voterUrl: 'https://scvotes.gov/voters/check-your-voter-registration/', voterDesc: 'South Carolina voter registration verification and county voter registration board directory.' },
  SD: { name: 'South Dakota', defaultCounty: 'Minnehaha County', domain: 'sd.gov', courtName: 'South Dakota Unified Judicial System', courtUrl: 'https://ujs.sd.gov/', courtDesc: 'Circuit court case records.', corpName: 'South Dakota SOS Business Search', corpUrl: 'https://sosbi.sdsos.gov/BusinessSearch.aspx', corpDesc: 'Corporate entity search.', licenseName: 'South Dakota Professional Licensing', licenseUrl: 'https://dlr.sd.gov/licensing.aspx', licenseDesc: 'Department of Labor and Regulation licenses.', inmateName: 'South Dakota DOC Offender Locator', inmateUrl: 'https://doc.sd.gov/', inmateDesc: 'Correctional offender locator.', voterName: 'South Dakota Secretary of State (Voter Information Portal)', voterUrl: 'https://vip.sdsos.gov/VIPLogin.aspx', voterDesc: 'South Dakota voter registration status, party affiliation, and county auditor contacts.' },
  TN: { name: 'Tennessee', defaultCounty: 'Davidson County', domain: 'tn.gov', courtName: 'Tennessee Administrative Office of the Courts', courtUrl: 'https://www.tncourts.gov/', courtDesc: 'Circuit, Chancery, and Criminal court directories.', corpName: 'Tennessee SOS Business Services Online', corpUrl: 'https://tnbear.tn.gov/Ecommerce/FilingSearch.aspx', corpDesc: 'Corporate charters, assumed names, and registered agents.', licenseName: 'Tennessee Commerce & Insurance License Search', licenseUrl: 'https://verify.tn.gov/', licenseDesc: 'Regulatory boards verification.', inmateName: 'Tennessee TDOC Felony Offender Search (FOISS)', inmateUrl: 'https://apps.tn.gov/foiss/', inmateDesc: 'Felony offender information search.', voterName: 'Tennessee Secretary of State (Voter Information Lookup)', voterUrl: 'https://tnmap.tn.gov/voterlookup/', voterDesc: 'Tennessee Division of Elections voter registration verification and county election commission.' },
  TX: { name: 'Texas', defaultCounty: 'Harris County', domain: 'texas.gov', courtName: 're:SearchTX / Texas Judicial Branch', courtUrl: 'https://researchtx.tylerhost.net/', courtDesc: 'Statewide case search covering Texas District, County, and Probate courts.', corpName: 'Texas SOSDirect / Comptroller Entity Search', corpUrl: 'https://mycpa.cpa.state.tx.us/coa/', corpDesc: 'Texas franchise tax entity status, registered officers, and LLC filings.', licenseName: 'Texas TDLR / Medical Board License Verification', licenseUrl: 'https://www.tdlr.texas.gov/verify.htm', licenseDesc: 'Department of Licensing and Regulation credential lookups.', inmateName: 'Texas TDCJ Inmate Information Search', inmateUrl: 'https://inmate.tdcj.texas.gov/InmateSearch/', inmateDesc: 'Texas Department of Criminal Justice offender search.', voterName: 'Texas Secretary of State (My Voter Portal - MVP)', voterUrl: 'https://teamrv-mvp.sos.texas.gov/MVP/mvp.do', voterDesc: 'Texas SOS official voter registration status, county voting precinct, and election administrator.' },
  UT: { name: 'Utah', defaultCounty: 'Salt Lake County', domain: 'utah.gov', courtName: 'Utah State Courts (XChange)', courtUrl: 'https://www.utcourts.gov/xchange/', courtDesc: 'District and Justice court case records.', corpName: 'Utah Business Entity Search', corpUrl: 'https://secure.utah.gov/bes/', corpDesc: 'Commerce division entity registrations.', licenseName: 'Utah DOPL License Verification', licenseUrl: 'https://secure.utah.gov/llv/search/index.html', licenseDesc: 'Division of Professional Licensing.', inmateName: 'Utah DOC Offender Search', inmateUrl: 'https://corrections.utah.gov/', inmateDesc: 'Department of Corrections lookup.', voterName: 'Utah Lieutenant Governor (Vote.Utah.gov Portal)', voterUrl: 'https://votesearch.utah.gov/', voterDesc: 'Utah official voter registration lookup, political party affiliation, and county clerk records.' },
  VT: { name: 'Vermont', defaultCounty: 'Chittenden County', domain: 'vermont.gov', courtName: 'Vermont Judiciary Public Portal', courtUrl: 'https://www.vermontjudiciary.org/court-records', courtDesc: 'Superior Court case records.', corpName: 'Vermont SOS Business Entity Search', corpUrl: 'https://bizfilings.vermont.gov/online/BusinessInquire/', corpDesc: 'Business filings and registrations.', licenseName: 'Vermont OPR License Lookup', licenseUrl: 'https://sos.vermont.gov/opr/', licenseDesc: 'Office of Professional Regulation.', inmateName: 'Vermont DOC Inmate Locator', inmateUrl: 'https://doc.vermont.gov/', inmateDesc: 'Correctional facility locator.', voterName: 'Vermont Secretary of State (My Voter Page - MVP)', voterUrl: 'https://mvp.vermont.gov/', voterDesc: 'Vermont voter registration status, town checklist, and municipal clerk directory.' },
  VA: { name: 'Virginia', defaultCounty: 'Fairfax County', domain: 'virginia.gov', courtName: 'Virginia Judicial System (Case Information)', courtUrl: 'https://eapps.courts.state.va.us/ocis/landing', courtDesc: 'General District and Circuit Court case information system.', corpName: 'Virginia SCC Clerk Information System (CIS)', corpUrl: 'https://cis.scc.virginia.gov/', corpDesc: 'State Corporation Commission business entity database.', licenseName: 'Virginia DPOR License Lookup', licenseUrl: 'https://www.dpor.virginia.gov/LicenseLookup', licenseDesc: 'Professional and occupational licensing.', inmateName: 'Virginia DOC Offender Locator', inmateUrl: 'https://vadoc.virginia.gov/general-public/offender-locator/', inmateDesc: 'Offender locator system.', voterName: 'Virginia Department of Elections (Citizen Portal)', voterUrl: 'https://vote.elections.virginia.gov/VoterInformation', voterDesc: 'Virginia official voter registration status, voting precinct, and local registrar directory.' },
  WA: { name: 'Washington', defaultCounty: 'King County', domain: 'wa.gov', courtName: 'Washington Courts Odyssey Public Portal', courtUrl: 'https://odysseyportal.courts.wa.gov/odyportal', courtDesc: 'Superior, District, and Municipal court case search.', corpName: 'Washington SOS Corporations Search', corpUrl: 'https://ccfs.sos.wa.gov/#/Home', corpDesc: 'Corporations and Charities filing system.', licenseName: 'Washington DOL Professional License Search', licenseUrl: 'https://fortress.wa.gov/dol/dolprod/bpdLicenseQuery/', licenseDesc: 'Department of Licensing verification.', inmateName: 'Washington DOC Inmate Search', inmateUrl: 'https://www.doc.wa.gov/information/inmate-search/', inmateDesc: 'Department of Corrections inmate search.', voterName: 'Washington Secretary of State (VoteWA Portal)', voterUrl: 'https://voter.votewa.gov/', voterDesc: 'Washington VoteWA voter registration verification, ballot tracking, and county auditor.' },
  WV: { name: 'West Virginia', defaultCounty: 'Kanawha County', domain: 'wv.gov', courtName: 'West Virginia Judiciary E-Filing', courtUrl: 'http://www.courtswv.gov/', courtDesc: 'Circuit and Magistrate court directory.', corpName: 'West Virginia Business Entity Search', corpUrl: 'https://apps.wv.gov/SOS/BusinessEntitySearch/', corpDesc: 'Corporate and LLC registrations.', licenseName: 'West Virginia Professional Licensing', licenseUrl: 'https://www.wv.gov/business/licensing/', licenseDesc: 'Licensing board directories.', inmateName: 'West Virginia DCR Offender Search', inmateUrl: 'https://apps.wv.gov/OJS/OffenderSearch/', inmateDesc: 'Corrections offender search.', voterName: 'West Virginia Secretary of State (Voter Information Check)', voterUrl: 'https://apps.sos.wv.gov/Elections/voter/amiregistered', voterDesc: 'West Virginia voter registration check, party affiliation, and county clerk office.' },
  WI: { name: 'Wisconsin', defaultCounty: 'Milwaukee County', domain: 'wisconsin.gov', courtName: 'Wisconsin Circuit Court Access (WCCA)', courtUrl: 'https://wcca.wicourts.gov/', courtDesc: 'Comprehensive public record of Wisconsin Circuit Court cases.', corpName: 'Wisconsin DFI Corporate Records Database', corpUrl: 'https://www.wdfi.org/apps/CorpSearch/Search.aspx', corpDesc: 'Department of Financial Institutions business database.', licenseName: 'Wisconsin DSPS License Search', licenseUrl: 'https://app.wi.gov/licensesearch', licenseDesc: 'Safety and Professional Services licenses.', inmateName: 'Wisconsin DOC Offender Search (DAI)', inmateUrl: 'https://appsdoc.wi.gov/lop/', inmateDesc: 'Offender tracking locator.', voterName: 'Wisconsin Elections Commission (MyVote Wisconsin)', voterUrl: 'https://myvote.wi.gov/en-us/', voterDesc: 'Wisconsin MyVote voter registration status, municipal clerk, and voting history records.' },
  WY: { name: 'Wyoming', defaultCounty: 'Laramie County', domain: 'wy.gov', courtName: 'Wyoming Judicial Branch Portal', courtUrl: 'https://www.courts.state.wy.us/', courtDesc: 'District and Circuit court records.', corpName: 'Wyoming SOS Business Entity Search', corpUrl: 'https://wyobiz.wyo.gov/Business/FilingSearch.aspx', corpDesc: 'Corporate entities, registered agents, and reports.', licenseName: 'Wyoming Professional Licensing Boards', licenseUrl: 'https://plb.wyo.gov/', licenseDesc: 'Professional board verifications.', inmateName: 'Wyoming WDOC Offender Search', inmateUrl: 'http://corrections.wyo.gov/', inmateDesc: 'Department of Corrections offender lookup.', voterName: 'Wyoming Secretary of State (Elections Division)', voterUrl: 'https://sos.wyo.gov/Elections/', voterDesc: 'Wyoming voter registration guidelines, party affiliation, and county clerk directory.' },
  DC: { name: 'District of Columbia', defaultCounty: 'District of Columbia', domain: 'dc.gov', courtName: 'DC Superior Court (eAccess)', courtUrl: 'https://eaccess.dccourts.gov/eaccess/', courtDesc: 'District of Columbia Superior Court case records.', corpName: 'DC CorpOnline Entity Search', corpUrl: 'https://corponline.dcra.dc.gov/', corpDesc: 'Department of Licensing and Consumer Protection.', licenseName: 'DC Professional License Verification', licenseUrl: 'https://dlcp.dc.gov/page/occupational-and-professional-licensing', licenseDesc: 'Occupational and professional licenses.', inmateName: 'DC Dept of Corrections Inmate Locator', inmateUrl: 'https://doc.dc.gov/', inmateDesc: 'DOC custody tracking.', voterName: 'DC Board of Elections (Voter Registration Status)', voterUrl: 'https://dcboe.org/voters/register-to-vote/check-voter-registration-status', voterDesc: 'District of Columbia Board of Elections voter registration verification and ward/precinct lookup.' },
  PR: { name: 'Puerto Rico', defaultCounty: 'San Juan Municipio', domain: 'pr.gov', courtName: 'Rama Judicial de Puerto Rico (Tribunales)', courtUrl: 'https://tribunalespr.org/', courtDesc: 'Directorio de Tribunales y casos.', corpName: 'Departamento de Estado Registro de Corporaciones', corpUrl: 'https://prcorpfiling.f1hst.com/', corpDesc: 'Registro mercantil y corporaciones de Puerto Rico.', licenseName: 'Junta Reglamentadora de Profesionales', licenseUrl: 'https://www.estado.pr.gov/', licenseDesc: 'Licencias profesionales en Puerto Rico.', inmateName: 'DCR Puerto Rico', inmateUrl: 'http://dcr.pr.gov/', inmateDesc: 'Departamento de Corrección y Rehabilitación.', voterName: 'Comisión Estatal de Elecciones (CEE Puerto Rico)', voterUrl: 'https://ceepur.org/', voterDesc: 'Registro electoral oficial, estatus de elector y precintos de votación en Puerto Rico.' }
};

const CITY_TO_COUNTY = {
  // New York - Wayne County
  'williamson': { county: 'Wayne County', state: 'NY' },
  'sodus': { county: 'Wayne County', state: 'NY' },
  'sodus point': { county: 'Wayne County', state: 'NY' },
  'lyons': { county: 'Wayne County', state: 'NY' },
  'newark': { county: 'Wayne County', state: 'NY' },
  'palmyra': { county: 'Wayne County', state: 'NY' },
  'macedon': { county: 'Wayne County', state: 'NY' },
  'ontario': { county: 'Wayne County', state: 'NY' },
  'walworth': { county: 'Wayne County', state: 'NY' },
  'marion': { county: 'Wayne County', state: 'NY' },
  'clyde': { county: 'Wayne County', state: 'NY' },
  'wolcott': { county: 'Wayne County', state: 'NY' },
  'rose': { county: 'Wayne County', state: 'NY' },
  'savannah': { county: 'Wayne County', state: 'NY' },
  'huron': { county: 'Wayne County', state: 'NY' },
  'butler': { county: 'Wayne County', state: 'NY' },
  'red creek': { county: 'Wayne County', state: 'NY' },
  'pultneyville': { county: 'Wayne County', state: 'NY' },
  'north rose': { county: 'Wayne County', state: 'NY' },
  'east palmyra': { county: 'Wayne County', state: 'NY' },
  // New York - Monroe County
  'rochester': { county: 'Monroe County', state: 'NY' },
  'webster': { county: 'Monroe County', state: 'NY' },
  'fairport': { county: 'Monroe County', state: 'NY' },
  'pittsford': { county: 'Monroe County', state: 'NY' },
  'penfield': { county: 'Monroe County', state: 'NY' },
  'greece': { county: 'Monroe County', state: 'NY' },
  'irondequoit': { county: 'Monroe County', state: 'NY' },
  'brighton': { county: 'Monroe County', state: 'NY' },
  'henrietta': { county: 'Monroe County', state: 'NY' },
  'chili': { county: 'Monroe County', state: 'NY' },
  'gates': { county: 'Monroe County', state: 'NY' },
  'hilton': { county: 'Monroe County', state: 'NY' },
  'brockport': { county: 'Monroe County', state: 'NY' },
  'spencerport': { county: 'Monroe County', state: 'NY' },
  'east rochester': { county: 'Monroe County', state: 'NY' },
  'honeoye falls': { county: 'Monroe County', state: 'NY' },
  'churchville': { county: 'Monroe County', state: 'NY' },
  'scottsville': { county: 'Monroe County', state: 'NY' },
  'mendon': { county: 'Monroe County', state: 'NY' },
  'ogden': { county: 'Monroe County', state: 'NY' },
  'parma': { county: 'Monroe County', state: 'NY' },
  'riga': { county: 'Monroe County', state: 'NY' },
  'rush': { county: 'Monroe County', state: 'NY' },
  'sweden': { county: 'Monroe County', state: 'NY' },
  'wheatland': { county: 'Monroe County', state: 'NY' },
  'clarkson': { county: 'Monroe County', state: 'NY' },
  'hamlin': { county: 'Monroe County', state: 'NY' },
  // New York - Other Regions
  'buffalo': { county: 'Erie County', state: 'NY' },
  'syracuse': { county: 'Onondaga County', state: 'NY' },
  'albany': { county: 'Albany County', state: 'NY' },
  'yonkers': { county: 'Westchester County', state: 'NY' },
  'white plains': { county: 'Westchester County', state: 'NY' },
  'new rochelle': { county: 'Westchester County', state: 'NY' },
  'mount vernon': { county: 'Westchester County', state: 'NY' },
  'new york': { county: 'New York County', state: 'NY' },
  'new york city': { county: 'New York County', state: 'NY' },
  'nyc': { county: 'New York County', state: 'NY' },
  'manhattan': { county: 'New York County', state: 'NY' },
  'brooklyn': { county: 'Kings County', state: 'NY' },
  'queens': { county: 'Queens County', state: 'NY' },
  'bronx': { county: 'Bronx County', state: 'NY' },
  'staten island': { county: 'Richmond County', state: 'NY' },
  'ithaca': { county: 'Tompkins County', state: 'NY' },
  'utica': { county: 'Oneida County', state: 'NY' },
  'schenectady': { county: 'Schenectady County', state: 'NY' },
  'binghamton': { county: 'Broome County', state: 'NY' },
  'canandaigua': { county: 'Ontario County', state: 'NY' },
  'geneva': { county: 'Ontario County', state: 'NY' },
  'victor': { county: 'Ontario County', state: 'NY' },
  'farmington': { county: 'Ontario County', state: 'NY' },
  'auburn': { county: 'Cayuga County', state: 'NY' },
  'oswego': { county: 'Oswego County', state: 'NY' },
  'fulton': { county: 'Oswego County', state: 'NY' },
  'batavia': { county: 'Genesee County', state: 'NY' },
  'geneseo': { county: 'Livingston County', state: 'NY' },
  'watertown': { county: 'Jefferson County', state: 'NY' },
  'plattsburgh': { county: 'Clinton County', state: 'NY' },
  'glens falls': { county: 'Warren County', state: 'NY' },
  'saratoga springs': { county: 'Saratoga County', state: 'NY' },
  'saratoga': { county: 'Saratoga County', state: 'NY' },
  'troy': { county: 'Rensselaer County', state: 'NY' },
  'kingston': { county: 'Ulster County', state: 'NY' },
  'poughkeepsie': { county: 'Dutchess County', state: 'NY' },
  'newburgh': { county: 'Orange County', state: 'NY' },
  'middletown': { county: 'Orange County', state: 'NY' },
  'hempstead': { county: 'Nassau County', state: 'NY' },
  'garden city': { county: 'Nassau County', state: 'NY' },
  'mineola': { county: 'Nassau County', state: 'NY' },
  'oyster bay': { county: 'Nassau County', state: 'NY' },
  'huntington': { county: 'Suffolk County', state: 'NY' },
  'islip': { county: 'Suffolk County', state: 'NY' },
  'babylon': { county: 'Suffolk County', state: 'NY' },
  'brookhaven': { county: 'Suffolk County', state: 'NY' },
  'smithtown': { county: 'Suffolk County', state: 'NY' },
  'riverhead': { county: 'Suffolk County', state: 'NY' },
  'southampton': { county: 'Suffolk County', state: 'NY' },
  // California
  'los angeles': { county: 'Los Angeles County', state: 'CA' },
  'san francisco': { county: 'San Francisco County', state: 'CA' },
  'san diego': { county: 'San Diego County', state: 'CA' },
  'san jose': { county: 'Santa Clara County', state: 'CA' },
  'sacramento': { county: 'Sacramento County', state: 'CA' },
  'oakland': { county: 'Alameda County', state: 'CA' },
  'irvine': { county: 'Orange County', state: 'CA' },
  'anaheim': { county: 'Orange County', state: 'CA' },
  'santa ana': { county: 'Orange County', state: 'CA' },
  'fresno': { county: 'Fresno County', state: 'CA' },
  'long beach': { county: 'Los Angeles County', state: 'CA' },
  'riverside': { county: 'Riverside County', state: 'CA' },
  'bakersfield': { county: 'Kern County', state: 'CA' },
  'palo alto': { county: 'Santa Clara County', state: 'CA' },
  'berkeley': { county: 'Alameda County', state: 'CA' },
  'pasadena': { county: 'Los Angeles County', state: 'CA' },
  // Texas
  'houston': { county: 'Harris County', state: 'TX' },
  'dallas': { county: 'Dallas County', state: 'TX' },
  'austin': { county: 'Travis County', state: 'TX' },
  'fort worth': { county: 'Tarrant County', state: 'TX' },
  'san antonio': { county: 'Bexar County', state: 'TX' },
  'el paso': { county: 'El Paso County', state: 'TX' },
  'arlington': { county: 'Tarrant County', state: 'TX' },
  'plano': { county: 'Collin County', state: 'TX' },
  'frisco': { county: 'Collin County', state: 'TX' },
  'mckinney': { county: 'Collin County', state: 'TX' },
  'denton': { county: 'Denton County', state: 'TX' },
  'round rock': { county: 'Williamson County', state: 'TX' },
  'lubbock': { county: 'Lubbock County', state: 'TX' },
  'irving': { county: 'Dallas County', state: 'TX' },
  'garland': { county: 'Dallas County', state: 'TX' },
  'grand prairie': { county: 'Dallas County', state: 'TX' },
  'corpus christi': { county: 'Nueces County', state: 'TX' },
  'the woodlands': { county: 'Montgomery County', state: 'TX' },
  'woodlands': { county: 'Montgomery County', state: 'TX' },
  'sugar land': { county: 'Fort Bend County', state: 'TX' },
  'katy': { county: 'Harris County', state: 'TX' },
  // Florida
  'miami': { county: 'Miami-Dade County', state: 'FL' },
  'orlando': { county: 'Orange County', state: 'FL' },
  'tampa': { county: 'Hillsborough County', state: 'FL' },
  'jacksonville': { county: 'Duval County', state: 'FL' },
  'fort lauderdale': { county: 'Broward County', state: 'FL' },
  'st petersburg': { county: 'Pinellas County', state: 'FL' },
  'tallahassee': { county: 'Leon County', state: 'FL' },
  'west palm beach': { county: 'Palm Beach County', state: 'FL' },
  'boca raton': { county: 'Palm Beach County', state: 'FL' },
  'gainesville': { county: 'Alachua County', state: 'FL' },
  // Illinois
  'chicago': { county: 'Cook County', state: 'IL' },
  'aurora': { county: 'Kane County', state: 'IL' },
  'rockford': { county: 'Winnebago County', state: 'IL' },
  'naperville': { county: 'DuPage County', state: 'IL' },
  'springfield': { county: 'Sangamon County', state: 'IL' },
  'peoria': { county: 'Peoria County', state: 'IL' },
  'evanston': { county: 'Cook County', state: 'IL' },
  // Pennsylvania
  'philadelphia': { county: 'Philadelphia County', state: 'PA' },
  'pittsburgh': { county: 'Allegheny County', state: 'PA' },
  'allentown': { county: 'Lehigh County', state: 'PA' },
  'erie': { county: 'Erie County', state: 'PA' },
  'harrisburg': { county: 'Dauphin County', state: 'PA' },
  // Washington
  'seattle': { county: 'King County', state: 'WA' },
  'spokane': { county: 'Spokane County', state: 'WA' },
  'tacoma': { county: 'Pierce County', state: 'WA' },
  'vancouver': { county: 'Clark County', state: 'WA' },
  'bellevue': { county: 'King County', state: 'WA' },
  // Georgia
  'atlanta': { county: 'Fulton County', state: 'GA' },
  'augusta': { county: 'Richmond County', state: 'GA' },
  'savannah': { county: 'Chatham County', state: 'GA' },
  // North Carolina
  'charlotte': { county: 'Mecklenburg County', state: 'NC' },
  'mecklenburg': { county: 'Mecklenburg County', state: 'NC' },
  'mecklenburg county': { county: 'Mecklenburg County', state: 'NC' },
  'raleigh': { county: 'Wake County', state: 'NC' },
  'cary': { county: 'Wake County', state: 'NC' },
  'apex': { county: 'Wake County', state: 'NC' },
  'morrisville': { county: 'Wake County', state: 'NC' },
  'wake forest': { county: 'Wake County', state: 'NC' },
  'holly springs': { county: 'Wake County', state: 'NC' },
  'garner': { county: 'Wake County', state: 'NC' },
  'fuquay-varina': { county: 'Wake County', state: 'NC' },
  'greensboro': { county: 'Guilford County', state: 'NC' },
  'durham': { county: 'Durham County', state: 'NC' },
  'chapel hill': { county: 'Orange County', state: 'NC' },
  'winston-salem': { county: 'Forsyth County', state: 'NC' },
  'winston salem': { county: 'Forsyth County', state: 'NC' },
  'fayetteville': { county: 'Cumberland County', state: 'NC' },
  'wilmington': { county: 'New Hanover County', state: 'NC' },
  'asheville': { county: 'Buncombe County', state: 'NC' },
  'concord': { county: 'Cabarrus County', state: 'NC' },
  'gastonia': { county: 'Gaston County', state: 'NC' },
  'high point': { county: 'Guilford County', state: 'NC' },
  'huntersville': { county: 'Mecklenburg County', state: 'NC' },
  'matthews': { county: 'Mecklenburg County', state: 'NC' },
  'cornelius': { county: 'Mecklenburg County', state: 'NC' },
  'mint hill': { county: 'Mecklenburg County', state: 'NC' },
  'pineville': { county: 'Mecklenburg County', state: 'NC' },
  // Michigan
  'detroit': { county: 'Wayne County', state: 'MI' },
  'grand rapids': { county: 'Kent County', state: 'MI' },
  'ann arbor': { county: 'Washtenaw County', state: 'MI' },
  // Colorado
  'denver': { county: 'Denver County', state: 'CO' },
  'colorado springs': { county: 'El Paso County', state: 'CO' },
  'boulder': { county: 'Boulder County', state: 'CO' },
  // Arizona
  'phoenix': { county: 'Maricopa County', state: 'AZ' },
  'tucson': { county: 'Pima County', state: 'AZ' },
  'scottsdale': { county: 'Maricopa County', state: 'AZ' },
  // Massachusetts
  'boston': { county: 'Suffolk County', state: 'MA' },
  'cambridge': { county: 'Middlesex County', state: 'MA' },
  'worcester': { county: 'Worcester County', state: 'MA' },
  // Ohio
  'columbus': { county: 'Franklin County', state: 'OH' },
  'cleveland': { county: 'Cuyahoga County', state: 'OH' },
  'cincinnati': { county: 'Hamilton County', state: 'OH' },
  // Virginia
  'virginia beach': { county: 'Virginia Beach City', state: 'VA' },
  'richmond': { county: 'Richmond City', state: 'VA' },
  'fairfax': { county: 'Fairfax County', state: 'VA' },
  'arlington': { county: 'Arlington County', state: 'VA' },
  // Maryland
  'baltimore': { county: 'Baltimore City', state: 'MD' },
  'bethesda': { county: 'Montgomery County', state: 'MD' },
  'rockville': { county: 'Montgomery County', state: 'MD' },
  // Minnesota
  'minneapolis': { county: 'Hennepin County', state: 'MN' },
  'saint paul': { county: 'Ramsey County', state: 'MN' },
  // Louisiana
  'new orleans': { county: 'Orleans Parish', state: 'LA' },
  'baton rouge': { county: 'East Baton Rouge Parish', state: 'LA' },
  'metairie': { county: 'Jefferson Parish', state: 'LA' },
  'kenner': { county: 'Jefferson Parish', state: 'LA' },
  'shreveport': { county: 'Caddo Parish', state: 'LA' },
  'bossier city': { county: 'Bossier Parish', state: 'LA' },
  'lafayette': { county: 'Lafayette Parish', state: 'LA' },
  'lake charles': { county: 'Calcasieu Parish', state: 'LA' },
  'monroe': { county: 'Ouachita Parish', state: 'LA' },
  'houma': { county: 'Terrebonne Parish', state: 'LA' },
  // Nevada
  'las vegas': { county: 'Clark County', state: 'NV' },
  'reno': { county: 'Washoe County', state: 'NV' },
  // Oregon
  'portland': { county: 'Multnomah County', state: 'OR' },
  'eugene': { county: 'Lane County', state: 'OR' },
  // Tennessee
  'nashville': { county: 'Davidson County', state: 'TN' },
  'memphis': { county: 'Shelby County', state: 'TN' },
  // Missouri
  'kansas city': { county: 'Jackson County', state: 'MO' },
  'st louis': { county: 'St. Louis City', state: 'MO' },
  'st. louis': { county: 'St. Louis City', state: 'MO' },
  'saint louis': { county: 'St. Louis City', state: 'MO' },
  // Indiana
  'indianapolis': { county: 'Marion County', state: 'IN' },
  // Utah
  'salt lake city': { county: 'Salt Lake County', state: 'UT' },
  // Wisconsin
  'milwaukee': { county: 'Milwaukee County', state: 'WI' },
  // Hawaii
  'honolulu': { county: 'Honolulu County', state: 'HI' },
  // Oklahoma
  'oklahoma city': { county: 'Oklahoma County', state: 'OK' },
  // California additional metros
  'oakland': { county: 'Alameda County', state: 'CA' },
  'riverside': { county: 'Riverside County', state: 'CA' },
  'san bernardino': { county: 'San Bernardino County', state: 'CA' },
  'anaheim': { county: 'Orange County', state: 'CA' },
  'santa ana': { county: 'Orange County', state: 'CA' },
  'irvine': { county: 'Orange County', state: 'CA' },
  // Florida additional metros
  'fort lauderdale': { county: 'Broward County', state: 'FL' },
  'st. petersburg': { county: 'Pinellas County', state: 'FL' },
  // Maryland / Virginia DC Suburbs
  'bethesda': { county: 'Montgomery County', state: 'MD' },
  'silver spring': { county: 'Montgomery County', state: 'MD' },
  'rockville': { county: 'Montgomery County', state: 'MD' },
  'fairfax': { county: 'Fairfax County', state: 'VA' },
  'alexandria': { county: 'Fairfax County', state: 'VA' },
  'arlington': { county: 'Fairfax County', state: 'VA' },
  // District of Columbia
  'washington': { county: 'District of Columbia', state: 'DC' },
  'washington dc': { county: 'District of Columbia', state: 'DC' },
  // Additional major metropolitan hubs
  'clearwater': { county: 'Pinellas County', state: 'FL' },
  'albuquerque': { county: 'Bernalillo County', state: 'NM' },
  'louisville': { county: 'Jefferson County', state: 'KY' },
  'omaha': { county: 'Douglas County', state: 'NE' },
  'tulsa': { county: 'Tulsa County', state: 'OK' },
  'overland park': { county: 'Johnson County', state: 'KS' },
  'olathe': { county: 'Johnson County', state: 'KS' },
  'pontiac': { county: 'Oakland County', state: 'MI' }
};

// -------------------------------------------------------------
// IN-WORKSTATION DIRECT COUNTY DIRECTORY HUBS
// Complete departmental directories (Assessor, Deeds, Tax Collector,
// GIS, Courts, and Vital/DBA) for official county records with 0 ads.
// -------------------------------------------------------------
const COUNTY_NETR_HUBS = {
  "IL:cook": {
    "name": "Cook County",
    "state": "IL",
    "metro": "Chicago Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Cook County Assessor's Office",
        "scope": "Property Assessment",
        "desc": "Real property ownership, parcel valuations, building specs & tax assessment rolls.",
        "url": "https://www.cookcountyassessor.com/address-search",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Cook County Clerk - Recording Division",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, mortgages, liens, deeds of trust & plat maps.",
        "url": "https://cookcountyclerkil.gov/recordings",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Cook County Treasurer's Office",
        "scope": "Tax Bills & Collections",
        "desc": "Real estate tax bills, payment histories, installment receipts & delinquent tax rolls.",
        "url": "https://www.cookcountytreasurer.com/setsearchparameters.aspx",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "CookCountyViewer Interactive Parcel GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries, PIN lookup & aerial maps.",
        "url": "https://cookviewer1.cookcountyil.gov/cookviewer/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Cook County Circuit Court Clerk",
        "scope": "Civil & Court Dockets",
        "desc": "Electronic court docket inquiry across Civil, Law, Chancery, Probate & Municipal divisions.",
        "url": "https://www.cookcountyclerkofcourt.org/court-records",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Cook County Clerk (Vital & Assumed Names)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names (DBA / Sole Proprietorships), marriage records & vital statistics.",
        "url": "https://cookcountyclerkil.gov/vital-records",
        "label": "DBA & Vital"
      }
    ]
  },
  "IL:dupage": {
    "name": "DuPage County",
    "state": "IL",
    "metro": "DuPage / West Suburbs",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "DuPage County Assessment Office",
        "scope": "Property Assessment",
        "desc": "County property appraisal records, assessed valuation & parcel numbers.",
        "url": "https://www.dupagecounty.gov/PropertyInfo/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "DuPage County Recorder",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.dupagecounty.gov/recorder/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "DuPage County Treasurer (Tax Lookup)",
        "scope": "Property Taxes",
        "desc": "Real estate tax bills, payment status & tax delinquency records.",
        "url": "https://www.dupagecounty.gov/treasurer/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "DuPage County Parcel GIS Explorer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & aerial imagery.",
        "url": "https://dupage.maps.arcgis.com/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "DuPage County 18th Judicial Circuit Clerk",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit court case records, civil lawsuits, probate & court dockets.",
        "url": "https://epay.18thjudicial.org/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "DuPage County Clerk (DBA & Vital)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names, marriage records & official county filings.",
        "url": "https://www.dupagecounty.gov/clerk/",
        "label": "DBA & Vital"
      }
    ]
  },
  "CA:los angeles": {
    "name": "Los Angeles County",
    "state": "CA",
    "metro": "Los Angeles Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "LA County Office of the Assessor",
        "scope": "Property Assessment",
        "desc": "Real property ownership, parcel valuations, building specs & tax assessment rolls.",
        "url": "https://portal.assessor.lacounty.gov/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "LA County Registrar-Recorder (Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://lavote.gov/home/records/property-records",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "LA County Treasurer and Tax Collector (TTC)",
        "scope": "Tax Bills & Collections",
        "desc": "Secured property tax bills, installment payment status & delinquent tax rolls.",
        "url": "https://ttc.lacounty.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "LA County GIS Parcel Boundary Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries, zoning & aerial maps.",
        "url": "https://assessor.lacounty.gov/gis/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Los Angeles Superior Court Online Services",
        "scope": "Civil & Court Dockets",
        "desc": "Civil litigation dockets, small claims, probate, family law & court judgments.",
        "url": "https://www.lacourt.org/online-services/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "LA County Registrar (FBN / DBA & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Fictitious Business Names (FBN / DBA), marriage certificates & vital records.",
        "url": "https://lavote.gov/home/records/fictitious-business-names",
        "label": "DBA & Vital"
      }
    ]
  },
  "CA:san diego": {
    "name": "San Diego County",
    "state": "CA",
    "metro": "San Diego Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "San Diego County Assessor",
        "scope": "Property Rolls & Values",
        "desc": "County property appraisal records, assessed valuation & parcel ownership.",
        "url": "https://arcc.sdcounty.ca.gov/Pages/assessor.aspx",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "San Diego County Recorder of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded deeds, mortgages, liens, deeds of trust & title filings.",
        "url": "https://arcc.sdcounty.ca.gov/Pages/recorder.aspx",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "San Diego County Treasurer-Tax Collector",
        "scope": "Property Taxes",
        "desc": "Secured property tax bills, payment verification & tax collection records.",
        "url": "https://www.sdttc.com/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "SanGIS Interactive Parcel Map",
        "scope": "GIS & Parcel Maps",
        "desc": "Joint city/county geographic information system parcel lookup and boundary maps.",
        "url": "https://www.sangis.org/",
        "label": "SanGIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "San Diego Superior Court Portal",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil case records, probate, family dockets & judgments.",
        "url": "https://www.sdcourt.ca.gov/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "San Diego County Clerk (FBN & Vital)",
        "scope": "DBA & Vital Records",
        "desc": "Fictitious business names, business licenses & marriage certificates.",
        "url": "https://arcc.sdcounty.ca.gov/Pages/fictitious.aspx",
        "label": "DBA & Vital"
      }
    ]
  },
  "CA:orange": {
    "name": "Orange County",
    "state": "CA",
    "metro": "Orange County / Anaheim",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Orange County Assessor",
        "scope": "Property Rolls",
        "desc": "Property tax assessment rolls, parcel specs & residential valuations.",
        "url": "https://www.ocgov.com/government/assessor-department",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Orange County Clerk-Recorder (Real Estate)",
        "scope": "Deeds & Mortgages",
        "desc": "Real property recorded documents, deeds, grant deeds, mortgages & liens.",
        "url": "https://cr.ocgov.com/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Orange County Treasurer-Tax Collector",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://www.ttc.ocgov.com/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "OC Land Records & Parcel GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://ocgis.com/ocpw/landrecords/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Orange County Superior Court Services",
        "scope": "Civil & Court Dockets",
        "desc": "Civil, probate, family law & small claims court records search.",
        "url": "https://www.occourts.org/online-services",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Orange County Clerk (Fictitious Names)",
        "scope": "DBA & Vital Registry",
        "desc": "Fictitious business name filings, marriage certificates & official records.",
        "url": "https://cr.ocgov.com/",
        "label": "DBA & Vital"
      }
    ]
  },
  "CA:santa clara": {
    "name": "Santa Clara County",
    "state": "CA",
    "metro": "Silicon Valley / San Jose",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Santa Clara County Assessor",
        "scope": "Property Rolls",
        "desc": "Silicon Valley property ownership rolls, assessment records & valuations.",
        "url": "https://www.sccassessor.org/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Santa Clara County Clerk-Recorder",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & conveyances.",
        "url": "https://clerkrecorder.sccgov.org/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Santa Clara Dept of Tax & Collections",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://dtac.sccgov.org/property-tax-search",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Santa Clara County GIS Parcel Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://sccgov.maps.arcgis.com/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Santa Clara County Superior Court",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.scscourt.org/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Santa Clara County Clerk (FBN & Vital)",
        "scope": "DBA & Vital Records",
        "desc": "Fictitious business names (DBA), notary filings & marriage records.",
        "url": "https://clerkrecorder.sccgov.org/",
        "label": "DBA & Vital"
      }
    ]
  },
  "CA:alameda": {
    "name": "Alameda County",
    "state": "CA",
    "metro": "Oakland / East Bay",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Alameda County Assessor",
        "scope": "Property Assessment",
        "desc": "County property appraisal records, assessed valuation & parcel numbers.",
        "url": "https://www.acgov.org/assessor/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Alameda County Clerk-Recorder",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, mortgages, deeds of trust & liens.",
        "url": "https://acgov.org/auditor/clerk/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Alameda County Treasurer-Tax Collector",
        "scope": "Property Taxes",
        "desc": "Real estate secured tax bills, payment status & tax delinquency lookup.",
        "url": "https://www.acgov.org/treasurer/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Alameda County Public GIS Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & aerial imagery.",
        "url": "https://www.acgov.org/gis/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Alameda County Superior Court Portal",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil case records, probate, family dockets & judgments.",
        "url": "https://www.alameda.courts.ca.gov/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Alameda County Clerk (DBA & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Fictitious business names, business licenses & marriage certificates.",
        "url": "https://acgov.org/auditor/clerk/",
        "label": "DBA & Vital"
      }
    ]
  },
  "CA:san francisco": {
    "name": "San Francisco",
    "state": "CA",
    "metro": "San Francisco (City & County)",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "SF Office of the Assessor-Recorder",
        "scope": "Property Assessment",
        "desc": "San Francisco real property assessment rolls, valuation & parcel lookup.",
        "url": "https://sfassessor.org/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "San Francisco Official Land Records",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://sfassessor.org/recorder-services",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "San Francisco Treasurer & Tax Collector",
        "scope": "Property Taxes",
        "desc": "Property tax billing inquiry, payment confirmation & tax balances.",
        "url": "https://sftreasurer.org/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "SF Property Information Map (PIM)",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive GIS parcel boundary tool with zoning, permits & building history.",
        "url": "https://sfplanninggis.org/pim/",
        "label": "SF PIM Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "San Francisco Superior Court Dockets",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil case records, probate, family dockets & judgments.",
        "url": "https://www.sfsuperiorcourt.org/online-services",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "San Francisco County Clerk (FBN & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Fictitious business names (DBA), domestic partnerships & marriage records.",
        "url": "https://sfgov.org/countyclerk/",
        "label": "DBA & Vital"
      }
    ]
  },
  "CA:riverside": {
    "name": "Riverside County",
    "state": "CA",
    "metro": "Inland Empire / Riverside",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Riverside County Assessor",
        "scope": "Property Assessment",
        "desc": "County property appraisal records, assessed valuation & parcel numbers.",
        "url": "https://www.countynew.org/services/assessor",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Riverside County Recorder",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded deeds, mortgages, liens, deeds of trust & title filings.",
        "url": "https://recorder.countyofriverside.us/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Riverside County Treasurer-Tax Collector",
        "scope": "Property Taxes",
        "desc": "Secured property tax bills, payment verification & tax collection records.",
        "url": "https://countytreasurer.org/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Riverside County Map My County GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive GIS parcel boundary tool with land zoning & aerial imagery.",
        "url": "https://gis.countyofriverside.us/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Riverside County Superior Court",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil case records, probate, family dockets & judgments.",
        "url": "https://www.riverside.courts.ca.gov/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Riverside County Clerk (FBN & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Fictitious business names, business licenses & marriage certificates.",
        "url": "https://recorder.countyofriverside.us/",
        "label": "DBA & Vital"
      }
    ]
  },
  "CA:san bernardino": {
    "name": "San Bernardino County",
    "state": "CA",
    "metro": "Inland Empire / San Bernardino",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "San Bernardino County Assessor",
        "scope": "Property Assessment",
        "desc": "Property tax assessment rolls, parcel specs & residential valuations.",
        "url": "https://arc.sbcounty.gov/assessor/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "San Bernardino County Recorder of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://arc.sbcounty.gov/recorder/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "San Bernardino County Tax Collector",
        "scope": "Property Taxes",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://www.mytaxcollector.com/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "San Bernardino Open Data & Parcel Maps",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://sbcounty.maps.arcgis.com/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "San Bernardino Superior Court",
        "scope": "Civil & Court Dockets",
        "desc": "Civil, probate, family law & small claims court records search.",
        "url": "https://www.sb-court.org/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "San Bernardino County Clerk (FBN)",
        "scope": "DBA & Vital Registry",
        "desc": "Fictitious business name filings, marriage certificates & official records.",
        "url": "https://arc.sbcounty.gov/",
        "label": "DBA & Vital"
      }
    ]
  },
  "TX:harris": {
    "name": "Harris County",
    "state": "TX",
    "metro": "Houston Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Harris Central Appraisal District (HCAD)",
        "scope": "Property Assessment",
        "desc": "Real property ownership, parcel valuations, building specs & tax appraisal rolls.",
        "url": "https://hcad.org/property-search",
        "label": "HCAD Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Harris County Clerk (Real Property Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://www.cclerk.hctx.net/applications/websearch/RP.aspx",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Harris County Tax Assessor-Collector",
        "scope": "Tax Bills & Collections",
        "desc": "Property tax statements, payment histories, installment receipts & tax rolls.",
        "url": "https://www.hctax.net/Property/PropertyTax",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "HCAD Interactive Parcel Map Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & aerial mapping.",
        "url": "https://hcad.org/hcad-online-services/interactive-mapping",
        "label": "HCAD Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Harris County District & County Court Dockets",
        "scope": "Civil & Court Dockets",
        "desc": "Electronic court docket inquiry across Civil, Family, Probate & Criminal dockets.",
        "url": "https://www.cclerk.hctx.net/applications/websearch/courtsearch.aspx",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Harris County Clerk (Assumed Names / DBA)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business name filings (DBA), marriage records & vital statistics.",
        "url": "https://www.cclerk.hctx.net/applications/websearch/DBA.aspx",
        "label": "DBA & Vital"
      }
    ]
  },
  "TX:dallas": {
    "name": "Dallas County",
    "state": "TX",
    "metro": "Dallas Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Dallas Central Appraisal District (DCAD)",
        "scope": "Property Assessment",
        "desc": "Dallas County property appraisal records, assessed valuation & parcel numbers.",
        "url": "https://www.dallascad.org/",
        "label": "DCAD Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Dallas County Clerk (Recording Division)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, deeds of trust, liens & property transfers.",
        "url": "https://www.dallascounty.org/government/county-clerk/recording/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Dallas County Tax Office",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, tax billing statements & tax delinquency search.",
        "url": "https://www.dallascounty.org/departments/tax/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "DCAD Interactive GIS Parcel Search",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://www.dallascad.org/SearchOwner.aspx",
        "label": "DCAD Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Dallas County Court Case Search",
        "scope": "Civil & Court Dockets",
        "desc": "District and county court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.dallascounty.org/services/record-search/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Dallas County Clerk (Assumed Names)",
        "scope": "DBA & Vital Registry",
        "desc": "Assumed business names (DBA / Sole Proprietorships) & marriage certificates.",
        "url": "https://www.dallascounty.org/government/county-clerk/assumed-names.php",
        "label": "DBA & Vital"
      }
    ]
  },
  "TX:travis": {
    "name": "Travis County",
    "state": "TX",
    "metro": "Austin Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Travis Central Appraisal District (TCAD)",
        "scope": "Property Assessment",
        "desc": "Austin and Travis County property appraisal records & assessed valuation.",
        "url": "https://traviscad.org/",
        "label": "TCAD Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Travis County Clerk (Recording Division)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://countyclerk.traviscountytx.gov/departments/recording/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Travis County Tax Office (Property Taxes)",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://tax-office.traviscountytx.gov/properties/taxes",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Travis County Interactive Parcel Map",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://travis.prodigycad.com/maps",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Travis County District Clerk Court Records",
        "scope": "Civil & Court Dockets",
        "desc": "District and county court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.traviscountytx.gov/district-clerk/online-services",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Travis County Clerk (DBA & Vital)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names, marriage records & official county filings.",
        "url": "https://countyclerk.traviscountytx.gov/",
        "label": "DBA & Vital"
      }
    ]
  },
  "TX:tarrant": {
    "name": "Tarrant County",
    "state": "TX",
    "metro": "Fort Worth Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Tarrant Appraisal District (TAD)",
        "scope": "Property Assessment",
        "desc": "Tarrant County property appraisal records, assessed valuation & parcel numbers.",
        "url": "https://www.tad.org/",
        "label": "TAD Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Tarrant County Clerk (Real Estate Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, deeds of trust, liens & property transfers.",
        "url": "https://www.tarrantcountytx.gov/en/county-clerk/real-estate-records.html",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Tarrant County Tax Assessor-Collector",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, tax billing statements & tax delinquency search.",
        "url": "https://taxonline.tarrantcounty.com/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "TAD Interactive Mapping Services",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://www.tad.org/gis-data/",
        "label": "TAD Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Tarrant County Electronic Court Case Access",
        "scope": "Civil & Court Dockets",
        "desc": "District and county court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.tarrantcountytx.gov/en/district-clerk/electronic-case-access.html",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Tarrant County Clerk (Assumed Names & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Assumed business names, business licenses & marriage certificates.",
        "url": "https://www.tarrantcountytx.gov/en/county-clerk.html",
        "label": "DBA & Vital"
      }
    ]
  },
  "TX:bexar": {
    "name": "Bexar County",
    "state": "TX",
    "metro": "San Antonio Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Bexar Appraisal District (BCAD)",
        "scope": "Property Assessment",
        "desc": "San Antonio and Bexar County property appraisal records & assessed valuation.",
        "url": "https://www.bcad.org/",
        "label": "BCAD Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Bexar County Clerk (Deed Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded deeds, mortgages, liens, deeds of trust & title filings.",
        "url": "https://www.bexar.org/2946/County-Clerk",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Bexar County Tax Assessor-Collector",
        "scope": "Property Taxes",
        "desc": "Real estate tax bills, payment status & tax delinquency records.",
        "url": "https://www.bexar.org/tax/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "BCAD Interactive Map Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & aerial imagery.",
        "url": "https://www.bcad.org/clientdb/Map.aspx",
        "label": "BCAD Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Bexar County Court Records Portal",
        "scope": "Civil & Court Dockets",
        "desc": "District and county court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://portal-txbexar.tylertech.cloud/Portal/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Bexar County Clerk (DBA & Vital)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names (DBA), notary filings & marriage records.",
        "url": "https://www.bexar.org/2946/County-Clerk",
        "label": "DBA & Vital"
      }
    ]
  },
  "FL:miami-dade": {
    "name": "Miami-Dade County",
    "state": "FL",
    "metro": "Miami Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Miami-Dade Property Appraiser (PA)",
        "scope": "Property Appraisal",
        "desc": "Property ownership, assessment rolls, square footage, building specs & parcel valuations.",
        "url": "https://www.miamidade.gov/pa/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Miami-Dade Clerk of Court (Official Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, mortgages, liens, deeds of trust & plat maps.",
        "url": "https://www.miamidadeclerk.gov/clerk/official-records.page",
        "label": "Official Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Miami-Dade Tax Collector (Property Taxes)",
        "scope": "Tax Bills & Collections",
        "desc": "Real estate tax bills, payment histories, installment receipts & delinquent tax rolls.",
        "url": "https://miamidade.county-taxes.com/public",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "MDCPropertySearch Interactive GIS Map",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries, aerial imagery & zoning overlays.",
        "url": "https://gisweb.miamidade.gov/MDCPropertySearch/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Miami-Dade Online Court System (OCS)",
        "scope": "Civil & Court Dockets",
        "desc": "Civil litigation dockets, small claims, probate, family law & court judgments.",
        "url": "https://www2.miamidadeclerk.gov/ocs/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Miami-Dade County Clerk (Marriage & Vital)",
        "scope": "DBA & Vital Records",
        "desc": "Marriage certificates, vital records & county clerk filings.",
        "url": "https://www.miamidadeclerk.gov/clerk/vital-records.page",
        "label": "DBA & Vital"
      }
    ]
  },
  "FL:broward": {
    "name": "Broward County",
    "state": "FL",
    "metro": "Fort Lauderdale Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Broward County Property Appraiser (BCPA)",
        "scope": "Property Assessment",
        "desc": "Broward County property appraisal records, assessed valuation & parcel numbers.",
        "url": "https://bcpa.net/",
        "label": "BCPA Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Broward Clerk of Court (Official Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.browardclerk.org/Divisions/OfficialRecords",
        "label": "Official Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Broward County Tax Collector",
        "scope": "Property Taxes",
        "desc": "Real estate secured tax bills, payment status & tax delinquency lookup.",
        "url": "https://broward.county-taxes.com/public",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Broward Enterprise GIS Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & aerial imagery.",
        "url": "https://gis.broward.org/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Broward Clerk of Courts Case Search",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit court case records, civil lawsuits, probate & court dockets.",
        "url": "https://www.browardclerk.org/Web2",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Broward County Clerk (Marriage & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Marriage licenses, vital statistics & county recording documents.",
        "url": "https://www.browardclerk.org/",
        "label": "DBA & Vital"
      }
    ]
  },
  "FL:orange": {
    "name": "Orange County",
    "state": "FL",
    "metro": "Orlando Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Orange County Property Appraiser (OCPA)",
        "scope": "Property Assessment",
        "desc": "Orlando and Orange County property appraisal records & assessed valuation.",
        "url": "https://www.ocpafl.org/",
        "label": "OCPA Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Orange County Comptroller (Official Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://www.myorangeclerk.com/Divisions/Records/Official-Records",
        "label": "Official Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Orange County Tax Collector",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://octaxcol.com/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "OCPA Interactive GIS Parcel Search",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://www.ocpafl.org/Searches/ParcelSearch.aspx",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Orange County myeClerk Case Search",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit court case records, civil lawsuits, probate & court dockets.",
        "url": "https://myeclerk.myorangeclerk.com/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Orange County Comptroller (Marriage & Vital)",
        "scope": "DBA & Vital Records",
        "desc": "Marriage licenses, official filings & vital records.",
        "url": "https://www.myorangeclerk.com/",
        "label": "DBA & Vital"
      }
    ]
  },
  "FL:hillsborough": {
    "name": "Hillsborough County",
    "state": "FL",
    "metro": "Tampa Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Hillsborough Property Appraiser (HCPA)",
        "scope": "Property Assessment",
        "desc": "Tampa and Hillsborough County property appraisal records, valuation & parcel lookup.",
        "url": "https://www.hcpafl.org/",
        "label": "HCPA Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Hillsborough Clerk of Court (Official Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.hillsclerk.com/official-records",
        "label": "Official Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Hillsborough County Tax Collector",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://hillsborough.county-taxes.com/public",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "HCPA GIS Parcel Search Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://gis.hcpafl.org/propertysearch/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Hillsborough HOVER Court Case Search",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://hover.hillsclerk.com/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Hillsborough Clerk (Marriage & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Marriage certificates, vital records & county clerk filings.",
        "url": "https://www.hillsclerk.com/",
        "label": "DBA & Vital"
      }
    ]
  },
  "NY:new york": {
    "name": "New York County (Manhattan)",
    "state": "NY",
    "metro": "New York City (Manhattan)",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "NYC Dept of Finance Property Assessment",
        "scope": "Property Assessment",
        "desc": "Manhattan real property assessment rolls, valuation, tax class & parcel specs.",
        "url": "https://a836-propertyportal.nyc.gov/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "NYC ACRIS (Manhattan Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded land records, deeds, mortgages, UCCs & property transfers.",
        "url": "https://a836-acris.nyc.gov/CP/",
        "label": "ACRIS Deeds"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "NYC Dept of Finance Property Tax Bills",
        "scope": "Tax Bills & Collections",
        "desc": "Real estate tax bills, payment histories, installment receipts & tax rolls.",
        "url": "https://a836-propertyportal.nyc.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "NYC Digital Tax Map & NYCityMap GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & aerial mapping.",
        "url": "https://maps.nyc.gov/taxmap/",
        "label": "NYC Tax Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "NYSCEF & WebCivil Supreme / Local Courts",
        "scope": "Civil & Court Dockets",
        "desc": "New York Supreme Court civil litigation dockets, judgments & filings.",
        "url": "https://iapps.courts.state.ny.us/webcivil/ecourtsMain",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "New York County Clerk (Corporate & Liens)",
        "scope": "DBA & Corporate Registry",
        "desc": "Business assumed names (DBA), corporate filings, lis pendens & vital statistics.",
        "url": "https://www.nycourts.gov/courts/1jd/supctmanh/county_clerk.shtml",
        "label": "County Clerk"
      }
    ]
  },
  "NY:kings": {
    "name": "Kings County (Brooklyn)",
    "state": "NY",
    "metro": "New York City (Brooklyn)",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "NYC Dept of Finance Property Assessment",
        "scope": "Property Assessment",
        "desc": "Brooklyn property assessment rolls, assessed valuation & parcel numbers.",
        "url": "https://a836-propertyportal.nyc.gov/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "NYC ACRIS (Brooklyn Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://a836-acris.nyc.gov/CP/",
        "label": "ACRIS Deeds"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "NYC Dept of Finance Tax Bills & Collections",
        "scope": "Property Taxes",
        "desc": "Real estate secured tax bills, payment status & tax delinquency lookup.",
        "url": "https://a836-propertyportal.nyc.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "NYC Digital Tax Map & NYCityMap GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & aerial imagery.",
        "url": "https://maps.nyc.gov/taxmap/",
        "label": "NYC Tax Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Kings County Supreme Court Civil Dockets",
        "scope": "Civil & Court Dockets",
        "desc": "Civil litigation dockets, small claims, probate, family law & court judgments.",
        "url": "https://iapps.courts.state.ny.us/webcivil/ecourtsMain",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Kings County Clerk (DBA & Vital Filings)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names (DBA / Sole Proprietorships), notary filings & vital records.",
        "url": "https://www.nycourts.gov/courts/2jd/kings/countyclerk.shtml",
        "label": "County Clerk"
      }
    ]
  },
  "NY:queens": {
    "name": "Queens County",
    "state": "NY",
    "metro": "New York City (Queens)",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "NYC Dept of Finance Property Portal",
        "scope": "Property Assessment",
        "desc": "Queens real property assessment rolls, valuation & parcel lookup.",
        "url": "https://a836-propertyportal.nyc.gov/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "NYC ACRIS (Queens Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://a836-acris.nyc.gov/CP/",
        "label": "ACRIS Deeds"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "NYC Dept of Finance Tax Billing Statements",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://a836-propertyportal.nyc.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "NYC Digital Tax Map GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://maps.nyc.gov/taxmap/",
        "label": "NYC Tax Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Queens County Supreme Court Dockets",
        "scope": "Civil & Court Dockets",
        "desc": "District and county court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://iapps.courts.state.ny.us/webcivil/ecourtsMain",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Queens County Clerk (DBA & Business Records)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names, marriage records & official county filings.",
        "url": "https://www.nycourts.gov/courts/11jd/queens/countyclerk.shtml",
        "label": "County Clerk"
      }
    ]
  },
  "NY:nassau": {
    "name": "Nassau County",
    "state": "NY",
    "metro": "Long Island / Nassau",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Nassau Land Records Viewer (LRV)",
        "scope": "Property Assessment",
        "desc": "Nassau County property appraisal records, assessed valuation & parcel numbers.",
        "url": "https://lrv.nassaucountyny.gov/",
        "label": "LRV Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Nassau County Clerk (Deeds & Mortgages)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.nassaucountyny.gov/435/County-Clerk",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Nassau County Treasurer / Assessment",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://www.nassaucountyny.gov/assessment",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Nassau County GIS Property Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://gis.nassaucountyny.gov/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "NYSCEF Nassau Supreme & County Court",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://iapps.courts.state.ny.us/webcivil/ecourtsMain",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Nassau County Clerk (DBA & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Business assumed names (DBA), notary filings & marriage records.",
        "url": "https://www.nassaucountyny.gov/435/County-Clerk",
        "label": "DBA & Vital"
      }
    ]
  },
  "AZ:maricopa": {
    "name": "Maricopa County",
    "state": "AZ",
    "metro": "Phoenix Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Maricopa County Assessor (Parcel Search)",
        "scope": "Property Rolls & Values",
        "desc": "Real property ownership, parcel valuations, building specs & tax assessment rolls.",
        "url": "https://mcassessor.maricopa.gov/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Maricopa County Recorder (Recorded Documents)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, mortgages, liens, deeds of trust & plat maps.",
        "url": "https://recorder.maricopa.gov/recdocsearch/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Maricopa County Treasurer (Property Taxes)",
        "scope": "Tax Bills & Collections",
        "desc": "Real estate tax bills, payment histories, installment receipts & delinquent tax rolls.",
        "url": "https://treasurer.maricopa.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Maricopa County Enterprise GIS Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries, PIN lookup & aerial maps.",
        "url": "https://maps.maricopa.gov/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Maricopa Superior Court Electronic Records",
        "scope": "Civil & Court Dockets",
        "desc": "Civil litigation dockets, small claims, probate, family law & court judgments.",
        "url": "https://www.clerkofcourt.maricopa.gov/records",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Maricopa County Recorder (Voter & Filings)",
        "scope": "DBA & Vital Records",
        "desc": "Trade name registrations, voter rolls, notary filings & county records.",
        "url": "https://recorder.maricopa.gov/",
        "label": "DBA & Records"
      }
    ]
  },
  "WA:king": {
    "name": "King County",
    "state": "WA",
    "metro": "Seattle Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "King County Department of Assessments",
        "scope": "Property Assessment",
        "desc": "Seattle and King County property appraisal records, valuation & parcel lookup.",
        "url": "https://recordsearch.kingcounty.gov/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "King County Recorder (Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://kingcounty.gov/en/dept/records-licensing/records-and-licensing/recorder-office",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "King County Treasury (Property Taxes)",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://kingcounty.gov/en/dept/finance-business-operations/property-tax-payments",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "King County Parcel Viewer 2.0 GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://gismaps.kingcounty.gov/parcelviewer2/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "King County Superior Court ECR Online",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://kingcounty.gov/en/court/superior-court/courts-jails-legal-system/court-records",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "King County Records & Licensing (DBA)",
        "scope": "DBA & Vital Registry",
        "desc": "Assumed business names (DBA), business licensing & marriage certificates.",
        "url": "https://kingcounty.gov/en/dept/records-licensing",
        "label": "DBA & Vital"
      }
    ]
  },
  "NV:clark": {
    "name": "Clark County",
    "state": "NV",
    "metro": "Las Vegas Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Clark County Assessor (Parcel Records)",
        "scope": "Property Rolls & Values",
        "desc": "Real property ownership, parcel valuations, building specs & tax assessment rolls.",
        "url": "https://maps.clarkcountynv.gov/assessor/AssessorParcelDetail/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Clark County Recorder (Records Search)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, mortgages, liens, deeds of trust & plat maps.",
        "url": "https://recorder.clarkcountynv.gov/recordssearch/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Clark County Treasurer (Tax Lookup & Pay)",
        "scope": "Tax Bills & Collections",
        "desc": "Real estate tax bills, payment histories, installment receipts & delinquent tax rolls.",
        "url": "https://trweb.co.clark.nv.us/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Clark County OpenWeb GIS Parcel Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries, PIN lookup & aerial maps.",
        "url": "https://maps.clarkcountynv.gov/opengis/",
        "label": "OpenWeb GIS"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Clark County 8th Judicial District Court",
        "scope": "Civil & Court Dockets",
        "desc": "Civil litigation dockets, small claims, probate, family law & court judgments.",
        "url": "https://www.clarkcountycourts.us/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Clark County Clerk (Marriage & FBN Filings)",
        "scope": "DBA & Vital Records",
        "desc": "Fictitious firm names (FBN / DBA), marriage records & official county filings.",
        "url": "https://www.clarkcountynv.gov/government/elected_officials/county_clerk/",
        "label": "DBA & Vital"
      }
    ]
  },
  "GA:fulton": {
    "name": "Fulton County",
    "state": "GA",
    "metro": "Atlanta Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Fulton County Board of Assessors (qPublic)",
        "scope": "Property Assessment",
        "desc": "Atlanta and Fulton County property appraisal records, valuation & parcel lookup.",
        "url": "https://qpublic.schneidercorp.com/Application.aspx?App=FultonCountyGA",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Fulton County Clerk of Superior Court (Deeds)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.fultonclerk.org/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Fulton County Tax Commissioner",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://fultoncountytaxes.org/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Fulton County GIS & Parcel Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://gis.fultoncountyga.gov/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Fulton County Superior Court Case Search",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.fultonclerk.org/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Fulton County Clerk (Trade Names & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Trade names (DBA), business licenses & marriage certificates.",
        "url": "https://www.fultonclerk.org/",
        "label": "DBA & Vital"
      }
    ]
  },
  "PA:philadelphia": {
    "name": "Philadelphia County",
    "state": "PA",
    "metro": "Philadelphia Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Philadelphia Office of Property Assessment (OPA)",
        "scope": "Property Rolls & Values",
        "desc": "Real property ownership, parcel valuations, building specs & tax assessment rolls.",
        "url": "https://property.phila.gov/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Philadelphia Department of Records (Deeds)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, mortgages, liens, deeds of trust & plat maps.",
        "url": "https://philadelphiarecords.com/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Philadelphia Department of Revenue (Taxes)",
        "scope": "Tax Bills & Collections",
        "desc": "Real estate tax bills, payment histories, installment receipts & delinquent tax rolls.",
        "url": "https://www.phila.gov/departments/department-of-revenue/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Philadelphia Atlas GIS Property Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries, PIN lookup & aerial maps.",
        "url": "https://atlas.phila.gov/",
        "label": "Atlas GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Philadelphia First Judicial District (FJD)",
        "scope": "Civil & Court Dockets",
        "desc": "Civil litigation dockets, small claims, probate, family law & court judgments.",
        "url": "https://fjclshub.phila.gov/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Philadelphia City Records (Vital & Business)",
        "scope": "DBA & Vital Records",
        "desc": "Business registrations, vital records & municipal archive documents.",
        "url": "https://www.phila.gov/departments/records/",
        "label": "City Records"
      }
    ]
  },
  "NC:mecklenburg": {
    "name": "Mecklenburg County",
    "state": "NC",
    "metro": "Charlotte Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Mecklenburg County Real Estate Assessment",
        "scope": "Property Assessment",
        "desc": "Charlotte and Mecklenburg County property appraisal records & assessed valuation.",
        "url": "https://property.spatialest.com/nc/mecklenburg/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Mecklenburg County Register of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://meckrod.manatron.com/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Mecklenburg County Tax Collector",
        "scope": "Property Taxes",
        "desc": "Real estate tax bills, payment status & tax delinquency records.",
        "url": "https://taxweb.mecklenburgcountync.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "POLARIS 3G Property Mapping GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & aerial imagery.",
        "url": "https://polaris3g.mecklenburgcountync.gov/",
        "label": "POLARIS GIS"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "North Carolina Judicial Branch eCourts",
        "scope": "Civil & Court Dockets",
        "desc": "Superior and district court civil litigation dockets & judgments.",
        "url": "https://portal-nc.tylertech.cloud/Portal/",
        "label": "eCourts Portal"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Mecklenburg Register of Deeds (Assumed Names)",
        "scope": "DBA & Vital Registry",
        "desc": "Assumed business names (DBA), notary filings & marriage records.",
        "url": "https://meckrod.manatron.com/",
        "label": "DBA & Vital"
      }
    ]
  },
  "NC:wake": {
    "name": "Wake County",
    "state": "NC",
    "metro": "Raleigh / Research Triangle",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Wake County Real Estate Search",
        "scope": "Property Assessment",
        "desc": "Raleigh and Wake County real estate appraisal records & assessed valuation.",
        "url": "https://services.wake.gov/realestate/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Wake County Register of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://www.wake.gov/departments-government/register-deeds",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Wake County Tax Administration",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://taxportal.wake.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Wake County iMAPS GIS Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://maps.wake.gov/imaps/",
        "label": "iMAPS GIS"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Wake County Courts (NC eCourts Portal)",
        "scope": "Civil & Court Dockets",
        "desc": "District and superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://portal-nc.tylertech.cloud/Portal/",
        "label": "eCourts Portal"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Wake County Register of Deeds (Assumed Names)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names (DBA), marriage records & vital statistics.",
        "url": "https://www.wake.gov/departments-government/register-deeds",
        "label": "DBA & Vital"
      }
    ]
  },
  "CO:denver": {
    "name": "Denver County",
    "state": "CO",
    "metro": "Denver Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Denver Assessor's Office (Property Search)",
        "scope": "Property Assessment",
        "desc": "Denver real property assessment rolls, valuation & parcel lookup.",
        "url": "https://www.denvergov.org/property",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Denver Clerk and Recorder (Real Estate)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Office-of-the-Clerk-and-Recorder/recordings",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Denver Treasury Division (Tax Lookup)",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Department-of-Finance/Treasury-Division",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Denver Property Map & Aerial GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://www.denvergov.org/maps/map/property",
        "label": "Denver Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Denver County Court Case Search",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.denvercountycourt.org/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Denver Clerk and Recorder (DBA & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Assumed business names, marriage certificates & official county recordings.",
        "url": "https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Office-of-the-Clerk-and-Recorder",
        "label": "DBA & Vital"
      }
    ]
  },
  "MA:suffolk": {
    "name": "Suffolk County (Boston)",
    "state": "MA",
    "metro": "Boston Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "City of Boston Assessing Department",
        "scope": "Property Rolls & Values",
        "desc": "Real property ownership, parcel valuations, building specs & tax assessment rolls.",
        "url": "https://www.boston.gov/departments/assessing",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Suffolk Registry of Deeds (MassLandRecords)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, mortgages, liens, deeds of trust & plat maps.",
        "url": "https://www.masslandrecords.com/Suffolk/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Boston Collector-Treasurer (Property Taxes)",
        "scope": "Tax Bills & Collections",
        "desc": "Real estate tax bills, payment histories, installment receipts & delinquent tax rolls.",
        "url": "https://www.boston.gov/departments/collector-treasurer",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Boston Map GIS Parcel Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries, PIN lookup & aerial maps.",
        "url": "https://boston.maps.arcgis.com/",
        "label": "Boston GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "MassCourts.org (Suffolk Trial Courts)",
        "scope": "Civil & Court Dockets",
        "desc": "Civil litigation dockets, small claims, probate, family law & court judgments.",
        "url": "https://www.masscourts.org/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Boston City Clerk (Business Certificates)",
        "scope": "DBA & Vital Records",
        "desc": "Business certificates (DBA), vital records & municipal filings.",
        "url": "https://www.boston.gov/departments/city-clerk",
        "label": "City Clerk"
      }
    ]
  },
  "DC:district of columbia": {
    "name": "District of Columbia",
    "state": "DC",
    "metro": "Washington DC Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "DC Real Property Tax Database (MyTax.DC)",
        "scope": "Property Assessment",
        "desc": "Washington DC real property assessment rolls, valuation, square footage & tax class.",
        "url": "https://mytax.dc.gov/_/#1",
        "label": "MyTax Assessor"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "DC Recorder of Deeds (OTR Online)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, deeds of trust & liens.",
        "url": "https://otr.cfo.dc.gov/service/recorder-deeds",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "DC Office of Tax and Revenue (Billing)",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, billing statements & tax delinquency verification.",
        "url": "https://mytax.dc.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "DC PropertyQuest GIS Mapping Tool",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, lot boundaries & historic designations.",
        "url": "https://propertyquest.dc.gov/",
        "label": "PropertyQuest"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "DC Superior Court (eAccess Case Search)",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://eaccess.dccourts.gov/eaccess/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "DC DLCP (CorpOnline Entity Search)",
        "scope": "DBA & Corporate Registry",
        "desc": "Corporate charters, LLC filings, trade names & business licensing.",
        "url": "https://corponline.dcra.dc.gov/",
        "label": "CorpOnline"
      }
    ]
  },
  "MI:wayne": {
    "name": "Wayne County",
    "state": "MI",
    "metro": "Detroit Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Wayne County Property Tax Search",
        "scope": "Property Assessment",
        "desc": "Detroit and Wayne County property appraisal records, valuation & parcel lookup.",
        "url": "https://www.waynecounty.com/departments/treasurer/property-tax-search.aspx",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Wayne County Register of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.waynecounty.com/departments/records/register-deeds.aspx",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Wayne County Treasurer (Tax Payments)",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://www.waynecounty.com/departments/treasurer/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Wayne County GIS Parcel Mapping",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://www.waynecounty.com/departments/records/gis.aspx",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Wayne County 3rd Judicial Circuit Court",
        "scope": "Civil & Court Dockets",
        "desc": "Superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.3rdcc.org/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Wayne County Clerk (DBA & Vital)",
        "scope": "DBA & Vital Registry",
        "desc": "Assumed business names (DBA), business licenses & marriage certificates.",
        "url": "https://www.waynecounty.com/departments/clerk/",
        "label": "DBA & Vital"
      }
    ]
  },
  "OH:franklin": {
    "name": "Franklin County",
    "state": "OH",
    "metro": "Columbus Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Franklin County Auditor (Property Search)",
        "scope": "Property Assessment",
        "desc": "Columbus and Franklin County real estate appraisal records & assessed valuation.",
        "url": "https://property.franklincountyauditor.com/",
        "label": "Auditor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Franklin County Recorder (Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://recorder.franklincountyohio.gov/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Franklin County Treasurer (Property Taxes)",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://treasurer.franklincountyohio.gov/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Franklin County Auditor GIS Map Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://audr-apps.franklincountyohio.gov/gis/",
        "label": "Auditor GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Franklin County Clerk of Courts Case Search",
        "scope": "Civil & Court Dockets",
        "desc": "Common pleas and municipal court civil litigation dockets & judgments.",
        "url": "https://fclerk.clerk.franklincountyohio.gov/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Franklin County Recorder (Business Filings)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names (DBA), military discharge & official records.",
        "url": "https://recorder.franklincountyohio.gov/",
        "label": "DBA & Records"
      }
    ]
  },
  "MN:hennepin": {
    "name": "Hennepin County",
    "state": "MN",
    "metro": "Minneapolis Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Hennepin County Property Information",
        "scope": "Property Assessment",
        "desc": "Minneapolis and Hennepin County property appraisal records, valuation & parcel lookup.",
        "url": "https://www.hennepin.us/residents/property/property-information-search",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Hennepin County Recorder / Registrar of Titles",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.hennepin.us/residents/property/record-property-document",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Hennepin County Property Tax Department",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://www.hennepin.us/residents/property/property-taxes",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Hennepin County Property Map GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://gis.hennepin.us/property/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Minnesota MCRO Public Access (4th District)",
        "scope": "Civil & Court Dockets",
        "desc": "District court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://publicaccess.courts.state.mn.us/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Hennepin County Certificates & Vital Records",
        "scope": "DBA & Vital Registry",
        "desc": "Certificate of assumed name (DBA), marriage certificates & vital statistics.",
        "url": "https://www.hennepin.us/residents/licenses-certificates-permits",
        "label": "DBA & Vital"
      }
    ]
  },
  "MO:st. louis": {
    "name": "St. Louis County",
    "state": "MO",
    "metro": "St. Louis County",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "St. Louis County Department of Revenue (IAS)",
        "scope": "Property Assessment",
        "desc": "St. Louis County property appraisal records, valuation & parcel lookup.",
        "url": "https://revenue.stlouisco.com/ias/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "St. Louis County Recorder of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://stlouiscountymo.gov/st-louis-county-departments/recorder-of-deeds/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "St. Louis County Collector of Revenue",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://stlouiscountymo.gov/st-louis-county-departments/revenue/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "St. Louis County Public GIS Parcel Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://stlouisco.maps.arcgis.com/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Missouri Case.net (21st Judicial Circuit)",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.courts.mo.gov/casenet/",
        "label": "Case.net Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "St. Louis County County Clerk",
        "scope": "DBA & Vital Registry",
        "desc": "Assumed business names (DBA), business licenses & marriage records.",
        "url": "https://stlouiscountymo.gov/",
        "label": "County Clerk"
      }
    ]
  },
  "TN:davidson": {
    "name": "Davidson County (Nashville)",
    "state": "TN",
    "metro": "Nashville Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Nashville & Davidson County Property Assessor",
        "scope": "Property Assessment",
        "desc": "Nashville real property assessment rolls, valuation, square footage & tax class.",
        "url": "https://www.padctn.org/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Nashville & Davidson Register of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, deeds of trust & liens.",
        "url": "https://www.nashville.gov/departments/register-deeds",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Nashville Metropolitan Trustee (Tax Bills)",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, billing statements & tax delinquency verification.",
        "url": "https://www.nashville.gov/departments/trustee",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Metro Nashville Enterprise GIS (Parcel Viewer)",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, lot boundaries & aerial imagery.",
        "url": "https://maps.nashville.gov/",
        "label": "Metro GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Nashville Trial Courts Electronic Dockets",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit, chancery and probate court case records search.",
        "url": "https://circuitclerk.nashville.gov/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Davidson County Clerk (Business Licenses)",
        "scope": "DBA & Vital Records",
        "desc": "Business tax registrations, marriage certificates & county filings.",
        "url": "https://www.nashville.gov/departments/county-clerk",
        "label": "County Clerk"
      }
    ]
  },
  "IN:marion": {
    "name": "Marion County (Indianapolis)",
    "state": "IN",
    "metro": "Indianapolis Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Marion County Assessor (Property Cards)",
        "scope": "Property Assessment",
        "desc": "Indianapolis and Marion County property appraisal records & assessed valuation.",
        "url": "https://maps.indy.gov/AssessorPropertyCards/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Marion County Recorder",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://www.indy.gov/agency/marion-county-recorder",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Marion County Treasurer (Tax Payments)",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://www.indy.gov/agency/marion-county-treasurer",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "IndyMap Enterprise GIS & Parcel Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://maps.indy.gov/",
        "label": "IndyMap GIS"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "mycase.IN.gov (Marion County Courts)",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit and superior court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://mycase.in.gov/",
        "label": "MyCase Courts"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Marion County Clerk's Office",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names (DBA), marriage records & vital statistics.",
        "url": "https://www.indy.gov/agency/marion-county-clerk",
        "label": "County Clerk"
      }
    ]
  },
  "MD:montgomery": {
    "name": "Montgomery County",
    "state": "MD",
    "metro": "Montgomery / DC Suburbs",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Maryland SDAT Real Property Search (Montgomery)",
        "scope": "Property Assessment",
        "desc": "State Department of Assessments and Taxation real property search.",
        "url": "https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx",
        "label": "SDAT Assessor"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "MDLandRec (Montgomery County Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Maryland statewide digital land records portal for deeds and mortgages.",
        "url": "https://mdlandrec.net/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Montgomery County Department of Finance",
        "scope": "Property Taxes",
        "desc": "Real property tax bills, payment status & assessment accounts.",
        "url": "https://www.montgomerycountymd.gov/finance/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Montgomery County MC:Atlas GIS Parcel Viewer",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://mcatlas.org/",
        "label": "MC:Atlas GIS"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Maryland Judiciary Case Search (Montgomery)",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit and district court civil lawsuits, judgments & court dockets.",
        "url": "https://casesearch.courts.state.md.us/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Montgomery County Circuit Court Clerk",
        "scope": "DBA & Licensing",
        "desc": "Business licenses, trade names, notary commissions & marriage records.",
        "url": "https://www.courts.state.md.us/clerks/montgomery",
        "label": "Circuit Clerk"
      }
    ]
  },
  "VA:fairfax": {
    "name": "Fairfax County",
    "state": "VA",
    "metro": "Northern Virginia / DC Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Fairfax County Real Estate Assessment (ICARE)",
        "scope": "Property Assessment",
        "desc": "Fairfax County property appraisal records, valuation & parcel lookup.",
        "url": "https://icare.fairfaxcounty.gov/ffxcare/search/commonsearch.aspx?mode=address",
        "label": "ICARE Assessor"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Fairfax County Circuit Court Land Records (CPAN)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.fairfaxcounty.gov/circuit/land-records",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Fairfax County Department of Tax Administration",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, real estate tax bills & delinquency search.",
        "url": "https://www.fairfaxcounty.gov/taxes/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Fairfax County JADE Interactive GIS Map",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://www.fairfaxcounty.gov/gis/jade/",
        "label": "JADE GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Virginia Judicial System Case Info (Fairfax)",
        "scope": "Civil & Court Dockets",
        "desc": "General district and circuit court civil dockets & judicial records.",
        "url": "https://eapps.courts.state.va.us/ocis/landing",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Fairfax County Circuit Court Clerk",
        "scope": "DBA & Vital Registry",
        "desc": "Fictitious business names (DBA), business licenses & marriage records.",
        "url": "https://www.fairfaxcounty.gov/circuit/",
        "label": "Circuit Clerk"
      }
    ]
  },
  "LA:orleans": {
    "name": "Orleans Parish (New Orleans)",
    "state": "LA",
    "metro": "New Orleans Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Orleans Parish Assessor's Office (qPublic)",
        "scope": "Property Assessment",
        "desc": "New Orleans real property assessment rolls, valuation, square footage & tax class.",
        "url": "https://qpublic.schneidercorp.com/Application.aspx?App=OrleansParishLA",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Orleans Civil District Court Clerk (Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, conveyances, mortgages & liens.",
        "url": "https://www.orleanscivilclerk.com/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "City of New Orleans Bureau of Treasury",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, billing statements & tax delinquency verification.",
        "url": "https://nola.gov/treasury/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "City of New Orleans Property Viewer GIS",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, lot boundaries & historic designations.",
        "url": "https://property.nola.gov/",
        "label": "Property Viewer"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Orleans Parish Civil District Court Dockets",
        "scope": "Civil & Court Dockets",
        "desc": "Civil litigation dockets, small claims, probate, family law & court judgments.",
        "url": "https://www.orleanscivilclerk.com/",
        "label": "Court Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Orleans Parish Custodian of Notarial Archives",
        "scope": "DBA & Notarial Records",
        "desc": "Notarial acts, trade names & parish archival conveyances.",
        "url": "https://www.orleanscivilclerk.com/",
        "label": "Parish Archives"
      }
    ]
  },
  "UT:salt lake": {
    "name": "Salt Lake County",
    "state": "UT",
    "metro": "Salt Lake City Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Salt Lake County Assessor Parcel Search",
        "scope": "Property Assessment",
        "desc": "Salt Lake City and County real estate appraisal records & assessed valuation.",
        "url": "https://slco.org/assessor/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Salt Lake County Recorder of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://slco.org/recorder/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Salt Lake County Treasurer (Tax Lookup)",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://slco.org/treasurer/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Salt Lake County Public GIS Map Portal",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://slco.org/gis/",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Utah State Courts XChange Case Search",
        "scope": "Civil & Court Dockets",
        "desc": "District and justice court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.utcourts.gov/xchange/",
        "label": "XChange Courts"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Salt Lake County Clerk (Business & Vital)",
        "scope": "DBA & Vital Records",
        "desc": "Business registrations, marriage certificates & county election records.",
        "url": "https://slco.org/clerk/",
        "label": "County Clerk"
      }
    ]
  },
  "OR:multnomah": {
    "name": "Multnomah County (Portland)",
    "state": "OR",
    "metro": "Portland Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Multnomah Division of Assessment & Taxation",
        "scope": "Property Assessment",
        "desc": "Portland and Multnomah County property appraisal records, valuation & parcel lookup.",
        "url": "https://multcoproptax.com/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Multnomah County Recording Office (Deeds)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, liens & property transfers.",
        "url": "https://www.multco.us/recording",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Multnomah Property Tax Collections",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://multcoproptax.com/",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "PortlandMaps Interactive GIS & Property Search",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://www.portlandmaps.com/",
        "label": "PortlandMaps"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Oregon Judicial Information Network (OJCIN)",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit court register of actions, probate, family dockets & judgments.",
        "url": "https://www.courts.oregon.gov/services/online/pages/ojcin.aspx",
        "label": "OJCIN Courts"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Multnomah County Elections & Records",
        "scope": "DBA & Vital Registry",
        "desc": "Assumed business names (DBA), business licenses & marriage certificates.",
        "url": "https://www.multco.us/",
        "label": "County Records"
      }
    ]
  },
  "WI:milwaukee": {
    "name": "Milwaukee County",
    "state": "WI",
    "metro": "Milwaukee Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "City of Milwaukee Assessing Department",
        "scope": "Property Assessment",
        "desc": "Milwaukee real property assessment rolls, valuation, square footage & tax class.",
        "url": "https://assessments.milwaukee.gov/",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Milwaukee County Register of Deeds",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, deeds, mortgages, deeds of trust & liens.",
        "url": "https://county.milwaukee.gov/EN/Register-of-Deeds",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Milwaukee County Treasurer (Tax Portal)",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, billing statements & tax delinquency verification.",
        "url": "https://county.milwaukee.gov/EN/Treasurer",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Milwaukee County Land Info GIS (MCLIO)",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, lot boundaries & aerial imagery.",
        "url": "https://mclio.maps.arcgis.com/",
        "label": "MCLIO GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Wisconsin Circuit Court Access (WCCA Milwaukee)",
        "scope": "Civil & Court Dockets",
        "desc": "Circuit court civil litigation dockets, judgments & case records.",
        "url": "https://wcca.wicourts.gov/",
        "label": "WCCA Courts"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Milwaukee County Clerk",
        "scope": "DBA & Vital Records",
        "desc": "Business registrations, marriage certificates & county filings.",
        "url": "https://county.milwaukee.gov/",
        "label": "County Clerk"
      }
    ]
  },
  "OK:oklahoma": {
    "name": "Oklahoma County",
    "state": "OK",
    "metro": "Oklahoma City Metro",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Oklahoma County Assessor Portal",
        "scope": "Property Assessment",
        "desc": "Oklahoma City and County property appraisal records & assessed valuation.",
        "url": "https://oklahomacounty.org/assessor",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Oklahoma County Clerk (Deed Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Recorded land records, deeds, deeds of trust, liens, mortgages & parcel conveyances.",
        "url": "https://oklahomacounty.org/countyclerk",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Oklahoma County Treasurer (Tax Search)",
        "scope": "Tax Bills & Payments",
        "desc": "Property tax payment verification, bill inquiry & installment status.",
        "url": "https://www.oklahomacounty.org/treasurer",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Oklahoma County Interactive GIS Mapping",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive geographic information system parcel boundaries & tract maps.",
        "url": "https://oklahomacounty.org/assessor/mapping",
        "label": "Parcel GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Oklahoma State Courts Network (OSCN)",
        "scope": "Civil & Court Dockets",
        "desc": "District and appellate court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.oscn.net/",
        "label": "OSCN Dockets"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Oklahoma County Clerk (Business Filings)",
        "scope": "DBA & Vital Records",
        "desc": "Assumed business names (DBA), marriage records & vital statistics.",
        "url": "https://oklahomacounty.org/",
        "label": "County Clerk"
      }
    ]
  },
  "HI:honolulu": {
    "name": "Honolulu (City & County)",
    "state": "HI",
    "metro": "Honolulu / Oahu",
    "offices": [
      {
        "key": "assessor",
        "icon": "🏡",
        "title": "Honolulu Real Property Assessment (qPublic)",
        "scope": "Property Assessment",
        "desc": "Honolulu and Oahu real property assessment rolls, valuation & parcel lookup.",
        "url": "https://qpublic.schneidercorp.com/Application.aspx?App=HonoluluCountyHI",
        "label": "Assessor Portal"
      },
      {
        "key": "deeds",
        "icon": "📜",
        "title": "Hawaii Bureau of Conveyances (BOC Land Records)",
        "scope": "Deeds & Mortgages",
        "desc": "Official recorded documents, Regular System & Land Court deeds & mortgages.",
        "url": "https://dlnr.hawaii.gov/boc/",
        "label": "Land Records"
      },
      {
        "key": "treasurer",
        "icon": "💰",
        "title": "Honolulu Real Property Tax Collections",
        "scope": "Property Taxes",
        "desc": "Property tax lookup, secured roll billing statements & delinquency search.",
        "url": "https://www.honolulu.gov/rpa",
        "label": "Tax Collector"
      },
      {
        "key": "gis",
        "icon": "🗺️",
        "title": "Honolulu Land Information System (HoLIS GIS)",
        "scope": "GIS & Parcel Maps",
        "desc": "Interactive parcel GIS map, zoning, parcel lines & planning data.",
        "url": "https://gis.hicentral.com/",
        "label": "HoLIS GIS Map"
      },
      {
        "key": "courts",
        "icon": "⚖️",
        "title": "Hawaii State Judiciary eCourt Kokua",
        "scope": "Civil & Court Dockets",
        "desc": "District and circuit court civil lawsuits, probate, family cases & judicial dockets.",
        "url": "https://www.courts.state.hi.us/legal_references/records/jims_system_availability",
        "label": "eCourt Kokua"
      },
      {
        "key": "clerk",
        "icon": "📋",
        "title": "Honolulu Office of the City Clerk",
        "scope": "DBA & Vital Registry",
        "desc": "City and county legislative records, marriage certificates & official filings.",
        "url": "https://www.honolulu.gov/clerk",
        "label": "City Clerk"
      }
    ]
  },
  "NY:erie": {
      "name": "Erie County",
      "state": "NY",
      "metro": "Buffalo Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Erie County Real Property Tax Services",
              "scope": "Property Assessment",
              "desc": "Buffalo and Erie County real property parcel search, assessment rolls & valuations.",
              "url": "https://www.erie.gov/ecrpts/real-property-parcel-search",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Erie County Clerk (Land Records)",
              "scope": "Deeds & Mortgages",
              "desc": "Official recorded land documents, deeds, mortgages, liens & conveyances.",
              "url": "https://erie.gov/clerk/land-records",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Erie County Real Property Tax Collections",
              "scope": "Property Taxes",
              "desc": "County and municipal tax bill lookup, payment records & tax auction info.",
              "url": "https://paytax.erie.gov/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Erie County On-Line GIS Parcel Map",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel mapping, aerial orthophotography & boundary boundaries.",
              "url": "https://erie.gov/gis/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Erie County Supreme & County Courts (NYSCEF)",
              "scope": "Civil & Court Dockets",
              "desc": "New York State Unified Court System civil dockets, motion decisions & judgment filings.",
              "url": "https://iapps.courts.state.ny.us/nyscef/Login",
              "label": "NYSCEF Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Erie County Clerk (DBA & Business Records)",
              "scope": "DBA & Business Filings",
              "desc": "Assumed business names (DBA), corporations, notary filings & public records.",
              "url": "https://erie.gov/clerk/business-certificates",
              "label": "DBA Registry"
          }
      ]
  },
  "MO:jackson": {
      "name": "Jackson County",
      "state": "MO",
      "metro": "Kansas City Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Jackson County Assessment Department",
              "scope": "Property Assessment",
              "desc": "Kansas City and Jackson County real estate valuation rolls, parcel specs & appraisal records.",
              "url": "https://ascendweb.jacksongov.org/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Jackson County Recorder of Deeds",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded real estate documents, warranty deeds, deeds of trust, liens & plats.",
              "url": "https://www.jacksongov.org/Government/Departments/Recorder-of-Deeds",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Jackson County Collections Department",
              "scope": "Tax Bills & Payments",
              "desc": "Real property and personal property tax statements, payments & receipt lookup.",
              "url": "https://www.jacksongov.org/Government/Departments/Collection",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Jackson County Interactive GIS Parcel Viewer",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive geographic information system parcel boundaries, topography & zoning.",
              "url": "https://jcgis.jacksongov.org/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "16th Judicial Circuit Court of Missouri (Case.net)",
              "scope": "Civil & Court Dockets",
              "desc": "Jackson County civil lawsuits, circuit court judgments, probate & domestic relations.",
              "url": "https://www.courts.mo.gov/casenet/base/welcome.do",
              "label": "MO Case.net"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Jackson County Clerk & Business Filings",
              "scope": "DBA & County Records",
              "desc": "County licenses, liquor permits, Board of Equalization petitions & county records.",
              "url": "https://www.jacksongov.org/Government/Departments/County-Clerk",
              "label": "County Clerk"
          }
      ]
  },
  "PA:allegheny": {
      "name": "Allegheny County",
      "state": "PA",
      "metro": "Pittsburgh Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Allegheny County Real Estate Portal",
              "scope": "Property Assessment",
              "desc": "Pittsburgh and Allegheny County property assessments, building specs, sales & parcel data.",
              "url": "https://alleghenycounty.us/Services/Real-Estate/Real-Estate-Portal",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Allegheny County Department of Real Estate",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded deeds, mortgages, satisfaction pieces, subdivision plans & land title records.",
              "url": "https://alleghenycontroller.com/real-estate-search/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Allegheny County Treasurer's Office",
              "scope": "Property Taxes",
              "desc": "County real estate tax bills, collections, payment status & delinquent tax liens.",
              "url": "https://alleghenycountytreasurer.us/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Allegheny County GIS Open Data & Parcel Map",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel explorer, cadastral layers, zoning & aerial imagery.",
              "url": "https://openac-alcogis.hub.arcgis.com/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Allegheny County Court Records (DCR Civil Search)",
              "scope": "Civil & Court Dockets",
              "desc": "Department of Court Records civil lawsuit dockets, arbitration, judgments & liens.",
              "url": "https://dcr.alleghenycounty.us/",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Allegheny County Department of Court Records (Wills/Marriage)",
              "scope": "DBA & Marriage Registry",
              "desc": "Fictitious names, marriage licenses, probate filings & estate inventories.",
              "url": "https://alleghenycounty.us/Services/Court-Records",
              "label": "County Registry"
          }
      ]
  },
  "OH:cuyahoga": {
      "name": "Cuyahoga County",
      "state": "OH",
      "metro": "Cleveland Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Cuyahoga County Fiscal Officer (MyPlace)",
              "scope": "Property Assessment",
              "desc": "Cleveland and Cuyahoga County real estate appraisal values, parcel characteristics & tax rolls.",
              "url": "https://myplace.cuyahogacounty.gov/",
              "label": "MyPlace Assessor"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Cuyahoga County Recorded Documents",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, warranty deeds, mortgages, liens, easements & survey plats.",
              "url": "https://fiscalofficer.cuyahogacounty.gov/en-US/recording.aspx",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Cuyahoga County Treasurer",
              "scope": "Tax Bills & Payments",
              "desc": "Real estate property tax statements, payment histories, installment plans & delinquency.",
              "url": "https://treasurer.cuyahogacounty.gov/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Cuyahoga County Enterprise GIS",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel GIS viewer, property boundary overlay & municipal zoning layers.",
              "url": "https://gis.cuyahogacounty.gov/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Cuyahoga County Clerk of Courts (Case Docket)",
              "scope": "Civil & Court Dockets",
              "desc": "Common Pleas Court civil lawsuits, foreclosure dockets, domestic relations & judgments.",
              "url": "https://cp.cuyahogacounty.gov/",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Cuyahoga County Clerk of Courts (Titles & Records)",
              "scope": "DBA & Public Filings",
              "desc": "Auto titles, notary commissions, passport services & civil judgment registry.",
              "url": "https://coc.cuyahogacounty.gov/",
              "label": "Clerk of Courts"
          }
      ]
  },
  "OH:hamilton": {
      "name": "Hamilton County",
      "state": "OH",
      "metro": "Cincinnati Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Hamilton County Auditor Property Search",
              "scope": "Property Assessment",
              "desc": "Cincinnati and Hamilton County real estate valuation records, tax rates & parcel data.",
              "url": "https://propertysearch.myhamiltoncountyauditor.org/",
              "label": "Auditor Search"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Hamilton County Recorder of Deeds",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded property conveyances, mortgages, condominium declarations & land liens.",
              "url": "https://recordersoffice.hamilton-co.org/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Hamilton County Treasurer",
              "scope": "Property Taxes",
              "desc": "Property tax billing statements, payment processing & delinquent tax rolls.",
              "url": "https://www.hamiltoncountyohio.gov/government/departments/treasurer",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Cincinnati Area GIS (CAGIS Online)",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel mapping system, building footprints, zoning & contours.",
              "url": "https://cagisonline.hamilton-co.org/",
              "label": "CAGIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Hamilton County Clerk of Courts Records Search",
              "scope": "Civil & Court Dockets",
              "desc": "Common Pleas and Municipal Court civil actions, lawsuits, evictions & judgments.",
              "url": "https://www.courtclerk.org/records-search/",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Hamilton County Probate Court (Vital & Marriage)",
              "scope": "Vital & Estate Registry",
              "desc": "Marriage license registry, probate estates, wills, name changes & guardianship.",
              "url": "https://www.probatect.org/",
              "label": "Probate & Vital"
          }
      ]
  },
  "FL:duval": {
      "name": "Duval County (Jacksonville)",
      "state": "FL",
      "metro": "Jacksonville Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Duval County Property Appraiser (PAO)",
              "scope": "Property Assessment",
              "desc": "Jacksonville real estate market valuations, building details, exemptions & parcel GIS.",
              "url": "https://paopropertysearch.coj.net/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Duval County Clerk of Courts (Official Records)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded deeds, mortgages, liens, lis pendens, deeds of trust & easements.",
              "url": "https://or.duvalclerk.com/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Duval County Tax Collector",
              "scope": "Property Taxes",
              "desc": "Real estate tax bills, tangible personal property taxes & payment verification.",
              "url": "https://fl-duval-taxcollector.governmax.com/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "City of Jacksonville Interactive GIS Maps",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel viewer, zoning atlas, FEMA flood maps & council districts.",
              "url": "https://maps.coj.net/",
              "label": "Jacksonville GIS"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Duval County Court Records (CORE Search)",
              "scope": "Civil & Court Dockets",
              "desc": "Circuit and County court civil litigation, small claims, probate & judicial dockets.",
              "url": "https://core.duvalclerk.com/",
              "label": "CORE Courts"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Duval County Clerk of Courts (Public Services)",
              "scope": "DBA & Marriage Registry",
              "desc": "Marriage licenses, passport records, value adjustment board & official recordings.",
              "url": "https://www.duvalclerk.com/",
              "label": "Clerk of Courts"
          }
      ]
  },
  "FL:palm beach": {
      "name": "Palm Beach County",
      "state": "FL",
      "metro": "West Palm Beach / Boca Raton",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Palm Beach County Property Appraiser (PAPA)",
              "scope": "Property Assessment",
              "desc": "West Palm Beach, Boca Raton property valuations, building structural specs & homestead status.",
              "url": "https://www.pbcgov.org/papa/",
              "label": "PAPA Assessor"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Palm Beach County Clerk Official Records",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded deeds, mortgages, satisfactions, notices of commencement & encumbrances.",
              "url": "https://www.mypalmbeachclerk.com/records/official-records",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Palm Beach County Tax Collector",
              "scope": "Property Taxes",
              "desc": "Real estate property tax statements, installment payments & delinquent tax certificates.",
              "url": "https://pbctax.com/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Palm Beach County Geographic Information Systems",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive cadastral parcel maps, commission boundaries & environmental layers.",
              "url": "https://discover.pbcgov.org/iss/gis/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Palm Beach County Clerk eCaseView Court Dockets",
              "scope": "Civil & Court Dockets",
              "desc": "15th Judicial Circuit civil lawsuits, probate proceedings, family court & foreclosure cases.",
              "url": "https://epay.mypalmbeachclerk.com/",
              "label": "eCaseView Courts"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Palm Beach County Clerk & Comptroller (Vital)",
              "scope": "Vital & Marriage Registry",
              "desc": "Marriage applications, passport operations, board records & official registry.",
              "url": "https://www.mypalmbeachclerk.com/",
              "label": "County Clerk"
          }
      ]
  },
  "FL:pinellas": {
      "name": "Pinellas County",
      "state": "FL",
      "metro": "St. Petersburg / Clearwater",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Pinellas County Property Appraiser (PCPAO)",
              "scope": "Property Assessment",
              "desc": "St. Petersburg and Clearwater real estate valuations, building permits & parcel data.",
              "url": "https://www.pcpao.org/",
              "label": "PCPAO Assessor"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Pinellas County Clerk Official Records Search",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, warranty deeds, mortgages, liens & subdivision plats.",
              "url": "https://officialrecords.mypinellasclerk.gov/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Pinellas County Tax Collector",
              "scope": "Property Taxes",
              "desc": "Real property ad valorem tax bills, annual billing & delinquent tax accounts.",
              "url": "https://pinellastaxcollector.gov/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Pinellas County Interactive GIS Parcel Map",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel explorer, aerial imagery, evacuation zones & property specs.",
              "url": "https://egis.pinellas.gov/",
              "label": "Pinellas GIS"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Pinellas County Court Records Search",
              "scope": "Civil & Court Dockets",
              "desc": "6th Judicial Circuit civil court actions, probate, family division & lawsuit dockets.",
              "url": "https://courtcasesearch.mypinellasclerk.gov/",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Pinellas County Clerk of the Circuit Court",
              "scope": "Marriage & Official Filings",
              "desc": "Marriage licenses, passport filings, fine payments & public record archive.",
              "url": "https://mypinellasclerk.gov/",
              "label": "Circuit Clerk"
          }
      ]
  },
  "MD:baltimore": {
      "name": "Baltimore County & City",
      "state": "MD",
      "metro": "Baltimore Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Maryland SDAT Real Property Search",
              "scope": "Property Assessment",
              "desc": "Baltimore County & City real estate appraisal records, parcel ID & tax assessment data.",
              "url": "https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx",
              "label": "SDAT Assessor"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Maryland Land Records (MDLandRec)",
              "scope": "Deeds & Mortgages",
              "desc": "Official statewide land record archive, recorded deeds, mortgages & title conveyances.",
              "url": "https://mdlandrec.net/",
              "label": "MDLandRec"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Baltimore County Property Tax Inquiry",
              "scope": "Property Taxes",
              "desc": "Real estate property tax statements, municipal tax bills & payment status.",
              "url": "https://baltimorecountymd.gov/departments/budfin/taxes/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Baltimore County MyNeighborhood GIS",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel boundary viewer, zoning layers & historic property maps.",
              "url": "https://bcgis.baltimorecountymd.gov/",
              "label": "MyNeighborhood GIS"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Maryland Judiciary Case Search (Casesearch)",
              "scope": "Civil & Court Dockets",
              "desc": "Circuit court and District court civil lawsuits, judgments, probate & dockets.",
              "url": "https://casesearch.courts.state.md.us/casesearch/",
              "label": "MD Case Search"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Baltimore County Circuit Court Clerk (Licensing)",
              "scope": "DBA & Business Licenses",
              "desc": "Business licenses (traders/DBA), marriage licenses & notary public commissions.",
              "url": "https://www.courts.state.md.us/clerks/baltimore",
              "label": "Court Clerk"
          }
      ]
  },
  "CA:sacramento": {
      "name": "Sacramento County",
      "state": "CA",
      "metro": "Sacramento Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Sacramento County Assessor's Office",
              "scope": "Property Assessment",
              "desc": "Sacramento real property assessment rolls, parcel specs & assessed valuations.",
              "url": "https://assessor.saccounty.gov/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Sacramento County Clerk-Recorder",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, grant deeds, deeds of trust, liens & subdivision maps.",
              "url": "https://recorder.saccounty.gov/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Sacramento County ePropTax Collector",
              "scope": "Property Taxes",
              "desc": "Secured property tax bills, installment payment receipts & tax auction notices.",
              "url": "https://eproptax.saccounty.gov/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Sacramento County GIS Parcel Viewer",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel boundaries, land zoning, flood hazard zones & supervisorial districts.",
              "url": "https://generalmap.gis.saccounty.gov/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Sacramento Superior Court Case Search",
              "scope": "Civil & Court Dockets",
              "desc": "Superior Court of California civil lawsuits, probate, family court & judgments.",
              "url": "https://services.saccourt.ca.gov/",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Sacramento County Clerk (FBN & Vital)",
              "scope": "FBN & Vital Registry",
              "desc": "Fictitious business names (FBN / DBA), marriage certificates & notary public oaths.",
              "url": "https://ccr.saccounty.gov/",
              "label": "FBN & Vital"
          }
      ]
  },
  "WA:pierce": {
      "name": "Pierce County",
      "state": "WA",
      "metro": "Tacoma Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Pierce County Assessor-Treasurer (ARMS)",
              "scope": "Property Assessment",
              "desc": "Tacoma and Pierce County property appraisal values, building specs & parcel rolls.",
              "url": "https://armsweb.co.pierce.wa.us/",
              "label": "ARMS Assessor"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Pierce County Auditor (Recorded Documents)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded property conveyances, deeds of trust, liens, covenants & plat surveys.",
              "url": "https://www.piercecountywa.gov/383/Auditor",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Pierce County Tax Collector",
              "scope": "Property Taxes",
              "desc": "Real property tax statements, payments & delinquent tax parcel inquiries.",
              "url": "https://www.piercecountywa.gov/658/Treasurer-Assessor",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Pierce County PublicGIS Interactive Map",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel mapping, boundary dimensions, zoning & critical area layers.",
              "url": "https://matterhorn.co.pierce.wa.us/publicgis/",
              "label": "PublicGIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Pierce County LINX Court Records Portal",
              "scope": "Civil & Court Dockets",
              "desc": "Legal Information Network Exchange (LINX) superior court civil lawsuits & case dockets.",
              "url": "https://linxonline.co.pierce.wa.us/linxweb/",
              "label": "LINX Courts"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Pierce County Clerk (Public Registry)",
              "scope": "DBA & Marriage Registry",
              "desc": "Marriage certificates, probate matters, domestic relations & official court records.",
              "url": "https://www.piercecountywa.gov/114/County-Clerk",
              "label": "County Clerk"
          }
      ]
  },
  "TX:el paso": {
      "name": "El Paso County",
      "state": "TX",
      "metro": "El Paso Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "El Paso Central Appraisal District (EPCAD)",
              "scope": "Property Assessment",
              "desc": "El Paso real estate valuations, market value rolls, property specs & exemptions.",
              "url": "https://www.epcad.org/",
              "label": "EPCAD Assessor"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "El Paso County Clerk (Real Property Records)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded real property records, deeds, deeds of trust, liens & marriage records.",
              "url": "https://www.epcounty.com/countyclerk/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "El Paso County Tax Assessor-Collector",
              "scope": "Property Taxes",
              "desc": "Consolidated property tax statements, payments & delinquent tax roll inquiry.",
              "url": "https://www.epcounty.com/taxassessor/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "EPCAD Interactive GIS Parcel Map",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel boundary viewer, subdivision plats & school district boundaries.",
              "url": "https://epcad.org/Home/GISMap",
              "label": "EPCAD GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "El Paso County District Clerk Court Records",
              "scope": "Civil & Court Dockets",
              "desc": "District court civil litigation, family division, judgments & electronic dockets.",
              "url": "https://epcounty.com/districtclerk/",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "El Paso County Clerk (Assumed Names / DBA)",
              "scope": "DBA & Business Registry",
              "desc": "Assumed business names (DBA), vital statistics & county commissioner records.",
              "url": "https://www.epcounty.com/countyclerk/",
              "label": "DBA Registry"
          }
      ]
  },
  "NM:bernalillo": {
      "name": "Bernalillo County",
      "state": "NM",
      "metro": "Albuquerque Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Bernalillo County Assessor Property Search",
              "scope": "Property Assessment",
              "desc": "Albuquerque real estate valuation data, parcel boundaries & property tax assessment rolls.",
              "url": "https://www.bernco.gov/assessor/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Bernalillo County Clerk (Recorded Documents)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, warranty deeds, mortgages, liens & real estate filings.",
              "url": "https://www.bernco.gov/clerk/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Bernalillo County Treasurer's Office",
              "scope": "Property Taxes",
              "desc": "Property tax statements, payment lookup, tax rate schedules & delinquent bills.",
              "url": "https://www.bernco.gov/treasurer/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Bernalillo County Assessor GIS Mapping",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel mapping, boundary overlays & geographic land records.",
              "url": "https://www.bernco.gov/assessor/gis-mapping/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "New Mexico Courts Case Lookup (Bernalillo)",
              "scope": "Civil & Court Dockets",
              "desc": "Second Judicial District Court civil litigation, domestic relations & judgments.",
              "url": "https://caselookup.nmcourts.gov/caselookup/",
              "label": "NM Case Lookup"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Bernalillo County Clerk (Bureau of Elections & Vital)",
              "scope": "DBA & Marriage Registry",
              "desc": "Marriage licenses, notary registry, business filings & county records.",
              "url": "https://www.bernco.gov/clerk/",
              "label": "County Clerk"
          }
      ]
  },
  "KY:jefferson": {
      "name": "Jefferson County",
      "state": "KY",
      "metro": "Louisville Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Jefferson County Property Valuation Administrator (PVA)",
              "scope": "Property Assessment",
              "desc": "Louisville real estate valuations, assessment rolls, parcel specs & property maps.",
              "url": "https://jeffersonpva.ky.gov/",
              "label": "PVA Assessor"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Jefferson County Clerk's Office (Land Records)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded deeds, mortgages, deeds of trust, liens & condominium declarations.",
              "url": "https://www.jeffersoncountyclerk.org/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Jefferson County Sheriff's Property Tax Division",
              "scope": "Property Taxes",
              "desc": "County property tax bill search, payment verification & tax collection records.",
              "url": "https://www.jeffersoncountysheriff.com/property-tax-search/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Louisville/Jefferson County GIS (LOJIC)",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive LOJIC Online parcel mapping, zoning layers & property boundaries.",
              "url": "https://lojic.org/",
              "label": "LOJIC GIS"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Kentucky Court of Justice (KCOJ Online Court Records)",
              "scope": "Civil & Court Dockets",
              "desc": "Jefferson Circuit and District court civil lawsuits, probate & court dockets.",
              "url": "https://kycourts.gov/",
              "label": "KCOJ Courts"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Jefferson County Clerk (DBA & Marriage)",
              "scope": "DBA & Marriage Registry",
              "desc": "Assumed business names (DBA), marriage licenses & professional registries.",
              "url": "https://www.jeffersoncountyclerk.org/",
              "label": "County Clerk"
          }
      ]
  },
  "NE:douglas": {
      "name": "Douglas County",
      "state": "NE",
      "metro": "Omaha Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Douglas County Assessor/Register of Deeds",
              "scope": "Property Assessment",
              "desc": "Omaha and Douglas County property valuation data, sales history & parcel rolls.",
              "url": "https://www.douglascountyassessor.org/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Douglas County Register of Deeds",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, warranty deeds, mortgages, liens & subdivision plats.",
              "url": "https://www.douglascountyclerk.org/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Douglas County Treasurer",
              "scope": "Property Taxes",
              "desc": "Real estate property tax statements, payment status & delinquent tax rolls.",
              "url": "https://www.dctreasurer.org/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Douglas County GIS (DOGIS Interactive Map)",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel mapping, boundary measurements & aerial orthophotos.",
              "url": "https://dogis.org/",
              "label": "DOGIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Nebraska Judicial Branch Case Search (JUSTICE)",
              "scope": "Civil & Court Dockets",
              "desc": "Douglas County District and County court civil lawsuits, judgments & dockets.",
              "url": "https://www.nebraska.gov/justice/",
              "label": "NE JUSTICE"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Douglas County Clerk (Licenses & Filings)",
              "scope": "DBA & Marriage Registry",
              "desc": "Marriage licenses, liquor licenses, tobacco permits & county board filings.",
              "url": "https://www.douglascountyclerk.org/",
              "label": "County Clerk"
          }
      ]
  },
  "OK:tulsa": {
      "name": "Tulsa County",
      "state": "OK",
      "metro": "Tulsa Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Tulsa County Assessor Property Search",
              "scope": "Property Assessment",
              "desc": "Tulsa real estate assessments, property characteristics, sales & parcel data.",
              "url": "https://www.assessor.tulsacounty.org/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Tulsa County Clerk (Land Records)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded property deeds, mortgages, mechanic's liens, deeds of trust & plats.",
              "url": "https://countyclerk.tulsacounty.org/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Tulsa County Treasurer",
              "scope": "Property Taxes",
              "desc": "Real property ad valorem tax bills, payment status & annual tax roll inquiry.",
              "url": "https://treasurer.tulsacounty.org/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Tulsa County Interactive GIS Mapping",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel boundaries, zoning overlay, topography & aerial imagery.",
              "url": "https://maps.tulsacounty.org/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Oklahoma State Courts Network (OSCN Tulsa County)",
              "scope": "Civil & Court Dockets",
              "desc": "14th Judicial District Court civil litigation, small claims, probate & dockets.",
              "url": "https://www.oscn.net/",
              "label": "OSCN Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Tulsa County Clerk (Business & Vital Filings)",
              "scope": "DBA & Business Registry",
              "desc": "Assumed business names (DBA), public filings & county commissioners records.",
              "url": "https://countyclerk.tulsacounty.org/",
              "label": "County Clerk"
          }
      ]
  },
  "KS:johnson": {
      "name": "Johnson County",
      "state": "KS",
      "metro": "Overland Park / KC Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Johnson County Appraiser's Office",
              "scope": "Property Assessment",
              "desc": "Overland Park and Olathe property valuations, appraisal rolls & parcel data.",
              "url": "https://www.jocogov.org/department/appraiser",
              "label": "Appraiser Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Johnson County Records & Tax Administration (Deeds)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded property deeds, mortgages, liens, easements & real estate instruments.",
              "url": "https://www.jocogov.org/department/records-and-tax-administration",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Johnson County Treasury & Financial Management",
              "scope": "Property Taxes",
              "desc": "Property tax statements, payment confirmation & delinquent tax roll lookup.",
              "url": "https://www.jocogov.org/department/treasury-and-financial-management",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Johnson County Automated Information Mapping (AIMS)",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive AIMS parcel viewer, property boundaries, aerial imagery & zoning.",
              "url": "https://aims.jocogov.org/",
              "label": "AIMS GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Kansas District Courts Public Portal (10th Judicial District)",
              "scope": "Civil & Court Dockets",
              "desc": "Johnson County civil lawsuits, limited actions, probate & electronic dockets.",
              "url": "https://www.kscourts.org/Cases-Opinions/Public-Portal",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Johnson County Department of Records (Licenses)",
              "scope": "DBA & County Licenses",
              "desc": "Marriage licenses, passport services, fish & game, and county public filings.",
              "url": "https://www.jocogov.org/",
              "label": "County Records"
          }
      ]
  },
  "TN:shelby": {
      "name": "Shelby County",
      "state": "TN",
      "metro": "Memphis Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Shelby County Assessor of Property",
              "scope": "Property Assessment",
              "desc": "Memphis and Shelby County real estate valuation rolls, parcel specs & appraisal records.",
              "url": "https://www.assessor.shelby.tn.us/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Shelby County Register of Deeds",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, warranty deeds, deeds of trust, liens & subdivision plats.",
              "url": "https://register.shelby.tn.us/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Shelby County Trustee (Property Tax Search)",
              "scope": "Property Taxes",
              "desc": "Property tax statements, payment processing & delinquent tax roll inquiry.",
              "url": "https://www.payitgov.com/shelby-county-trustee/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Shelby County Register GIS Parcel Viewer",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel mapping, boundary measurements & cadastral survey maps.",
              "url": "https://gis.register.shelby.tn.us/",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Shelby County Circuit & Chancery Court (CourtConnect)",
              "scope": "Civil & Court Dockets",
              "desc": "CourtConnect civil lawsuits, chancery court filings, domestic relations & judgments.",
              "url": "https://courtconnect.shelbycountytn.gov/",
              "label": "CourtConnect"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Shelby County Clerk (Business Tax & Marriage)",
              "scope": "DBA & Business Registry",
              "desc": "County business tax licenses, marriage certificates & notary commissions.",
              "url": "https://www.shelbycountytn.gov/",
              "label": "County Clerk"
          }
      ]
  },
  "MI:oakland": {
      "name": "Oakland County",
      "state": "MI",
      "metro": "Detroit Metro / Pontiac",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Oakland County Property Gateway & Equalization",
              "scope": "Property Assessment",
              "desc": "Troy, Farmington Hills, Pontiac property assessments, parcel characteristics & tax data.",
              "url": "https://www.oakgov.com/government/equalization",
              "label": "Property Gateway"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Oakland County Register of Deeds",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, warranty deeds, mortgages, liens & condominium plats.",
              "url": "https://www.oakgov.com/government/clerk-register-of-deeds",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Oakland County Treasurer",
              "scope": "Property Taxes",
              "desc": "Delinquent property tax lookup, annual tax statements & tax foreclosure info.",
              "url": "https://www.oakgov.com/government/treasurer",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Oakland County Access Oakland GIS",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive GIS parcel maps, aerial imagery, topography & municipal boundaries.",
              "url": "https://www.oakgov.com/community/gis-mapping",
              "label": "Access Oakland GIS"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "6th Judicial Circuit Court of Michigan (Court Explorer)",
              "scope": "Civil & Court Dockets",
              "desc": "Oakland County Circuit Court civil lawsuits, domestic relations & judicial dockets.",
              "url": "https://www.oakgov.com/government/courts",
              "label": "Court Explorer"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Oakland County Clerk (Assumed Names & Vital)",
              "scope": "DBA & Vital Registry",
              "desc": "Assumed business names (DBA / Co-partnerships), marriage licenses & concealed pistol licenses.",
              "url": "https://www.oakgov.com/government/clerk-register-of-deeds",
              "label": "County Clerk"
          }
      ]
  },
  "AZ:pima": {
      "name": "Pima County",
      "state": "AZ",
      "metro": "Tucson Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Pima County Assessor Property Search",
              "scope": "Property Assessment",
              "desc": "Tucson and Pima County property appraisal values, residential specs & tax rolls.",
              "url": "https://www.asr.pima.gov/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Pima County Recorder of Deeds",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, warranty deeds, deeds of trust, liens & subdivision surveys.",
              "url": "https://www.recorder.pima.gov/",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Pima County Treasurer",
              "scope": "Property Taxes",
              "desc": "Real property and personal property tax billing inquiry, payments & tax status.",
              "url": "https://www.to.pima.gov/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Pima County PimaMaps Interactive GIS",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel boundaries, elevation contours, floodplains & zoning overlay.",
              "url": "https://gis.pima.gov/",
              "label": "PimaMaps GIS"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Pima County Superior Court Clerk Case Search",
              "scope": "Civil & Court Dockets",
              "desc": "Superior court civil lawsuits, probate proceedings, domestic relations & judgments.",
              "url": "https://www.sc.pima.gov/",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Pima County Clerk of the Superior Court",
              "scope": "Marriage & Public Records",
              "desc": "Marriage licenses, passport processing, legal records & court file archives.",
              "url": "https://www.cosc.pima.gov/",
              "label": "Superior Clerk"
          }
      ]
  },
  "GA:gwinnett": {
      "name": "Gwinnett County",
      "state": "GA",
      "metro": "Atlanta Metro / Lawrenceville",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Gwinnett County Tax Assessor's Office",
              "scope": "Property Assessment",
              "desc": "Lawrenceville, Duluth, Norcross real property assessments, building details & tax rolls.",
              "url": "https://www.gwinnettcounty.com/web/gwinnett/departments/financialservices/taxassessorsoffice",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Gwinnett County Clerk of Superior Court (Deeds)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded property deeds, mortgages, liens, UCC financing statements & plat maps.",
              "url": "https://www.gwinnettcourts.com/clerk/real-estate",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Gwinnett County Tax Commissioner",
              "scope": "Property Taxes",
              "desc": "Real estate tax bill lookups, payment processing & property tax receipts.",
              "url": "https://gwinnetttaxcommissioner.publicaccessnow.com/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Gwinnett County Geographic Information Systems",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel boundaries, zoning overlay, aerial orthophotography & commission districts.",
              "url": "https://www.gwinnettcounty.com/web/gwinnett/departments/informationtechnologyservices/gis",
              "label": "Parcel GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Gwinnett County Courts Case Search",
              "scope": "Civil & Court Dockets",
              "desc": "Superior and State court civil litigation, garnishments, foreclosures & case dockets.",
              "url": "https://www.gwinnettcourts.com/casesearch/",
              "label": "Court Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Gwinnett County Clerk (Trade Names / DBA)",
              "scope": "DBA & Business Registry",
              "desc": "Trade name registration (DBA), notary public commissions & partnership registry.",
              "url": "https://www.gwinnettcourts.com/",
              "label": "Trade Names"
          }
      ]
  },
  "NY:westchester": {
      "name": "Westchester County",
      "state": "NY",
      "metro": "White Plains / NYC Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Westchester County Real Property Tax Services",
              "scope": "Property Assessment",
              "desc": "White Plains and Westchester municipal assessment rolls, tax rates & parcel valuations.",
              "url": "https://tax.westchestergov.com/",
              "label": "Tax Services"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Westchester County Clerk (PREP Land Records)",
              "scope": "Deeds & Mortgages",
              "desc": "Property Records Electronic Portal (PREP) recorded deeds, mortgages & title filings.",
              "url": "https://westchesterclerk.com/",
              "label": "PREP Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Westchester County Department of Finance",
              "scope": "Property Taxes",
              "desc": "County property tax distributions, municipal apportionments & tax rolls.",
              "url": "https://finance.westchestergov.com/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Westchester County Geographic Information Systems",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel mapping, boundary measurements, zoning & environmental data.",
              "url": "https://giswww.westchestergov.com/",
              "label": "Westchester GIS"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Westchester Supreme & County Courts (NYSCEF)",
              "scope": "Civil & Court Dockets",
              "desc": "New York State Unified Court System civil dockets, commercial claims & judgments.",
              "url": "https://iapps.courts.state.ny.us/nyscef/Login",
              "label": "NYSCEF Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Westchester County Clerk (Business / DBA Records)",
              "scope": "DBA & Business Registry",
              "desc": "Business certificates for sole proprietorships (DBA), corporations & notary commissions.",
              "url": "https://westchesterclerk.com/",
              "label": "DBA Registry"
          }
      ]
  },
  "NY:suffolk": {
      "name": "Suffolk County",
      "state": "NY",
      "metro": "Long Island Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Suffolk County Real Property Tax Service Agency",
              "scope": "Property Assessment",
              "desc": "Long Island township property assessment rolls, tax maps & assessed parcel data.",
              "url": "https://www.suffolkcountyny.gov/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Suffolk County Clerk (Recorded Documents)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded land documents, deeds, mortgages, satisfactions, covenants & subdivision plats.",
              "url": "https://suffolkcountyny.gov/Departments/County-Clerk",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Suffolk County Comptroller",
              "scope": "Property Taxes",
              "desc": "County property tax distribution, delinquent tax redemptions & property tax sales.",
              "url": "https://www.suffolkcountyny.gov/Departments/Comptroller",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Suffolk County GIS Interactive Parcel Viewer",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel mapping, boundary lines, aerial orthophotos & township lines.",
              "url": "https://gis.suffolkcountyny.gov/",
              "label": "Suffolk GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Suffolk County Supreme & County Court (NYSCEF)",
              "scope": "Civil & Court Dockets",
              "desc": "New York State Unified Court System civil lawsuits, motion decisions & dockets.",
              "url": "https://iapps.courts.state.ny.us/nyscef/Login",
              "label": "NYSCEF Courts"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Suffolk County Clerk (Business Certificates / DBA)",
              "scope": "DBA & Business Registry",
              "desc": "Certificates of doing business under assumed name (DBA), partnerships & legal filings.",
              "url": "https://suffolkcountyny.gov/Departments/County-Clerk",
              "label": "DBA Registry"
          }
      ]
  },
  "NY:monroe": {
      "name": "Monroe County",
      "state": "NY",
      "metro": "Rochester Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "Monroe County Real Property Portal",
              "scope": "Property Assessment",
              "desc": "Rochester and Monroe County real property assessment rolls, property tax bills & parcel info.",
              "url": "https://www.monroecounty.gov/taxes",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "Monroe County Clerk (Recorded Documents)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded property deeds, mortgages, liens, easements & survey map filings.",
              "url": "https://www.monroecounty.gov/clerk",
              "label": "Land Records"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "Monroe County Real Property Tax Collections",
              "scope": "Property Taxes",
              "desc": "Annual county tax payments, installment plans & delinquent tax roll status.",
              "url": "https://monroecounty.gov/taxes-pay",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "Monroe County GIS Parcel Viewer",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive parcel boundaries, aerial photography & municipal boundaries.",
              "url": "https://www.monroecounty.gov/gis",
              "label": "Monroe GIS Map"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Monroe Supreme & County Courts (NYSCEF)",
              "scope": "Civil & Court Dockets",
              "desc": "7th Judicial District civil lawsuits, tort actions, commercial division & judgments.",
              "url": "https://iapps.courts.state.ny.us/nyscef/Login",
              "label": "NYSCEF Dockets"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Monroe County Clerk (DBA & Business Records)",
              "scope": "DBA & Business Registry",
              "desc": "Business certificates (DBA), partnership filings & notary public registration.",
              "url": "https://www.monroecounty.gov/clerk",
              "label": "DBA Registry"
          }
      ]
  },
  "NY:bronx": {
      "name": "Bronx County (The Bronx)",
      "state": "NY",
      "metro": "New York City Metro",
      "offices": [
          {
              "key": "assessor",
              "icon": "🏡",
              "title": "NYC Department of Finance (Property Assessment)",
              "scope": "Property Assessment",
              "desc": "The Bronx and NYC property assessment rolls, market valuations & tax bills.",
              "url": "https://a836-propertyportal.nyc.gov/",
              "label": "Assessor Portal"
          },
          {
              "key": "deeds",
              "icon": "📜",
              "title": "NYC ACRIS (Automated City Register Information System)",
              "scope": "Deeds & Mortgages",
              "desc": "Recorded property deeds, mortgages, liens & title conveyances across The Bronx.",
              "url": "https://a836-acris.nyc.gov/CP/",
              "label": "ACRIS Deeds"
          },
          {
              "key": "treasurer",
              "icon": "💰",
              "title": "NYC Department of Finance (Property Taxes)",
              "scope": "Property Taxes",
              "desc": "Property tax bills, quarterly statement of accounts & tax payment receipts.",
              "url": "https://a836-propertyportal.nyc.gov/",
              "label": "Tax Collector"
          },
          {
              "key": "gis",
              "icon": "🗺️",
              "title": "NYC CityMap Interactive Parcel GIS",
              "scope": "GIS & Parcel Maps",
              "desc": "Interactive cadastral parcel boundaries, zoning, tax block/lot (BBL) & aerial imagery.",
              "url": "https://maps.nyc.gov/doitt/nycitymap/",
              "label": "CityMap GIS"
          },
          {
              "key": "courts",
              "icon": "⚖️",
              "title": "Bronx County Supreme Court (NYSCEF eCourts)",
              "scope": "Civil & Court Dockets",
              "desc": "Supreme Court civil lawsuits, commercial actions, foreclosures & judgment rolls.",
              "url": "https://iapps.courts.state.ny.us/nyscef/Login",
              "label": "NYSCEF Courts"
          },
          {
              "key": "clerk",
              "icon": "📋",
              "title": "Bronx County Clerk (Business & Vital Filings)",
              "scope": "DBA & Business Registry",
              "desc": "Assumed business names (DBA), partnership certificates & notary public registry.",
              "url": "https://www.nycourts.gov/courts/2jd/bronx/",
              "label": "County Clerk"
          }
      ]
  }
};

function getDirectCountyHub(stateCode, countyName) {
  if (!stateCode || !countyName || typeof countyName !== 'string') return null;
  const s = stateCode.toUpperCase().trim();
  const raw = countyName.toLowerCase().trim();
  const withoutParens = raw.replace(/\s*\([^\)]*\)/g, '').trim();
  const stripped1 = withoutParens.replace(/\s+(county|parish|borough|municipality|city)$/i, '').trim();
  const stripped2 = raw.replace(/\s+(county|parish|borough|municipality)$/i, '').trim();
  return COUNTY_NETR_HUBS[`${s}:${stripped1}`] ||
         COUNTY_NETR_HUBS[`${s}:${withoutParens}`] ||
         COUNTY_NETR_HUBS[`${s}:${stripped2}`] ||
         COUNTY_NETR_HUBS[`${s}:${raw}`] ||
         null;
}

function getDirectCountyPortal(stateCode, countyName) {
  const hub = getDirectCountyHub(stateCode, countyName);
  if (!hub) return null;
  const assessor = hub.offices.find(o => o.key === 'assessor')?.url || '';
  const deeds = hub.offices.find(o => o.key === 'deeds')?.url || '';
  return { name: hub.name, assessor, deeds };
}

let locationDebounceTimer = null;

function resolveJurisdiction(rawLocation) {
  if (!rawLocation || typeof rawLocation !== 'string' || !rawLocation.trim()) {
    return {
      country: 'US',
      stateCode: 'NY',
      stateName: 'New York',
      county: 'New York County',
      city: 'New York City',
      resolvedText: 'New York City (New York County), New York',
      isExact: true
    };
  }

  const str = rawLocation.trim();
  const normalizedKey = str.toLowerCase().replace(/\s+/g, ' ');

  // 0. Check persistent local cache first
  if (State.jurisdictionCache && State.jurisdictionCache[normalizedKey]) {
    return State.jurisdictionCache[normalizedKey];
  }
  const zipMatch = str.match(/\b(\d{5})\b/);
  if (zipMatch && State.jurisdictionCache && State.jurisdictionCache[zipMatch[1]]) {
    return State.jurisdictionCache[zipMatch[1]];
  }

  let stateCode = '';
  let county = '';
  let city = '';
  let isExact = false;

  // 1. Detect state name or state code
  // Priority A: State specified after comma: 'Kansas City, MO' or 'Kansas City, Missouri'
  const commaParts = str.split(',');
  if (commaParts.length > 1) {
    const afterComma = commaParts[commaParts.length - 1].trim();
    const codeMatch = afterComma.match(/^([A-Za-z]{2})\b/);
    if (codeMatch && US_STATES[codeMatch[1].toUpperCase()]) {
      stateCode = codeMatch[1].toUpperCase();
    }
    if (!stateCode) {
      for (const [code, info] of Object.entries(US_STATES)) {
        if (new RegExp(`\\b${info.name}\\b`, 'i').test(afterComma)) {
          stateCode = code;
          break;
        }
      }
    }
  }

  // Priority B: Trailing 2-letter state code: 'Kansas City MO' or 'Charlotte NC'
  if (!stateCode) {
    const endMatch = str.match(/\b([A-Za-z]{2})\s*$/);
    if (endMatch && US_STATES[endMatch[1].toUpperCase()]) {
      stateCode = endMatch[1].toUpperCase();
    }
  }

  // Priority C: Trailing full state name: 'Kansas City Missouri'
  if (!stateCode) {
    for (const [code, info] of Object.entries(US_STATES)) {
      if (new RegExp(`\\b${info.name}\\s*$`, 'i').test(str)) {
        stateCode = code;
        break;
      }
    }
  }

  // Priority D: Comma followed by 2-letter code anywhere
  if (!stateCode) {
    const commaMatch = str.match(/,\s*([A-Za-z]{2})\b/);
    if (commaMatch && US_STATES[commaMatch[1].toUpperCase()]) {
      stateCode = commaMatch[1].toUpperCase();
    }
  }

  // Priority E: Standalone uppercase 2-letter code matching a US state
  if (!stateCode) {
    const words = str.split(/[^A-Za-z]/).filter(Boolean);
    for (const w of words) {
      if (w.length === 2 && w === w.toUpperCase() && US_STATES[w]) {
        stateCode = w;
        break;
      }
    }
  }

  // Priority F: Full state name anywhere in str
  if (!stateCode) {
    for (const [code, info] of Object.entries(US_STATES)) {
      const namePattern = new RegExp(`\\b${info.name}\\b`, 'i');
      if (namePattern.test(str)) {
        stateCode = code;
        break;
      }
    }
  }

  // 2. Check if County, Parish, Borough, or Municipio is explicitly specified in the query
  const countyMatch = str.match(/([A-Za-z\s]+?)\s+(County|Parish|Borough|Municipio)/i);
  if (countyMatch) {
    county = `${countyMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase())} ${countyMatch[2].charAt(0).toUpperCase() + countyMatch[2].slice(1).toLowerCase()}`;
    isExact = true;
  }

  // 3. Check city in dictionary (multi-word down to single-word)
  const cleanTokens = str.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < cleanTokens.length; i++) {
    for (let len = Math.min(4, cleanTokens.length - i); len >= 1; len--) {
      const candidate = cleanTokens.slice(i, i + len).join(' ');
      if (CITY_TO_COUNTY[candidate]) {
        const mapped = CITY_TO_COUNTY[candidate];
        if (!stateCode || stateCode === mapped.state) {
          city = candidate.replace(/\b\w/g, c => c.toUpperCase());
          if (!county) county = mapped.county;
          if (!stateCode) stateCode = mapped.state;
          isExact = true;
          break;
        } else if (!city) {
          city = candidate.replace(/\b\w/g, c => c.toUpperCase());
          if (!county) county = mapped.county;
        }
      }
    }
    if (city && county) break;
  }

  // Also check if city alone is in jurisdictionCache
  if (!county && city && State.jurisdictionCache && State.jurisdictionCache[city.toLowerCase()]) {
    const cached = State.jurisdictionCache[city.toLowerCase()];
    if (!stateCode || cached.stateCode === stateCode) {
      county = cached.county;
      if (!stateCode) stateCode = cached.stateCode;
      isExact = true;
    }
  }

  // 4. Default state if still undetermined
  if (!stateCode) stateCode = 'NY';
  const stateObj = US_STATES[stateCode] || US_STATES.NY;

  // 5. If city or county not resolved from dictionary, inspect candidate string
  if (!city && !county) {
    const parts = str.split(',');
    let candidate = parts[0].trim();
    candidate = candidate.replace(new RegExp(`\\b${stateObj.name}\\b`, 'i'), '').trim();
    candidate = candidate.replace(new RegExp(`\\b${stateCode}\\b`, 'i'), '').trim();

    if (candidate && candidate.length > 1) {
      if (/County|Parish|Borough|Municipio/i.test(candidate)) {
        county = candidate.replace(/\b\w/g, c => c.toUpperCase());
        isExact = true;
      } else {
        // It is a municipal city/town candidate - DO NOT append "County"!
        city = candidate.replace(/\b\w/g, c => c.toUpperCase());
        county = stateObj.defaultCounty || `${stateObj.name} County`;
        isExact = false;
      }
    } else {
      county = stateObj.defaultCounty || `${stateObj.name} County`;
    }
  } else if (!county) {
    county = stateObj.defaultCounty || `${stateObj.name} County`;
  }

  const resolvedText = city && city !== county
    ? `${city} (${county}), ${stateObj.name}`
    : `${county}, ${stateObj.name}`;

  return {
    country: 'US',
    stateCode,
    stateName: stateObj.name,
    county,
    city: city || (county ? county.replace(/\s+(County|Parish|Borough|Municipio)/i, '') : ''),
    resolvedText,
    isExact
  };
}

let lastNominatimTimestamp = 0;

async function resolveJurisdictionAsync(rawLocation) {
  if (!rawLocation || typeof rawLocation !== 'string' || !rawLocation.trim()) {
    return resolveJurisdiction(rawLocation);
  }

  const str = rawLocation.trim();
  const normalizedKey = str.toLowerCase().replace(/\s+/g, ' ');

  // 1. Check persistent local cache first
  if (State.jurisdictionCache && State.jurisdictionCache[normalizedKey]) {
    return State.jurisdictionCache[normalizedKey];
  }

  // 2. Synchronous resolution check
  const syncJur = resolveJurisdiction(str);
  if (syncJur.isExact) {
    State.jurisdictionCache[normalizedKey] = syncJur;
    if (typeof saveStoredData === 'function') saveStoredData();
    return syncJur;
  }

  // 3. Fall back to OpenStreetMap Nominatim universal geocoder
  try {
    // Rate limit guard: strictly enforce at least 1100ms between remote calls (OSM policy is 1 req/sec max)
    const now = Date.now();
    const elapsed = now - lastNominatimTimestamp;
    if (elapsed < 1100) {
      await new Promise(r => setTimeout(r, 1100 - elapsed));
    }
    lastNominatimTimestamp = Date.now();

    const isZipOnly = /^\d{5}$/.test(str);
    const encoded = encodeURIComponent(str);
    const url = isZipOnly
      ? `https://nominatim.openstreetmap.org/search?postalcode=${encoded}&countrycodes=us&format=json&addressdetails=1&limit=1`
      : `https://nominatim.openstreetmap.org/search?q=${encoded}&countrycodes=us&format=json&addressdetails=1&limit=1`;

    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Visage-OSINT-Extension/1.0'
      }
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        showToast('⚠️ Nominatim geocoding rate limit reached (1 req/sec). Using offline dictionary.', 'warning', 5000);
      } else {
        console.warn(`Nominatim geocoder HTTP status ${resp.status}`);
      }
      return syncJur;
    }

    const results = await resp.json();
    if (!Array.isArray(results) || results.length === 0) {
      return syncJur;
    }

    const item = results[0];
    const addr = item.address || {};

    // Determine state
    let stateCode = '';
    if (addr['ISO3166-2-lvl4'] && addr['ISO3166-2-lvl4'].startsWith('US-')) {
      stateCode = addr['ISO3166-2-lvl4'].replace('US-', '').toUpperCase();
    }
    if (!stateCode && addr.state) {
      for (const [code, info] of Object.entries(US_STATES)) {
        if (info.name.toLowerCase() === addr.state.toLowerCase()) {
          stateCode = code;
          break;
        }
      }
    }
    if (!stateCode) {
      stateCode = syncJur.stateCode || 'NY';
    }

    const stateObj = US_STATES[stateCode] || US_STATES.NY;

    // Determine county / parish / borough
    let county = addr.county || addr.parish || addr.borough || addr.district || '';
    if (!county && addr.subregion) {
      county = addr.subregion;
    }

    if (county) {
      // Normalize county naming
      if (stateCode === 'LA') {
        if (!/Parish/i.test(county)) county = `${county} Parish`;
      } else if (stateCode === 'AK') {
        if (!/Borough|Municipality|Census Area/i.test(county)) county = `${county} Borough`;
      } else {
        if (!/County|Parish|Borough|City/i.test(county)) county = `${county} County`;
      }
    } else {
      county = syncJur.county || stateObj.defaultCounty || `${stateObj.name} County`;
    }

    // Determine city / municipality and strip formal prefix (e.g. "Town of Williamson" -> "Williamson")
    const rawCity = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || addr.suburb || syncJur.city || '';
    const city = rawCity.replace(/^(Town|City|Village) of\s+/i, '');

    const resolvedText = city && city !== county
      ? `${city} (${county}), ${stateObj.name}`
      : `${county}, ${stateObj.name}`;

    const resolved = {
      country: addr.country_code ? addr.country_code.toUpperCase() : 'US',
      stateCode,
      stateName: stateObj.name,
      county,
      city,
      zip: addr.postcode || (isZipOnly ? str : ''),
      resolvedText,
      isExact: true,
      fromGeo: true
    };

    // Store in cache under multiple permutations
    State.jurisdictionCache[normalizedKey] = resolved;
    if (addr.postcode) {
      State.jurisdictionCache[addr.postcode] = resolved;
    }
    if (city) {
      State.jurisdictionCache[city.toLowerCase()] = resolved;
      State.jurisdictionCache[`${city.toLowerCase()}, ${stateCode.toLowerCase()}`] = resolved;
      State.jurisdictionCache[`${city.toLowerCase()}, ${stateObj.name.toLowerCase()}`] = resolved;
    }
    if (typeof saveStoredData === 'function') saveStoredData();

    return resolved;
  } catch (err) {
    console.warn('Geocoding error in resolveJurisdictionAsync:', err);
    showToast('ℹ️ Geocoding network limit or offline: using local jurisdictional dictionary.', 'info', 3500);
    return syncJur;
  }
}

function applyResolvedJurisdictionToUI(jur) {
  if (!jur) return;
  State.jurisdiction = jur;

  // 1. Update Scope preview badge in Step 1
  const preview = document.getElementById('jurisdiction-preview');
  const badgeText = document.getElementById('jur-badge-text');
  if (preview && badgeText) {
    const label = jur.city && jur.city !== jur.county
      ? `📍 ${jur.city} (${jur.county}), ${jur.stateCode}`
      : `📍 ${jur.county}, ${jur.stateCode}`;
    badgeText.textContent = label;
    preview.style.display = 'flex';
  }

  // 2. Update Public Records tab controls in Step 6
  const stateSelect = document.getElementById('jur-state-select');
  const countyInput = document.getElementById('jur-county-input');
  if (stateSelect && jur.stateCode) {
    stateSelect.value = jur.stateCode;
  }
  if (countyInput) {
    countyInput.value = jur.city && jur.city !== jur.county
      ? `${jur.city} (${jur.county})`
      : (jur.city || jur.county);
  }

  // 3. Re-render records tab
  renderRecordsTab();
}

function updateLocationJurisdictionPreview() {
  const locInput = document.getElementById('target-location');
  const locStr = locInput ? locInput.value.trim() : '';
  const preview = document.getElementById('jurisdiction-preview');

  if (!locStr) {
    if (preview) preview.style.display = 'none';
    return;
  }

  // Fast synchronous preview first
  const quickJur = resolveJurisdiction(locStr);
  applyResolvedJurisdictionToUI(quickJur);

  // If not exact, debounce async Nominatim lookup
  if (!quickJur.isExact) {
    clearTimeout(locationDebounceTimer);
    locationDebounceTimer = setTimeout(async () => {
      try {
        const asyncJur = await resolveJurisdictionAsync(locStr);
        if (asyncJur) {
          applyResolvedJurisdictionToUI(asyncJur);
        }
      } catch (err) {
        console.warn('Async jurisdiction resolution failed:', err);
      }
    }, 500);
  }
}

function setupRecordsTab() {
  const stateSelect = document.getElementById('jur-state-select');
  const countyInput = document.getElementById('jur-county-input');
  const btnResolve = document.getElementById('btn-resolve-jur');
  const btnSyncScope = document.getElementById('btn-sync-jur-scope');
  const btnLogDossier = document.getElementById('btn-records-to-audit');

  if (!stateSelect) return;

  // Populate states dropdown
  stateSelect.innerHTML = '<option value="">-- Select State / Territory --</option>';
  Object.keys(US_STATES).sort().forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${US_STATES[code].name} (${code})`;
    if (code === State.jurisdiction.stateCode) opt.selected = true;
    stateSelect.appendChild(opt);
  });

  if (countyInput) {
    countyInput.value = State.jurisdiction.city && State.jurisdiction.city !== State.jurisdiction.county
      ? `${State.jurisdiction.city} (${State.jurisdiction.county})`
      : (State.jurisdiction.city || State.jurisdiction.county);
  }

  // Handlers
  stateSelect.addEventListener('change', async () => {
    const code = stateSelect.value;
    if (code && US_STATES[code]) {
      const stateObj = US_STATES[code];
      const currentCity = (countyInput ? countyInput.value.trim() : '') || State.jurisdiction.city || '';
      const candidate = currentCity ? `${currentCity}, ${code}` : code;
      const quick = resolveJurisdiction(candidate);
      applyResolvedJurisdictionToUI(quick);
      markStep(6, true);
      showToast(`Jurisdiction updated: ${quick.resolvedText}`);

      if (!quick.isExact && currentCity) {
        try {
          const asyncJur = await resolveJurisdictionAsync(candidate);
          if (asyncJur) {
            applyResolvedJurisdictionToUI(asyncJur);
          }
        } catch (e) { /* ignore */ }
      }
    }
  });

  const doResolve = async () => {
    const inputVal = countyInput.value.trim();
    const stVal = stateSelect.value;
    
    // Check if inputVal already contains state info
    let hasState = false;
    for (const [code, info] of Object.entries(US_STATES)) {
      if (new RegExp(`\\b${code}\\b`, 'i').test(inputVal) || new RegExp(`\\b${info.name}\\b`, 'i').test(inputVal)) {
        hasState = true;
        break;
      }
    }
    
    let combined = inputVal;
    if (!hasState && stVal) {
      combined = inputVal ? `${inputVal}, ${stVal}` : stVal;
    }

    const quick = resolveJurisdiction(combined);
    applyResolvedJurisdictionToUI(quick);
    markStep(6, true);
    showToast(`Jurisdiction resolved: ${quick.resolvedText}`);

    // Run async resolution to verify/discover exact county/parish
    try {
      const asyncJur = await resolveJurisdictionAsync(combined);
      if (asyncJur) {
        applyResolvedJurisdictionToUI(asyncJur);
        if (asyncJur.resolvedText !== quick.resolvedText) {
          showToast(`Jurisdiction verified: ${asyncJur.resolvedText}`);
        }
      }
    } catch (err) {
      console.warn('Async resolve failed:', err);
    }
  };

  let countyDebounceTimer = null;
  if (btnResolve) btnResolve.addEventListener('click', doResolve);
  if (countyInput) {
    countyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doResolve();
    });
    countyInput.addEventListener('input', () => {
      clearTimeout(countyDebounceTimer);
      countyDebounceTimer = setTimeout(() => {
        const val = countyInput.value.trim();
        if (val.length >= 3) {
          doResolve();
        }
      }, 600);
    });
  }

  if (btnSyncScope) {
    btnSyncScope.addEventListener('click', () => {
      const locInput = document.getElementById('target-location');
      if (locInput) {
        locInput.value = State.jurisdiction.resolvedText;
        State.target.location = State.jurisdiction.resolvedText;
        updateLocationJurisdictionPreview();
        updateTargetCard();
        saveStoredData();
        markStep(6, true);
        showToast(`Synced '${State.jurisdiction.resolvedText}' to Scope`);
      }
    });
  }

  if (btnLogDossier) {
    btnLogDossier.addEventListener('click', () => {
      const jur = State.jurisdiction;
      const targetName = State.target.name || 'Target';
      const directHub = getDirectCountyHub(jur.stateCode, jur.county);
      const portalUrl = directHub
        ? (directHub.offices.find(o => o.key === 'assessor')?.url || directHub.offices[0]?.url)
        : `https://publicrecords.netronline.com/state/${jur.stateCode}/`;
      const notes = directHub
        ? `Target location: ${targetName} in ${jur.county}, ${jur.stateName}. Verified in-workstation county portal (${directHub.name}) logged.`
        : `Target location: ${targetName} in ${jur.county}, ${jur.stateName}. Verified County and State official portals logged.`;

      State.auditLogs.unshift({
        id: Date.now().toString(),
        target: targetName,
        title: `Jurisdiction Profile: ${jur.resolvedText}`,
        category: 'Public Legal Record',
        severity: 'info',
        status: 'confirmed',
        url: portalUrl,
        notes: notes,
        timestamp: new Date().toISOString()
      });
      saveStoredData();
      renderAuditLogs();
      updateTargetCard();
      markStep(6, true);
      showToast('Logged jurisdiction profile to dossier');
    });
  }
}

function renderRecordsTab() {
  const jur = State.jurisdiction;
  const stateObj = US_STATES[jur.stateCode] || US_STATES.NY;
  const targetName = State.target.name || 'Target Name';
  const directHub = getDirectCountyHub(jur.stateCode, jur.county);

  // Banner
  const bannerTitle = document.getElementById('jur-banner-title');
  const bannerMeta = document.getElementById('jur-banner-meta');
  if (bannerTitle) {
    bannerTitle.textContent = jur.city && jur.city !== jur.county
      ? `Resolved Jurisdiction: ${jur.city} • ${jur.county}, ${stateObj.name}`
      : `Resolved Jurisdiction: ${jur.county}, ${stateObj.name}`;
  }
  if (bannerMeta) {
    const metro = jur.city ? `Target Location: ${jur.city} • ` : '';
    const directBadge = directHub ? ` • ⚡ Direct County Hub: ${directHub.name} (${directHub.metro})` : '';
    bannerMeta.textContent = `${metro}Target: ${targetName} • Official Domain: ${stateObj.domain}${directBadge} • Directory Hub: publicrecords.netronline.com/state/${jur.stateCode}/`;
  }

  // Tier headers
  const t1County = document.getElementById('tier1-county-name');
  const t2State = document.getElementById('tier2-state-name');
  const t4Target = document.getElementById('tier4-target-name');
  if (t1County) {
    t1County.textContent = jur.city && jur.city !== jur.county
      ? `${jur.city} & ${jur.county}`
      : jur.county;
  }
  if (t2State) t2State.textContent = stateObj.name;
  if (t4Target) t4Target.textContent = targetName;

  // Tier 1 Badge and Title
  const t1Badge = document.getElementById('tier1-badge');
  if (t1Badge) {
    if (directHub) {
      t1Badge.textContent = '⚡ DIRECT COUNTY DIRECTORY';
      t1Badge.classList.add('badge-county-hub', 'badge-netr-clone');
    } else {
      t1Badge.textContent = 'TIER 1';
      t1Badge.classList.remove('badge-county-hub', 'badge-netr-clone');
    }
  }

  const t1TitleText = document.getElementById('tier1-title-text');
  if (t1TitleText) {
    t1TitleText.textContent = directHub ? 'Official County Directory Hub' : 'County & Local Government Records';
  }

  const t1NoticeContainer = document.getElementById('tier1-hub-notice-container');
  if (t1NoticeContainer) {
    if (directHub) {
      t1NoticeContainer.innerHTML = `
        <div class="county-hub-notice">
          <span class="hub-icon">⚡</span>
          <div>
            <span class="hub-title">${escapeHtml(directHub.name)} Directory (${escapeHtml(directHub.metro)})</span>: Direct in-workstation access to official county departmental records (Assessor, Deeds, Tax Collector, GIS, Courts, and Vital records) with zero ads, external paywalls, or adblock restrictions.
          </div>
        </div>
      `;
    } else {
      t1NoticeContainer.innerHTML = '';
    }
  }

  // Tier 1: County & Local Cards
  const t1Grid = document.getElementById('tier1-county-cards');
  if (t1Grid) {
    const netrUrl = `https://publicrecords.netronline.com/state/${jur.stateCode}/`;
    const locFilter = jur.city && jur.city !== jur.county
      ? `("${jur.county}" | "${jur.city}")`
      : `"${jur.county}"`;

    const deedsDork = `${locFilter} ("clerk" | "recorder of deeds" | "register of deeds" | "deeds") site:gov`;
    const assessorDork = jur.city && jur.city !== jur.county
      ? `"${jur.county}" ("${jur.city}" | "property appraiser" | "tax assessor" | "assessment roll" | "gis" | "parcel") site:gov`
      : `"${jur.county}" ("property appraiser" | "tax assessor" | "assessment roll" | "gis" | "parcel") site:gov`;
    const taxDork = `${locFilter} ("treasurer" | "tax collector" | "property taxes" | "tax bill") site:gov`;
    const gisDork = `${locFilter} ("gis" | "interactive map" | "parcel viewer" | "cadastral") site:gov`;
    const courtDork = `${locFilter} ("district court" | "county court" | "clerk of court" | "civil docket") site:gov`;
    const clerkDork = `${locFilter} ("clerk" | "assumed name" | "dba" | "vital statistics" | "marriage license") site:gov`;
    const sheriffDork = `${locFilter} ("sheriff" | "police" | "inmate roster" | "jail" | "booking" | "arrests") site:gov`;
    const boeDork = `${locFilter} ("board of elections" | "election commission" | "registrar of voters" | "voter registration" | "sample ballot") site:gov`;

    const countyCards = [];

    // Municipal Town / City Hall card when a specific municipal town is identified
    if (jur.city && jur.city !== jur.county) {
      const municipalDork = `"${jur.city}" "${stateObj.name}" ("city hall" | "town hall" | ordinance | zoning | "code enforcement" | permits | "meeting minutes") site:gov`;
      countyCards.push({
        icon: '🏛️',
        title: `${jur.city} Municipal / Town Hall Records`,
        scope: 'Town & Municipal',
        isDirect: false,
        desc: `Local municipal codes, city/town hall official notices, building permits, local zoning, and council minutes for ${jur.city}.`,
        dork: municipalDork,
        portalUrl: `https://www.google.com/search?q=${encodeURIComponent(municipalDork)}`,
        portalLabel: 'Search Municipal'
      });
    }

    if (directHub) {
      const dorkMap = {
        assessor: assessorDork,
        deeds: deedsDork,
        treasurer: taxDork,
        gis: gisDork,
        courts: courtDork,
        clerk: clerkDork
      };

      for (const off of directHub.offices) {
        countyCards.push({
          icon: off.icon || '🏛️',
          title: off.title,
          scope: `${off.scope} (Direct ⚡)`,
          isDirect: true,
          desc: off.desc,
          dork: dorkMap[off.key] || `${locFilter} "${off.title}" site:gov`,
          portalUrl: off.url,
          portalLabel: `${off.label} ⚡`
        });
      }

      countyCards.push(
        {
          icon: '👮',
          title: `${jur.county} Sheriff & Jail Inmate Roster`,
          scope: 'Custody & Warrants',
          isDirect: false,
          desc: 'Review active detention lists, county jail bookings, warrants, and sheriff notices.',
          dork: sheriffDork,
          portalUrl: `https://www.google.com/search?q=${encodeURIComponent(sheriffDork)}`,
          portalLabel: 'Sheriff Search'
        },
        {
          icon: '🗳️',
          title: `${jur.county} Board of Elections & Voter Rolls`,
          scope: 'Voter Registration',
          isDirect: false,
          desc: `County board of elections, local voter registration rolls, petition filings, and municipal election precincts for ${jur.county}.`,
          dork: boeDork,
          portalUrl: stateObj.voterUrl || `https://www.google.com/search?q=${encodeURIComponent(boeDork)}`,
          portalLabel: 'BOE & Voter Info'
        },
        {
          icon: '🌐',
          title: `Statewide Records Directory (${stateObj.name})`,
          scope: 'Statewide Index Fallback',
          isDirect: false,
          desc: 'Direct link to statewide public records directory if you need historical indexes or peripheral townships outside the primary metro hub.',
          dork: `site:publicrecords.netronline.com "${jur.county}"`,
          portalUrl: netrUrl,
          portalLabel: 'Open Statewide Directory ↗'
        }
      );
    } else {
      countyCards.push(
        {
          icon: '📜',
          title: `${jur.county} Clerk & Recorder of Deeds`,
          scope: 'Deeds & Mortgages',
          isDirect: false,
          desc: 'Search property deeds, mortgages, liens, judgments, DBA business names, and marriage records.',
          dork: deedsDork,
          portalUrl: netrUrl,
          portalLabel: 'NETR Directory'
        },
        {
          icon: '🏡',
          title: `${jur.county} Real Property Tax & GIS Assessor`,
          scope: 'Property Rolls',
          isDirect: false,
          desc: `Query property parcel assessment rolls by owner name to verify residential address and valuation${jur.city && jur.city !== jur.county ? ' in ' + jur.city : ''}.`,
          dork: assessorDork,
          portalUrl: netrUrl,
          portalLabel: 'GIS Tax Portal'
        },
        {
          icon: '⚖️',
          title: `${jur.county} County / District Court Filings`,
          scope: 'Civil & Criminal',
          isDirect: false,
          desc: 'Access local civil lawsuits, small claims, traffic infractions, and county court dockets.',
          dork: courtDork,
          portalUrl: `https://www.google.com/search?q=${encodeURIComponent(courtDork)}`,
          portalLabel: 'Court Directory'
        },
        {
          icon: '👮',
          title: `${jur.county} Sheriff & Jail Inmate Roster`,
          scope: 'Custody & Warrants',
          isDirect: false,
          desc: 'Review active detention lists, county jail bookings, warrants, and sheriff notices.',
          dork: sheriffDork,
          portalUrl: `https://www.google.com/search?q=${encodeURIComponent(sheriffDork)}`,
          portalLabel: 'Sheriff Search'
        },
        {
          icon: '🗳️',
          title: `${jur.county} Board of Elections & Voter Rolls`,
          scope: 'Voter Registration',
          isDirect: false,
          desc: `County board of elections, local voter registration rolls, petition filings, and municipal election precincts for ${jur.county}.`,
          dork: boeDork,
          portalUrl: stateObj.voterUrl || `https://www.google.com/search?q=${encodeURIComponent(boeDork)}`,
          portalLabel: 'BOE & Voter Info'
        },
        {
          icon: '🗺️',
          title: `Statewide Records Directory (${stateObj.name})`,
          scope: 'Statewide Index',
          isDirect: false,
          desc: 'Direct directory links to Assessor, Recorder of Deeds, and Tax Collector portals for all counties in the state.',
          dork: `site:publicrecords.netronline.com "${jur.county}"`,
          portalUrl: netrUrl,
          portalLabel: 'Open Statewide Directory ↗'
        }
      );
    }

    t1Grid.innerHTML = countyCards.map(c => `
      <div class="record-portal-card">
        <div class="record-portal-top">
          <span class="record-portal-icon">${c.icon}</span>
          <span class="record-portal-title">${escapeHtml(c.title)}</span>
          <span class="record-portal-scope ${c.isDirect ? 'scope-direct' : ''}">${escapeHtml(c.scope)}</span>
        </div>
        <div class="record-portal-desc">${escapeHtml(c.desc)}</div>
        <div class="record-portal-actions">
          <button type="button" class="btn-micro btn-open-portal ${c.isDirect ? 'btn-portal-direct' : ''}" data-url="${escapeHtml(c.portalUrl)}">${escapeHtml(c.portalLabel)} ↗</button>
          <button type="button" class="btn-micro btn-search-dork" data-query="${escapeHtml(c.dork)}">Dork Portal</button>
        </div>
      </div>
    `).join('');
  }

  // Tier 2: State Government Portals
  const t2Grid = document.getElementById('tier2-state-cards');
  if (t2Grid) {
    const stateCards = [
      {
        icon: '⚖️',
        title: stateObj.courtName,
        scope: 'State Courts',
        desc: stateObj.courtDesc || 'Unified state judicial case lookup and electronic filing records.',
        url: stateObj.courtUrl
      },
      {
        icon: '🏢',
        title: stateObj.corpName,
        scope: 'Business & LLCs',
        desc: stateObj.corpDesc || 'Division of Corporations corporate filings, LLC members, and registered agents.',
        url: stateObj.corpUrl
      },
      {
        icon: '🎓',
        title: stateObj.licenseName,
        scope: 'Professional Licensing',
        desc: stateObj.licenseDesc || 'State professional, healthcare, engineering, and occupational licenses.',
        url: stateObj.licenseUrl
      },
      {
        icon: '🔒',
        title: stateObj.inmateName,
        scope: 'Corrections',
        desc: stateObj.inmateDesc || 'Department of Corrections state prison population and supervision search.',
        url: stateObj.inmateUrl
      },
      {
        icon: '🗳️',
        title: stateObj.voterName || `${stateObj.name} State Voter Registration Lookup`,
        scope: 'Voter Registration',
        desc: stateObj.voterDesc || 'Official statewide voter registration verification, political party affiliation, and district profile.',
        url: stateObj.voterUrl || `https://www.google.com/search?q=${encodeURIComponent(stateObj.name + ' voter registration lookup status site:gov')}`
      }
    ];

    t2Grid.innerHTML = stateCards.map(s => `
      <div class="record-portal-card">
        <div class="record-portal-top">
          <span class="record-portal-icon">${s.icon}</span>
          <span class="record-portal-title">${escapeHtml(s.title)}</span>
          <span class="record-portal-scope">${escapeHtml(s.scope)}</span>
        </div>
        <div class="record-portal-desc">${escapeHtml(s.desc)}</div>
        <div class="record-portal-actions">
          <button type="button" class="btn-micro btn-open-portal" data-url="${escapeHtml(s.url)}">Open Official Portal ↗</button>
          <button type="button" class="btn-micro btn-log-state-portal" data-title="${escapeHtml(s.title)}" data-url="${escapeHtml(s.url)}" data-category="${escapeHtml(s.scope)}">Log to Exposure Report</button>
        </div>
      </div>
    `).join('');
  }

  // Tier 3: Federal & Nationwide Indexes
  const t3Grid = document.getElementById('tier3-federal-cards');
  if (t3Grid) {
    const usptoUrl = targetName && targetName !== 'Target Name'
      ? `https://patents.google.com/?inventor=${encodeURIComponent(targetName)}`
      : 'https://ppubs.uspto.gov/pubwebapp/static/pages/landing.html';

    const fedCards = [
      {
        icon: '🏛️',
        title: 'CourtListener / RECAP & PACER',
        scope: 'Federal Courts',
        desc: 'Search Federal District, Bankruptcy, and Appellate litigation dockets across all US federal circuits.',
        url: targetName !== 'Target Name' ? `https://www.courtlistener.com/?q=${encodeURIComponent('"' + targetName + '"')}&type=r` : 'https://www.courtlistener.com/'
      },
      {
        icon: '💡',
        title: 'USPTO Patent & Trademark Public Search',
        scope: 'Patents & Inventions',
        desc: 'Official public register for patents and trademarks. Discloses inventor full names, assignees, residential city/state, and technical innovations.',
        url: usptoUrl
      },
      {
        icon: '💵',
        title: 'FEC.gov Individual Contributor Search',
        scope: 'Campaign Donors',
        desc: 'Political campaign donation disclosures - frequently reveals target personal street address, employer, and title.',
        url: targetName !== 'Target Name' ? `https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${encodeURIComponent(targetName)}` : 'https://www.fec.gov/data/receipts/individual-contributions/'
      },
      {
        icon: '📈',
        title: 'SEC EDGAR Executive Filings',
        scope: 'Executive Equity',
        desc: 'Corporate director insider stock transactions (Form 3, 4, 5) and institutional beneficial ownership schedules (13D/13G).',
        url: targetName !== 'Target Name' ? `https://www.sec.gov/edgar/searchedgar/companysearch?q=${encodeURIComponent(targetName)}` : 'https://www.sec.gov/edgar/searchedgar/companysearch'
      }
    ];

    t3Grid.innerHTML = fedCards.map(f => `
      <div class="record-portal-card">
        <div class="record-portal-top">
          <span class="record-portal-icon">${f.icon}</span>
          <span class="record-portal-title">${escapeHtml(f.title)}</span>
          <span class="record-portal-scope">${escapeHtml(f.scope)}</span>
        </div>
        <div class="record-portal-desc">${escapeHtml(f.desc)}</div>
        <div class="record-portal-actions">
          <button type="button" class="btn-micro btn-open-portal" data-url="${escapeHtml(f.url)}">Open Federal Portal ↗</button>
          <button type="button" class="btn-micro btn-log-state-portal" data-title="${escapeHtml(f.title)}" data-url="${escapeHtml(f.url)}" data-category="${escapeHtml(f.scope)}">Log to Exposure Report</button>
        </div>
      </div>
    `).join('');
  }

  // Tier 4: Jurisdictional Target Dorks
  const t4Grid = document.getElementById('tier4-dorks-grid');
  if (t4Grid) {
    const locFilter = jur.city && jur.city !== jur.county
      ? `("${jur.city}" | "${jur.county}" | "${jur.stateName}")`
      : `("${jur.county}" | "${jur.stateName}")`;

    const dorks = [
      {
        title: '📜 Real Property, Deeds & Parcel Assessments',
        tag: 'Property Deeds',
        query: `"${targetName}" ${locFilter} ("deed" | "mortgage" | "grantor" | "grantee" | "property assessment" | "parcel")`
      },
      {
        title: '⚖️ Local Court Litigation & Dockets',
        tag: 'Court Actions',
        query: `"${targetName}" ${locFilter} (plaintiff | defendant | "case no" | docket | lawsuit | indictment)`
      },
      {
        title: '🏢 State LLC & Corporate Registrations',
        tag: 'LLCs & Officers',
        query: `"${targetName}" site:${stateObj.domain} ("llc" | "corporation" | "articles of organization" | "managing member" | "director")`
      },
      {
        title: '👮 Arrests, Inmates & Police Blotters',
        tag: 'Arrests & Blotters',
        query: `"${targetName}" ${locFilter} (arrest | mugshot | booking | inmate | warrant | charges | blotter)`
      },
      {
        title: '🗳️ Voter Registration & Party Enrollment',
        tag: 'Voter Records',
        query: `"${targetName}" ("voter registration" | "voter record" | "registered to vote" | "party affiliation") ${locFilter}`
      },
      {
        title: '🏛️ State & Municipal Campaign Finance',
        tag: 'State Donors',
        query: `"${targetName}" site:${stateObj.domain} ("board of elections" | "campaign finance" | "contributions" | "donations" | "expenditures")`
      },
      {
        title: '💸 Federal & Local Campaign Contributions',
        tag: 'Campaign Donors',
        query: jur.city && jur.city !== jur.county
          ? `"${targetName}" ("${jur.city}" | "${jur.county}") "${jur.stateCode}" (donor | contributor | "fec.gov" | contribution)`
          : `"${targetName}" "${jur.county}" "${jur.stateCode}" (donor | contributor | "fec.gov" | contribution)`
      },
      {
        title: '🎓 State Professional Board Licenses',
        tag: 'Professional Licensing',
        query: `"${targetName}" site:${stateObj.domain} ("license" | "credential" | "board of" | "active status" | "licensed by")`
      }
    ];

    t4Grid.innerHTML = dorks.map(d => `
      <div class="jur-dork-card">
        <div class="jur-dork-header">
          <span class="jur-dork-title">${escapeHtml(d.title)}</span>
          <span class="jur-dork-tag">${escapeHtml(d.tag)}</span>
        </div>
        <div class="jur-dork-query">${escapeHtml(d.query)}</div>
        <div class="jur-dork-actions">
          <button type="button" class="btn-micro btn-search-dork" data-query="${escapeHtml(d.query)}">Search Google</button>
          <button type="button" class="btn-micro btn-copy-dork-query" data-query="${escapeHtml(d.query)}">Copy</button>
          <button type="button" class="btn-micro btn-log-dork-to-dossier" data-title="${escapeHtml(d.title)}" data-query="${escapeHtml(d.query)}">Log</button>
        </div>
      </div>
    `).join('');
  }

  // Attach event listeners across records cards
  document.querySelectorAll('.btn-open-portal').forEach(btn => {
    btn.onclick = () => {
      const url = btn.getAttribute('data-url');
      if (url) browser.tabs.create({ url });
      markStep(6, true);
    };
  });

  document.querySelectorAll('.btn-search-dork').forEach(btn => {
    btn.onclick = () => {
      const q = btn.getAttribute('data-query');
      if (q) browser.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(q)}&tbs=li:1` });
      markStep(6, true);
    };
  });

  document.querySelectorAll('.btn-copy-dork-query').forEach(btn => {
    btn.onclick = () => {
      const q = btn.getAttribute('data-query');
      if (q) {
        navigator.clipboard.writeText(q);
        showToast('Copied search dork to clipboard');
        markStep(6, true);
      }
    };
  });

  document.querySelectorAll('.btn-log-state-portal').forEach(btn => {
    btn.onclick = () => {
      const title = btn.getAttribute('data-title');
      const url = btn.getAttribute('data-url');
      const cat = btn.getAttribute('data-category') || 'Public Legal Record';
      State.auditLogs.unshift({
        id: Date.now().toString(),
        target: State.target.name || 'Target',
        title: `Public Record Portal: ${title}`,
        category: cat,
        severity: 'info',
        status: 'investigating',
        url: url,
        notes: `Jurisdiction portal review for ${State.jurisdiction.resolvedText}.`,
        timestamp: new Date().toISOString()
      });
      saveStoredData();
      renderAuditLogs();
      updateTargetCard();
      markStep(6, true);
      showToast('Logged portal to dossier');
    };
  });

  document.querySelectorAll('.btn-log-dork-to-dossier').forEach(btn => {
    btn.onclick = () => {
      const title = btn.getAttribute('data-title');
      const query = btn.getAttribute('data-query');
      State.auditLogs.unshift({
        id: Date.now().toString(),
        target: State.target.name || 'Target',
        title: `Jurisdictional Search: ${title}`,
        category: 'Public Legal Record',
        severity: 'medium',
        status: 'investigating',
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=li:1`,
        notes: `Jurisdictional query: ${query}`,
        timestamp: new Date().toISOString()
      });
      saveStoredData();
      renderAuditLogs();
      updateTargetCard();
      markStep(6, true);
      showToast('Logged search dork to dossier');
    };
  });
}

// -------------------------------------------------------------
// STEP 7: DOSSIER TRIAGE & MULTI-DIALECT OBSIDIAN EXPORT
// -------------------------------------------------------------
function setupDossierTab() {
  // Filters
  document.getElementById('audit-filter-status').addEventListener('change', renderAuditLogs);
  document.getElementById('audit-filter-severity').addEventListener('change', renderAuditLogs);

  // Clear FP and Clear All
  document.getElementById('btn-clear-fp').addEventListener('click', () => {
    State.auditLogs = State.auditLogs.filter(l => l.status !== 'false_positive');
    saveStoredData();
    renderAuditLogs();
    updateTargetCard();
    showToast('Cleared False Positives');
  });

  document.getElementById('btn-clear-audit').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all findings in this dossier?')) {
      State.auditLogs = [];
      saveStoredData();
      renderAuditLogs();
      updateTargetCard();
      showToast('Dossier cleared');
    }
  });

  // Manual finding modal
  const manualModal = document.getElementById('manual-modal');
  document.getElementById('btn-add-manual-finding').addEventListener('click', () => {
    manualModal.style.display = 'flex';
  });

  document.getElementById('btn-close-manual-modal').addEventListener('click', () => {
    manualModal.style.display = 'none';
  });

  document.getElementById('btn-cancel-manual-finding').addEventListener('click', () => {
    manualModal.style.display = 'none';
  });

  document.getElementById('btn-save-manual-finding').addEventListener('click', () => {
    const title = document.getElementById('mf-title').value.trim();
    const category = document.getElementById('mf-category').value;
    const severity = document.getElementById('mf-severity').value;
    const url = document.getElementById('mf-url').value.trim();
    const notes = document.getElementById('mf-notes').value.trim();

    if (!title) return showToast('Please enter a finding title', false);

    State.auditLogs.unshift({
      id: Date.now().toString(),
      target: State.target.name || State.target.handle || 'Target',
      title,
      category,
      severity,
      status: 'confirmed',
      url,
      notes,
      timestamp: new Date().toISOString()
    });

    document.getElementById('mf-title').value = '';
    document.getElementById('mf-url').value = '';
    document.getElementById('mf-notes').value = '';
    manualModal.style.display = 'none';

    saveStoredData();
    renderAuditLogs();
    updateTargetCard();
    markStep(7, true);
    showToast('Finding added to exposure report');
  });

  // Exporters & Importer
  document.getElementById('btn-export-obsidian').addEventListener('click', exportObsidianMarkdown);
  document.getElementById('btn-copy-dossier-md').addEventListener('click', copyObsidianMarkdown);
  document.getElementById('btn-export-json').addEventListener('click', exportJsonDossier);
  document.getElementById('btn-export-csv').addEventListener('click', exportCsvDossier);

  const btnImport = document.getElementById('btn-import-dossier');
  const fileInput = document.getElementById('input-import-dossier');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        await handleDossierImport(file);
        fileInput.value = '';
      }
    });
  }
}

function renderAuditLogs() {
  const container = document.getElementById('dossier-list');
  if (!container) return;

  const filterStatus = document.getElementById('audit-filter-status')?.value || 'all';
  const filterSeverity = document.getElementById('audit-filter-severity')?.value || 'all';

  let filtered = State.auditLogs.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && l.severity !== filterSeverity) return false;
    return true;
  });

  // Update counts
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  State.auditLogs.forEach(l => {
    if (counts[l.severity] !== undefined) counts[l.severity]++;
  });

  document.getElementById('count-critical').textContent = counts.critical;
  document.getElementById('count-high').textContent = counts.high;
  document.getElementById('count-medium').textContent = counts.medium;
  document.getElementById('count-low').textContent = counts.low;
  document.getElementById('count-info').textContent = counts.info;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No exposure findings recorded yet. Send findings from the Username Matrix, PGP keys, Breach checks, or add a manual finding above.</div>';
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="finding-card" data-id="${escapeHtml(item.id)}">
      <div class="finding-card-header">
        <div class="finding-title-group">
          <span class="badge-${item.severity}">${item.severity.toUpperCase()}</span>
          <span class="finding-title">${escapeHtml(item.title)}</span>
          <span class="finding-category-pill">${escapeHtml(item.category)}</span>
        </div>
        <div class="finding-controls">
          <select class="finding-status-select" data-id="${escapeHtml(item.id)}">
            <option value="investigating" ${item.status === 'investigating' ? 'selected' : ''}>Under Review</option>
            <option value="confirmed" ${item.status === 'confirmed' ? 'selected' : ''}>Confirmed Hit</option>
            <option value="false_positive" ${item.status === 'false_positive' ? 'selected' : ''}>False Positive</option>
            <option value="mitigated" ${item.status === 'mitigated' ? 'selected' : ''}>Mitigated</option>
          </select>
          <button type="button" class="btn-micro btn-delete-finding" data-id="${escapeHtml(item.id)}" title="Delete finding">🗑️</button>
        </div>
      </div>
      <div class="finding-body">
        ${item.url ? (/^https?:\/\//i.test(item.url)
          ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="finding-evidence">${escapeHtml(item.url)} ↗</a>`
          : `<span class="finding-evidence">${escapeHtml(item.url)}</span>`) : ''}
        <input type="text" class="finding-notes-input" data-id="${escapeHtml(item.id)}" value="${escapeHtml(item.notes || '')}" placeholder="Add analyst notes or evidence details...">
      </div>
      <div class="finding-footer">
        <span>Target: ${escapeHtml(item.target || 'N/A')}</span>
        <span>${new Date(item.timestamp).toLocaleString()}</span>
      </div>
    </div>
  `).join('');

  // Attach controls
  container.querySelectorAll('.finding-status-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const id = sel.getAttribute('data-id');
      const item = State.auditLogs.find(l => l.id === id);
      if (item) {
        item.status = sel.value;
        saveStoredData();
        renderAuditLogs();
        updateTargetCard();
      }
    });
  });

  container.querySelectorAll('.finding-notes-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const id = inp.getAttribute('data-id');
      const item = State.auditLogs.find(l => l.id === id);
      if (item) {
        item.notes = inp.value.trim();
        saveStoredData();
      }
    });
  });

  container.querySelectorAll('.btn-delete-finding').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      State.auditLogs = State.auditLogs.filter(l => l.id !== id);
      saveStoredData();
      renderAuditLogs();
      updateTargetCard();
      showToast('Deleted finding');
    });
  });

  updatePrivacyHubFindingsPreview();
}

// -------------------------------------------------------------
// Multi-Dialect Exporters (Obsidian Vault, JSON, CSV)
// -------------------------------------------------------------
function generateObsidianMarkdown() {
  const target = State.target;
  const targetName = target.name || target.handle || 'Unnamed Profile';
  const now = new Date().toISOString().split('T')[0];
  const confirmedFindings = State.auditLogs.filter(l => l.status === 'confirmed');
  const reviewFindings = State.auditLogs.filter(l => l.status === 'investigating');
  const directHub = getDirectCountyHub(State.jurisdiction.stateCode, State.jurisdiction.county);
  let countyReportRows = '';
  if (directHub) {
    countyReportRows = directHub.offices.map(o =>
      `| **County** | ${o.title} | ${o.desc} | [${o.label} ↗](${o.url}) |`
    ).join('\n') + '\n';
  } else {
    const directJurPortal = getDirectCountyPortal(State.jurisdiction.stateCode, State.jurisdiction.county);
    const deedsReportLink = directJurPortal?.deeds
      ? `[Official Deeds (${directJurPortal.name})](${directJurPortal.deeds})`
      : `[NETR Directory](https://publicrecords.netronline.com/state/${State.jurisdiction.stateCode}/)`;
    const assessorReportRow = directJurPortal?.assessor
      ? `| **County** | ${State.jurisdiction.county} Tax & GIS Assessor | Property parcels, valuations & ownership rolls | [Official Assessor (${directJurPortal.name})](${directJurPortal.assessor}) |\n`
      : '';
    countyReportRows = `| **County** | ${State.jurisdiction.county} Real Property & Deeds | Deeds, mortgages, liens & parcel maps | ${deedsReportLink} |\n` +
      assessorReportRow +
      `| **County** | ${State.jurisdiction.county} Courts & Civil Dockets | Local civil litigation & judgments | [Google Portal Search](https://www.google.com/search?q=${encodeURIComponent('"' + State.jurisdiction.county + '" ("district court" | "county court" | "clerk of court") site:gov')}) |\n`;
  }

  let md = `---
aliases:
  - "${escapeMarkdown(targetName)}"
  - "${escapeMarkdown(target.handle || '')}"
tags:
  - privacy/audit
  - privacy/visage
  - status/triaged
target_name: "${escapeMarkdown(target.name || '')}"
first_name: "${escapeMarkdown(target.firstName || '')}"
middle_name: "${escapeMarkdown(target.middleName || '')}"
last_name: "${escapeMarkdown(target.lastName || '')}"
primary_handle: "${escapeMarkdown(target.handle || '')}"
primary_email: "${escapeMarkdown(target.email || '')}"
primary_phone: "${escapeMarkdown(target.phone || '')}"
location: "${escapeMarkdown(target.location || '')}"
jurisdiction: "${escapeMarkdown(State.jurisdiction.resolvedText || '')}"
organization: "${escapeMarkdown(target.org || '')}"
assessment_date: ${now}
tool: Visage Digital Footprint & Identity Privacy Workstation
---

# 👤 Digital Footprint Assessment Report: ${targetName}

> [!INFO] Assessment Summary
> **Subject / Profile**: ${targetName}  
> **Primary Alias**: @${target.handle || 'N/A'}  
> **Email**: ${target.email || 'N/A'}  
> **Phone**: ${target.phone || 'N/A'}  
> **Location**: ${target.location || 'N/A'} (${State.jurisdiction.resolvedText || 'Jurisdiction Pending'})  
> **Affiliation / Org**: ${target.org || 'N/A'}  
> **Total Audit Findings**: ${State.auditLogs.length} (${confirmedFindings.length} Confirmed Hits)

---

## 🎯 Profile Metadata (Dataview)
Subject:: [[${targetName}]]
First Name:: ${target.firstName || 'N/A'}
Middle Name:: ${target.middleName || 'N/A'}
Last Name:: ${target.lastName || 'N/A'}
Handle:: ${target.handle ? `@${target.handle}` : 'N/A'}
Email:: ${target.email || 'N/A'}
Phone:: ${target.phone || 'N/A'}
Jurisdiction:: ${State.jurisdiction.resolvedText || 'N/A'}
Status:: ${confirmedFindings.length > 0 ? 'High Exposure' : 'Low Exposure'}
Date:: ${now}

---

## 🌐 Confirmed Accounts & Matrix Presence
| Platform | Handle | Verification URL | Status |
| :--- | :--- | :--- | :--- |
${Object.values(State.matrixResults).filter(r => r.status === 'found').map(r => `| **${r.platform}** | @${target.handle || 'profile'} | [Profile Link](${r.url}) | Confirmed Hit |`).join('\n') || '| *None recorded* | - | - | - |'}

---

## 🔐 Cryptographic Identities & PGP Keys
| Key ID | Created | UIDs / Linked Emails | Registry URL |
| :--- | :--- | :--- | :--- |
${State.cryptoResults.pgp.map(k => `| \`0x${k.keyId}\` | ${k.created} | ${k.uids.map(u => u.raw).join('<br>')} | [Ubuntu Keyserver](https://keyserver.ubuntu.com/pks/lookup?search=0x${k.keyId}&op=vindex) |`).join('\n') || '| *No PGP keys indexed* | - | - | - |'}

---

## 🏛️ Public Records & Jurisdictional Footprint
**Audited Jurisdiction**: ${State.jurisdiction.resolvedText || 'Unresolved'} (${State.jurisdiction.county}, ${State.jurisdiction.stateName})${directHub ? ` • **Direct Metro Hub**: ${directHub.name} (${directHub.metro})` : ''}

| Tier | Portal / Resource | Scope & Purpose | Link |
| :--- | :--- | :--- | :--- |
${countyReportRows}| **County** | ${State.jurisdiction.county} Board of Elections | County voter registration & election rolls | [BOE Portal / Dork](${US_STATES[State.jurisdiction.stateCode]?.voterUrl || '#'}) |
| **State** | ${State.jurisdiction.stateName} Courts | ${US_STATES[State.jurisdiction.stateCode]?.courtName || 'State Courts'} | [State Court Portal](${US_STATES[State.jurisdiction.stateCode]?.courtUrl || '#'}) |
| **State** | ${State.jurisdiction.stateName} Corporate Registrations | ${US_STATES[State.jurisdiction.stateCode]?.corpName || 'Division of Corporations'} | [Business Database](${US_STATES[State.jurisdiction.stateCode]?.corpUrl || '#'}) |
| **State** | ${State.jurisdiction.stateName} Professional Licensing | ${US_STATES[State.jurisdiction.stateCode]?.licenseName || 'Professional Licensing'} | [Licensing Search](${US_STATES[State.jurisdiction.stateCode]?.licenseUrl || '#'}) |
| **State** | ${State.jurisdiction.stateName} Voter Registration | ${US_STATES[State.jurisdiction.stateCode]?.voterName || 'State Voter Registry'} | [State Voter Portal](${US_STATES[State.jurisdiction.stateCode]?.voterUrl || '#'}) |
| **Federal** | USPTO Public Patent Search | Inventor filings, assignee entities, patent records | [Google Patents](https://patents.google.com/) |
| **Federal** | CourtListener / PACER | Federal District & Bankruptcy Dockets | [CourtListener](https://www.courtlistener.com/) |
| **Federal** | FEC Individual Contributions | Political donor records (home address & employer) | [FEC Search](https://www.fec.gov/data/receipts/individual-contributions/) |
| **Federal** | SEC EDGAR | Executive Form 4 insider equity holdings | [SEC EDGAR](https://www.sec.gov/edgar/searchedgar/companysearch) |

---

## 🚨 Exposure Findings & Triage Log

`;

  if (confirmedFindings.length > 0) {
    md += `### 🔴 Confirmed Exposure Findings\n\n`;
    confirmedFindings.forEach(f => {
      const calloutType = f.severity === 'critical' ? 'CAUTION' : (f.severity === 'high' ? 'WARNING' : 'NOTE');
      md += `> [!${calloutType}] ${f.title}\n`;
      md += `> **Category**: ${f.category} | **Severity**: ${f.severity.toUpperCase()}\n`;
      if (f.url) md += `> **Evidence**: [Source Link](${f.url})\n`;
      if (f.notes) md += `> **Remediation Notes**: ${f.notes}\n`;
      md += `> **Discovered**: ${new Date(f.timestamp).toLocaleDateString()}\n\n`;
    });
  }

  if (reviewFindings.length > 0) {
    md += `### 🟡 Items Under Review\n\n`;
    reviewFindings.forEach(f => {
      md += `- [ ] **${f.title}** (${f.category}) - ${f.url ? `[Link](${f.url})` : ''} - *${f.notes || 'Under review'}*\n`;
    });
    md += '\n';
  }

  md += `---

## 🛡️ Remediation & Privacy Hardening Plan

| Action / Remediation Item | Target Surface | Recommended Resource / Procedure | Status |
| :--- | :--- | :--- | :--- |
| **Search Engine PII Removal** | Google Search Results | Submit direct de-indexing via [Google PII Removal Request](https://support.google.com/websearch/troubleshooter/3111061) | [ ] Pending |
| **Major Broker Suppression** | LexisNexis / Risk Sol. | Submit consumer opt-out suppression via [LexisNexis Opt-Out](https://optout.lexisnexis.com/) | [ ] Pending |
| **Directory Delisting** | Whitepages & Aggregators | Submit listing suppression via [Whitepages Suppression](https://www.whitepages.com/suppression-requests) | [ ] Pending |
| **Search Delisting** | Spokeo & BeenVerified | Delist profiles via [Spokeo Opt-Out](https://www.spokeo.com/optout) & [BeenVerified](https://www.beenverified.com/app/optout/search) | [ ] Pending |
| **Credential Rotation** | Leaked / Exposed Passwords | Rotate passwords on all exposed domains, enable hardware FIDO2/WebAuthn MFA | [ ] Pending |
| **Public Filing Scrub** | Resumes / PDFs / Archives | Scrub unredacted personal phone numbers and home addresses from public websites | [ ] Pending |
| **Automated Opt-Out Agent** | Consumer Data Brokers | Deploy automated opt-out agents such as [Permission Slip by CR](https://www.permissionslipcr.com/) | [ ] Pending |

---
*Generated by [Visage](https://github.com/mrnickpeer/Visage) - Digital Footprint & Identity Privacy Workstation.*
`;

  return md;
}

function escapeMarkdown(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '\\"');
}

function exportObsidianMarkdown() {
  const md = generateObsidianMarkdown();
  const filename = `visage-report-${(State.target.name || State.target.handle || 'profile').toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
  downloadFile(filename, 'text/markdown', md);
  markStep(7, true);
  showToast(`Exported ${filename}`);
}

function copyObsidianMarkdown() {
  const md = generateObsidianMarkdown();
  navigator.clipboard.writeText(md);
  markStep(7, true);
  showToast('Copied Markdown Report to clipboard');
}

function exportJsonDossier() {
  const payload = {
    target: State.target,
    jurisdiction: State.jurisdiction,
    auditLogs: State.auditLogs,
    matrixResults: State.matrixResults,
    cryptoResults: State.cryptoResults,
    stepProgress: State.stepProgress,
    exportedAt: new Date().toISOString(),
    generator: 'Visage v1.1.0'
  };

  const json = JSON.stringify(payload, null, 2);
  const targetId = (State.target.handle || State.target.lastName || 'profile').toLowerCase();
  const filename = `visage-audit-${targetId}.json`;
  downloadFile(filename, 'application/json', json);
  markStep(7, true);
  showToast(`Exported ${filename}`);
}

async function handleDossierImport(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const nameLower = (file.name || '').toLowerCase();

    if (nameLower.endsWith('.json') || text.trim().startsWith('{')) {
      importJsonDossier(text, file.name);
    } else if (nameLower.endsWith('.md') || text.includes('---')) {
      importObsidianMarkdownDossier(text, file.name);
    } else {
      showToast('⚠️ Unsupported file format. Please upload a .json or .md file.', 'error', 4000);
    }
  } catch (err) {
    console.error('Import failed:', err);
    showToast(`⚠️ Import failed: ${err.message}`, 'error', 5000);
  }
}

function importJsonDossier(jsonStr, filename) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Invalid JSON format');
  }

  if (!data || (!data.target && !data.auditLogs && !data.currentTarget)) {
    throw new Error('JSON is not a recognized Visage dossier file');
  }

  // 1. Target
  const incTarget = data.target || data.currentTarget || {};
  if (incTarget.name || incTarget.handle || incTarget.email || incTarget.firstName || incTarget.lastName) {
    State.target = Object.assign({
      firstName: '', middleName: '', lastName: '',
      name: '', handle: '', email: '', phone: '', location: '', org: ''
    }, incTarget);

    if (State.target.name && (!State.target.firstName || !State.target.lastName)) {
      const parts = splitFullName(State.target.name);
      if (!State.target.firstName) State.target.firstName = parts.firstName;
      if (!State.target.middleName) State.target.middleName = parts.middleName;
      if (!State.target.lastName) State.target.lastName = parts.lastName;
    }
    State.target.name = [State.target.firstName, State.target.middleName, State.target.lastName].filter(Boolean).join(' ');
  }

  // 2. Jurisdiction
  if (data.jurisdiction && data.jurisdiction.stateCode) {
    State.jurisdiction = data.jurisdiction;
  } else if (State.target.location) {
    State.jurisdiction = resolveJurisdiction(State.target.location);
  }

  // 3. Audit logs
  if (Array.isArray(data.auditLogs)) {
    State.auditLogs = data.auditLogs;
  }

  // 4. Matrix results
  if (data.matrixResults && typeof data.matrixResults === 'object') {
    State.matrixResults = data.matrixResults;
  }

  // 5. Crypto results
  if (data.cryptoResults && typeof data.cryptoResults === 'object') {
    State.cryptoResults = data.cryptoResults;
  }

  // 6. Step Progress
  if (data.stepProgress && typeof data.stepProgress === 'object') {
    State.stepProgress = Object.assign(State.stepProgress, data.stepProgress);
  } else {
    if (State.target.name || State.target.handle) markStep(1, true);
    if (Object.keys(State.matrixResults).length > 0) markStep(2, true);
    if (State.cryptoResults.pgp && State.cryptoResults.pgp.length > 0) markStep(3, true);
    if (State.jurisdiction.stateCode) markStep(6, true);
    if (State.auditLogs.length > 0) markStep(7, true);
  }

  saveStoredData();

  applyTargetToInputs();
  generateHandlePermutations();
  updateLocationJurisdictionPreview();
  applyResolvedJurisdictionToUI(State.jurisdiction);
  renderAuditLogs();
  updateTargetCard();
  updateMethodologyChecklistUI();
  renderMatrixGrid();
  renderDorkLibrary();
  renderRecordsTab();

  showToast(`✔ Dossier restored from ${filename}: ${State.auditLogs.length} findings loaded`, 'success', 4000);
}

function importObsidianMarkdownDossier(mdText, filename) {
  // 1. Extract YAML Frontmatter
  const frontmatterMatch = mdText.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1];
    const getVal = (key) => {
      const m = yaml.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'));
      return m ? m[1].trim() : '';
    };

    State.target.firstName = getVal('first_name') || State.target.firstName;
    State.target.middleName = getVal('middle_name') || State.target.middleName;
    State.target.lastName = getVal('last_name') || State.target.lastName;
    State.target.name = getVal('target_name') || [State.target.firstName, State.target.middleName, State.target.lastName].filter(Boolean).join(' ');
    State.target.handle = getVal('primary_handle') || State.target.handle;
    State.target.email = getVal('primary_email') || State.target.email;
    State.target.phone = getVal('primary_phone') || State.target.phone;
    State.target.location = getVal('location') || State.target.location;
    State.target.org = getVal('organization') || State.target.org;

    const jurText = getVal('jurisdiction');
    if (jurText) {
      State.jurisdiction = resolveJurisdiction(jurText);
    } else if (State.target.location) {
      State.jurisdiction = resolveJurisdiction(State.target.location);
    }
  }

  // 2. Parse Callouts (> [!CAUTION], > [!WARNING], > [!NOTE], etc.)
  const calloutRegex = />\s*\[!(CAUTION|WARNING|NOTE|IMPORTANT|TIP)\]\s*([^\n]+)\n((?:>\s*[^\n]*\n?)*)/g;
  let match;
  const importedLogs = [];

  while ((match = calloutRegex.exec(mdText)) !== null) {
    const type = match[1].toUpperCase();
    const title = match[2].trim();
    const body = match[3];

    let severity = 'medium';
    if (type === 'CAUTION') severity = 'critical';
    else if (type === 'WARNING') severity = 'high';
    else if (type === 'NOTE') severity = 'low';

    const catMatch = body.match(/\*\*Category\*\*:\s*([^|\n]+)/);
    const category = catMatch ? catMatch[1].trim() : 'Obsidian Finding';

    const urlMatch = body.match(/\((https?:\/\/[^\s)]+)\)/);
    const url = urlMatch ? urlMatch[1].trim() : '';

    const notesMatch = body.match(/\*\*Analyst Notes\*\*:\s*([^\n]+)/);
    const notes = notesMatch ? notesMatch[1].trim() : '';

    importedLogs.push({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      target: State.target.name || 'Target',
      title,
      category,
      severity,
      status: 'confirmed',
      url,
      notes,
      timestamp: new Date().toISOString()
    });
  }

  // 3. Parse Checklist items (- [ ] **Title** (Category) - [Link](url) - *notes*)
  const checkRegex = /- \[([ xX])\] \*\*([^*]+)\*\*\s*(?:\(([^)]+)\))?\s*(?:-\s*\[Link\]\(([^)]+)\))?\s*(?:-\s*\*([^*]+)\*)?/g;
  while ((match = checkRegex.exec(mdText)) !== null) {
    const isDone = match[1].toLowerCase() === 'x';
    const title = match[2].trim();
    const category = match[3] ? match[3].trim() : 'Manual Triage';
    const url = match[4] ? match[4].trim() : '';
    const notes = match[5] ? match[5].trim() : '';

    importedLogs.push({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      target: State.target.name || 'Target',
      title,
      category,
      severity,
      status: isDone ? 'confirmed' : 'investigating',
      url,
      notes,
      timestamp: new Date().toISOString()
    });
  }

  if (importedLogs.length > 0) {
    State.auditLogs = importedLogs;
  }

  // 4. Parse Matrix table
  const tableRegex = /\|\s*\*\*([^*]+)\*\*\s*\|\s*@[^|]+\|\s*\[Profile Link\]\(([^)]+)\)\s*\|\s*Confirmed Hit\s*\|/g;
  while ((match = tableRegex.exec(mdText)) !== null) {
    const platform = match[1].trim();
    const url = match[2].trim();
    State.matrixResults[platform] = { platform, status: 'found', url };
  }

  if (State.target.name || State.target.handle) markStep(1, true);
  if (Object.keys(State.matrixResults).length > 0) markStep(2, true);
  if (State.jurisdiction.stateCode) markStep(6, true);
  if (State.auditLogs.length > 0) markStep(7, true);

  saveStoredData();

  applyTargetToInputs();
  generateHandlePermutations();
  updateLocationJurisdictionPreview();
  applyResolvedJurisdictionToUI(State.jurisdiction);
  renderAuditLogs();
  updateTargetCard();
  updateMethodologyChecklistUI();
  renderMatrixGrid();
  renderDorkLibrary();
  renderRecordsTab();

  showToast(`✔ Audit Report restored from ${filename}: ${State.auditLogs.length} findings, profile "${State.target.name || State.target.handle || 'Loaded'}"`, 'success', 4000);
}

function exportCsvDossier() {
  const headers = ['ID', 'Profile', 'Title', 'Category', 'Severity', 'Status', 'URL', 'Remediation Notes', 'Timestamp'];
  const rows = State.auditLogs.map(l => [
    `"${l.id}"`,
    `"${(l.target || '').replace(/"/g, '""')}"`,
    `"${(l.title || '').replace(/"/g, '""')}"`,
    `"${(l.category || '').replace(/"/g, '""')}"`,
    `"${(l.severity || '').replace(/"/g, '""')}"`,
    `"${(l.status || '').replace(/"/g, '""')}"`,
    `"${(l.url || '').replace(/"/g, '""')}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`,
    `"${l.timestamp}"`
  ]);

  const targetName = State.target.name || State.target.handle || 'Self';
  const remediationItems = [
    ['ACT-01', targetName, 'Search Engine PII Removal Request', 'Privacy Remediation', 'High', 'pending', 'https://support.google.com/websearch/troubleshooter/3111061', 'Submit official Google search de-indexing form for exposed personal PII or doxxing material.', new Date().toISOString()],
    ['ACT-02', targetName, 'LexisNexis Consumer Opt-Out', 'Data Broker Suppression', 'High', 'pending', 'https://optout.lexisnexis.com/', 'Submit official consumer opt-out suppression request to LexisNexis Risk Solutions public records.', new Date().toISOString()],
    ['ACT-03', targetName, 'Whitepages Directory Delisting', 'Directory Suppression', 'Medium', 'pending', 'https://www.whitepages.com/suppression-requests', 'Submit public listing suppression request to purge residential street address and relative associations.', new Date().toISOString()],
    ['ACT-04', targetName, 'Spokeo & BeenVerified Delisting', 'Aggregator Opt-Out', 'Medium', 'pending', 'https://www.spokeo.com/optout', 'Submit delisting requests on Spokeo and BeenVerified self-service portals.', new Date().toISOString()],
    ['ACT-05', targetName, 'Credential Rotation & Hardware MFA', 'Account Security', 'Critical', 'pending', '', 'Rotate passwords across all identified compromised services and enforce FIDO2 WebAuthn security keys.', new Date().toISOString()]
  ];

  const remediationRows = remediationItems.map(item => item.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

  const csv = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    '# ACTIONABLE REMEDIATION & HARDENING PLAN',
    ...remediationRows
  ].join('\n');

  const fileSlug = (State.target.handle || State.target.lastName || State.target.name || 'profile').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const filename = `visage-findings-${fileSlug}.csv`;
  downloadFile(filename, 'text/csv', csv);
  markStep(7, true);
  showToast(`Exported ${filename}`);
}

function downloadFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// -------------------------------------------------------------
// TAB 8: PROFILES TAB
// -------------------------------------------------------------
function setupProfilesTab() {
  document.getElementById('btn-export-profiles').addEventListener('click', () => {
    const json = JSON.stringify(State.savedProfiles, null, 2);
    downloadFile('visage-profiles-backup.json', 'application/json', json);
    showToast('Exported profiles database');
  });

  document.getElementById('file-import-profiles').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          State.savedProfiles = imported;
          saveStoredData();
          renderProfilesList();
          showToast(`Imported ${imported.length} target profiles`);
        } else {
          showToast('Invalid profile JSON structure', false);
        }
      } catch (err) {
        showToast('Error reading profile JSON file', false);
      }
    };
    reader.readAsText(file);
  });
}

function renderProfilesList() {
  const container = document.getElementById('profiles-grid');
  if (!container) return;

  if (!State.savedProfiles || State.savedProfiles.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">No saved profiles yet. Scope an identity on the left and click \'Save Profile\'.</div>';
    return;
  }

  container.innerHTML = State.savedProfiles.map(p => `
    <div class="profile-card" data-id="${escapeHtml(p.id)}">
      <div class="profile-card-top">
        <div class="avatar-ring" style="width: 32px; height: 32px; font-size: 0.9rem;">👤</div>
        <div>
          <div class="profile-card-name">${escapeHtml(p.name || p.handle || 'Unnamed Profile')}</div>
          ${p.handle ? `<div class="profile-card-alias">@${escapeHtml(p.handle)}</div>` : ''}
        </div>
      </div>
      <div class="profile-details">
        ${p.email ? `<div>✉️ ${escapeHtml(p.email)}</div>` : ''}
        ${p.phone ? `<div>📞 ${escapeHtml(p.phone)}</div>` : ''}
        ${p.location ? `<div>📍 ${escapeHtml(p.location)}</div>` : ''}
        ${p.org ? `<div>🏢 ${escapeHtml(p.org)}</div>` : ''}
      </div>
      <div class="profile-card-actions">
        <button type="button" class="btn-micro btn-load-profile" data-id="${escapeHtml(p.id)}">Load Scope</button>
        <button type="button" class="btn-micro btn-delete-profile" data-id="${escapeHtml(p.id)}">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-load-profile').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const p = State.savedProfiles.find(x => x.id === id);
      if (p) {
        State.target = { ...p };
        applyTargetToInputs();
        generateHandlePermutations();
        updateTargetCard();
        saveStoredData();
        showToast(`Loaded profile: ${p.name || p.handle}`);
      }
    });
  });

  container.querySelectorAll('.btn-delete-profile').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      State.savedProfiles = State.savedProfiles.filter(x => x.id !== id);
      saveStoredData();
      renderProfilesList();
      showToast('Deleted profile');
    });
  });
}

// -------------------------------------------------------------
// Companion Pivot to Vantage
// -------------------------------------------------------------
function setupCompanionPivot() {
  const btn = document.getElementById('btn-pivot-vantage');
  if (!btn) return;

  btn.addEventListener('click', () => {
    let domain = '';
    if (State.target.email && State.target.email.includes('@')) {
      domain = State.target.email.split('@')[1];
    } else if (State.target.org) {
      domain = State.target.org.toLowerCase().replace(/\s+/g, '') + '.com';
    }

    if (!domain) {
      showToast('No corporate email or organization found to pivot into Vantage', false);
      return;
    }

    // Attempt to open Vantage tab or provide link
    const vantageUrl = `chrome-extension://vantage/dashboard.html?domain=${encodeURIComponent(domain)}`;
    navigator.clipboard.writeText(domain);
    showToast(`Copied domain '${domain}' for Vantage recon!`);
  });
}
