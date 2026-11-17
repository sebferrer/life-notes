# Regression tests

Automated tests of the whole app, run with [Playwright](https://playwright.dev) in a headless Chrome,
against the production build (`www`) served locally.

## Running them

| Command | What it does |
| --- | --- |
| `npm test` | Builds the app, then runs every test (unit, e2e, visual) |
| `npm run test:e2e` | Builds the app, then runs the unit and e2e tests |
| `npm run test:unit` | Unit tests only, no build nor browser (a few seconds) |
| `npm run test:visual` | Builds the app, then compares the screens to the approved screenshots |
| `npm run test:visual:update` | Approves the current screens as the new reference screenshots |
| `npm run test:run` | Runs every test on the current build, without building again |
| `npm run test:report` | Opens the HTML report of the last run |
| `npm run screenshots:store` | Builds the app, then takes the Google Play screenshots (not a test, see `store/README.md`) |
| `npm run test:compat` | Builds the published version and the current one, then checks that the backups go from one to the other without any loss (see `compat/README.md`) |

The tests use the installed Google Chrome. Without it, run `npx playwright install chromium` once and set
`PW_CHANNEL=chromium`.

A single test or file: `npx playwright test --config=playwright.config.ts tests/e2e/timeline.spec.ts -g "deleted"`.
Add `--headed` to watch it, or `--ui` for the interactive mode.

## What is tested

- `unit/`: pure logic of `src`, without browser
  - event colors: palettes, migrations, readability of texts and icons on any customized color, and the
    colors precomputed in `styles.scss` (they must match the code)
  - translations: same keys and parameters in French and English, every key used by the app exists
  - custom event types: limit of 10 types, icons, ready-made colors, light and dark variants, type keys
  - inverted intensity scale of a symptom (colors, doughnut charts), statistics of an event (periods, key
    figures, hours of the day), sleep of the nights of a month
- `e2e/`: user flows, in French, each test starting from a fresh app (empty database)
  - first launch, symptoms (inverted intensity scale too), timeline (every event type, edit, delete, wake-up/bedtime, intensity, V1),
    day view, calendar (V1 too, V2: intensities of the symptoms entered as rings, V1: pie charts, sleep of the month as bars or curves), Year in Pixels, manage lists (refreshed from their header, confirmed in a sheet), statistics of an event, settings (the help of the automatic overview, illustrated in V1 and V2), backups (export, import, another phone, invalid files),
    PDF report (V2: each symptom as in the calendar, V1: the classic report, both saved as a PDF), tutorial (illustrated
    with the screens of the version of the interface, no text cut on a small phone), small screens, the cross of every
    bottom sheet
  - event types created by the user: creation (the icons must all exist in the Material Icons font), entries
    from the timeline, colors per theme, limit of 10 types, edition, renaming and deletion of entries, deletion
    of a type with its entries, backups, PDF report; restart in the dark theme, several types sharing entry
    names, English quantities, 12 hour format, length limits, entries of a missing type, incomplete types in a
    backup, identical entries of the same minute, quantities hidden by their type
  - versions of the interface: the V2 for new users only, the users of a former version (`app.startAsFormerUser`,
    settings written in the database before the app starts) keep the V1 and get a popup once; what differs in V1
    (see `GlobalService.uiVersion`); when the app starts, only the chosen version is ever drawn (no flash)
  - data of the former versions: `fixtures/backup-0.3.7.json` is a real backup made by the version 0.3.7 (the one
    published before the V2; September and October 2026, some of its entries typed in its own interface). Imported,
    every day and symptom is found again as it was; a phone with the settings of a 2025 version (five fields) gets
    the V1, the popup and the defaults of then
- `visual/`: main screens in light and dark themes, the V1 screens and the popup of the V2, compared pixel by pixel to
  `visual/__screenshots__`

Every test fails on any JavaScript error, console error or failed request of the page, even when the screen
looks fine. The clock is frozen on 2026-03-18 10:30 (`support/app.ts`), so dates and times are deterministic.

## After a change of the UI

1. `npm test`
2. If visual tests fail, open the report (`npm run test:report`): each failure shows the expected screen, the
   actual one and their differences.
3. Wanted change: approve it with `npm run test:visual:update` and commit the updated screenshots.
   Unwanted change: it is a regression.

New user flows go in `e2e/`, with the actions of `support/app.ts` (`addSymptom`, `addEvent`, `goToSettings`...)
so that a change of the UI only needs to be reflected there.
