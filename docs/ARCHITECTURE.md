# CycleCare architecture

## Application structure

CycleCare is a Vite-served React single-page application. `src/main.jsx` mounts `App` from `src/App.jsx`; `App.css`, `assistant.css`, and `index.css` provide styles. Date-only and cycle-estimate helpers live in `src/utils/cycle.js` and are covered by Node's built-in test runner. There is no database, authentication service, service worker, or router configuration. Navigation is held in React state.

`App` owns the active page, mobile menu, onboarding state, language, age group, pregnancy-information visibility, Discreet Mode, and optional vault lock state. It renders Overview, My Calendar, My Symptoms, Insights, Learn, Offline answers, When to see a doctor, Reminders, Pregnancy, or Settings. The consent-gated Gemini assistant is a floating chat panel available across dashboard pages outside onboarding and Discreet Mode. Custom `cyclecare-navigate` and `cyclecare-edit-symptom` events connect in-app navigation and calendar-to-symptom editing. The Overview distinguishes saved period history from an estimated period window, shows recent recorded check-ins, and links to logged-record-based care guidance. Self-care cards contain original lightweight SVG illustrations; these suggestions do not make treatment claims.

## Onboarding and records

On first use, onboarding offers fictional demo records or an empty start. The demo is not personal health advice. Selecting either option completes setup.

Period records are stored under `cyclecare_periods`. A period start can be recorded with a duration, flow, frequent-product-change observation, and large-clot observation. `getPeriodEntries` validates local date strings, rejects future or duplicate starts and invalid durations, normalizes supported fields, and sorts by start date.

Symptom check-ins are stored under `cyclecare_symptoms`. Entries include a date, selected symptoms, pain score and activity impact, bleeding-between-periods observation, optional notes, mood, energy, sleep, medicines, and explicit urgent-symptom and wellbeing observations. The calendar displays dates with check-ins; selecting a past or current date allows period-entry edits and offers an edit action for each check-in on that date. Check-in edits retain the original record ID and update rather than append.

Both record types use local calendar dates (`YYYY-MM-DD`). Calendar-day interval calculations use UTC date components to avoid daylight-saving-hour differences. The application does not infer a biological cycle phase.

## Cycle estimates and insights

`getCycleEstimate` needs at least three distinct valid period starts. It takes up to the six most recent complete intervals, uses their median, and presents a date range based on observed deviation (at least two days on either side). A two-interval estimate is explicitly labelled limited history; no confidence percentage is shown. A spread greater than seven days is labelled an irregular tracking pattern and increases the range. If the newest interval is over seven days longer than the median of earlier intervals, the app asks the user to review a possible missing log before showing the estimate. Invalid dates and duplicate dates are ignored by the pure helper; imports are validated for date, duplicate, and overlapping period ranges before use. Calendar editing supports correcting both start and end dates, which causes estimates to be recalculated from updated records.

This is an estimate from entered dates, not a guarantee, diagnosis, ovulation confirmation, or contraception method. Fertility-window estimates are optional, hidden for under-18 users unless enabled, and withheld when the recent pattern is marked irregular. Pregnancy mode suppresses cycle estimates.

Insights show averages, ranges, up to twelve recent logged cycle intervals, symptom frequencies, and symptoms recorded in multiple logged cycles. These are descriptive summaries only; they cannot establish a cause or diagnosis.

## Care guidance, education, and questions

`getCareGuidance` checks saved period durations, three consecutive out-of-reference-range intervals, date gaps of at least 90 days, and selected logged symptom observations. Prompts state the record that triggered them, provide a suggested next step, and link to a named source. Age-group settings select the adult or adolescent interval reference. The rules cannot assess symptoms that were not logged and are not a medical triage system.

The care page separates general comfort measures, reasons to arrange medical advice, and urgent symptoms. It includes source links, India eSanjeevani information, a printable visit summary, and an explicit notice that qualified clinician review is pending. Symptom check-ins also show urgent-support guidance for selected warning signs; the wellbeing prompt links to Tele-MANAS. Users are told not to wait for the app during an emergency. Emergency-service availability and clinical guidance should be checked locally and periodically; the app cannot contact services for the user.

