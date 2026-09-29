/**
 * Builds one monthly care report: HTML and a one-page PDF.
 *
 *   npm run report -- 2026-08
 *
 * Reads config.json, months/<period>.json and the search numbers in
 * months/<period>.search.json (from npm run report:search), renders template.html, inlines
 * every asset so the HTML is a single portable file, measures the layout in
 * headless Chrome, then prints the PDF. Fails if any copy overflows its slot
 * or the PDF is not exactly one page.
 *
 * Runs on Node's built-in TypeScript support (Node 23.6+), no extra packages.
 * Set CHROME_PATH to use a specific Chrome or Chromium binary.
 */
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  countPdfPages,
  inlineAssets,
  layoutProblems,
  parseConfig,
  parseLayoutProbe,
  parseMonth,
  parseSearch,
  renderReport,
  reportFileStem,
  withLayoutProbe,
} from "./report.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const MONTHS_DIR = join(ROOT, "months");
const OUTPUT_DIR = join(ROOT, "output");
const PERIOD = /^\d{4}-\d{2}$/;
const CHROME_TIMEOUT_MS = 60_000;

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const CHROME_ON_PATH = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];

class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BuildError(`Could not read ${formatRelative(path)}: ${reason}`);
  }
}

function availablePeriods(): string[] {
  return readdirSync(MONTHS_DIR)
    .filter((file) => file.endsWith(".json") && !file.endsWith(".search.json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
}

function findChrome(): string {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new BuildError(`CHROME_PATH points to ${fromEnv}, which does not exist.`);
    return fromEnv;
  }
  const onPath = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .flatMap((dir) => CHROME_ON_PATH.map((name) => join(dir, name)));
  const found = [...CHROME_CANDIDATES, ...onPath].find((candidate) => existsSync(candidate));
  if (!found) {
    throw new BuildError("Could not find Chrome or Chromium. Install Chrome, or set CHROME_PATH to its binary.");
  }
  return found;
}

/*
 * Chrome notes, for both the layout check and the print:
 *  - No --user-data-dir. Headless Chrome already runs on its own temporary
 *    profile. Passing a fresh one wakes Chrome's updater on macOS, and the
 *    main process then hangs on exit long after the PDF is written.
 *  - No pipes. Helper processes inherit captured pipes, and Node waits for
 *    every pipe to close, so capturing output can stall the build. Output is
 *    either ignored or written straight to a file descriptor.
 * Success is judged by the files Chrome writes, not by its exit output.
 */
function runChrome(chrome: string, args: string[], stdout: "ignore" | number, task: string): void {
  try {
    execFileSync(chrome, ["--headless=new", "--disable-gpu", "--virtual-time-budget=8000", ...args], {
      stdio: ["ignore", stdout, "ignore"],
      timeout: CHROME_TIMEOUT_MS,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BuildError(`Chrome failed to ${task}: ${reason}`);
  }
}

function printToPdf(chrome: string, htmlPath: string, pdfPath: string): void {
  runChrome(chrome, ["--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], "ignore", "print the PDF");
}

/**
 * Loads a copy of the page with the layout probe and has Chrome dump the DOM.
 * The dump goes to a file descriptor rather than a pipe (see note above).
 */
function checkLayout(chrome: string, html: string, outDir: string): void {
  const probePath = join(outDir, ".layout-probe.html");
  const dumpPath = join(outDir, ".layout-probe.dom");
  writeFileSync(probePath, withLayoutProbe(html));
  const fd = openSync(dumpPath, "w");
  try {
    runChrome(chrome, ["--dump-dom", pathToFileURL(probePath).href], fd, "measure the layout");
  } finally {
    closeSync(fd);
  }
  try {
    const problems = layoutProblems(parseLayoutProbe(readFileSync(dumpPath, "utf8")));
    if (problems.length > 0) {
      throw new BuildError(`The copy does not fit the page:\n  - ${problems.join("\n  - ")}`);
    }
  } finally {
    rmSync(probePath, { force: true });
    rmSync(dumpPath, { force: true });
  }
}

function build(period: string): void {
  if (!PERIOD.test(period)) {
    throw new BuildError(`Pass the month as YYYY-MM, for example: npm run report -- 2026-08 (got "${period}")`);
  }
  const monthPath = join(MONTHS_DIR, `${period}.json`);
  if (!existsSync(monthPath)) {
    const known = availablePeriods();
    throw new BuildError(
      `No data for ${period}. Create reports/care-report/months/${period}.json` +
        (known.length > 0 ? ` (copy months/${known[known.length - 1]}.json as a starting point).` : "."),
    );
  }

  const config = parseConfig(readJson(join(ROOT, "config.json")));
  const month = parseMonth(readJson(monthPath), config, `months/${period}.json`);
  if (month.period !== period) {
    throw new BuildError(`months/${period}.json says "period": "${month.period}"; the file name and period must match.`);
  }

  const searchPath = join(MONTHS_DIR, `${period}.search.json`);
  if (!existsSync(searchPath)) {
    throw new BuildError(`No search data for ${period}. Run: npm run report:search -- ${period}`);
  }
  const search = parseSearch(readJson(searchPath), period, `months/${period}.search.json`);

  const template = readFileSync(join(ROOT, "template.html"), "utf8");
  const html = inlineAssets(renderReport(template, config, month, search), (assetPath) => {
    const file = join(ROOT, assetPath);
    if (!existsSync(file)) throw new BuildError(`Missing asset: reports/care-report/${assetPath}`);
    return readFileSync(file).toString("base64");
  });

  const outDir = join(OUTPUT_DIR, period);
  mkdirSync(outDir, { recursive: true });
  const stem = reportFileStem(config, month);
  const htmlPath = join(outDir, `${stem}.html`);
  const pdfPath = join(outDir, `${stem}.pdf`);
  rmSync(pdfPath, { force: true }); // never leave an old PDF beside a failed build

  const chrome = findChrome();
  checkLayout(chrome, html, outDir);
  writeFileSync(htmlPath, html);
  printToPdf(chrome, htmlPath, pdfPath);

  if (!existsSync(pdfPath)) throw new BuildError("Chrome exited without writing a PDF.");
  const pages = countPdfPages(readFileSync(pdfPath).toString("latin1"));
  if (pages !== 1) {
    throw new BuildError(`The PDF is ${pages} pages; it must be 1. Check template.html for changes to the page size.`);
  }

  console.log(`Built ${formatRelative(pdfPath)}`);
  console.log(`      ${formatRelative(htmlPath)}`);
}

function formatRelative(path: string): string {
  return relative(process.cwd(), path);
}

try {
  build(process.argv[2] ?? "");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
