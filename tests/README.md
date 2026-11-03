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

The tests use the installed Google Chrome. Without it, run `npx playwright install chromium` once and set
`PW_CHANNEL=chromium`.

A single test or file: `npx playwright test --config=playwright.config.ts tests/e2e/timeline.spec.ts -g "deleted"`.
Add `--headed` to watch it, or `--ui` for the interactive mode.

## What is tested

- `unit/`: pure logic of `src`, without browser
  - event colors: palettes, migrations, readability of texts and icons on any customized color, and the
    colors precomputed in `styles.scss` (they must match the code)
  - translations: same keys and parameters in French and English, every key used by the app exists
- `e2e/`: user flows, in French, each test starting from a fresh app (empty database)
  - first launch, symptoms, timeline (every event type, edit, delete, wake-up/bedtime, intensity, classic design),
    day view, calendar, manage lists, settings, backups (export, import, another phone, invalid files),
    PDF report, tutorial, small screens
- `visual/`: main screens in light and dark themes, compared pixel by pixel to `visual/__screenshots__`

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
