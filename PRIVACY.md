# 🔒 Visage Privacy Policy

**Last Updated:** September 19, 2026  
**Effective Date:** September 19, 2026  

Visage ("the Extension", "we", "our") is a browser extension developed as a personal identity intelligence and exposure reconnaissance suite. Visage is built on a strict **zero-telemetry, client-side-only** architecture. 

This Privacy Policy explains what information is processed when you use Visage and how we ensure your complete privacy and operational security (OPSEC).

---

## 🛡️ 1. Core Commitment: Zero Data Collection

- **No Remote Servers**: Visage operates entirely within your local browser runtime. We do not operate any external collection servers, databases, or analytics infrastructure.
- **No User Tracking**: We do not track, log, profile, or analyze your browsing activity, IP address, search queries, target profiles, or dossier findings.
- **Zero Remote Code**: Visage contains no CDN dependencies, no remote script loaders, and no `eval()` statements, adhering strictly to Mozilla Add-ons (AMO) and Chrome Web Store (CWS) developer security policies.

---

## 💾 2. Local Storage & Data Retention

All data created or imported within Visage—including:
- Target identity scopes (names, usernames, emails, phone numbers, locations)
- Discovered accounts and matrix presence
- Exposure findings, triage statuses, and analyst notes
- Saved identity profiles and jurisdiction cache

is stored **strictly on your local device** using the browser's isolated `browser.storage.local` API.

- **Data Ownership**: You retain 100% ownership and control over your data.
- **Data Deletion**: You can permanently purge all stored data at any time by clicking **"Clear All"** in the Dossier tab, deleting individual target profiles, or uninstalling the extension from your browser.

---

## 🌐 3. External Network Communications

Visage performs only client-initiated, read-only queries to public OSINT intermediaries when you explicitly trigger an audit action. No target identities or analyst queries are routed through proprietary proxy servers:

1. **Ubuntu OpenPGP & SURFnet Keyservers** (`keyserver.ubuntu.com`, `pgp.surf.nl`):
   - Queries public PGP keyservers over HTTPS using standard HKP machine-readable lookup protocols.
2. **Keybase Public API** (`keybase.io`):
   - Fetches public identity proofs and verified services for a given username.
3. **GitHub Public API** (`api.github.com`):
   - Queries public developer profiles, GPG signing keys, and public commit author emails.
4. **Have I Been Pwned? Pwned Passwords** (`api.pwnedpasswords.com`):
   - Uses mathematical **k-Anonymity**. Passwords tested are hashed locally using `SHA-1` via the browser's native Web Cryptography API (`crypto.subtle`). Only the first 5 characters of the hash are transmitted. Your actual password or complete hash is never transmitted over the network.
5. **OpenStreetMap Nominatim** (`nominatim.openstreetmap.org`):
   - Resolves municipal city names and 5-digit postal ZIP codes to county/state jurisdictions. Requests are throttled locally to comply with OpenStreetMap's 1-request/second usage policy.

---

## 🍪 4. Cookies, Analytics & Third Parties

- **No Cookies**: Visage does not set, read, or track cookies.
- **No Advertising or Monetization**: Visage contains zero ads, affiliate trackers, or commercial telemetry scripts.
- **No Third-Party Disclosures**: We do not sell, rent, share, or disclose any information to third parties, data brokers, or marketing firms.

---

## ⚖️ 5. Compliance with Store Developer Policies

- **Google Chrome Web Store Single-Purpose Policy**: Visage serves the sole purpose of assisting security professionals and investigators in personal identity intelligence and exposure auditing.
- **Mozilla Add-on Data Disclosure Policy**: Visage requests only permissions necessary for local operation (`storage`, `tabs`, `downloads`, `contextMenus`).

---

## 📬 6. Contact & Open Source Auditing

Visage is free and open-source software under the MIT License. You can independently inspect, audit, or build the entire codebase from source:

- **Source Code & Issue Tracker**: [https://github.com/mrnickpeer/Visage](https://github.com/mrnickpeer/Visage)
- **Security & Privacy Inquiries**: Please submit an issue via the GitHub repository issue tracker.
