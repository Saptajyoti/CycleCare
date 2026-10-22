# Manual testing checklist

Use a private/incognito browser profile or disposable data. **Before deletion or browser-data-clearing tests, export any real records you need to retain.** Do not use real personal health data for test scenarios.

## Core records and calendar

- [ ] First launch: use a fresh profile; confirm Overview, Calendar, and Symptoms show empty states without errors.
- [ ] Period logging: save a past date and duration; verify success. Try the same start date and a future date and verify rejection.
- [ ] Calendar highlighting: confirm each recorded duration day is highlighted, including one that crosses a month end.
- [ ] Estimates: with fewer than three starts confirm the insufficient-history text. Add three starts with two 20–45-day intervals and confirm an average and five-day window. Confirm an out-of-range interval does not qualify by itself.
- [ ] Month navigation: use Previous/Next across December/January and February in leap and non-leap years; verify day counts and highlights.
- [ ] Refresh synchronization: save a period on Overview, then confirm Calendar reflects it after navigation.

## Symptoms and learning

- [ ] Symptom logging: select symptoms, add a note, save, and verify the dated check-in. Save without symptoms and verify “No symptoms selected.”
- [ ] Symptom Insights: create repeated and tied symptoms across check-ins; verify counts, bars, and tied wording.
- [ ] Articles: search title/description/keyword terms, select every category, verify no-match feedback, open every article, check its source link, and use Back.

## Privacy and persistence

- [ ] Discreet Mode: enable it, verify neutral Overview text, refresh for persistence, then turn it off.
- [ ] JSON export: save disposable data, export, inspect the JSON, and verify `periods`, `symptoms`, `exportedAt`, and values.
- [ ] Deletion: **after export/back-up**, cancel Delete once and verify records remain; then confirm deletion and verify Calendar/Symptoms empty states. Verify Discreet Mode is not reset.
- [ ] Refresh persistence: save disposable records, reload, and confirm period and symptom history persist.

## Layout and accessibility

- [ ] Desktop: verify sidebar, settings actions, cards, and calendar at a wide viewport without overlap.
- [ ] Mobile: test at 700 px or narrower and around 390 px; operate the menu and inspect horizontal overflow.
- [ ] Keyboard: use Tab, Shift+Tab, Enter, and Space for navigation, forms, buttons, and Discreet Mode; verify visible focus indicators.
- [ ] Reduced motion: enable the OS/browser preference and confirm interactions remain usable.

Record browser version, viewport size, test data, and console errors with each finding. This checklist is manual guidance, not a medical validation of the estimator.
