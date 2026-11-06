# Google Play screenshots

`npm run screenshots:store` builds the app, then takes the screenshots of the Google Play listing in
`play-store/fr` and `play-store/en` (about a minute per language). They are not tests: they never run with `npm test`.

- `01-…08-*.png`: the 8 screenshots of the listing (8 at most on Google Play), in their order (`SELECTION` in
  `store-screenshots.spec.ts`)
- `selection-light/`: the same 8 screenshots, in the light theme only
- `extras/`: every screen, in the light and dark themes, to choose other ones

Each image is 1080 x 1920 (9:16, the format recommended by Google Play): a 360 x 640 dp phone at 3x.

The data come from `store-data.ts`: ten months of a realistic use (January 1st to October 28, 2026, the "today" of
the screenshots), imported as a backup. They are generated with a fixed seed: the same screenshots on every run.

`08-pdf-report.png` shows the first two pages of the PDF report that the app really exports (September 2026),
with a PDF icon, on a transparent background (the background of the listing is laid under it afterwards: Google
Play itself refuses transparent images). `extras/light-monthly-report.png` is the report as the app shows it.

Options: `STORE_LANGS=fr` (one language only), `STORE_OUT=<folder>` (another output folder), `STORE_PDF_ONLY=1`
(only the PDF report, the other screenshots are kept). The PDF itself is saved in `tests/results`.
