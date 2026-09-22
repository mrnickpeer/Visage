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
