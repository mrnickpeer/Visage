# Visage - Store Submission & Distribution Guide

This guide details step-by-step instructions to publish **Visage** to the **Google Chrome Web Store (CWS)** and the **Mozilla Firefox Add-ons Portal (AMO)**, including ready-to-copy permissions justifications and privacy compliance answers.

---

## 📦 Generated Release Packages

The automated build pipeline produces verified, store-ready packages in the `dist/` directory:

| Store | File / Path | Format | Notes |
| :--- | :--- | :--- | :--- |
| **Chrome Web Store (CWS)** | `dist/visage-chrome-v1.0.3.zip` | ZIP archive | Manifest V3 with `background.service_worker` |
| **Firefox Add-ons (AMO)** | `dist/visage-firefox-v1.0.3.zip` | ZIP archive | Manifest V3 with `background.scripts` & Gecko ID |
| **Microsoft Edge Add-ons** | `dist/visage-chrome-v1.0.3.zip` | ZIP archive | Same Chromium Manifest V3 bundle as CWS |
| **Chrome / Edge Unpacked** | `dist/chrome/` | Directory | For "Load unpacked" local testing |
| **Firefox Unpacked** | `dist/firefox/` | Directory | For "Load Temporary Add-on" in Firefox |

> **Rebuilding Packages:** Whenever code changes are made, run:
> ```bash
> npm run build
> # or
> node build.js
> ```

---

## 🌐 1. Google Chrome Web Store (CWS) Submission

### Step 1: Access Developer Console
1. Log in to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click **"New Item"** (or open an existing draft).
3. Drag and drop:  
   `dist/visage-chrome-v1.0.3.zip`

### Step 2: Store Listing Tab
* **Product Name:** `Visage`
* **Summary Description (<=132 chars):**  
  `Personal Identity Intelligence, Executive Exposure & People OSINT Suite.`
* **Detailed Description:**  
  ```text
  Visage is an open-source, zero-touch personal identity intelligence workstation designed for security analysts, executive protection specialists, and threat researchers.

  Key Features:
  • 100+ Platform Username Matrix: Real-time verification across developer, social, professional, gaming, and financial platforms with staggered rate-limit protection.
  • Name Permutation Engine: Generate standardized handle conventions (first.last, flast, etc.).
  • OpenPGP Keyserver & Keybase Proofs: Discover verified email signatures, linked services, and cryptocurrency addresses.
  • Breach & Paste Reconnaissance: Test passwords locally with k-Anonymity SHA-1 queries and construct passive paste dump queries.
  • Multi-Tier Public Records Directory: County assessors, state corporate/court registries, and federal archives.
  • Full Dossier & CSV Export: Categorize exposure leads with severity ratings and export audit logs cleanly to CSV.

  100% Client-Side: No telemetry, no remote servers, no user tracking. All data is persisted strictly in local browser storage.
  ```
* **Category:** `Developer Tools` (or `Productivity`)
* **Store Icon:** Upload `icons/icon-128.png`.
* **Screenshots (1280x800):**  
  Upload the showcase screenshots from the `screenshots/` directory:
  1. `screenshots/visage_matrix.png` (Username Matrix & Platform Recon)
  2. `screenshots/visage_records.png` (Multi-Tier Public Records & Dossier)
  3. `screenshots/visage_crypto.png` (Cryptographic Keys & Identity Proofs)
* **Official URL / Homepage:** `https://github.com/mrnickpeer/Visage`

### Step 3: Privacy Practices Tab (CRITICAL — Avoid Rejection)
Google scrutinizes this tab carefully. Use these exact fields:

#### A. Single Purpose Description
> *Personal identity exposure auditing, cross-platform username presence verification, public breach checking, cryptographic key correlation, and public records triage for security research.*

#### B. Permission Justifications (Copy-Paste Ready)
* **`storage`**:  
  *Used to locally persist target identity scopes, discovered platform accounts, analyst dossier findings, custom notes, and saved identity profiles. No data is transmitted to external servers.*
* **`tabs`**:  
  *Used to detect and switch to existing Visage workspace tabs to prevent tab duplication, and to capture the current webpage title and URL when the analyst explicitly saves a lead via the browser context menu.*
* **`contextMenus`**:  
  *Adds right-click options ("Investigate in Visage", "Send Link to Visage Dossier", "Send Current Page to Visage Dossier") so researchers can catalog discovered exposure leads directly into their local dossier.*
* **`host_permissions`**:  
  *Required to perform client-side queries against public identity intermediaries: OpenPGP keyservers (`keyserver.ubuntu.com`, `pgp.surf.nl`), Keybase public identity proofs (`keybase.io`), GitHub public developer activity (`api.github.com`), Have I Been Pwned k-anonymity SHA-1 hash ranges (`api.pwnedpasswords.com`), and OpenStreetMap municipal geocoding (`nominatim.openstreetmap.org`).*

