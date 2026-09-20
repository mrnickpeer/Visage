# 🛡️ The V-Suite: Open Source Intelligence & Security Workstations
## Master Strategic Roadmap & Architecture Specification

> **Mission Statement:** Provide professional-grade, privacy-first, 100% free and open-source browser extensions for cybersecurity researchers, penetration testers, OSINT investigators, journalists, and privacy advocates. No paywalls, no API account paywalls, zero server telemetry, and no tracking. Ever.

---

## 🧭 The Core Architecture Philosophy

Every tool in the **V-Suite** adheres to strict non-negotiable architectural standards:

1. **100% Client-Side & Zero-Telemetry:** All computation, regex parsing, cryptographic hashing, and local state management run strictly inside the user's browser sandbox. No user telemetry, analytics, or search queries ever leave the machine.
2. **Zero Commercial Gating / True Public Utility:** Every capability is free and fully featured. No "Pro tiers", subscription nag screens, or feature paywalls.
3. **Dual-Store Manifest V3 Architecture:** Compatible with both **Firefox (AMO)** and **Chromium-based browsers (Chrome Web Store, Brave, Edge)** using clean, unminified vanilla JavaScript that easily passes automated and human extension audits.
4. **OPSEC & Anti-Bot Shielding:** Automatic HTTP Referrer stripping, client-side rate limiting (staggered queue delays), and private k-anonymity protocols to protect the investigator from leaking intent to target hosts.
5. **Obsidian & Knowledge Graph Interoperability:** Native export of structured Markdown dossiers with frontmatter, callouts, tags, and JSON backups designed to nest cleanly into an investigator's local Obsidian vault.

---

## 🗺️ Suite Ecosystem Overview

```
                      ┌─────────────────────────────────────────┐
                      │          THE V-SUITE WORKSTATIONS       │
                      └────────────────────┬────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴─────┬──────────────────┐
         │                  │                    │                  │
   ┌─────▼──────┐     ┌─────▼──────┐       ┌─────▼──────┐     ┌─────▼──────┐
   │  VANTAGE   │     │   VISAGE   │       │  VALENCE   │     │   VENEER   │
   │   Infra    │     │   People   │       │   AppSec   │     │  Forensics │
   │ Attack Sfc │     │  Identity  │       │ Tech Stack │     │ Media/Docs │
   │  (Active)  │     │  (Active)  │       │  (Next Up) │     │ (Planned)  │
   └────────────┘     └────────────┘       └────────────┘     └────────────┘
         │                  │                    │                  │
         └──────────────────┼────────────────────┴──────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
         ┌─────▼──────┐            ┌─────▼──────┐
         │   VIGIL    │            │  VESTIGE   │
         │ IOC Triage │            │ Chronology │
         │ Threat Int │            │  Archives  │
         │ (Planned)  │            │ (Planned)  │
         └────────────┘            └────────────┘
```

---

## 📦 Project Portfolio & Status

| Tool | Focus Area | Status | Target Audience | Primary Core Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Vantage** | Corporate Attack Surface & Infra | **Released (v1.0.0)** | Red Teams, Bug Bounty, SecOps | Subdomain recon, DNS telemetry, IP ranges, cloud bucket hunting, tech fingerprinting. |
| **Visage** | Identity Intelligence & Executive Exposure | **Released (v1.0.1)** | OSINT, Exec Protection, Privacy | 100+ platform username matrix, PGP keyservers, Keybase, k-anonymity breach check, 50-state public records. |
| **Valence** | Client-Side AppSec & Tech Architecture | **In Development (Next)** | AppSec, Web Pen-testers, Devs | DOM/JS runtime scraping, secret sniffer, passive API route discovery, CSP scoring, offline CVEs. |
| **Veneer** | Media, Image & Document Forensics | **Specification Complete** | Journalists, OSINT, Fraud Intel | 100% local EXIF/XMP parsing, GPS coordinate map pinning, PDF/DOCX author/printer metadata, ELA forensics. |
| **Vigil** | IOC Triage & Threat Intelligence | **Planning Phase** | SOC Analysts, Incident Responders | In-page IOC highlighting, 1-click defang/refang, multi-engine threat pivots, typosquatting detector. |
| **Vestige** | Digital Archaeology & Temporal Diffing | **Planning Phase** | Researchers, Fact Checkers, Legal | Multi-archive simultaneous scraper, live-vs-snapshot DOM diffing, historical SSL/DNS timelines. |

