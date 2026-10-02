# Common Ground — working prototype

Common Ground is a mobile-friendly, installable PWA prototype for compatibility-first blind dating.

## Included
- 18+ onboarding
- approximate area and dating radius
- Big Five-style personality sliders
- communication / social / planning / children preferences
- alcohol, nicotine/cigarettes, cannabis, and sobriety fields
- dating-partner preferences for those lifestyle choices
- hard deal-breakers before scoring
- interests and short bio
- weighted compatibility score
- "Why you two?" explanation
- alcohol-free date logic for anyone under 21 in this U.S.-focused prototype
- offline-capable PWA install support
- browser localStorage so no database account is required for this first version

## Run locally
From the project folder:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in a browser.

## Publish free
This static app can be hosted on GitHub Pages, Cloudflare Pages, Netlify, or similar static hosting. No paid backend is required for this demo.

## Production work still needed before public dating use
A real public dating service should add secure sign-in, server-side database, encrypted data handling, profile deletion/export, age/identity verification, moderation, reporting/blocking, abuse prevention, rate limiting, photo controls, privacy policy/terms, and legal review. Do not expose exact location.

The matching score is a compatibility heuristic, not a psychological diagnosis or guarantee of relationship success.


## v23 development note
Service worker caching is disabled during active development so GitHub Pages updates are visible immediately.
