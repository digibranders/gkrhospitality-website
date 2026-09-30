# Monthly Website Care Report

The two-page report Fynix Digital sends GKR Hospitality every month. The design is fixed; only the month's data changes.

- **Page 1, the summary.** The verdict, four key figures, the care work done, visitors and search at a glance with a visits-per-day chart, and a "Needs your attention" box when something needs the client.
- **Page 2, the detail.** Search in detail (daily charts, what people searched, pages Google showed), visitors in detail (where visits came from, landing pages, devices and country), site health tiles, next month's plan, and the standing monthly checks.

```bash
npm run report:analytics -- 2026-08   # pull the month's GA4 visitor numbers
npm run report:search -- 2026-08      # pull the month's Google Search numbers
npm run report:health -- 2026-08      # check the live site, domain and code
npm run report -- 2026-08             # build the PDF
```

This writes two files to `reports/care-report/output/2026-08/`:

- `GKR-Hospitality-Website-Care-Report-August-2026.pdf`, the file you send.
- `GKR-Hospitality-Website-Care-Report-August-2026.html`, the same two pages as one self-contained file.

`output/` is gitignored. The month's JSON files are the record; the PDF can be rebuilt from them at any time.

Needs Node 23.6 or later (it runs the TypeScript directly) and Google Chrome. Set `CHROME_PATH` to use a different Chrome or Chromium binary.

## Making next month's report

1. Wait until the 3rd of the next month. Search Console data settles about three days after each day (GA4 about two), and both fetches refuse an unfinished month.
2. Run `npm run report:analytics -- 2026-09`, `npm run report:search -- 2026-09` and `npm run report:health -- 2026-09`. They write `months/2026-09.analytics.json`, `months/2026-09.search.json` and `months/2026-09.health.json`. Never edit those files by hand; run the commands again instead.
3. Copy the latest month file: `cp months/2026-09.json months/2026-10.json`, and edit the copy. Every field is described below. Take the deployment count and runtime errors from the Vercel dashboard.
4. Run `npm run report -- 2026-09`.
5. If the build stops with a list of problems, fix them and run it again. It will not produce a PDF until everything fits.
6. Open the PDF and read it once before sending.

## Month file fields

| Field | What it is | Limit |
|---|---|---|
| `period` | Reporting month, `YYYY-MM`. Must match the file name. | |
| `issued` | Date the report is issued, `YYYY-MM-DD`. | Not before the reporting month |
| `nextReport` | Date of the next report, `YYYY-MM-DD`. Kept as a record; not printed. | After `issued` |
| `headline` | The verdict at the top of the page. | 46 characters (2 lines) |
| `headlineEmphasis` | The word in the headline set in copper, usually the status. | Must appear in `headline` |
| `summary` | One or two sentences on what changed this month. | 140 characters, and must fit on 2 lines |
| `figures` | Exactly 4 key numbers. `value` is the number, `unit` is optional (like `%`), `label` is 1 or 2 short lines. | 5 characters per value, 20 per label line |
| `improvementsNote` | The short line under "What we improved in ...". | 110 characters |
| `improvements` | 1 to 4 changes. `area` must be one of the six care areas in `config.json`. | Title 36 (1 line), body 80 characters (2 lines) |
| `operations` | From Vercel: `deployments` (`succeeded`, `total`) this month, and `runtimeErrors` (`count` over the last `days`). Shown as site health tiles on page 2. | |
| `attention` | 0 to 3 extra items for "Needs your attention", each a `title` and `detail`. The health check adds its own (see below), so this is usually `[]`. | Title 60, detail 140 characters |
| `nextMonth` | 1 to 5 planned items for next month, shown as "Coming in ...". Confirm them with the client before sending. | 72 characters (1 line) each |
| `heroImage` | Optional. A different masthead photo for this month, like `assets/new-photo.jpg`. | |

## Search numbers

`npm run report:search` asks Google Search Console for the month and saves:

- **Impressions and clicks** for the whole month, with the change against the previous month ("Up 19% on July").
- **Click rate and average position** for the month, and times shown on desktop and mobile.
- **What people searched**, top 5 by times shown, with clicks and average position. Google leaves rare searches out for privacy, so the report says how many of the month's clicks the listed searches cover. Long searches are shortened in the middle ("hospitalit…new york") so similar ones stay distinguishable.
- **Pages Google showed**, top 5. www and non-www addresses for the same page are counted together, and paths are shown by the names in `config.json` (`"/services": "Services"`). A page missing from that list shows as its path; add it to `pageNames` when the site gets a new page.

It reads the `https://www.gkrhospitality.com/` property. Every other address (non-www, the old gkrhospitalityconsulting.com domains) redirects to www, so this is where all search traffic is recorded. The `sc-domain:gkrhospitality.com` Domain property also exists but was only added on 29 September 2026 and had not loaded its history yet; the www property had.

Search Console only returns days it has finalised, about three days behind. To report on a month that is still running, add `--partial`: the report then shows the last finalised day it covers. If Search Console has no data yet (a brand new property), `--indexing-only` records indexing and marks the search numbers as pending.

## Visitor numbers

`npm run report:analytics` asks Google Analytics 4 for the month and the month before:

- **Visitors**: GA4 "Active users", the Users figure on GA4's home screen.
- **Search visits**: sessions in GA4's Organic Search channel (Google, Bing and other search engines).
- **Visits per day**, page views, engaged visits (GA4 engagement rate) and average visit length.
- **Where visits came from**, in plain names (Direct, Search engines, Other websites, Social media), and the **pages visitors arrived on**.
- **Devices and top country**, written as one sentence under the lists.

Each shows the change against the previous month. When GA4 has no earlier data (September 2026 was the first month tracked), Visitors says when tracking began and Search visits shows its share of all visits instead.

