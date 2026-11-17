# Backup compatibility tests (V1 ↔ V2)

Non-regression of the backups between the published version (**V1**, 0.3.7, commit `17071de` of `master`) and the current one
(**V2**, the working tree): what a user saves in one version must come back, unchanged, in the other one.

The two real apps are built and run side by side in Chrome, and driven as a user drives them: the backup file is
chosen in Settings > Import / Export, the import confirmed, the backup saved with "Save" and read from the download.
The databases (IndexedDB) are also read directly, document by document.

## Running them

| Command | What it does |
| --- | --- |
| `npm run test:compat` | Builds the V1 (once per commit) and the V2, then runs every compatibility test |
| `npm run test:compat:prod` | Same with the production builds (`ng build --prod`), closer to the published app |
| `npm run test:compat:report` | Opens the HTML report of the last run (every export of the V1 and the V2 is attached) |

- `COMPAT_V1_REF`: git ref of the V1 (default: `17071de`, the published 0.3.7; not `master`, which becomes the V2 once
  merged).
- `COMPAT_DIR`: where the sources and builds go (default: `<temp>/life-notes-compat`).
- The V1 is extracted with `git archive`: the repository, its branches and its working tree are never touched.
- Its dependencies are the current `node_modules` (same versions in both lock files, the V2 only adds some).

`serve.mjs` serves both builds on a **single origin**, the `ln_build` cookie choosing the version: as on a phone,
the database is kept when the app is replaced by the other version (update from the store, or rollback).

## What is tested

Every comparison is strict: values **and types** (`"400"` is not `400`), absent is not `null`, order of the entries
of a day and of the days of the file. Any JavaScript error of the page fails the test (see "Known errors").

| File | Scenarios |
| --- | --- |
| `v1-backups.spec.ts` | Each backup of the V1 world imported into the V1 and into the V2 (side by side), then saved: same days, symptoms, settings, file name, same documents in the databases; the V2 opened again changes nothing; the V2 backup goes back into the V1 unchanged |
| `v2-backups.spec.ts` | A V2 backup (sports, custom types and entries, inverted scales, appearance) into the V2: everything back. Into the V1: every day kept, then back into a new V2 phone, and into the V2 phone it comes from (types and settings kept). Data typed in the V2 interface (every kind of entry) through V1 and back |
| `upgrade.spec.ts` | App updated in place: a V1 user (1063 days, all its settings) gets the V2: not a single day or symptom document rewritten (same revisions), settings kept, V1 interface kept. Rollback V2 → V1 → V2. A user of a 2025 version (five settings) going through V1 then V2 |
| `validation.spec.ts` | 27 files (valid, indented, BOM, CRLF, accents in the name, empty, truncated, wrong structure...): the V2 accepts and refuses the same files as the V1, with the same messages |
| `import-semantics.spec.ts` | Import into a phone with data (days replaced, symptoms added), V2 phone with custom types, cancelled and refused imports change nothing, manual save (advanced settings) = saved file, forced import |
| `newer-data.spec.ts` | Data of a newer version edited by an older one (app rolled back, backup restored on a phone not updated): removing the last symptom of a day keeps its other entries. V2 data in the V1, data of a later version in the V2 |
| `display.spec.ts` | After the import, the page of **each day** shows every entry (name, detail, dose) in the V2 interface and in the V1 one kept by the former users; every month of the calendar, every Year in Pixels, the monthly report, without error; browsing never changes the data |

The tests were checked against faults injected on purpose in copies of the V2 build (`COMPAT_BUILDS` points to
another builds file): doses turned into numbers at the import, empty details dropped at the export, days rewritten
at the start of the app, one symptom entry lost per day, target symptom not restored. Each one fails several tests,
with the exact difference (e.g. `days[2026-08-04].meds[0].quantity: "1000" -> 1000`).

The backups (`support/corpus.ts`):

