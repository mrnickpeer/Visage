# Visage - Roadmap & Future Enhancements

## Planned Features (v3.0 Candidate)

### 1. Contextual Snippet Extraction (Bio/Avatar Previews)
**The Problem:** 
In SOCMINT (Social Media Intelligence), simply knowing that a username exists on a platform (returning a 200 OK status) is only 20% of the battle. The other 80% is figuring out if it is *your* target, or just a false positive. Right now, the analyst has to manually click and open all the "Found" links in new tabs to verify the identity.

**The Improvement:** 
Upgrade the Deep Matrix Scan to perform **Contextual Snippet Extraction**. 

**How it works:** 
When the extension pings a platform and gets a hit, it parses the returned page's `<title>`, `<meta name="description">`, or OpenGraph tags to extract the account's bio, location, or avatar URL. It then displays a tiny preview directly inside the Visage matrix card. 

**Why it matters:** 
This allows the investigator to instantly scan the matrix and say, *"Ah, the GitHub bio says 'Charlotte, NC' and matches the target's location, but the Pinterest bio is in Spanish—ignore that one."* It eliminates the need to open 40 tabs and drastically reduces the false-positive fatigue that plagues identity mapping.

### 2. Built-in Proxy / OPSEC Routing
**The Problem:**
Currently, the Automated Deep Matrix Scan makes direct HTTP requests from the browser to target social media platforms. While this prevents third-party data brokering, it inadvertently leaves the user's IP address in the target platforms' server logs unless they run a system-wide VPN, creating an operational security (OPSEC) vulnerability.

**The Improvement:**
Implement an **OPSEC Routing** settings panel.

**How it works:**
Users can input API credentials for proxy services (like ScraperAPI, ProxyMesh, or custom SOCKS5 proxies). Visage will then route all background `fetch` requests and Deep Matrix Scans through the specified proxy rather than the local connection.

**Why it matters:**
This feature ensures the analyst remains completely covert during active reconnaissance, solving the IP-leak constraint while maintaining the local-first, privacy-respecting architecture of the extension.