To report on a month that is still running, add `--partial`: it covers the 1st to yesterday, and the report shows those exact dates. Run it again without the flag after the month ends to replace it with the full month.

**Enquiries are not reported yet.** As of 29 September 2026 the GA4 `generate_lead` event fires on every page view (a Tag Manager tag triggered on All Pages), so it counts visits, not contact form submissions. Once that is fixed, enquiries can be added.

## Site health

`npm run report:health` checks the live site and the repository, and needs no Google access:

- **Security certificate**: the HTTPS certificate's expiry date and issuer.
- **Domain renewal**: the registration expiry and registrar, from the public registry record (RDAP, found through IANA's list of registries).
- **Pages responding**: every page in the sitemap, loaded one at a time.
- **Security headers**: which of six expected headers the homepage sends.
- **Security alerts in code**: `pnpm audit` counts, and the Next.js and React versions in `package.json`. These describe the repository, which can be ahead of what is deployed.

The health check raises items in "Needs your attention" by itself: a domain renewing within 90 days, a certificate expiring within 14 days, any page not loading, and any critical or high security alert. Its warning tiles are marked with a copper rule.

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
- **Data matches the month.** The build needs the month's `.search.json`, `.analytics.json` and `.health.json`, and checks the first two cover the same month as the report.
- **Everything fits on two pages.** Before printing, the build loads the pages in Chrome and measures each one: headline lines, the gap above the figures panel, overflow at the bottom and right edge, and whether each footer is visible. It names the page that overflows. After printing it checks the PDF has exactly two pages.

## What stays the same every month

`config.json` holds the client, the agency sign-off, the Search Console property and page names, and the six "Checked every month" care areas. Change it only when the care plan itself changes. The build checks that there are exactly six areas with one to three checks each, to fit two columns of three.

## Files

| File | Purpose |
|---|---|
| `template.html` | The design: all CSS and markup, with `{{placeholders}}` for the data. |
| `config.json` | Client, agency, Search Console property and page names, care areas. |
| `months/YYYY-MM.json` | The month's copy and care figures, written by hand. |
| `months/YYYY-MM.search.json` | The month's search numbers, written by `npm run report:search`. |
| `months/YYYY-MM.analytics.json` | The month's GA4 numbers, written by `npm run report:analytics`. |
| `months/YYYY-MM.health.json` | The live site and code readings, written by `npm run report:health`. |
| `report.ts` | Validation, rendering and layout checks. Pure functions, covered by `report.test.ts`. |
| `search-console.ts` | Search Console and URL Inspection response handling. Pure, covered by `search-console.test.ts`. |
| `analytics.ts` | GA4 Data API response handling. Pure, covered by `analytics.test.ts`. |
| `health.ts` | Health readings and the attention rules. Pure, covered by `health.test.ts`. |
| `charts.ts` | The daily column charts (SVG) and bar lists (HTML). Pure, covered by `charts.test.ts`. |
| `periods.ts` | Reporting months and date ranges. Pure, covered by `periods.test.ts`. |
| `google-auth.ts` | Service account sign-in (read-only scopes). Pure, covered by `google-auth.test.ts`. |
| `google-client.ts` | Reads the key and exchanges it for an access token. |
| `fetch-search.ts` | The search command: calls the Search Console API. |
| `fetch-analytics.ts` | The visitors command: calls the GA4 Data API. |
| `fetch-health.ts` | The health command: certificate, registry record, pages, headers, `pnpm audit`. |
| `build.ts` | The build command: reads files, runs Chrome, writes the output. |
| `.secrets/` | The service account key. Gitignored. |
| `assets/` | Logos, the masthead photo, the panel shadow and the Figtree font. |

## Design notes for anyone editing the template

- **Palette.** Fynix navy `#0C1E2E` with one accent, copper, taken from the GKR logo. `#8E5B3E` for text on light backgrounds (5.0:1 contrast on stone), `#E9AF88` on navy (8.8:1).
- **Bands carry meaning.** Navy is the verdict (page 1) and the header band (page 2), white is this month, stone is what comes next and the standing monthly care.
- **One grid.** Every section has a title column on the left and two content columns on the right, on both pages, so the eye reads down a single grid. Numbers from 100,000 up use the short form ("128.5K") so they always fit.
- **Charts.** One series each, in chart copper `#B07A55` (3:1 on white). Bars are at most 24px thick with a rounded top and a 2px gap; only the peak day is labelled. Text is never set in the chart colour. There are no two-axis charts: times shown and clicks are two separate charts.
- **Type scale.** Figtree throughout. Nothing prints below 11px, and the lowest text contrast is 5.7:1. Section titles (19px), improvement titles (14px) and the masthead summary (14px) are sized to fit their lines; the layout probe fails the build if the summary runs into the figures. Numbers carry more weight than their labels: key figures and glance stats 500, and 600 for health tiles, bar values, the facts beside each section and the clicks column in the tables. Labels and notes are 400 in muted grey.
- **No blurred CSS effects.** Chrome turns `box-shadow` blur, `filter: blur()` and `backdrop-filter` into a greyscale image with a transparency mask when printing. macOS Preview, Mail and iOS Files ignore the mask and show a solid grey block. The figures panel shadow is a pre-rendered PNG (`assets/panel-shadow.png`) for this reason. It is sized for the 704 x 112px panel with 4 figures; if the panel changes shape, regenerate the PNG to match.
- **Text over the photo.** The report label, domain and issue date sit on the masthead photo, with a dark corner fade behind them (at least 5.5:1 contrast over the current photo). If you swap in a brighter photo, check that the text still reads clearly (at least 4.5:1).
- **Fonts are local.** Figtree is self-hosted in `assets/` so the build never depends on Google Fonts being reachable. Figtree is licensed under the SIL Open Font License.
