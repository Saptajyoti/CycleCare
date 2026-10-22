# Manual testing checklist

Use a private/incognito browser profile or disposable data. **Before deletion, import, or browser-data-clearing tests, export any real records you need to retain.** Do not use real personal health data for test scenarios. Health copy and thresholds require professional review; this checklist is not clinical validation.

## Setup and navigation

- [ ] First launch: choose demo data and verify the fictional records load. Repeat in a fresh profile and choose a fresh start; verify empty states and no console errors.
- [ ] Navigate through every page using the desktop and mobile menus. Confirm the active page and menu close behavior.
- [ ] Enable Discreet Mode: verify the brand/title become “Diary,” the Overview masks selected details, and the privacy notice explains it is visual only. Refresh and turn it off again.

## Periods, estimates, calendar, and insights

- [ ] Period logging: save a past date and valid duration. Try duplicate, future, and invalid dates; verify validation. Record heavy-flow observations and verify they persist.
- [ ] Calendar: verify duration highlights, symptom-day markers, current date selection, month changes across year boundaries, and disabled future dates. Edit a period start and verify the history updates; remove a period by unchecking it and saving.
- [ ] Symptom edit from Calendar: on a date with multiple check-ins, edit each one, change fields and date to a past/current day, and save. Confirm the original ID is updated without creating a duplicate and the calendar marker moves when the date changes. Cancel an edit and verify the stored record is unchanged. Verify a future date cannot be saved.
- [ ] Estimates: with fewer than three starts confirm insufficient-history text. With three starts verify the median of two complete intervals and a minimum two-day range. Add at least seven starts and confirm only the latest six complete intervals are used.
- [ ] Estimate variability: use cycles whose longest and shortest intervals differ by more than seven days; verify the irregular tracking label, wider range, fertility estimate suppression, and disclaimer. Make the latest gap more than seven days longer than the earlier-interval median; verify the missed-log review appears and confirmation is required before the estimate is shown.
- [ ] Pregnancy mode: enable only after the confirmation checkbox; verify cycle estimates pause, approximate timing and external weekly-source link display, then turn off and verify records remain.
- [ ] Insights: verify average and min/max recorded intervals, recent chart, symptom frequency, and cross-cycle co-occurrence only after sufficient logged cycles. Confirm copy avoids claiming causation or diagnosis.
- [ ] Overview dashboard: verify recorded history is labelled as records, the next period range is labelled as an estimate, and an unusually long latest gap requests review instead of showing an estimate. Verify pregnancy mode pauses the estimate and Discreet Mode hides personal cycle dates.
- [ ] Recent check-ins: add multiple symptom and mood entries, return to Overview, and verify the three most recent records appear in date order with a route to symptom logging. Verify the empty state before any check-ins and that Discreet Mode hides record details.
- [ ] Care prompts: create a record that triggers care guidance, verify only logged facts are shown on Overview, and use the link to open the full care page and named source.

## Logging and care guidance

- [ ] Symptom logging: create a check-in for today and an earlier date with symptoms, pain, activity impact, mood, energy, sleep, medicines, and notes. Reload and verify saved values. Check optional empty fields and no-symptom entries.
- [ ] Care guidance: test a period longer than seven days, heavy-flow observations, three consecutive out-of-range cycles for each age setting, a 90-day gap, bleeding between periods, pain affecting activities, and high pain. Verify the observed dates, next step, and source shown for each trigger.
- [ ] Urgent prompts: test urgent symptom checkboxes and wellbeing support with disposable data. Confirm app text directs users to outside help, identifies that it does not monitor emergencies, and includes cited sources where provided. Do not treat this as a triage test.
- [ ] Visit summary: preview/print it and verify dates and optional record details; confirm it is labelled a personal record, not a diagnosis.
- [ ] FAQ: test known English and Hindi questions, suggested questions, an unknown question, and urgent self-harm terms. Confirm it is offline and not presented as an AI assistant.
- [ ] Learn: open the PCOS and first-period lessons in both languages, verify citations, search/filter existing articles, and test read-aloud with and without browser speech support.

## Reminders and data controls

- [ ] Reminders: configure each default and a custom reminder; verify they start disabled and can be enabled/disabled and timed. Use “Send test reminder” to verify browser notification or in-page fallback. Set an enabled reminder for the current local minute and confirm it fires while the page is open; verify multiple same-time reminders each fire once and do not repeat that day. Hide and refocus the page to verify it resumes checking. Close the app and confirm the limitation is clearly disclosed (no background scheduling).
- [ ] JSON export: create disposable records, export, and inspect `periods`, `symptoms`, `reminders`, preferences, and timestamp. Keep the file private.
- [ ] CSV export: verify quoting and that dates/details from both period and symptom records are included.
- [ ] JSON import: import a valid export after confirmation and verify records replace current records. Cancel confirmation; test malformed JSON, future dates, and invalid records; verify errors are visible and invalid data is not imported.
- [ ] PIN vault: on localhost/HTTPS, enable encryption with a disposable four-digit PIN after exporting. Verify plaintext health keys are removed, reload and unlock with the correct PIN, reject a wrong PIN, test lock/unlock and record edits, and verify the warning about weak PINs and unrecoverability. Test export/import and deletion while unlocked. Do not use a PIN protecting real or irreplaceable data for this test.
- [ ] Delete everything: cancel once and confirm records remain; then confirm deletion and verify CycleCare keys, vault and preferences are cleared and onboarding returns.

## Accessibility, layout, and validation

- [ ] Viewport: check 360 px, 390 px, 700 px, and desktop widths for clipping, horizontal overflow, readable wrapping, and usable calendar controls.
- [ ] Self-care cards: verify all drink/food illustrations have meaningful accessible names, decorative flowers are ignored by screen readers, and preparation guides work by keyboard and touch. Confirm suggestions make no treatment or guaranteed-relief claims.
- [ ] Accessibility settings: verify small/default/large text and high contrast persist after navigation/reload. Confirm focus indicators, labels, accessible names, and keyboard operation for navigation, forms, calendar days, dialogs, and controls.
- [ ] Reduced motion: enable the OS/browser preference and confirm interactions remain usable.
- [ ] Run `npm test`, `npm run build`, and `npm run lint`; record any warnings and browser console errors.

Record browser/version, viewport size, disposable test data, and console errors with each finding.