| Backup | Content |
| --- | --- |
| `fixtures/life-notes-save-v1-ref.json` | Made by the published app: 1063 days (2023-12 to 2026-11), 7 symptoms, English |
| `../fixtures/backup-0.3.7.json` | Made by the 0.3.7, entries typed in its interface, French |
| `edge-cases-v1.json` | Every kind of entry, doses as strings and numbers (`"1000"`, `400`, `"1,5"`, `""`, `0`, none), intensities as strings, unicode, emoji, HTML, quotes, new lines, 5,000-character texts, leap day, changes of time, year 2019 and 2027, deleted symptom, empty day, unknown fields |
| `old-settings-2025.json` | Settings of a 2025 version (five fields) |
| `stress-6-years.json` | 2190 days, about 17,000 entries |
| `rich-v2.json` | V2 format: sports, 3 custom types and their entries, inverted scale, every new setting |
| `newer-data.json` | Days whose only entry known by the V1 is a symptom, besides sports, custom entries, a field of a later version |

## Known differences (expected)

- The V2 backup has a `customTypes` list (empty without custom types), and the new settings.
- `lastWeeklyReminder` of a new phone: 0 in V1 (its first reminder date is lost in a concurrent write), the
  installation date in V2. It isn't in the import (neither version restores it).
- The V2 refuses a backup whose `customTypes` is not a list of complete types (the V1 ignores the field).
- `lastInstall`: the version of the app that wrote the settings. An app with a version above the stored one shows
  what's new and stores its own one; a lower one leaves it (a rollback). Checked apart from the other settings, the
  versions of the builds being those of their `CURRENT_VERSION`.

## Known limits (not regressions)

- **Custom types through the published V1**: the V1 keeps the custom entries and the sports in the days (it stores
  whole documents), but not the definitions of the types, nor the settings of the V2. A V2 backup imported into a V1
  then saved again comes back into the V2 phone with everything (the V2 keeps the types of the phone used by the
  entries of a backup without types, and its own settings). Into a new phone, its entries come back, shown with a
  neutral name and color. A V1 published again for a rollback (`v1-rollback.patch`) keeps them.
- An import restores the days, the symptoms, the language and the target symptom (V2: also the theme, the
  interface version, the sleep chart, the landscape mode and the event colors). The other settings (pain scale, time
  format, palette...) stay those of the phone, as in V1.
- The symptoms are added to those of the phone: a symptom already on the phone keeps its name, as in V1.
- **Fault of the published V1** (`newer-data.spec.ts`, expected to fail with it): removing the last symptom, note,
  med or meal of a day without wake-up nor bedtime removes the whole day, with its sports and custom entries of the
  V2 (`isDayEmpty` only knows the fields of the V1). It concerns V2 data in a V1 only: a V2 backup restored on a
  phone not updated, or an app rolled back to the V1 (see below). The V2 never removes a day holding fields it doesn't
  know, for the next versions.
- Not testable in a browser: the reading/writing of the files by Android (Capacitor `Filesystem`, `FileSaver`,
  `Share`). Their native code is the same in V1 and V2 (only the screen orientation plugin was added), and the
  content written is the one tested here.

## Rolling back to the V1

Never publish the 0.3.7 again as is: on the phones of the V2 users, it would remove sports and custom entries (see
above). Publish it with `v1-rollback.patch`, with a `versionCode` above the V2 one. The patch changes nothing for the
users who never had the V2; for the others:
- `isDayEmpty` keeps the days holding fields it doesn't know (sports, custom entries);
- the backups keep the custom types (`customTypes`, only when the phone has some) and the settings of the V2, as the
  V2 does.

In a worktree, this repository staying on the V2 (the compared one):

```
git worktree add -b v1-rollback ../life-notes-v1-rollback 17071de
cd ../life-notes-v1-rollback
git apply ../life-notes/tests/compat/v1-rollback.patch
# versionCode / versionName (android/app/build.gradle), CURRENT_VERSION (src/app/infra/settings.service.ts), commit
cd ../life-notes
COMPAT_V1_REF=v1-rollback npm run test:compat     # PowerShell: $env:COMPAT_V1_REF='v1-rollback'; npm run test:compat
```

Every test must pass, the V1 ones of `newer-data.spec.ts` included (they are only expected to fail with the 0.3.7),
and `v2-backups.spec.ts` then checks that the custom types and the settings go through this V1.

## Known errors

Errors of the published version, reported as annotations in the report, that don't fail the tests:

- V1 only: `CustomPouchError` 409 on the settings document at the first launch (fixed by the write queue of the V2).
- V1 and V2, development build only: `NG0100 ExpressionChangedAfterItHasBeenCheckedError` of the language select
  of the settings when an import changes the language.
