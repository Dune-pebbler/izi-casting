---
name: Email slide feature
description: Email inbox slide type — Gmail API via Vercel serverless, provider-agnostic architecture
type: project
---

Email inbox slide type was implemented. Architecture:

- `api/email/fetch.js` — Vercel POST endpoint, provider-agnostic router
- `api/email/providers/base.js` — abstract EmailProvider class (subclass for each provider)
- `api/email/providers/gmail.js` — Gmail via googleapis OAuth2 (clientId, clientSecret, refreshToken)
- `src/components/admin/slide-edit/EmailInput.js` — admin credentials/settings UI
- Display rendered in `SlideDisplay.js` as `EmailSlideDisplay` function
- Slide layout key: `"email"`, type: `"email"`
- Credentials stored in slide data under `emailCredentials: { clientId, clientSecret, refreshToken }`

**Why:** User wants to display open support emails (Gmail) on narrowcast screens.  
**How to apply:** When adding Outlook or other providers, add a class in `api/email/providers/` extending `EmailProvider` and register it in `PROVIDERS` in `api/email/fetch.js`. No other files need changing.
