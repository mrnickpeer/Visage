# 👤 Visage

> **Personal Identity Intelligence, Executive Exposure & People OSINT Suite**  
> *A zero-touch, browser-native identity reconnaissance and exposure audit tool for security analysts, penetration testers, and investigators.*  
> *Companion extension to [Vantage](https://github.com/mrnickpeer/Vantage).*

---

## 🌟 Overview

**Visage** is an in-browser identity reconnaissance workstation designed to map an individual's digital shadow and personal attack surface without active probing. While **Vantage** maps corporate domains, DNS, and cloud infrastructure, **Visage** maps human identities: usernames across 100+ platforms, public cryptographic keys, credential breach exposure, curated search dorks, and structured dossier generation for Obsidian.

---

## 🧭 The 6-Step Identity Audit Methodology

1. **Scope Identity**: Dissect full name, known aliases/handles, primary email, phone number, and location.
2. **Alias & Username Matrix**: Passively probe public presence across social, developer, and forum platforms.
3. **Cryptographic Signatures**: Query PGP keyservers and Keybase proofs to link disparate email addresses and keys.
4. **Breach & Exposure Telemetry**: Passive audit of known credential compromises and pastebin dumps.
5. **Person-Centric Dorking**: Precision search operators for resumes, CVs, court records, presentations, and leaked PDFs.
6. **Audit & Dossier Export**: Triage findings and export a structured Markdown dossier formatted for Obsidian or Joplin vaults.

---

## 🔒 Architecture & OPSEC

- **100% Client-Side**: Visage runs entirely within your browser. No user queries, names, or research data are ever transmitted to private servers.
- **Zero-Touch Passive Scoping**: Queries public OSINT intermediaries.
- **Local Storage**: All custom profiles, notes, and audit logs remain strictly on your local machine (`browser.storage.local`).

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for full architectural specifications.

---

## 📄 License

MIT License