---

## 🛠️ Detailed Project Specifications

---

### 1. Vantage (v1.0.0 — Released)
*The Corporate Surface & Perimeter Workstation*

* **Primary Purpose:** Maps external technical footprint of an organization or domain without noisy active scanning.
* **Core Modules:**
  * **Domain & DNS Intel:** Passive DNS record aggregation (A, AAAA, MX, TXT, SPF, DMARC, NS, SOA).
  * **Subdomain Discovery:** Certificate Transparency log querying (`crt.sh`, HackerTarget) with wildcard stripping and deduplication.
  * **Cloud Asset Hunter:** Precision dorks and patterns for public S3, Google Cloud Storage, Azure Blob, and Firebase databases.
  * **Perimeter Fingerprinting:** CDN, WAF, hosting provider, and AS number resolution.
  * **Target Workstation Notes:** Integrated investigation notepad with Obsidian markdown export.

---

### 2. Visage (v1.0.1 — Released)
*The Personal Identity Intelligence & Executive Exposure Suite*

* **Primary Purpose:** Enables privacy professionals and investigators to conduct thorough, ethical background audits on individuals, executive leadership, or pseudonymous actors.
* **Core Modules:**
  * **7-Step Guided Methodology:** Step-by-step workflow covering seed triage, handles, crypto keys, breach telemetry, dorks, public records, and dossier compilation.
  * **100+ Platform Username Matrix:** Category-based passive profile enumeration across Developer, Social, Messaging, Media, and Gaming platforms with background-tab staggering.
  * **Cryptographic Identity Telemetry:** Unauthenticated queries to Ubuntu/SURFnet OpenPGP keyservers, Keybase identity proofs, and GitHub commit-email extraction.
  * **k-Anonymity Breach Range Check:** Client-side SHA-1 range hashing via Web Cryptography API (`crypto.subtle`) against HaveIBeenPwned and Hudson Rock Cavalier.
  * **50-State Public Records Desk:** Multi-tier portal compiler spanning County Deeds/Courts/Voters, State SOS/Unified Courts, and Federal PACER/SEC/FEC systems.
  * **Nominatim City/ZIP Resolver:** Built-in rate-limit shield (1.1s cooldown) with offline fallback for geographical targeting.
  * **Two-Way Rehydration:** Export dossiers as structured JSON or Obsidian markdown, and restore previous sessions directly from saved notes.

---

### 3. Valence (Target: v1.0.0 — Next Up)
*Client-Side AppSec, Technology Architecture & Secret Mining Workstation*

