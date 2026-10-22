# CycleCare

CycleCare is a browser-based menstrual health companion for privately recording period starts and symptom check-ins, reviewing a calendar, and reading educational material. It is a privacy-conscious client-side application: it has no backend, account system, or networked health-record service.

## Features

- Period start logging with a 1–10 day duration and duplicate-date prevention.
- Calendar view of recorded period days and a pattern-based next-period window.
- Symptom check-ins with optional notes, saved-history display, and frequency insights.
- Eight educational articles with client-side keyword search, category filters, and source links.
- A privacy settings page with persistent Discreet Mode, local JSON export, and confirmation-based deletion of CycleCare health records.
- Responsive layouts, visible keyboard focus styles, reduced-motion support, and labelled controls.

## Technology

- React 19, rendered with React DOM
- Vite 8 and `@vitejs/plugin-react`
- `lucide-react` icons
- Oxlint

`react-router-dom` and `recharts` are installed dependencies, but the current application does not import or use them. Navigation is component state rather than URL routing, and symptom insights use CSS rather than a chart library.

## Architecture

`src/main.jsx` mounts `App` in React Strict Mode. `src/App.jsx` contains the stateful shell, pages, article content, storage helpers, and date/cycle helpers. `src/App.css` contains application, responsive, and accessibility styling; `src/index.css` supplies the global reset. `index.html` provides Vite's root element, viewport metadata, favicon, and document title.

The sidebar changes an in-memory active-page value. The Overview page dispatches a `cyclecare-data-updated` browser event after period saves; Calendar listens for it and refreshes. Symptoms use a separate `cyclecare-symptoms-updated` event. The native `storage` event synchronizes relevant changes from other browser tabs.

For fuller design and data-flow detail, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local data storage and privacy

CycleCare stores only the following keys in the current browser origin's `localStorage`:

| Key | Format |
| --- | --- |
| `cyclecare_periods` | JSON array of `{ "startDate": "YYYY-MM-DD", "periodLength": number }`. Reads accept only real, non-future dates, unique start dates, and integer durations from 1 through 10. |
| `cyclecare_symptoms` | JSON array of `{ "id": string, "date": "YYYY-MM-DD", "symptoms": string[], "note": string }`. Missing legacy IDs receive a display-only `legacy-<index>` value when read. |
| `cyclecare_discreet_mode` | String boolean: `"true"` enables the visual Discreet Mode. |

Malformed JSON and invalid records are treated as unavailable rather than crashing. Data stays in the browser profile and is not automatically sent to a CycleCare server. Local storage is **not encrypted**, can be accessed by someone using the same browser profile/device or developer tools, and can be erased when browser/site data is cleared. Discreet Mode only hides selected Overview details on screen; it does not secure stored records. Export a copy before clearing data or running destructive tests.

## Cycle estimate

The calendar requires at least three recorded period starts. It calculates the day count between consecutive starts, keeps only plausible intervals from 20 to 45 days, and requires at least two such intervals. It rounds their arithmetic mean to a whole-day cycle length, adds that value to the latest start date, and displays a five-day window from two days before to two days after that date.

Dates are parsed as date-only local calendar dates and intervals use UTC calendar-day arithmetic to avoid daylight-saving-time hour changes. The prediction is an estimate, not a guarantee; it cannot confirm ovulation and must not be used as contraception or medical advice.

## Setup

Prerequisite: a current Node.js version supported by Vite 8.

```bash
npm install
npm run dev
```

Other verified package scripts are:

```bash
npm run lint
npm run build
npm run preview
```

`vite.config.js` does not set a custom `base`, so the build assumes deployment at the site root. Configure `base` before hosting beneath a subpath.

## Testing and verification

There is no automated test framework or test script configured in this repository. Adding one solely for a small helper test set would require new tooling and has not been done for this documentation-focused pass.

On 22 October 2026, these checks ran successfully:

```text
npm run lint   # oxlint completed with exit code 0
npm run build  # vite v8.3.5 completed with exit code 0
```

No browser automation or manual browser session was run. Use [docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md) before submission.

## Medical disclaimer

CycleCare is an informational record-keeping and education tool. It does not diagnose conditions, provide individualized medical advice, confirm ovulation, or replace a qualified healthcare professional. Seek professional care for concerning, severe, persistent, or life-disrupting symptoms.

## Limitations and future improvements

- No authentication, encryption, PIN, backup sync, or cross-device data sharing exists.
- Page navigation is not URL-addressable; refreshing returns to Overview.
- The estimator uses a simple average of valid intervals and does not model individual clinical factors.
- Article links lead to third-party sources and require network access when opened.
- Future work could extract pure helpers into a testable module, add an automated test runner, add accessible URL routing, and offer opt-in secure storage/sync only after an appropriate privacy review.
