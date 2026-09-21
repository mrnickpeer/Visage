/**
 * dashboard.js - Visage Personal Identity Intelligence Workstation
 * Sister extension and tactical companion to Vantage.
 *
 * Implements the 7-Step Identity Reconnaissance Methodology:
 *  Step 1: Identity Scope Normalization & Permutations
 *  Step 2: Passive Username & Alias Matrix (100+ Platforms)
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
  }
};

// -------------------------------------------------------------
// 100+ Platform Directory for Step 2 (Username Matrix)
// -------------------------------------------------------------
const PLATFORMS = [
  // Developer & Tech (22)
  { name: 'GitHub', cat: 'dev', url: 'https://github.com/{}', icon: '🐙', checkUrl: 'https://api.github.com/users/{}', checkMode: 'json_status' },
  { name: 'GitLab', cat: 'dev', url: 'https://gitlab.com/{}', icon: '🦊' },
  { name: 'Bitbucket', cat: 'dev', url: 'https://bitbucket.org/{}/', icon: '🪣' },
  { name: 'DockerHub', cat: 'dev', url: 'https://hub.docker.com/u/{}', icon: '🐳' },
  { name: 'PyPI', cat: 'dev', url: 'https://pypi.org/user/{}', icon: '🐍' },
  { name: 'NPM', cat: 'dev', url: 'https://www.npmjs.com/~{}', icon: '📦' },
  { name: 'Packagist', cat: 'dev', url: 'https://packagist.org/users/{}/', icon: '🐘' },
  { name: 'RubyGems', cat: 'dev', url: 'https://rubygems.org/profiles/{}', icon: '💎' },
  { name: 'HackerNews', cat: 'dev', url: 'https://news.ycombinator.com/user?id={}', icon: '🟧', checkUrl: 'https://hacker-news.firebaseio.com/v0/user/{}.json', checkMode: 'json_val' },
  { name: 'StackOverflow', cat: 'dev', url: 'https://stackoverflow.com/users/{}', icon: '🥞' },
  { name: 'HuggingFace', cat: 'dev', url: 'https://huggingface.co/{}', icon: '🤗' },
  { name: 'Kaggle', cat: 'dev', url: 'https://www.kaggle.com/{}', icon: '📊' },
  { name: 'Replit', cat: 'dev', url: 'https://replit.com/@{}', icon: '⚡' },
  { name: 'Codeberg', cat: 'dev', url: 'https://codeberg.org/{}', icon: '🏔️' },
  { name: 'SourceForge', cat: 'dev', url: 'https://sourceforge.net/u/{}/profile', icon: '📁' },
  { name: 'Dev.to', cat: 'dev', url: 'https://dev.to/{}', icon: '👩‍💻' },
  { name: 'Hashnode', cat: 'dev', url: 'https://hashnode.com/@{}', icon: '📘' },
  { name: 'LeetCode', cat: 'dev', url: 'https://leetcode.com/{}', icon: '🧠' },
  { name: 'CodePen', cat: 'dev', url: 'https://codepen.io/{}', icon: '🖋️' },
  { name: 'Launchpad', cat: 'dev', url: 'https://launchpad.net/~{}', icon: '🚀' },
  { name: 'Gist', cat: 'dev', url: 'https://gist.github.com/{}', icon: '📝' },
  { name: 'Glitch', cat: 'dev', url: 'https://glitch.com/@{}', icon: '🎏' },

  // Social & Microblogging (28)
  { name: 'X / Twitter', cat: 'social', url: 'https://x.com/{}', icon: '𝕏' },
  { name: 'Bluesky', cat: 'social', url: 'https://bsky.app/profile/{}.bsky.social', icon: '🦋' },
  { name: 'Reddit', cat: 'social', url: 'https://www.reddit.com/user/{}', icon: '🤖' },
  { name: 'Mastodon.social', cat: 'social', url: 'https://mastodon.social/@{}', icon: '🐘' },
  { name: 'Threads', cat: 'social', url: 'https://www.threads.net/@{}', icon: '🧵' },
  { name: 'Instagram', cat: 'social', url: 'https://www.instagram.com/{}/', icon: '📸' },
  { name: 'LinkedIn', cat: 'social', url: 'https://www.linkedin.com/in/{}', icon: '💼' },
  { name: 'Pinterest', cat: 'social', url: 'https://www.pinterest.com/{}/', icon: '📌' },
  { name: 'Tumblr', cat: 'social', url: 'https://{}.tumblr.com', icon: '📜' },
  { name: 'Medium', cat: 'social', url: 'https://medium.com/@{}', icon: '✍️' },
  { name: 'Substack', cat: 'social', url: 'https://{}.substack.com', icon: '📰' },
  { name: 'Linktree', cat: 'social', url: 'https://linktr.ee/{}', icon: '🌲' },
  { name: 'About.me', cat: 'social', url: 'https://about.me/{}', icon: '🙋' },
  { name: 'Gravatar', cat: 'social', url: 'https://gravatar.com/{}', icon: '👤' },
  { name: 'Quora', cat: 'social', url: 'https://www.quora.com/profile/{}', icon: '❓' },
  { name: 'Patreon', cat: 'social', url: 'https://www.patreon.com/{}', icon: '🪙' },
  { name: 'BuyMeACoffee', cat: 'social', url: 'https://www.buymeacoffee.com/{}', icon: '☕' },
  { name: 'Ko-fi', cat: 'social', url: 'https://ko-fi.com/{}', icon: '🍵' },
  { name: 'Flickr', cat: 'social', url: 'https://www.flickr.com/people/{}', icon: '📷' },
  { name: 'Facebook', cat: 'social', url: 'https://www.facebook.com/{}', icon: '📘' },
  { name: 'VK', cat: 'social', url: 'https://vk.com/{}', icon: '🔵' },
  { name: 'Vero', cat: 'social', url: 'https://vero.co/{}', icon: '🟢' },
  { name: 'Post.news', cat: 'social', url: 'https://post.news/@/{}', icon: '📫' },
  { name: 'Gab', cat: 'social', url: 'https://gab.com/{}', icon: '🐸' },
  { name: 'Truth Social', cat: 'social', url: 'https://truthsocial.com/@{}', icon: '🔴' },
  { name: 'Myspace', cat: 'social', url: 'https://myspace.com/{}', icon: '📻' },
  { name: 'Keybase', cat: 'social', url: 'https://keybase.io/{}', icon: '🔑', checkUrl: 'https://keybase.io/_/api/1.0/user/lookup.json?usernames={}', checkMode: 'keybase' },
  { name: 'Polywork', cat: 'social', url: 'https://www.polywork.com/{}', icon: '🟣' },

  // Messaging & Forums (18)
  { name: 'Telegram', cat: 'chat', url: 'https://t.me/{}', icon: '✈️' },
  { name: 'Discourse', cat: 'chat', url: 'https://meta.discourse.org/u/{}/summary', icon: '💬' },
  { name: 'Session', cat: 'chat', url: 'https://session.org', icon: '🛡️' },
  { name: 'Matrix', cat: 'chat', url: 'https://matrix.to/#/@{}:matrix.org', icon: '🟩' },
  { name: 'IRCCloud', cat: 'chat', url: 'https://www.irccloud.com/chat#!{}', icon: '☁️' },
  { name: 'HackerNoon', cat: 'chat', url: 'https://hackernoon.com/u/{}', icon: '🟩' },
  { name: 'Lemmy.world', cat: 'chat', url: 'https://lemmy.world/u/{}', icon: '🐭' },
  { name: 'Revolt', cat: 'chat', url: 'https://revolt.chat', icon: '⚡' },
  { name: 'Guilded', cat: 'chat', url: 'https://www.guilded.gg/{}', icon: '🛡️' },
  { name: 'Steam Community', cat: 'chat', url: 'https://steamcommunity.com/id/{}', icon: '🎮' },
  { name: 'Lobste.rs', cat: 'chat', url: 'https://lobste.rs/u/{}', icon: '🦞' },
  { name: 'BGG Forum', cat: 'chat', url: 'https://boardgamegeek.com/user/{}', icon: '🎲' },
  { name: 'XDA Developers', cat: 'chat', url: 'https://forum.xda-developers.com/m/{}', icon: '📱' },
  { name: 'MacRumors', cat: 'chat', url: 'https://forums.macrumors.com/members/{}/', icon: '🍏' },
  { name: 'Overclock.net', cat: 'chat', url: 'https://www.overclock.net/members/{}/', icon: '⚙️' },
  { name: 'Bitcointalk', cat: 'chat', url: 'https://bitcointalk.org/index.php?action=profile;u={}', icon: '₿' },
  { name: 'Discord Lookup', cat: 'chat', url: 'https://discord.id/?id={}', icon: '👾' },
  { name: 'Signal Lookup', cat: 'chat', url: 'https://signal.me/#u/{}', icon: '📶' },

  // Media & Creative (20)
  { name: 'YouTube', cat: 'media', url: 'https://www.youtube.com/@{}', icon: '▶️' },
  { name: 'Twitch', cat: 'media', url: 'https://www.twitch.tv/{}', icon: '🟣' },
  { name: 'TikTok', cat: 'media', url: 'https://www.tiktok.com/@{}', icon: '🎵' },
  { name: 'Vimeo', cat: 'media', url: 'https://vimeo.com/{}', icon: '🎬' },
  { name: 'SoundCloud', cat: 'media', url: 'https://soundcloud.com/{}', icon: '☁️' },
  { name: 'Spotify', cat: 'media', url: 'https://open.spotify.com/user/{}', icon: '🟢' },
  { name: 'Bandcamp', cat: 'media', url: 'https://bandcamp.com/{}', icon: '🎪' },
  { name: 'Behance', cat: 'media', url: 'https://www.behance.net/{}', icon: '🎨' },
  { name: 'Dribbble', cat: 'media', url: 'https://dribbble.com/{}', icon: '🏀' },
  { name: 'ArtStation', cat: 'media', url: 'https://www.artstation.com/{}', icon: '🖌️' },
  { name: '500px', cat: 'media', url: 'https://500px.com/p/{}', icon: '📸' },
  { name: 'DeviantArt', cat: 'media', url: 'https://www.deviantart.com/{}', icon: '🎭' },
  { name: 'Unsplash', cat: 'media', url: 'https://unsplash.com/@{}', icon: '📷' },
  { name: 'Letterboxd', cat: 'media', url: 'https://letterboxd.com/{}/', icon: '🍿' },
  { name: 'Last.fm', cat: 'media', url: 'https://www.last.fm/user/{}', icon: '📻' },
  { name: 'Goodreads', cat: 'media', url: 'https://www.goodreads.com/{}', icon: '📚' },
  { name: 'Strava', cat: 'media', url: 'https://www.strava.com/athletes/{}', icon: '🏃' },
  { name: 'Chess.com', cat: 'media', url: 'https://www.chess.com/member/{}', icon: '♟️', checkUrl: 'https://api.chess.com/pub/player/{}', checkMode: 'json_status' },
  { name: 'Dailymotion', cat: 'media', url: 'https://www.dailymotion.com/{}', icon: '📽️' },
  { name: 'Mixcloud', cat: 'media', url: 'https://www.mixcloud.com/{}/', icon: '🎧' },

  // Gaming & Miscellaneous (14)
  { name: 'Steam Profile', cat: 'gaming', url: 'https://steamcommunity.com/id/{}', icon: '🎮' },
  { name: 'Roblox', cat: 'gaming', url: 'https://www.roblox.com/user.aspx?username={}', icon: '🧱' },
  { name: 'Epic Games', cat: 'gaming', url: 'https://www.epicgames.com/id/{}', icon: '🎯' },
  { name: 'Itch.io', cat: 'gaming', url: 'https://{}.itch.io', icon: '🕹️' },
  { name: 'Speedrun.com', cat: 'gaming', url: 'https://www.speedrun.com/user/{}', icon: '⏱️' },
  { name: 'Nexus Mods', cat: 'gaming', url: 'https://www.nexusmods.com/users/{}', icon: '🔧' },
  { name: 'GOG', cat: 'gaming', url: 'https://www.gog.com/u/{}', icon: '👾' },
  { name: 'Lichess', cat: 'gaming', url: 'https://lichess.org/@/{}', icon: '♞', checkUrl: 'https://lichess.org/api/user/{}', checkMode: 'json_status' },
  { name: 'AniList', cat: 'gaming', url: 'https://anilist.co/user/{}/', icon: '🌸' },
  { name: 'MyAnimeList', cat: 'gaming', url: 'https://myanimelist.net/profile/{}', icon: '🎌' },
  { name: 'Trakt.tv', cat: 'gaming', url: 'https://trakt.tv/users/{}', icon: '📺' },
  { name: 'Duolingo', cat: 'gaming', url: 'https://www.duolingo.com/profile/{}', icon: '🦉' },
  { name: 'AllTrails', cat: 'gaming', url: 'https://www.alltrails.com/members/{}', icon: '🥾' },
  { name: 'Archive.org', cat: 'gaming', url: 'https://archive.org/details/@{}', icon: '🏛️' }
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
    what: 'Test the audited handle and generated permutations across 100+ popular public developer, social, chat, media, and gaming platforms.',
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

// -------------------------------------------------------------
// Initialization & Storage
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigationTabs();
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
  updateTargetCard();
  updateMethodologyChecklistUI();
  renderAuditLogs();
  renderProfilesList();
  renderMatrixGrid();
  renderDorkLibrary();
  renderPastesDorks();
  renderRecordsTab();
}

function setupNavigationTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      switchTab(targetId);
    });
  });
}

function switchTab(targetId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const activeBtn = document.querySelector(`.tab-btn[data-target="${targetId}"]`);
  const activeContent = document.getElementById(targetId);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeContent) activeContent.classList.add('active');

  if (targetId === 'tab-records') {
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

function setupGuidanceToggle() {
  const toggle = document.getElementById('toggle-guidance');
  if (!toggle) return;

  toggle.addEventListener('change', () => {
    const isChecked = toggle.checked;
    document.querySelectorAll('.guidance-item').forEach(el => {
      el.style.display = isChecked ? '' : 'none';
    });
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

  // Jump to Records Desk
  const btnJumpRecords = document.getElementById('btn-jump-records');
  if (btnJumpRecords) {
    btnJumpRecords.addEventListener('click', () => {
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
  const tabCryptoBtn = document.querySelector('.tab-btn[data-target="tab-crypto"]');
  const tabRecordsBtn = document.querySelector('.tab-btn[data-target="tab-records"]');
  const tabBreachBtn = document.querySelector('.tab-btn[data-target="tab-breach"]');
  const tabDorksBtn = document.querySelector('.tab-btn[data-target="tab-dorks"]');
  const tabPrivacyBtn = document.querySelector('.tab-btn[data-target="tab-privacy"]');

  // Tab privacy headers
  const privacyTabTitle = document.getElementById('privacy-tab-title');
  const privacyTabDesc = document.getElementById('privacy-tab-desc');

  if (mode === 'self') {
    // Banner styling - clean green
    if (banner) banner.classList.remove('banner-warning');
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
    if (tabCryptoBtn) tabCryptoBtn.style.display = 'none';
    if (tabRecordsBtn) tabRecordsBtn.style.display = 'none';
    if (tabBreachBtn) tabBreachBtn.textContent = 'Data Leaks';
    if (tabDorksBtn) tabDorksBtn.textContent = 'Google Exposure';
    if (tabPrivacyBtn) tabPrivacyBtn.textContent = 'Clean Up & Opt-Out';

    // If currently viewing a hidden tab, switch to matrix
    const currentTab = document.querySelector('.tab-btn.active')?.getAttribute('data-target');
    if (currentTab === 'tab-crypto' || currentTab === 'tab-records') {
      switchTab('tab-matrix');
    }

    // Privacy tab headers
    if (privacyTabTitle) privacyTabTitle.textContent = 'Clean Up & Opt-Out Desk';
    if (privacyTabDesc) privacyTabDesc.textContent = 'Take direct action on your audit findings: delist your PII from search engines, opt out of commercial data brokers, and download your personal action plan.';
  } else {
    // Banner styling - warm amber warning
    if (banner) banner.classList.add('banner-warning');
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

    // Navigation tabs: show all
    if (tabCryptoBtn) tabCryptoBtn.style.display = '';
    if (tabRecordsBtn) tabRecordsBtn.style.display = '';
    if (tabBreachBtn) tabBreachBtn.textContent = 'Credential Exposure';
    if (tabDorksBtn) tabDorksBtn.textContent = 'Search Footprint';
    if (tabPrivacyBtn) tabPrivacyBtn.textContent = 'Privacy & Remediation Desk';

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

  select.addEventListener('change', () => {
    const selectedMode = select.value;

    if (selectedMode === 'org' && !consentAccepted) {
      // Prompt with consent modal before allowing the mode change
      if (consentModal) {
        if (chkConsent) chkConsent.checked = false;
        if (btnConfirmConsent) btnConfirmConsent.disabled = true;
        consentModal.style.display = 'flex';
      }
      return;
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
    });
  }

  function cancelConsent() {
    if (consentModal) consentModal.style.display = 'none';
    select.value = 'self';
    applyAuditMode('self');
  }

  if (btnCancelConsent) btnCancelConsent.addEventListener('click', cancelConsent);
  if (btnCloseConsent) btnCloseConsent.addEventListener('click', cancelConsent);

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
  // Step navigation buttons
  document.getElementById('step-btn-1').addEventListener('click', () => {
    const fInput = document.getElementById('target-first-name');
    if (fInput) fInput.focus();
  });
  document.getElementById('step-btn-2').addEventListener('click', () => {
    switchTab('tab-matrix');
  });
  document.getElementById('step-btn-3').addEventListener('click', () => {
    switchTab('tab-crypto');
  });
  document.getElementById('step-btn-4').addEventListener('click', () => {
    switchTab('tab-breach');
  });
  document.getElementById('step-btn-5').addEventListener('click', () => {
    switchTab('tab-dorks');
  });
  document.getElementById('step-btn-6').addEventListener('click', () => {
    switchTab('tab-records');
  });
  document.getElementById('step-btn-7').addEventListener('click', () => {
    if (State.auditMode === 'self') {
      switchTab('tab-privacy');
      markStep(7, true);
    } else {
      switchTab('tab-dossier');
    }
  });

  // Minimize / Expand Checklist
  const btnToggle = document.getElementById('btn-toggle-checklist');
  const checklistSteps = document.getElementById('checklist-steps');
  btnToggle.addEventListener('click', () => {
    if (checklistSteps.style.display === 'none') {
      checklistSteps.style.display = 'grid';
      btnToggle.textContent = 'Minimize';
    } else {
      checklistSteps.style.display = 'none';
      btnToggle.textContent = 'Expand';
    }
  });

  // Step Help Modals
  document.querySelectorAll('.step-help-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stepNum = btn.getAttribute('data-step');
      openStepModal(stepNum);
    });
  });

  // Modal Close
  document.getElementById('btn-close-step-modal').addEventListener('click', () => {
    document.getElementById('step-modal').style.display = 'none';
  });
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

// -------------------------------------------------------------
// STEP 2: USERNAME & ALIAS MATRIX
// -------------------------------------------------------------
function setupMatrixTab() {
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

async function runMatrixScan() {
  const handle = State.target.handle.trim();
  if (!handle) {
    showToast('Please enter a username handle in the Scope panel first', false);
    return;
  }

  const statusBar = document.getElementById('matrix-status-bar');
  const statusText = document.getElementById('matrix-status-text');
  const progressCount = document.getElementById('matrix-progress-count');
  const progressFill = document.getElementById('matrix-progress-fill');

  statusBar.style.display = 'flex';
  const total = PLATFORMS.length;
  let processed = 0;

  for (const p of PLATFORMS) {
    statusText.textContent = `Checking ${p.name}...`;
    progressCount.textContent = `${processed + 1} / ${total}`;
    progressFill.style.width = `${Math.round(((processed + 1) / total) * 100)}%`;

    const targetUrl = p.url.replace('{}', encodeURIComponent(handle));

    // For platforms with public endpoints (GitHub, HackerNews, Keybase, Chess.com, Lichess)
    if (p.checkUrl) {
      try {
        const queryUrl = p.checkUrl.replace('{}', encodeURIComponent(handle));
        const resp = await fetch(queryUrl, { cache: 'no-store' });

        if (p.checkMode === 'json_status') {
          if (resp.status === 200) {
            State.matrixResults[p.name] = { platform: p.name, status: 'found', url: targetUrl };
          } else if (resp.status === 404) {
            State.matrixResults[p.name] = { platform: p.name, status: 'available', url: targetUrl };
          } else {
            State.matrixResults[p.name] = { platform: p.name, status: 'error', url: targetUrl };
          }
        } else if (p.checkMode === 'json_val') {
          if (resp.status === 200) {
            const val = await resp.json();
            if (val && val.id) {
              State.matrixResults[p.name] = { platform: p.name, status: 'found', url: targetUrl };
            } else {
              State.matrixResults[p.name] = { platform: p.name, status: 'available', url: targetUrl };
            }
          } else {
            State.matrixResults[p.name] = { platform: p.name, status: 'available', url: targetUrl };
          }
        } else if (p.checkMode === 'keybase') {
          if (resp.status === 200) {
            const val = await resp.json();
            if (val.them && val.them.length > 0 && val.them[0]) {
              State.matrixResults[p.name] = { platform: p.name, status: 'found', url: targetUrl };
            } else {
              State.matrixResults[p.name] = { platform: p.name, status: 'available', url: targetUrl };
            }
          } else {
            State.matrixResults[p.name] = { platform: p.name, status: 'available', url: targetUrl };
          }
        }
      } catch (_) {
        State.matrixResults[p.name] = { platform: p.name, status: 'error', url: targetUrl };
      }
    } else {
      // Direct passive inspection default
      if (!State.matrixResults[p.name]) {
        State.matrixResults[p.name] = { platform: p.name, status: 'unchecked', url: targetUrl };
      }
    }

    processed++;
    renderMatrixGrid();
  }

  statusText.textContent = 'Passive scan completed. Confirmed API hits flagged in green.';
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
  // District of Columbia
  'washington': { county: 'District of Columbia', state: 'DC' }
};

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
  for (const [code, info] of Object.entries(US_STATES)) {
    const namePattern = new RegExp(`\\b${info.name}\\b`, 'i');
    if (namePattern.test(str)) {
      stateCode = code;
      break;
    }
  }

  // Comma followed by 2-letter code: 'Charlotte, NC'
  if (!stateCode) {
    const commaMatch = str.match(/,\s*([A-Za-z]{2})\b/);
    if (commaMatch && US_STATES[commaMatch[1].toUpperCase()]) {
      stateCode = commaMatch[1].toUpperCase();
    }
  }

  // Trailing 2-letter code: 'Charlotte NC'
  if (!stateCode) {
    const endMatch = str.match(/\b([A-Za-z]{2})\s*$/);
    if (endMatch && US_STATES[endMatch[1].toUpperCase()]) {
      stateCode = endMatch[1].toUpperCase();
    }
  }

  // Standalone uppercase 2-letter code matching a US state
  if (!stateCode) {
    const words = str.split(/[^A-Za-z]/).filter(Boolean);
    for (const w of words) {
      if (w.length === 2 && w === w.toUpperCase() && US_STATES[w]) {
        stateCode = w;
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
      State.auditLogs.unshift({
        id: Date.now().toString(),
        target: targetName,
        title: `Jurisdiction Profile: ${jur.resolvedText}`,
        category: 'Public Legal Record',
        severity: 'info',
        status: 'confirmed',
        url: `https://publicrecords.netronline.com/state/${jur.stateCode}/`,
        notes: `Target location: ${targetName} in ${jur.county}, ${jur.stateName}. Verified County and State official portals logged.`,
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
    bannerMeta.textContent = `${metro}Target: ${targetName} • Official Domain: ${stateObj.domain} • NETR State Hub: publicrecords.netronline.com/state/${jur.stateCode}/`;
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
    const courtDork = `${locFilter} ("district court" | "county court" | "clerk of court" | "civil docket") site:gov`;
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
        desc: `Local municipal codes, city/town hall official notices, building permits, local zoning, and council minutes for ${jur.city}.`,
        dork: municipalDork,
        portalUrl: `https://www.google.com/search?q=${encodeURIComponent(municipalDork)}`,
        portalLabel: 'Search Municipal'
      });
    }

    countyCards.push(
      {
        icon: '📜',
        title: `${jur.county} Clerk & Recorder of Deeds`,
        scope: 'Deeds & Mortgages',
        desc: 'Search property deeds, mortgages, liens, judgments, DBA business names, and marriage records.',
        dork: deedsDork,
        portalUrl: netrUrl,
        portalLabel: 'NETR Directory'
      },
      {
        icon: '🏡',
        title: `${jur.county} Real Property Tax & GIS Assessor`,
        scope: 'Property Rolls',
        desc: `Query property parcel assessment rolls by owner name to verify residential address and valuation${jur.city && jur.city !== jur.county ? ' in ' + jur.city : ''}.`,
        dork: assessorDork,
        portalUrl: netrUrl,
        portalLabel: 'GIS Tax Portal'
      },
      {
        icon: '⚖️',
        title: `${jur.county} County / District Court Filings`,
        scope: 'Civil & Criminal',
        desc: 'Access local civil lawsuits, small claims, traffic infractions, and county court dockets.',
        dork: courtDork,
        portalUrl: `https://www.google.com/search?q=${encodeURIComponent(courtDork)}`,
        portalLabel: 'Court Directory'
      },
      {
        icon: '👮',
        title: `${jur.county} Sheriff & Jail Inmate Roster`,
        scope: 'Custody & Warrants',
        desc: 'Review active detention lists, county jail bookings, warrants, and sheriff notices.',
        dork: sheriffDork,
        portalUrl: `https://www.google.com/search?q=${encodeURIComponent(sheriffDork)}`,
        portalLabel: 'Sheriff Search'
      },
      {
        icon: '🗳️',
        title: `${jur.county} Board of Elections & Voter Rolls`,
        scope: 'Voter Registration',
        desc: `County board of elections, local voter registration rolls, petition filings, and municipal election precincts for ${jur.county}.`,
        dork: boeDork,
        portalUrl: stateObj.voterUrl || `https://www.google.com/search?q=${encodeURIComponent(boeDork)}`,
        portalLabel: 'BOE & Voter Info'
      },
      {
        icon: '🗺️',
        title: `NETR Online - ${stateObj.name} County Hub`,
        scope: 'Statewide Index',
        desc: 'Direct links to Assessor, Recorder of Deeds, and Tax Collector portals for all counties in the state.',
        dork: `site:publicrecords.netronline.com "${jur.county}"`,
        portalUrl: netrUrl,
        portalLabel: 'Open NETR State Hub'
      }
    );

    t1Grid.innerHTML = countyCards.map(c => `
      <div class="record-portal-card">
        <div class="record-portal-top">
          <span class="record-portal-icon">${c.icon}</span>
          <span class="record-portal-title">${escapeHtml(c.title)}</span>
          <span class="record-portal-scope">${escapeHtml(c.scope)}</span>
        </div>
        <div class="record-portal-desc">${escapeHtml(c.desc)}</div>
        <div class="record-portal-actions">
          <button type="button" class="btn-micro btn-open-portal" data-url="${escapeHtml(c.portalUrl)}">${escapeHtml(c.portalLabel)} ↗</button>
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
**Audited Jurisdiction**: ${State.jurisdiction.resolvedText || 'Unresolved'} (${State.jurisdiction.county}, ${State.jurisdiction.stateName})

| Tier | Portal / Resource | Scope & Purpose | Link |
| :--- | :--- | :--- | :--- |
| **County** | ${State.jurisdiction.county} Real Property & Deeds | Deeds, mortgages, liens & parcel maps | [NETR Directory](https://publicrecords.netronline.com/state/${State.jurisdiction.stateCode}/) |
| **County** | ${State.jurisdiction.county} Courts & Civil Dockets | Local civil litigation & judgments | [Google Portal Search](https://www.google.com/search?q=${encodeURIComponent('"' + State.jurisdiction.county + '" ("district court" | "county court" | "clerk of court") site:gov')}) |
| **County** | ${State.jurisdiction.county} Board of Elections | County voter registration & election rolls | [BOE Portal / Dork](${US_STATES[State.jurisdiction.stateCode]?.voterUrl || '#'}) |
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
    generator: 'Visage v1.0.4'
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
