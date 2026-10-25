# CycleCare

CycleCare is an account-free menstrual health companion for recording period
starts and symptom check-ins, reviewing personal patterns, and finding
educational and care information. Health records stay in the current browser
profile; the app does not send them to a CycleCare server.

## Features

- Period start and duration logging, flow observations, and an editable calendar.
- An estimated period date and range based on the median of up to six recent
  recorded cycle gaps, with limited-history messaging, uncertainty explanation,
  and a possible missing-log review prompt.
- Symptom and mood check-ins, recent record summaries, cycle insights, and
  cautious, record-based care guidance with separate self-care, medical-advice,
  and urgent-symptom sections.
- Offline keyword matching for a finite FAQ, sourced health lessons and
  articles, bilingual search, essential English/Hindi learning content, and
  optional pause/resume read-aloud.
- An opt-in Gemini educational assistant, with the existing offline FAQ kept as
  a fallback. Only the question typed into the assistant is sent to the
  CycleCare backend and Gemini after consent; saved records and chat history
  are not sent. Deterministic local and backend safety checks return fixed
  guidance for concerning symptoms without asking Gemini.
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
treatments. The linked health guidance has not yet been reviewed by a qualified
clinician. AI responses are educational only and should not guide starting or
stopping medication. Seek professional or emergency care when indicated; do not
wait for CycleCare.

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
Navigation is component-state based; there is no configured router. The
optional Gemini assistant uses a separate Express backend in `server/`; core
CycleCare functionality does not require it.

`react-router-dom` and `recharts` are installed but not used by the current
application.

## Privacy and storage

Without the optional vault, records are stored in browser `localStorage`, which
is **not encrypted** and may be accessible to someone with access to the same
browser profile or developer tools. Clearing browser data can erase records.
Discreet Mode changes what is shown on screen; it is not a security boundary.

The optional vault uses Web Crypto AES-GCM and a 256-bit key derived from a
five-digit PIN using PBKDF2/SHA-256 with 600,000 iterations and a random salt.
The PIN is not stored and cannot be recovered. Five digits provide only
100,000 combinations, so this is weaker against offline guessing than a long
password if someone obtains the vault file. Existing four-digit PIN and
passphrase vaults remain unlockable so users can upgrade them in Settings.
This is not device security. The vault requires a secure context such as
HTTPS or localhost and protects selected records only while stored, not while
unlocked.

Exports contain sensitive health information; keep exported files private.
Import validates supported fields, record types, dates, uniqueness, and a 5 MB
file-size limit before replacing data, after confirmation. Deletion removes
CycleCare keys from this browser's localStorage and verifies the keys are
absent. The application has no account, sync, analytics, or health-record
transmission service. Standard network metadata can be processed by the
backend/provider when the optional assistant is used.

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
revoked from Ask. Only the question entered in the assistant is sent in the
request to the CycleCare backend and then to Google Gemini; saved CycleCare
records and prior chat messages are not sent. The services may process standard
connection metadata, such as an IP address. Do not include identifying or
sensitive details. Updated consent disclosures require older saved consent to
be confirmed again.

## Deploy to Render

The frontend is a Vite static site rooted at the repository root. The included
`render.yaml` configures its build command as:

```bash
npm ci --include=dev && npm run build
```

It publishes `dist`. Including devDependencies is intentional: Vite and its
React plugin are build tools, and Render environments that omit
devDependencies would otherwise fail with `vite: not found`. Keep these tools
in the root `devDependencies`; do not move them into runtime dependencies.

The Express service in `server/` is optional and is only needed for the
consent-based Gemini assistant. If enabling it on Render, create a separate
Web Service with `server` as its root directory, `npm ci` as its build command,
and `npm start` as its start command. Set `GEMINI_API_KEY` as a secret and
`CLIENT_ORIGIN` to `https://cycle-care-wlhg.onrender.com`. The backend also
allows `http://localhost:5173`; comma-separated additional exact origins can
be provided in `CLIENT_ORIGIN`. Render's `PORT` is used automatically. The
backend serves `GET /api/health` and `POST /api/assistant`.

The frontend Render Blueprint sets `VITE_ASSISTANT_API_URL` to
`https://cycle-care-b.onrender.com/api/assistant`. It is a public URL, not a
secret, and is embedded into the frontend at build time. For local development,
the frontend defaults to `http://localhost:5000/api/assistant`.

Configure these variables in Render:

| Service | Variable | Value |
| --- | --- | --- |
| Static Site (repository root) | `VITE_ASSISTANT_API_URL` | `https://cycle-care-b.onrender.com/api/assistant` |
| Web Service (root directory `server`) | `GEMINI_API_KEY` | Your Gemini API key, stored as a secret |
| Web Service (root directory `server`) | `GEMINI_MODEL` | `gemini-3.5-flash-lite` (optional; this is the default) |
| Web Service (root directory `server`) | `CLIENT_ORIGIN` | `https://cycle-care-wlhg.onrender.com` |
| Web Service (root directory `server`) | `GEMINI_TIMEOUT_MS` | `30000` (optional; this is the default) |

Do not set the Gemini key in a frontend variable or expose it to the browser.
Do not include private CycleCare records in assistant requests: after explicit
consent, the frontend sends only `{ "message": "<the user's question>",
"consent": true }`. The backend should use `npm ci` to build/install and
`npm start` to run. Configure its Render health check to `/api/health`.

To verify the integration after configuring Render, check
`https://cycle-care-b.onrender.com/api/health`, run `npm test` at the repository
root and `npm test` in `server/`, then build the frontend with `npm run build`.
The health endpoint checks service availability; sending an actual assistant
question is required to verify Gemini credentials and provider access.
Without the backend, the offline assistant and the rest of the frontend remain
available.

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
derives a range from observed variation, and labels two gaps as limited history
without presenting a confidence percentage. The dashboard and calendar explain
the median-based calculation, distinguish estimates from records, and ask the
user to review a possible missing log when the latest gap is unusually long
compared with earlier gaps. Calendar editing supports both period start and end
dates; imports and new edits reject overlapping period ranges before those
dates are used for calculations.

The date-only helpers validate calendar dates and use UTC day arithmetic for
intervals, avoiding daylight-saving-hour differences. An estimate cannot
confirm ovulation, diagnose a condition, or guide contraception decisions.

## Limitations and review

- Reminders are checked while the Reminders page is open; background delivery
  after the app closes is not supported.
- Some supplementary Learn articles and other app areas are English-only;
  additional Indian-language translations should be prioritized based on
  community needs.
- Health lessons are general education, not diagnosis or individualized
  treatment advice. The content and translations have not yet been reviewed by
  a qualified healthcare professional and need ongoing clinical and local
  review.
- Browser storage, device accessibility, and notification support vary.
- Continue manual keyboard, screen-reader, mobile, and health-content testing
  using [docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md).
