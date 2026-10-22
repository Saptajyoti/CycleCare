# CycleCare architecture

## Application structure

CycleCare is a Vite-served React single-page application. `src/main.jsx` mounts `App` from `src/App.jsx` into `#root`; `App.css` and `index.css` provide styles. The app has no backend, API client, database, authentication, service worker, or router configuration.

`App` owns the active page, mobile-menu state, and Discreet Mode state. It renders Dashboard (Overview), CalendarPage, SymptomsPage, LearnPage, or SettingsPage. Page changes are in-memory state changes, including a custom `cyclecare-navigate` event used by the Overview learning link.

## Period flow

1. A user selects a past-or-today date and a 1–10 day duration on Overview.
2. Dashboard rejects empty, future, and duplicate start dates.
3. It reads normalized history, appends the record, sorts by date, and writes `cyclecare_periods` as JSON.
4. It dispatches `cyclecare-data-updated`.
5. Calendar listens for the event, re-renders from storage, and expands each saved duration into highlighted days, including across month/year boundaries.

`getPeriodEntries` parses JSON, discards malformed records, non-real/future dates, duplicate start dates, and durations outside 1–10, then sorts valid entries. It does not rewrite storage while reading.

## Estimation and symptoms

`getCycleEstimate` needs three starts and at least two consecutive 20–45 day intervals. It rounds their arithmetic mean, adds it to the latest start, and returns a ±2-day display window. Date-only helpers avoid timestamp-string parsing; interval arithmetic uses UTC calendar-day components to avoid DST-hour differences.

SymptomsPage saves `{ id, date, symptoms, note }` records in `cyclecare_symptoms`, clears the form, and emits `cyclecare-symptoms-updated`. It refreshes from that event and the browser `storage` event. `getSymptomSummary` counts each distinct symptom once per check-in and derives sorted frequencies and ties.

## Persistence, export, and deletion

`cyclecare_discreet_mode` stores a string boolean and synchronizes from other tabs through `storage`. Export serializes normalized period and symptom reads plus an ISO `exportedAt` timestamp into a JSON Blob download. Deletion asks for native confirmation, removes only the period and symptom keys, leaves the Discreet Mode preference intact, and emits both refresh events.

## Privacy and technical limits

No data is intentionally sent by the application itself, but localStorage is not encrypted or PIN-protected. Device/browser-profile access and developer tools can expose it; browser-data clearing can remove it. Discreet Mode is only visual masking on Overview. External educational sources are third-party navigation. Predictions and summaries are informational, not medical conclusions.

Vite uses the default root base path. Static paths beginning with `/` assume root hosting unless `base` is configured for subpath deployment.
