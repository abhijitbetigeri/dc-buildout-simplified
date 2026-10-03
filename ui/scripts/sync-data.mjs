// Mirror the DATA track's artefacts into ui/public so the browser can fetch them.
// Re-run any time data/ changes:  node scripts/sync-data.mjs
import { cp, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const UI = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(UI, "..");

const exists = async (p) => !!(await stat(p).catch(() => null));

// 1. the event log
const src = path.join(REPO, "data", "mock-events.json");
if (await exists(src)) {
  const raw = JSON.parse(await readFile(src, "utf8"));
  const events = Array.isArray(raw) ? raw : (raw.events ?? []);
  await writeFile(
    path.join(UI, "public", "events.json"),
    JSON.stringify(Array.isArray(raw) ? { events } : raw, null, 1)
  );
  console.log(`events.json ← data/mock-events.json (${events.length} events)`);
} else {
  console.log("no data/mock-events.json yet — UI stays on events.stub.json");
}

// 2. marking images referenced by counterfeit.flagged / moss.matches,
//    mirrored at the same relative path so the payload strings resolve as-is.
for (const rel of ["data/markings/img", "data/markings"]) {
  const from = path.join(REPO, rel);
  if (!(await exists(from))) continue;
  const to = path.join(UI, "public", rel);
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  console.log(`public/${rel} ← ${rel}`);
  break;
}
