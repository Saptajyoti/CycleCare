# Manual testing checklist

Use a private/incognito browser profile or disposable data. **Before deletion, import, or browser-data-clearing tests, export any real records you need to retain.** Do not use real personal health data for test scenarios. Health copy and thresholds require professional review; this checklist is not clinical validation.

## Setup and navigation

- [ ] First launch: choose demo data and verify the fictional records load. Repeat in a fresh profile and choose a fresh start; verify empty states and no console errors.
- [ ] Navigate through every page using the desktop and mobile menus. Confirm the active page and menu close behavior.
- [ ] Enable Discreet Mode: verify the brand/title become “Diary,” the Overview masks selected details, and the privacy notice explains it is visual only. Refresh and turn it off again.

## Periods, estimates, calendar, and insights

- [ ] Period logging: save a past date and valid duration. Try duplicate, future, and invalid dates; verify validation. Record heavy-flow observations and verify they persist.
- [ ] Calendar: verify duration highlights, symptom-day markers, current date selection, month changes across year boundaries, and disabled future dates. Edit both period start and end dates and flow; verify history and estimates update. Reject overlapping dates and remove a period by unchecking it and saving.
- [ ] Symptom edit from Calendar: on a date with multiple check-ins, edit each one, change fields and date to a past/current day, and save. Confirm the original ID is updated without creating a duplicate and the calendar marker moves when the date changes. Cancel an edit and verify the stored record is unchanged. Verify a future date cannot be saved.
- [ ] Estimates: with fewer than three starts confirm insufficient-history text. With three starts verify the median of two complete intervals, explicit limited-history label, calculation explanation, and minimum two-day range; verify there is no confidence percentage. Add at least seven starts and confirm only the latest six complete intervals are used.
- [ ] Estimate variability: use cycles whose longest and shortest intervals differ by more than seven days; verify the irregular tracking label, wider range, fertility estimate suppression, and disclaimer. Make the latest gap more than seven days longer than the earlier-interval median; verify the missed-log review appears and confirmation is required before the estimate is shown.
- [ ] Pregnancy mode: enable only after the confirmation checkbox; verify cycle estimates pause, approximate timing and external weekly-source link display, then turn off and verify records remain.
- [ ] Insights: verify average and min/max recorded intervals, recent chart, symptom frequency, and cross-cycle co-occurrence only after sufficient logged cycles. Confirm copy avoids claiming causation or diagnosis.
- [ ] Overview dashboard: verify recorded history is labelled as records, the next period range is labelled as an estimate, and an unusually long latest gap requests review instead of showing an estimate. Verify pregnancy mode pauses the estimate and Discreet Mode hides personal cycle dates.
- [ ] Recent check-ins: add multiple symptom and mood entries, return to Overview, and verify the three most recent records appear in date order with a route to symptom logging. Verify the empty state before any check-ins and that Discreet Mode hides record details.
- [ ] Care prompts: create a record that triggers care guidance, verify only logged facts are shown on Overview, and use the link to open the full care page and named source.
- [ ] Self-care categories: open each Nutrition, Refreshments, Relaxation, and Physical comfort section. Verify meal/hydration ideas, water and caffeine-free drink choices, breathing/relaxation prompts, and gentle movement appear without cure, hormone-regulation, or treatment promises.
- [ ] Self-care checklist and favorites: mark suggestions done, switch categories, save/remove favorites, reload, and verify saved state and today's checklist remain. Confirm the checklist resets for a different local date and is described as optional rather than a score.
- [ ] Self-care feedback: record both helpful and not-helpful responses for suggestions. Verify feedback is local, editable, and available in JSON export/import; do not infer medical benefit from it.
- [ ] Self-care reminder: enable a time, leave the Overview open until that time, and verify one in-page reminder appears for that local day. Reload and confirm it does not repeat that day; verify it is clearly described as unavailable when the app is closed and can be disabled.

## Logging and care guidance

