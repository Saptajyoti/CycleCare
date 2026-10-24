# CycleCare

CycleCare is an account-free menstrual health companion for recording period
starts and symptom check-ins, reviewing personal patterns, and finding
educational and care information. Health records stay in the current browser
profile; the app does not send them to a CycleCare server.

## Features

- Period start and duration logging, flow observations, and an editable calendar.
- A clearly labelled estimated period window based on the median of up to six
  recent recorded cycle gaps, with uncertainty messaging and a possible missed
  log review prompt.
- Symptom and mood check-ins, recent record summaries, cycle insights, and
  cautious, record-based care guidance.
- Offline keyword matching for a finite FAQ, sourced health lessons and
  articles, English/Hindi content in selected areas, and optional read-aloud.
- An opt-in Gemini educational assistant, with the existing offline FAQ kept as
  a fallback. Saved CycleCare data is never sent to Gemini.
- Opt-in reminders while the Reminders page is open and optional pregnancy
  information mode.
- A warm ivory and blush botanical theme, responsive desktop/mobile preview,
  Discreet Mode, text-size and contrast preferences, and optional encrypted
  local storage.
- JSON and CSV exports, JSON import, and confirmation-based deletion of
  CycleCare data from the current browser.

CycleCare does not diagnose, confirm ovulation, provide contraception advice,
monitor emergencies, or replace a healthcare professional. Estimates are not
guaranteed. Food and drink suggestions are general comfort ideas, not
treatments.

## Technology and architecture

- React 19 and Vite 8
- `lucide-react` icons
- Oxlint
- Node's built-in test runner for cycle/date calculation tests

`src/main.jsx` mounts `App` from `src/App.jsx`. The main app currently contains
the shell, pages, persistence operations, and content; reusable date and cycle
estimate functions are in `src/utils/cycle.js`, with tests in
`src/utils/cycle.test.js`. Learning content is also maintained in
`src/content/healthLessons.js`. Styling is in `src/App.css` and `src/index.css`.
Navigation is component-state based; there is no configured router or backend.

`react-router-dom` and `recharts` are installed but not used by the current
application.

## Privacy and storage

Without the optional vault, records are stored in browser `localStorage`, which
is **not encrypted** and may be accessible to someone with access to the same
browser profile or developer tools. Clearing browser data can erase records.
Discreet Mode changes what is shown on screen; it is not a security boundary.

The optional four-digit PIN vault uses Web Crypto AES-GCM with a key derived
using PBKDF2/SHA-256. The PIN is not stored and cannot be recovered. A short PIN
can be guessed offline if someone obtains the browser storage; this is not
device security. The vault requires a secure context such as HTTPS or localhost.

Exports contain sensitive health information; keep exported files private.
Import validates record structure, dates, and reminder times before replacing
data, after confirmation. The application has no account, sync, analytics, or
health-record transmission service.

## Run locally

Use a current Node.js version supported by Vite 8.

```bash
npm install
npm run dev
```

To enable Gemini responses, start the Express backend in a second terminal.
Create `server/.env` (it is ignored by Git) with:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
CLIENT_ORIGIN=http://localhost:5173
GEMINI_TIMEOUT_MS=30000
```

Then run:

```bash
cd server
npm install
npm run dev
```

The frontend calls `http://localhost:5000/api/assistant` only after the user
explicitly consents. That preference stays local to the browser and can be
revoked from Ask.

Available checks and commands:

```bash
npm test
npm run lint
npm run build
npm run preview
```

The Vite build uses the site root by default. Configure `base` before deploying
under a subpath.

## Cycle estimates

The estimate requires at least three distinct, valid period start dates (two
complete recorded gaps). It uses the median of up to the six most recent gaps,
derives a range from observed variation, and asks the user to review a possible
missing log when the latest gap is unusually long compared with earlier gaps.
The calendar and dashboard distinguish an estimate from recorded data.

The date-only helpers validate calendar dates and use UTC day arithmetic for
intervals, avoiding daylight-saving-hour differences. An estimate cannot
confirm ovulation, diagnose a condition, or guide contraception decisions.

## Limitations and review

- Reminders are checked while the Reminders page is open; background delivery
  after the app closes is not supported.
- Hindi translation is partial. Ask is an offline FAQ matcher, not an AI
  assistant or a general medical question service.
- Health guidance and translations need ongoing clinical and local review.
- Browser storage, device accessibility, and notification support vary.
- Continue manual keyboard, screen-reader, mobile, and health-content testing
  using [docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md).
