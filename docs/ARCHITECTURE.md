# CycleCare architecture

## Application structure

CycleCare is a Vite-served React single-page application. `src/main.jsx` mounts `App` from `src/App.jsx`; `App.css` and `index.css` provide styles. There is no backend, API client, database, authentication service, service worker, or router configuration. Navigation is held in React state.

`App` owns the active page, mobile menu, onboarding state, language, age group, pregnancy-information visibility, Discreet Mode, and optional vault lock state. It renders Overview, My Calendar, My Symptoms, Insights, Learn, Ask, When to see a doctor, Reminders, Pregnancy, or Settings. Custom `cyclecare-navigate` and `cyclecare-edit-symptom` events connect in-app navigation and calendar-to-symptom editing.

## Onboarding and records

On first use, onboarding offers fictional demo records or an empty start. The demo is not personal health advice. Selecting either option completes setup.

Period records are stored under `cyclecare_periods`. A period start can be recorded with a duration, flow, frequent-product-change observation, and large-clot observation. `getPeriodEntries` validates local date strings, rejects future or duplicate starts and invalid durations, normalizes supported fields, and sorts by start date.

Symptom check-ins are stored under `cyclecare_symptoms`. Entries include a date, selected symptoms, pain score and activity impact, bleeding-between-periods observation, optional notes, mood, energy, sleep, medicines, and explicit urgent-symptom and wellbeing observations. The calendar displays dates with check-ins; selecting a past or current date allows period-entry edits and offers an edit action for each check-in on that date. Check-in edits retain the original record ID and update rather than append.

Both record types use local calendar dates (`YYYY-MM-DD`). Calendar-day interval calculations use UTC date components to avoid daylight-saving-hour differences. The application does not infer a biological cycle phase.

## Cycle estimates and insights

`getCycleEstimate` needs at least three recorded period starts. It takes up to the six most recent complete intervals, uses their median, and presents a date range based on observed deviation (at least two days on either side). A spread greater than seven days is labelled an irregular tracking pattern and increases the range. If the newest interval is over seven days longer than the median of earlier intervals, the app asks the user to review a possible missing log before showing the estimate.

This is an estimate from entered dates, not a guarantee, diagnosis, ovulation confirmation, or contraception method. Fertility-window estimates are optional, hidden for under-18 users unless enabled, and withheld when the recent pattern is marked irregular. Pregnancy mode suppresses cycle estimates.

Insights show averages, ranges, up to twelve recent logged cycle intervals, symptom frequencies, and symptoms recorded in multiple logged cycles. These are descriptive summaries only; they cannot establish a cause or diagnosis.

## Care guidance, education, and questions

`getCareGuidance` checks saved period durations, three consecutive out-of-reference-range intervals, date gaps of at least 90 days, and selected logged symptom observations. Prompts state the record that triggered them, provide a suggested next step, and link to a named source. Age-group settings select the adult or adolescent interval reference. The rules cannot assess symptoms that were not logged and are not a medical triage system.

The care page includes an urgent-help warning, links to NHS guidance, India eSanjeevani information, and a printable visit summary. Symptom check-ins also show urgent-support guidance for selected warning signs; the wellbeing prompt links to Tele-MANAS. Users are told not to wait for the app during an emergency. Emergency-service availability and clinical guidance should be checked locally and periodically; the app cannot contact services for the user.

Learn combines the existing article collection with separately maintained English/Hindi lessons in `src/content/healthLessons.js`. Topics include PCOS, first periods, heavy bleeding, irregular timing, period pain, missed periods, and endometriosis. Each added health lesson links to its named NHS source. Read-aloud uses browser speech synthesis when available. Ask is an offline keyword match against a finite FAQ, not an AI assistant or a general-purpose question-answer service; it displays a fallback when there is no match.

## Reminders and pregnancy information

Reminders are opt-in. The daily, estimated-window, and medicine reminders can be configured, along with custom reminders. The app checks on a timer only while the Reminders page is open. Browser notifications require user permission; otherwise the reminder appears in the page. The app does not schedule background notifications after it is closed.

Pregnancy mode is opt-in and requires the user to affirm a positive test or professional confirmation. It pauses cycle estimates and provides approximate timing from the last recorded period plus links to external NHS pregnancy information. This is not pregnancy dating or a substitute for prenatal care; weekly information is linked externally rather than embedded in CycleCare.

## Preferences, privacy, and data portability

Without the optional PIN vault, records are stored in browser `localStorage` and are not encrypted. Discreet Mode changes the app name and masks selected Overview details only; it is not a security boundary. Language selection is partly translated: onboarding, selected guidance/FAQ and lessons support Hindi, but the full interface does not.

The optional four-digit PIN vault uses Web Crypto AES-GCM with a 256-bit key derived by PBKDF2/SHA-256 and a random salt. The PIN is not stored, and forgotten PINs cannot be recovered. A short PIN is vulnerable to offline guessing if someone obtains the browser storage; this is not device security. Browser crypto requires a secure context. Only the configured health-data keys are moved into the encrypted vault; other app preferences are not all encrypted.

Settings provide JSON and CSV exports, JSON import, and deletion of all keys beginning with `cyclecare_` in this browser. Import validates record dates and durations and replaces period, symptom, reminder, pregnancy-mode, age-group, and tracked-symptom data after confirmation. Exports contain sensitive health data and should be kept private. No backend transfer is implemented by the app.

## Accessibility and known limits

Settings include text-size and high-contrast preferences; reduced-motion styles and responsive layouts are present. The app should still be manually checked at 360 px, with keyboard-only operation and a screen reader.

There is no moderated community, AI assistant, full Hindi translation, or embedded pregnancy-week curriculum. There is no automated test runner configured; use the manual checklist and the Vite build/linter for validation. Health copy and guidance rules need appropriate clinical and local review before real-world medical use.

Vite uses its default root base path. Static paths beginning with `/` assume root hosting unless `base` is configured for subpath deployment.