* **The Problem:** Legacy extensions like Wappalyzer and BuiltWith have become bloated, monetized, and privacy-invasive. They only report basic tech names and provide zero security utility.
* **The Solution:** An unminified, zero-telemetry application security desk that reveals the inner workings and exposed attack surface of web apps directly in the browser.
* **Core Capabilities:**
  * **Deep DOM & JavaScript Runtime Introspection:**
    * Inspects active runtime state beyond static HTML: `window.__NEXT_DATA__`, `window.__NUXT__`, `window.Apollo`, `window.webpackChunk`, `window.Shopify`.
    * Dumps server-side pre-render payloads, exposing hidden props, unlinked routes, and internal user roles.
  * **Passive Secret & Token Sniffer:**
    * Scans all incoming scripts, inline script blocks, and network manifests using high-speed regexes for leaked tokens:
      * AWS Access Keys (`AKIA...`), Google API Keys (`AIza...`), Firebase configs, Stripe public keys, JWT structures, GitHub Personal Access Tokens.
  * **Passive Route & API Endpoint Discovery:**
    * Extracts hardcoded API endpoints (`/api/v1/...`, `/v2/graphql`, `/internal/...`, `/admin/...`) and backend microservice URLs from JavaScript chunks as you browse.
  * **Security Posture & Defensive Scorecard:**
    * Real-time letter grade (A+ to F) evaluating HTTP headers: Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, Access-Control-Allow-Origin (CORS), and Permissions-Policy.
    * Highlights dangerous CSP directives (e.g., `unsafe-inline`, `unsafe-eval`, open wildcards).
    * Cookie security table highlighting cookies missing `Secure`, `HttpOnly`, or `SameSite=Strict`.
  * **Offline Vulnerability Correlation:**
    * Bundled local vulnerability database (Retire.js + GitHub Advisory lists) correlating detected library versions with known CVEs without phoning home.
  * **Precision Technology Exposure Paths:**
    * Context-sensitive shortcuts to test standard sensitive paths for detected technologies (e.g., `/.git/HEAD`, `/.env`, `/swagger.json`, `/openapi.json`, `/actuator/health`, `/graphiql`).

---

### 4. Veneer (Target: v1.0.0 — Phase 3)
*Media, Image & Document Forensics Workstation*

* **The Problem:** In OSINT and fraud investigations, photos, leaked PDFs, and corporate presentations contain critical hidden metadata. Investigators currently rely on command-line tools (`exiftool`) or sketchy third-party web converters that log the uploaded media.
* **The Solution:** 100% in-browser, client-side metadata and forensic analysis accessible via right-click or drag-and-drop.
* **Core Capabilities:**
  * **Zero-Upload EXIF & Metadata Extraction:**
    * Parses EXIF, XMP, and IPTC headers directly using HTML5 File and ArrayBuffer APIs.
    * Reveals camera make/model, lens serial number, exposure settings, software edits (e.g., Photoshop, Lightroom), and timestamp history.
  * **Automatic GPS Coordinate Mapping:**
    * Extracts GPS latitude/longitude and renders a high-precision Leaflet/OpenStreetMap satellite/street pin with direction of travel and altitude.
  * **Document Deep-Dive (PDF, DOCX, XLSX):**
    * Extracts author names, operating system usernames, printer tracking dots, template file paths, and incremental revision counts.
  * **In-Browser Tamper Detection (ELA):**
    * Error Level Analysis (ELA) filter using the HTML5 Canvas API to identify areas of differing compression levels (highlighting spliced or modified elements).
  * **Reverse Visual Pivot Matrix:**
    * Right-click any image to execute automated, referrer-free visual searches across Google Lens, Yandex Visual, Bing Visual, FaceCheck.id, and TinEye.

---

### 5. Vigil (Target: v1.0.0 — Phase 4)
*IOC Triage & Threat Intelligence Workstation*

* **The Problem:** Incident responders, SOC analysts, and threat hunters spend hours manually copying/pasting indicators of compromise (IOCs) across multiple tabs, defanging URLs, and checking reputation engines.
* **The Solution:** An ambient threat triage utility that identifies, defangs, and pivots on indicators across any web page or alert console.
* **Core Capabilities:**
  * **Passive In-Page IOC Detection:**
    * Highlights IPv4, IPv6, MD5, SHA1, SHA256, CVE numbers, and cryptocurrency wallet addresses (BTC, ETH, Monero, Tron) on any webpage or threat report.
  * **1-Click Defang & Refang:**
    * Converts `https://malicious.example[.]com` to `hxxps[://]malicious[.]example[.]com` and vice-versa for safe clipboard sharing into Jira, Slack, or tickets.
  * **Rapid Pivot Context Menu:**
    * Click any indicator to launch a radial popup linking directly to VirusTotal, AlienVault OTX, AbuseIPDB, URLScan.io, Shodan, GreyNoise, and Blockchair.
  * **Homoglyph & Punycode Detector:**
    * Warns when a domain uses lookalike Cyrillic/Greek unicode characters to spoof legitimate brands (e.g., detecting phishing domains in real-time).