> **Note on Downloads:** Visage does **not** request the `downloads` permission. All CSV dossier exports are generated client-side using standard HTML5 `Blob` and `<a download>` object URLs within the extension page context, strictly honoring the Principle of Least Privilege.

#### C. Data Usage Questionnaire
* **Do you collect Personally Identifiable Information (PII)?** ➔ **No**
* **Do you collect Health information?** ➔ **No**
* **Do you collect Financial and Payment Information?** ➔ **No**
* **Do you collect Authentication information?** ➔ **No**
* **Do you collect Personal Communications?** ➔ **No**
* **Do you collect Location information?** ➔ **No**
* **Do you collect Web History?** ➔ **No**  
  *(Crucial: Do NOT check Yes. Visage does not track or log browsing history; it only reads the active tab URL/title when the user explicitly clicks a context menu item).*
* **Do you collect User Activity?** ➔ **No**
* **Do you collect Website Content?** ➔ **No**
* **Certification Checkboxes:**  
  Check all compliance boxes:
  - [x] *"I certify that this extension complies with the Limited Use policy."*
  - [x] *"I certify that this extension does not sell user data to third parties."*
  - [x] *"I certify that this extension does not use or transfer user data for purposes unrelated to the item's single purpose."*
* **Privacy Policy URL:**  
  `https://github.com/mrnickpeer/Visage/blob/main/PRIVACY.md`

### Step 4: Submit for Review
Click **"Submit for review"**. Approval typically takes between 12 and 48 hours.

---

## 🦊 2. Mozilla Firefox Add-ons (AMO) Submission

### Step 1: Developer Hub Upload
1. Log in to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Click **"Submit a New Add-on"**.
3. Distribution: Select **"On this site"** (listed publicly in Mozilla's directory).
4. Upload:  
   `dist/visage-firefox-v1.0.3.zip`

### Step 2: Automated Validation
* Mozilla's automated linter will analyze the bundle.
* Because Visage is written in 100% unminified, clean vanilla JavaScript with zero remote code execution, it will pass with **0 errors and 0 warnings**.
* When asked: *"Do your files require source code submission?"*  
  Select **"No"** (the zip contains the exact unminified human-readable source code directly).

### Step 3: Listing Details
* **Name:** `Visage`
* **Summary (<=250 chars):**  
  `Personal Identity Intelligence, Executive Exposure & People OSINT Suite. Zero-touch, client-side identity reconnaissance and exposure audit tool.`
* **Description:** Paste the detailed description from Section 1.
* **Categories:** `Security & Privacy`, `Web Development`
* **Tags:** `osint`, `reconnaissance`, `privacy`, `security`, `audit`, `identity`
* **Support Email / Repository:** `https://github.com/mrnickpeer/Visage`
* **Privacy Policy:** Paste the contents or link to `PRIVACY.md`.

### Step 4: Submit
Click **"Submit Version"**. Mozilla reviews typically complete within 2 to 24 hours.

---

## 🌊 3. Microsoft Edge Add-ons Store Submission

Because Microsoft Edge runs on the Chromium engine, it natively accepts the **Chrome Web Store Manifest V3 zip bundle**.

### Step-by-Step Submission:
1. Log in to the [Microsoft Partner Center Dashboard](https://partner.microsoft.com/dashboard/microsoftedge).
2. Click **"Create new extension"**.
3. Upload:  
   `dist/visage-chrome-v1.0.3.zip`
4. Store Listing:
   - **Store Logo:** Upload `icons/icon-300.png` (Edge strictly requires a **300x300 PNG** store logo).
   - **Extension Icon:** Upload `icons/icon-128.png`.
   - **Screenshots:** Upload the 1280x800 screenshots from `screenshots/`.
   - **Privacy Policy URL:** `https://github.com/mrnickpeer/Visage/blob/main/PRIVACY.md`
5. Under **"Notes for certification"**, paste the same permissions justification from Section 1.B.
6. Submit for certification.

---

## 🧪 Local Testing Instructions

### Testing in Chrome / Brave / Edge:
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **"Developer mode"** (toggle in top-right corner).
3. Click **"Load unpacked"** (top-left button).
4. Select the directory: `dist/chrome/`.
5. Visage will appear in your extensions list and toolbar!

### Testing in Firefox:
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **"Load Temporary Add-on..."**.
3. Select `dist/firefox/manifest.json`.
4. Click the extension icon in the toolbar or right-click to open Visage!
