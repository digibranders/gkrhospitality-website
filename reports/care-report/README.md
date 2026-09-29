# Monthly Website Care Report

The one-page report Fynix Digital sends GKR Hospitality every month: the care work done, visitors and Google Search performance, and the standing monthly checks. The design is fixed; only the month's data changes.

```bash
npm run report:analytics -- 2026-08   # pull the month's GA4 visitor numbers
npm run report:search -- 2026-08      # pull the month's Google Search numbers
npm run report -- 2026-08             # build the PDF
```

This writes two files to `reports/care-report/output/2026-08/`:

- `GKR-Hospitality-Website-Care-Report-August-2026.pdf`, the file you send.
- `GKR-Hospitality-Website-Care-Report-August-2026.html`, the same page as one self-contained file.

`output/` is gitignored. The month's JSON files are the record; the PDF can be rebuilt from them at any time.

Needs Node 23.6 or later (it runs the TypeScript directly) and Google Chrome. Set `CHROME_PATH` to use a different Chrome or Chromium binary.

## Making next month's report

1. Wait until the 3rd of the next month. Search Console data settles about three days after each day (GA4 about two), and both fetches refuse an unfinished month.
2. Run `npm run report:analytics -- 2026-09` and `npm run report:search -- 2026-09`. They write `months/2026-09.analytics.json` and `months/2026-09.search.json`. Never edit those files by hand; run the commands again instead.
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

It reads the `https://www.gkrhospitality.com/` property. Every other address (non-www, the old gkrhospitalityconsulting.com domains) redirects to www, so this is where all search traffic is recorded. The `sc-domain:gkrhospitality.com` Domain property also exists but was only added on 29 September 2026 and had not loaded its history yet; the www property had.

Search Console only returns days it has finalised, about three days behind. To report on a month that is still running, add `--partial`: the report then shows the last finalised day it covers. If Search Console has no data yet (a brand new property), `--indexing-only` records indexing and marks the search numbers as pending.

## Visitor numbers

`npm run report:analytics` asks Google Analytics 4 for the month and the month before:

- **Visitors**: GA4 "Active users", the Users figure on GA4's home screen.
- **Search visits**: sessions in GA4's Organic Search channel (Google, Bing and other search engines).

Each shows the change against the previous month. When GA4 has no earlier data (September 2026 was the first month tracked), Visitors says when tracking began and Search visits shows its share of all visits instead.

To report on a month that is still running, add `--partial`: it covers the 1st to yesterday, and the report shows those exact dates. Run it again without the flag after the month ends to replace it with the full month.

**Enquiries are not reported yet.** As of 29 September 2026 the GA4 `generate_lead` event fires on every page view (a Tag Manager tag triggered on All Pages), so it counts visits, not contact form submissions. Once that is fixed, enquiries can be added.

## Google access

Set up once on 29 September 2026. Nothing here needs doing again unless the key is lost.

| What | Where |
|---|---|
| Search Console properties | `https://www.gkrhospitality.com/` (the one the report reads) and the Domain property `gkrhospitality.com`, both owned by digibranders@gmail.com. Verified by the `google-site-verification` TXT record in Cloudflare DNS: never delete that record. |
| GA4 property `552679084` | gkrhospitality.com, in the "OyeChats" GA4 account. Loaded by Tag Manager container GTM-TG8GB3PP. |
| Google Cloud project | `fynix-care-reports` (digibranders@gmail.com), with the Search Console API and Google Analytics Data API enabled. |
| Service account | `gkr-care-report@fynix-care-reports.iam.gserviceaccount.com`: a **Restricted** user on both Search Console properties and a **Viewer** in GA4, all read-only. It has no Google Cloud roles, and it only ever asks Google for read-only access. |
| Key file | `reports/care-report/.secrets/service-account.json`. Gitignored, readable only by its owner. Set `GOOGLE_KEY_FILE` to keep it elsewhere. |

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
| `months/YYYY-MM.analytics.json` | The month's GA4 numbers, written by `npm run report:analytics`. |
| `report.ts` | Validation, rendering and layout checks. Pure functions, covered by `report.test.ts`. |
| `search-console.ts` | Search Console and URL Inspection response handling. Pure, covered by `search-console.test.ts`. |
| `analytics.ts` | GA4 Data API response handling. Pure, covered by `analytics.test.ts`. |
| `periods.ts` | Reporting months and date ranges. Pure, covered by `periods.test.ts`. |
| `google-auth.ts` | Service account sign-in (read-only scopes). Pure, covered by `google-auth.test.ts`. |
| `google-client.ts` | Reads the key and exchanges it for an access token. |
| `fetch-search.ts` | The search command: calls the Search Console API. |
| `fetch-analytics.ts` | The visitors command: calls the GA4 Data API. |
| `build.ts` | The build command: reads files, runs Chrome, writes the output. |
| `.secrets/` | The service account key. Gitignored. |
| `assets/` | Logos, the masthead photo, the panel shadow and the Figtree font. |

## Design notes for anyone editing the template

- **Palette.** Fynix navy `#0C1E2E` with one accent, copper, taken from the GKR logo. `#8E5B3E` for text on light backgrounds (5.0:1 contrast on stone), `#E9AF88` on navy (8.8:1).
- **Bands carry meaning.** Navy is the verdict, white is this month (the work done, then search results), stone is the standing monthly care.
- **One grid.** The improvements and the search lists share the same two columns, so the page reads down a single grid. The four visitor and search numbers split those columns in half. Numbers from 100,000 up use the short form ("128.5K") so they always fit. "Checked every month" spans the full width because it never changes and gets the least height.
- **No blurred CSS effects.** Chrome turns `box-shadow` blur, `filter: blur()` and `backdrop-filter` into a greyscale image with a transparency mask when printing. macOS Preview, Mail and iOS Files ignore the mask and show a solid grey block. The figures panel shadow is a pre-rendered PNG (`assets/panel-shadow.png`) for this reason. It is sized for the 704 x 112px panel with 4 figures; if the panel changes shape, regenerate the PNG to match.
- **Text over the photo.** The report label, domain and issue date sit on the masthead photo, with a dark corner fade behind them (at least 5.5:1 contrast over the current photo). If you swap in a brighter photo, check that the text still reads clearly (at least 4.5:1).
- **Fonts are local.** Figtree is self-hosted in `assets/` so the build never depends on Google Fonts being reachable. Figtree is licensed under the SIL Open Font License.