- [ ] Symptom logging: create a check-in for today and an earlier date with symptoms, pain, activity impact, mood, energy, sleep, medicines, and notes. Reload and verify saved values. Check optional empty fields and no-symptom entries.
- [ ] Care guidance: test a period longer than seven days, heavy-flow observations, three consecutive out-of-range cycles for each age setting, a 90-day gap, bleeding between periods, pain affecting activities, and high pain. Verify the observed dates, next step, and source shown for each trigger.
- [ ] Guidance categories: verify the care page separates General self-care, Arrange medical advice, and Urgent symptoms. Check advice for prolonged/heavy bleeding, repeated irregularity, missed periods, severe or activity-limiting pain, and pregnancy-related warning symptoms. Confirm source links and the pending clinician-review disclaimer.
- [ ] Urgent prompts: test urgent symptom checkboxes and wellbeing support with disposable data. Confirm app text directs users to outside help, identifies that it does not monitor emergencies, and includes cited sources where provided. Do not treat this as a triage test.
- [ ] Visit summary: preview/print it and verify dates and optional record details; confirm it is labelled a personal record, not a diagnosis.
- [ ] Offline answers: test known English and Hindi questions, suggested questions, an unknown question, and urgent self-harm terms. Confirm FAQ questions remain offline.
- [ ] Floating AI assistant: open it on multiple dashboard pages and on a narrow viewport; verify the panel stays open during navigation, closes with Escape, requires consent before sending, explains the question/backend/Gemini and connection metadata sent, retains the visible chat, and clears the conversation when consent is revoked. Verify urgent and medical-advice symptom descriptions (including misspellings and indirect wording) receive fixed local guidance without being sent to the cloud. Inspect the Network panel: no question request before consent and request body contains only `message` and `consent`, never saved records or prior chat.
- [ ] Assistant safeguards: submit urgent bleeding/pain, pregnancy warning symptoms, self-harm, heavy/prolonged bleeding, missed/irregular periods, and disabling pain. Verify urgent messages offer immediate help and never show a Gemini answer; medical-advice responses direct users to a professional and do not diagnose or recommend medication changes. Verify ordinary education still sends only after consent.
- [ ] Assistant fallback: simulate timeout, network failure, and provider error. Verify a persistent alert explains that AI cannot assess or diagnose, includes urgent-care directions, and links to Offline answers.
- [ ] Learn: open the cycle basics, first-period, hygiene, common-symptoms, irregular-period, PCOS, endometriosis, and appointment-preparation lessons in English and Hindi. Verify translated headings/body/takeaways, source links, clinical-review notice, and English-only labels for untranslated supplementary articles.
- [ ] Learn: verify the cycle diagram has an accessible name/description and remains legible on mobile; search by English/Hindi title, body terms, and source; filter each category; check the result count and empty state.
- [ ] Learn read-aloud: test listen, pause, resume, stop, changing language/article while reading, and browser speech unavailable/error states. Confirm spoken language follows the selected content.

## Reminders and data controls

- [ ] Reminders: configure each default and a custom reminder; verify they start disabled and can be enabled/disabled and timed. Use “Send test reminder” to verify browser notification or in-page fallback. Set an enabled reminder for the current local minute and confirm it fires while the page is open; verify multiple same-time reminders each fire once and do not repeat that day. Hide and refocus the page to verify it resumes checking. Close the app and confirm the limitation is clearly disclosed (no background scheduling).
- [ ] JSON export: create disposable records, export, and inspect `periods`, `symptoms`, `reminders`, preferences, and timestamp. Keep the file private. Verify JSON and CSV export errors are announced and download links remain usable.
- [ ] CSV export: verify quoting and that dates/details from both period and symptom records are included.
- [ ] JSON import: import a valid export after confirmation and verify records replace current records. Cancel confirmation; test malformed JSON, unsupported format, files over 5 MB, future/duplicate dates, duplicate IDs/tags, invalid field types, oversized notes, and invalid reminders; verify errors are visible and no invalid records are imported.
- [ ] Imported cycle records: verify duplicate, invalid, and overlapping period ranges are rejected before import; valid dates across month boundaries and leap days produce the expected cycle intervals and estimates.
- [ ] Five-digit PIN vault: on localhost/HTTPS, export disposable data, enable with a five-digit PIN, and verify plaintext health keys are removed while preferences remain outside the vault. Inspect the envelope for version 3, 600,000 KDF iterations, random salt/IV, and ciphertext only. Reject non-five-digit values, reload, reject a wrong PIN, unlock correctly, edit records, lock, and verify decrypted record components are no longer rendered. Test PIN change, reload with the new PIN, export/import, and deletion. Keep the warning visible that five digits are susceptible to offline guessing if the vault is copied. Do not use credentials protecting real or irreplaceable data for this test.
- [ ] Legacy vault migration: use only disposable version 1 and version 2 vaults. Verify the old four-digit PIN or credential still unlocks, replace it with a five-digit PIN in Settings, and verify the vault reopens only with the new PIN after reload.
- [ ] Delete everything: cancel once and confirm records remain; then confirm deletion and verify all keys beginning `cyclecare_` are absent from localStorage and onboarding returns. Test storage failure and verify the app reports that deletion did not complete.

## Accessibility, layout, and validation

- [ ] Viewport: check 360 px, 390 px, 700 px, and desktop widths for clipping, horizontal overflow, readable wrapping, and usable calendar controls.
- [ ] Self-care cards: verify all drink/food illustrations have meaningful accessible names, decorative flowers are ignored by screen readers, and preparation guides work by keyboard and touch. Confirm suggestions make no treatment or guaranteed-relief claims.
- [ ] Accessibility settings: verify small/default/large text and high contrast persist after navigation/reload. Confirm focus indicators, labels, accessible names, and keyboard operation for navigation, forms, calendar days, dialogs, and controls. On mobile, open the navigation with the keyboard, confirm focus enters the menu, Tab/Shift+Tab stay within it, Escape closes it and restores focus to the trigger, and the current page is announced. Use a screen reader to check headings, live validation/status messages, the locked vault dialog, and assistant consent controls.
- [ ] Language support: switch between English and Hindi using the language setting and onboarding controls. Verify the document language changes, mobile navigation and core dashboard/period-entry/self-care labels are translated, and translated text wraps without clipping at narrow widths. Confirm the Settings page accurately identifies screens and supplementary lessons that are not yet translated.
- [ ] Reduced motion: enable the OS/browser preference and confirm interactions remain usable.
- [ ] Run `npm test`, `npm run build`, and `npm run lint`; record any warnings and browser console errors.

Record browser/version, viewport size, disposable test data, and console errors with each finding.