Learn combines the existing article collection with separately maintained English/Hindi lessons in `src/content/healthLessons.js`. Topics include PCOS, first periods, heavy bleeding, irregular timing, period pain, missed periods, and endometriosis. Each added health lesson links to its named NHS source. Read-aloud uses browser speech synthesis when available. Offline answers is a keyword match against a finite FAQ and displays a fallback when there is no match. The floating Gemini assistant sends only the submitted question after browser-stored consent; each question is handled independently. Shared deterministic rules in `shared/healthSafety.js` intercept urgent and common medical-advice symptom descriptions (including selected misspellings) in the browser before transmission and again at the backend before Gemini. These rules return fixed safety guidance rather than model output. Other questions receive a persistent AI-limitations notice; provider failures show offline guidance and a link to Offline answers. These rules are not a validated triage system, and clinician review remains pending.

## Reminders and pregnancy information

Reminders are opt-in. The daily, estimated-window, and medicine reminders can be configured, along with custom reminders. While the Reminders page is open, the app checks every ten seconds and when the page regains focus/visibility; each enabled reminder is delivered at most once per local calendar day. Browser notifications require user permission; otherwise reminder text appears in the page. A test-reminder control checks the browser notification or in-page fallback immediately. The app does not schedule background notifications after it is closed.

Pregnancy mode is opt-in and requires the user to affirm a positive test or professional confirmation. It pauses cycle estimates and provides approximate timing from the last recorded period plus links to external NHS pregnancy information. This is not pregnancy dating or a substitute for prenatal care; weekly information is linked externally rather than embedded in CycleCare.

## Preferences, privacy, and data portability

Without the optional vault, records are stored in browser `localStorage` and are not encrypted. Browser-profile access, browser extensions, device compromise, and browser-data clearing can expose or erase them. Discreet Mode changes the app name and masks selected Overview details only; it is not a security boundary. Language selection is partly translated: onboarding, selected guidance/FAQ and lessons support Hindi, but the full interface does not.

The optional vault uses Web Crypto AES-GCM with a 256-bit key derived from a five-digit PIN by PBKDF2/SHA-256 (600,000 iterations) and a random salt. Version 3 authenticates its KDF metadata as AES-GCM additional data. Existing version 1 four-digit PIN and version 2 passphrase vaults remain unlockable and can be re-encrypted with a five-digit PIN in Settings. A five-digit PIN has only 100,000 combinations and is more susceptible to offline guessing than a long password if the vault is copied. Credentials are not stored and cannot be recovered. Browser crypto requires a secure context. Only configured health-data keys are in the encrypted vault; other app preferences are not all encrypted. Decrypted data and the key stay in page memory while unlocked.

Settings provide JSON and CSV exports, JSON import, and deletion of all keys beginning with `cyclecare_` in this browser. Import is limited to 5 MB and validates supported fields, date values, period durations, symptom fields, duplicate identifiers/dates, and reminder values before replacing period, symptom, reminder, pregnancy-mode, age-group, and tracked-symptom data after confirmation. Deletion verifies that CycleCare keys are absent after removal. Exports contain sensitive health data and should be kept private. No health records are sent to the backend. If the optional assistant is enabled, only the typed question is sent to the CycleCare backend and Gemini; chat history and saved records are not included. Standard network metadata may still be processed by those services.

## Accessibility and known limits

Settings include text-size and high-contrast preferences; reduced-motion styles and responsive layouts are present. The app should still be manually checked at 360 px, with keyboard-only operation and a screen reader.

There is no moderated community, full Hindi translation, or embedded pregnancy-week curriculum. `npm test` runs focused date and cycle-estimate tests; browser workflows and accessibility still require manual checks. Health copy and guidance rules need appropriate clinical and local review before real-world medical use.

Vite uses its default root base path. Static paths beginning with `/` assume root hosting unless `base` is configured for subpath deployment.