---

### 6. Vestige (Target: v1.0.0 — Phase 4)
*Digital Archaeology & Temporal Investigation Workstation*

* **The Problem:** Web content disappears quickly when targets realize they are under scrutiny. Historical verification requires manually switching between Wayback Machine, archive.is, and cached engines.
* **The Solution:** A unified time-machine that queries multiple archival engines simultaneously and diffs changes over time.
* **Core Capabilities:**
  * **Multi-Archive Simultaneous Aggregation:**
    * Checks the current tab or entered URL across the Wayback Machine, Archive.today, Google Cache / Common Crawl, GhostArchive, and Perma.cc.
  * **Side-by-Side Visual & DOM Diffing:**
    * Displays the current live page side-by-side with an archived snapshot from a selected date, highlighting deleted paragraphs, swapped phone numbers, or changed executive names.
  * **Historical Certificate & DNS Timeline:**
    * Visualizes when subdomains were first registered and when SSL certificates were renewed or transferred to new hosting providers over years of activity.

---

## 🎨 Shared Design System & UI Principles

All V-Suite extensions share a unified, purpose-built tactical aesthetic:

| Design Token | Specification | Rationale |
| :--- | :--- | :--- |
| **Theme Base** | Deep Slate Dark (`#0a0b10` background, `#12131e` cards) | Reduces eye fatigue during long late-night investigative sessions. |
| **Accent Colors** | Cyan (`#00f0ff`), Purple (`#a855f7`), Emerald (`#10b981`), Amber (`#f59e0b`) | Distinct, semantic color cues for status, risk levels, and categories. |
| **Typography** | Inter & JetBrains Mono / Fira Code | Clean sans-serif for reading; high-legibility monospace for hashes, code, and IP addresses. |
| **Component Kit** | Minimalist cards, badge pills, category chips, and collapsible guidance callouts | High information density without visual clutter or unnecessary decorative fluff. |

---

## 📅 Roadmap Execution Phases

```mermaid
flowchart TD
    subgraph Phase 1: Core Foundation [Phase 1: Complete]
        Vantage["Vantage v1.0.0<br/>Corporate Attack Surface"]
        Visage["Visage v1.0.1<br/>Personal Identity OSINT"]
    end

    subgraph Phase 2: Application Security [Phase 2: Next Up]
        Valence["Valence v1.0.0<br/>AppSec, Tech Stack, Secrets & Route Discovery"]
    end

    subgraph Phase 3: Media Intelligence [Phase 3]
        Veneer["Veneer v1.0.0<br/>EXIF, Documents, GPS Mapping & Visual Forensics"]
    end

    subgraph Phase 4: Threat Operations [Phase 4]
        Vigil["Vigil v1.0.0<br/>IOC Triage, Defanging & Threat Pivots"]
        Vestige["Vestige v1.0.0<br/>Digital Archaeology & Historical Diffing"]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 3 --> Phase 4
```

---

## 🤝 Community, Contributions & Licensing

* **License:** All V-Suite projects are distributed under the permissive **MIT License**.
* **Zero Telemetry Guarantee:** No tracking code, Google Analytics, Mixpanel, or third-party ad networks will ever be accepted into any repository.
* **Store Portals:** Every tool will maintain synchronized releases on:
  * **Mozilla Add-ons (AMO)** for Firefox and Firefox Mobile.
  * **Chrome Web Store (CWS)** for Chrome, Brave, Edge, and Opera.
  * **GitHub Releases** with standalone zip files for offline/manual installation.
