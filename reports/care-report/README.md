# Monthly Website Care Report

The one-page report Fynix Digital sends GKR Hospitality every month: the care work done, how the site performed in Google Search, and the standing monthly checks. The design is fixed; only the month's data changes.

```bash
npm run report:search -- 2026-08   # pull the month's Google Search numbers
npm run report -- 2026-08          # build the PDF
```

This writes two files to `reports/care-report/output/2026-08/`:

- `GKR-Hospitality-Website-Care-Report-August-2026.pdf`, the file you send.
- `GKR-Hospitality-Website-Care-Report-August-2026.html`, the same page as one self-contained file.

`output/` is gitignored. The month's JSON files are the record; the PDF can be rebuilt from them at any time.

Needs Node 23.6 or later (it runs the TypeScript directly) and Google Chrome. Set `CHROME_PATH` to use a different Chrome or Chromium binary.

## Making next month's report

1. Wait until the 3rd of the next month. Search Console data for a day settles about three days later, and the fetch refuses to run before then.
2. Run `npm run report:search -- 2026-09`. It writes `months/2026-09.search.json`. Never edit that file by hand; run the command again instead.
3. Copy the latest month file: `cp months/2026-08.json months/2026-09.json`, and edit the copy. Every field is described below.
4. Run `npm run report -- 2026-09`.
5. If the build stops with a list of problems, fix them and run it again. It will not produce a PDF until everything fits.
6. Open the PDF and read it once before sending.

## Month file fields

| Field | What it is | Limit |
|---|---|---|
| `period` | Reporting month, `YYYY-MM`. Must match the file name. | |
| `issued` | Date the report is issued, `YYYY-MM-DD`. | Not before the reporting month |
| `nextReport` | Date of the next report, `YYYY-MM-DD`. | After `issued` |
| `headline` | The verdict at the top of the page. | 46 characters (2 lines) |
| `headlineEmphasis` | The word in the headline set in copper, usually the status. | Must appear in `headline` |
| `summary` | One or two sentences on what changed this month. | 140 characters, and must fit on 2 lines |
| `figures` | Exactly 4 key numbers. `value` is the number, `unit` is optional (like `%`), `label` is 1 or 2 short lines. | 5 characters per value, 20 per label line |
| `improvementsNote` | The short line under "What we improved in ...". | 110 characters |
| `improvements` | 1 to 4 changes. `area` must be one of the six care areas in `config.json`. | Title 36 (1 line), body 84 characters (2 lines) |
| `heroImage` | Optional. A different masthead photo for this month, like `assets/new-photo.jpg`. | |

## Search numbers

`npm run report:search` asks Google Search Console for the month and saves:

- **Impressions and clicks** for the whole month, with the change against the previous month ("Up 19% on July").
- **Pages with the most clicks**, top 5. www and non-www addresses for the same page are counted together, and paths are shown by the names in `config.json` (`"/services": "Services"`). A page missing from that list shows as its path; add it to `pageNames` when the site gets a new page.
- **Queries that brought clicks**, top 5. Google leaves rare queries out for privacy, so on a quiet month this list can be short or empty; the report says so plainly.

It reads the `sc-domain:gkrhospitality.com` Domain property, which covers www and non-www together.

## Search Console access

Set up once on 29 September 2026. Nothing here needs doing again unless the key is lost.

| What | Where |
|---|---|
| Domain property `gkrhospitality.com` | Search Console, owned by digibranders@gmail.com. Verified by the `google-site-verification` TXT record in Cloudflare DNS: never delete that record. |
| Google Cloud project | `fynix-care-reports` (digibranders@gmail.com), with the Search Console API enabled. |
| Service account | `gkr-care-report@fynix-care-reports.iam.gserviceaccount.com`, added to the Search Console property as a **Restricted** (read-only) user. It has no Google Cloud roles. |
| Key file | `reports/care-report/.secrets/search-console-key.json`. Gitignored, readable only by its owner. Set `GSC_KEY_FILE` to keep it elsewhere. |

To run the fetch on another computer, copy the key file there privately (never by email or chat), or create a new key: Google Cloud > IAM & Admin > Service Accounts > GKR care report > Keys > Add key > JSON. If a key might have leaked, delete it on that same page; the old file stops working at once.

## House rules the build enforces

- **No em-dashes or en-dashes** anywhere in the copy. Use a comma, colon or full stop.
- **Only real numbers.** Figures come from what was measured this month. Leave a figure out rather than estimate it; if a month has fewer than four real numbers, change the figure (for example "Pages under monitoring") rather than invent one.
- **Every improvement belongs to a care area,** so the client can see which part of the plan the work falls under.
- **Search numbers match the month.** The build needs `months/YYYY-MM.search.json` from the fetch, and checks it covers the same month as the report.
- **Everything fits on one page.** Before printing, the build loads the page in Chrome and measures it: headline lines, the gap above the figures panel, overflow at the bottom and right edge, and whether the footer is visible. The page is a fixed size and would otherwise cut off long copy without warning. Long page names and queries are cut short with an ellipsis.

## What stays the same every month

`config.json` holds the client, the agency sign-off, the Search Console property and page names, and the six "Checked every month" care areas. Change it only when the care plan itself changes. The build checks that there are exactly six areas with one to three checks each, to fit the 3 x 2 grid.

## Files

| File | Purpose |
|---|---|
| `template.html` | The design: all CSS and markup, with `{{placeholders}}` for the data. |
| `config.json` | Client, agency, Search Console property and page names, care areas. |
| `months/YYYY-MM.json` | The month's copy and care figures, written by hand. |
| `months/YYYY-MM.search.json` | The month's search numbers, written by `npm run report:search`. |
| `report.ts` | Validation, rendering and layout checks. Pure functions, covered by `report.test.ts`. |
| `search-console.ts` | Search Console dates, sign-in and response handling. Pure functions, covered by `search-console.test.ts`. |
| `fetch-search.ts` | The search command: signs in and calls the Search Console API. |
| `build.ts` | The build command: reads files, runs Chrome, writes the output. |
| `.secrets/` | The service account key. Gitignored. |
| `assets/` | Logos, the masthead photo, the panel shadow and the Figtree font. |

## Design notes for anyone editing the template

- **Palette.** Fynix navy `#0C1E2E` with one accent, copper, taken from the GKR logo. `#8E5B3E` for text on light backgrounds (5.0:1 contrast on stone), `#E9AF88` on navy (8.8:1).
- **Bands carry meaning.** Navy is the verdict, white is this month (the work done, then search results), stone is the standing monthly care.
- **One grid.** The improvements and the search lists share the same two columns, so the page reads down a single grid. "Checked every month" spans the full width because it never changes and gets the least height.
- **No blurred CSS effects.** Chrome turns `box-shadow` blur, `filter: blur()` and `backdrop-filter` into a greyscale image with a transparency mask when printing. macOS Preview, Mail and iOS Files ignore the mask and show a solid grey block. The figures panel shadow is a pre-rendered PNG (`assets/panel-shadow.png`) for this reason. It is sized for the 704 x 112px panel with 4 figures; if the panel changes shape, regenerate the PNG to match.
- **Text over the photo.** The report label, domain and issue date sit on the masthead photo, with a dark corner fade behind them (at least 5.5:1 contrast over the current photo). If you swap in a brighter photo, check that the text still reads clearly (at least 4.5:1).
- **Fonts are local.** Figtree is self-hosted in `assets/` so the build never depends on Google Fonts being reachable. Figtree is licensed under the SIL Open Font License.
