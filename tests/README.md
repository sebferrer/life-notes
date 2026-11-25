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

At most 3 browsers run in parallel, so that the tests don't take the whole processor (6, the default of
Playwright on a 12-thread CPU, keep it at 100%). `PW_WORKERS=n` changes it for one run.

## What is tested

- `unit/`: pure logic of `src`, without browser
  - event colors: palettes, migrations, readability of texts and icons on any customized color, and the
    colors precomputed in `styles.scss` (they must match the code)
  - translations: every language of `language.model.ts` has its file and flag, the same keys, parameters and HTML tags
    as English, and every key used by the app
  - custom event types: limit of 10 types, icons, ready-made colors, light and dark variants, type keys
  - inverted intensity scale of a symptom (colors, doughnut charts), statistics of an event (periods, key
    figures, hours of the day), sleep of the nights of a month
  - invitation to rate the app: due once, to the users who know the app (days with data, since how long), never
    right after a strong symptom (every value of both scales: up to 2 of 5, up to 4 of 10, reversed when inverted)
  - image of the month of a symptom: the symptoms that can be shared, its figures (as its ring in the calendar, both
    scales), the improvement on the previous month only once the month is over and only when it is better; the sleep
    of a month can be shared from its first complete night
  - correlation engine: ranks, median, q-values of Benjamini-Hochberg; the stratified permutation test (finds a
    strong link, no false alarm on independent data, strata keeping apart what must not be compared, same result
    every time); the links found in generated days (a meal then a stomach ache within hours, compared with the
    same hours of the other days; short nights then headaches, a single card for the short nights and the late
    bedtimes; nights too short or too long for the person then fatigue; an irregular schedule then dizziness; a mood
    lower the day after a drink; a sport with fewer symptoms; the quantity of a custom type) and those not found (a
    habit and a symptom of the same season, the soup eaten the evenings without curry, a medication taken because of
    a symptom, nor linked to the other symptoms of these days, random data); a few striking days stay a weak lead;
    two years analyzed in less than 5 s
- `e2e/`: user flows, in French, each test starting from a fresh app (empty database)
  - first launch, symptoms (inverted intensity scale too), timeline (every event type, edit, delete, wake-up/bedtime, intensity, V1),
    day view, calendar (V1 too, V2: intensities of the symptoms entered as rings, V1: pie charts, sleep of the month as bars or curves), Year in Pixels, manage lists (refreshed from their header, confirmed in a sheet), statistics of an event, settings (the help of the automatic overview, illustrated in V1 and V2), backups (export, import, another phone, invalid files),
    PDF report (V2: each symptom as in the calendar, V1: the classic report, both saved as a PDF), tutorial (illustrated
    with the screens of the version of the interface, no text cut on a small phone, the last slide only gives the
    contact address), small screens, the cross of every
    bottom sheet
  - share of the month as an image (calendar of the V2, when a symptom has intensities or the month a complete night):
    the month and the address in a dark green (the name of the app on the PDF report too); a PNG of 1080 x 1350 and its
    message given to the share sheet of the browser, downloaded without one; on Android (bridge of Capacitor faked),
    written in the cache by Filesystem then given to Share with its message, a share sheet left without choosing
    an app being no error; the image saved (downloaded on the web, on Android written in the cache then given to the
    "Save as" of the system by FileSaver, as the PDF report; the sheet stays open, leaving the "Save as" is no error);
    the choice of the symptom, the sleep after the symptoms (alone when no symptom has an intensity: the sleep card of
    the calendar, its figures and both charts, taller than 1350 and checked on the pixels of the image, in the mode of
    the card, bars or curves, the PDF report opened from the share too), the comparison with the previous month, the
    PDF report of the same month from the sheet, no share for a month without intensity nor night, nor in V1
  - languages: the texts built by the code follow each language (order of the dates, month numbers in Japanese,
    capitals of the German nouns and of the Spanish titles, singular), the language of the page, the day of an
    entry in a time zone behind UTC
  - event types created by the user: creation (the icons must all exist in the Material Icons font), entries
    from the timeline, colors per theme, limit of 10 types, edition, renaming and deletion of entries, deletion
    of a type with its entries, backups, PDF report; restart in the dark theme, several types sharing entry
    names, English quantities, 12 hour format, length limits, entries of a missing type, incomplete types in a
    backup, identical entries of the same minute, quantities hidden by their type
  - versions of the interface: the V2 for new users only, the users of a former version (`app.startAsFormerUser`,
    settings written in the database before the app starts) keep the V1 and get a popup once; what differs in V1
    (see `GlobalService.uiVersion`); when the app starts, only the chosen version is ever drawn (no flash)
  - rating the app: the invitation (previewed from the developer mode) says it is shown once and that a new user
    can wait, its button opens the page of the store on the web (the card of Google Play on Android); the page of
    the store from the about page (Settings > About > Learn more, next to the coffee); the web app never shows the
    invitation by itself; as on Android (platform faked), no invitation after a symptom above 2/5 or 4/10, one at
    2/5 or 4/10
  - data of the former versions: `fixtures/backup-0.3.7.json` is a real backup made by the version 0.3.7 (the one
    published before the V2; September and October 2026, some of its entries typed in its own interface). Imported,
    every day and symptom is found again as it was; a phone with the settings of a 2025 version (five fields) gets
    the V1, the popup and the defaults of then
  - correlations (V2, beta): a small tonal button on the line of the title of the list of symptoms ("Symptômes" in V2), hidden from the settings with the link of
    the statistics of a symptom (none in the manage menu, none in V1), the help
    of the information point (not a cause, not a diagnosis), their icons in the icon font, what is missing without
    symptom or before 14 days; with 60 generated days imported (`support/correlation-data.ts`): the links in sentences
    with their figures, the strength of the signal, the latest days behind a link each opening its day, the filter by
    symptom, the weak leads on demand; the statistics of a symptom open its correlations filtered on it
- `visual/`: main screens in light and dark themes (the correlations too, empty and with generated days), the V1
  screens and the popup of the V2, compared pixel by pixel to
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
