/**
 * Stage rehearsal in a real browser.
 *
 * Drives the actual page with a real Chrome: checks the run plays, the keyboard
 * works, the approval gate halts and is clickable with a MOUSE, the three money
 * shots compose, and that nothing is logging errors onto the projector.
 *
 *   node scripts/verify.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3137";
const CHROME =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SHOTS = path.resolve(import.meta.dirname, "..", "shots");

const results = [];
const ok = (n, d = "") => results.push({ pass: true, n, d });
const bad = (n, d = "") => results.push({ pass: false, n, d });

const text = (page) => page.evaluate(() => document.body.innerText);
const has = async (page, s) => (await text(page)).toLowerCase().includes(s.toLowerCase());

async function waitForText(page, s, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await has(page, s)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

const run = async () => {
  await mkdir(SHOTS, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "shell",
    args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const consoleIssues = [];
  const newPage = async (url) => {
    const page = await browser.newPage();
    // defaultViewport does not reliably apply in headless shell, which leaves the
    // CSS viewport taller than the captured image and silently crops the shot.
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        consoleIssues.push(`[${m.type()}] ${m.text()}`);
      }
    });
    page.on("pageerror", (e) => consoleIssues.push(`[pageerror] ${e.message}`));
    page.on("requestfailed", (r) =>
      consoleIssues.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText ?? ""}`)
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    return page;
  };

  // ———————————————— 1. the run plays end to end ————————————————
  {
    const page = await newPage(`${BASE}/?speed=10`);
    await waitForText(page, "the room");

    const played = await waitForText(page, "allocation alert", 10000);
    played ? ok("auto-plays from alert.raised") : bad("auto-plays from alert.raised");

    // the block
    (await waitForText(page, "blocked", 30000))
      ? ok("reaches block.raised")
      : bad("reaches block.raised");

    // the counterfeit catch
    (await waitForText(page, "counterfeit detected", 30000))
      ? ok("reaches counterfeit.flagged")
      : bad("reaches counterfeit.flagged");

    // the gate must HALT the run
    const gated = await waitForText(page, "human authorisation required", 30000);
    gated ? ok("approval gate reached") : bad("approval gate reached");

    await new Promise((r) => setTimeout(r, 2500));
    const stillHalted =
      (await has(page, "human authorisation required")) && !(await has(page, "exposure protected"));
    stillHalted
      ? ok("gate HALTS the run (did not auto-advance)")
      : bad("gate HALTS the run (did not auto-advance)");

    // ——— click Approve with a real mouse ———
    const approve = await page.evaluateHandle(() => {
      const bs = Array.from(document.querySelectorAll("button"));
      return bs.find((b) => b.innerText.trim().toLowerCase().startsWith("approve")) ?? null;
    });
    const el = approve.asElement();
    if (el) {
      const box = await el.boundingBox();
      if (box && box.width > 200 && box.height > 40) {
        ok(`Approve button is a real mouse target (${Math.round(box.width)}×${Math.round(box.height)}px)`);
      } else {
        bad("Approve button hit area", JSON.stringify(box));
      }
      await el.click(); // genuine mouse click, not a keypress
      ok("Approve clicked with mouse");
    } else {
      bad("Approve button not found");
    }

    (await waitForText(page, "purchase order", 15000))
      ? ok("click flows into po.drafted")
      : bad("click flows into po.drafted");

    (await waitForText(page, "exposure protected", 25000))
      ? ok("reaches run.ended outcome hero")
      : bad("reaches run.ended outcome hero");

    (await has(page, "$2,487,600"))
      ? ok("outcome hero shows $2,487,600")
      : bad("outcome hero shows $2,487,600");

    await page.close();
  }

  // ———————————————— 2. keyboard ————————————————
  {
    const page = await newPage(`${BASE}/?speed=6`);
    await waitForText(page, "the room");
    await new Promise((r) => setTimeout(r, 1200));

    await page.keyboard.press("Space");
    await new Promise((r) => setTimeout(r, 400));
    (await has(page, "paused")) ? ok("Space pauses") : bad("Space pauses");

    await page.keyboard.press("Space");
    await new Promise((r) => setTimeout(r, 400));
    !(await has(page, "paused")) ? ok("Space resumes") : bad("Space resumes");

    // Read the stage indicator out of the header: "<n> / <total>".
    const beatOf = () =>
      page.evaluate(() => {
        const head = Array.from(document.querySelectorAll("header")).find((h) =>
          /linedown/i.test(h.innerText)
        );
        const m = head?.innerText.match(/(\d+)\s*\/\s*(\d+)/);
        return m ? Number(m[1]) : -1;
      });

    const before = await beatOf();
    await page.keyboard.press("ArrowRight");
    await new Promise((r) => setTimeout(r, 600));
    await page.keyboard.press("ArrowRight");
    await new Promise((r) => setTimeout(r, 600));
    const after = await beatOf();
    after > before
      ? ok(`→ skips beats (${before} → ${after})`)
      : bad(`→ skips beats (${before} → ${after})`);

    await page.keyboard.press("KeyR");
    await new Promise((r) => setTimeout(r, 700));
    const restarted = await beatOf();
    restarted <= 1
      ? ok(`R restarts (beat ${restarted})`)
      : bad(`R restarts (beat ${restarted})`);

    await page.close();
  }

  // ———————————————— 3. the three money shots ————————————————
  const shots = [
    { file: "1-counterfeit.png", url: `${BASE}/?at=92000&paused=1`, needs: "counterfeit detected" },
    { file: "2-block.png", url: `${BASE}/?at=61000&paused=1`, needs: "blocked" },
    { file: "3-approval.png", url: `${BASE}/?at=109000&paused=1`, needs: "human authorisation required" },
    { file: "4-outcome.png", url: `${BASE}/?at=145000&paused=1&gate=open`, needs: "exposure protected" },
  ];

  for (const s of shots) {
    const page = await newPage(s.url);
    const found = await waitForText(page, s.needs, 15000);
    found ? ok(`shot composes: ${s.file}`) : bad(`shot composes: ${s.file}`, `missing "${s.needs}"`);
    // let fonts and images settle, then make sure the newest beat is framed
    await new Promise((r) => setTimeout(r, 1800));
    // The app's own smooth-scroll can still be animating toward a stale target,
    // so pin to the bottom repeatedly until it settles.
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => {
        const sc = document.querySelector("[data-feed-scroll]");
        if (sc) sc.scrollTop = sc.scrollHeight;
      });
      await new Promise((r) => setTimeout(r, 180));
    }
    const framed = await page.evaluate(() => {
      // Only ever scroll the feed itself — scrolling any ancestor drags the
      // header off screen, which is exactly the bug this check exists to catch.
      const sc = document.querySelector("[data-feed-scroll]");
      if (sc) sc.scrollTop = sc.scrollHeight;
      window.scrollTo(0, 0);
      // innerText reflects text-transform, so the wordmark renders uppercase.
      const head = Array.from(document.querySelectorAll("header")).find((h) =>
        /linedown/i.test(h.innerText)
      );
      const r = head?.getBoundingClientRect();
      const gap = sc ? sc.scrollHeight - sc.scrollTop - sc.clientHeight : 999;
      return {
        pageY: window.scrollY,
        atBottom: gap,
        headerVisible: !!r && r.top >= -1 && r.bottom > 20,
      };
    });
    if (framed.pageY !== 0 || !framed.headerVisible || framed.atBottom > 8) {
      bad(`${s.file}: not framed on the beat`, JSON.stringify(framed));
    } else {
      ok(`${s.file}: header in frame, feed pinned to newest beat`);
    }
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS, s.file) });
    await page.close();
  }

  // ———————————————— 4. counterfeit images actually rendered ————————————————
  {
    const page = await newPage(`${BASE}/?at=92000&paused=1`);
    await waitForText(page, "counterfeit detected", 15000);
    await new Promise((r) => setTimeout(r, 1200));
    const imgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img"))
        .filter((i) => /marking/i.test(i.alt))
        .map((i) => ({
          alt: i.alt,
          src: i.getAttribute("src"),
          w: i.naturalWidth,
          h: i.naturalHeight,
        }))
    );
    if (imgs.length === 2 && imgs.every((i) => i.w > 0 && i.h > 0)) {
      ok("both marking SVGs render side by side", imgs.map((i) => i.src).join(" | "));
    } else {
      bad("both marking SVGs render", JSON.stringify(imgs));
    }

    const sideBySide = await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll("figure"));
      if (f.length < 2) return false;
      const [a, b] = f.slice(0, 2).map((x) => x.getBoundingClientRect());
      return Math.abs(a.top - b.top) < 40 && b.left > a.right - 5;
    });
    sideBySide ? ok("labels are laid out side by side") : bad("labels are laid out side by side");

    await page.close();
  }

  // ———————————————— 5. unknown event resilience ————————————————
  {
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      if (req.url().endsWith("/events.json")) {
        await req.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            runId: "ld-run-20261003-1402",
            durationMs: 9000,
            events: [
              {
                id: "x1",
                ts: 0,
                type: "alert.raised",
                payload: {
                  part: "TEST-MPN",
                  partLabel: "test",
                  program: "p",
                  qtyAtRisk: 1,
                  burnRatePerMin: 10,
                  deadlineLabel: "d",
                  reason: "r",
                  plain: "plain text",
                },
              },
              { id: "x2", ts: 500, type: "something.weird", payload: { plain: "A judge can still read this." } },
              { id: "x3", ts: 1000, type: "tool.call", payload: { callId: "z", agent: "a", tool: "mystery", label: "Unresolved call", status: "running" } },
              { id: "x4", ts: 1500, type: "tool.result", payload: { callId: "z", kind: "nonsense.kind", payload: { a: 1 } } },
              { id: "x5", ts: 2000, type: "agent.message", payload: { agent: "sourcing", role: "Sourcing", text: "after", plain: "still alive" } },
            ],
          }),
        });
      } else await req.continue();
    });
    await page.goto(`${BASE}/?speed=10`, { waitUntil: "networkidle2" });
    const survived = await waitForText(page, "still alive", 15000);
    survived && errs.length === 0
      ? ok("unknown event type + orphan tool call render without crashing")
      : bad("unknown event resilience", errs.join("; "));
    await page.close();
  }

  await browser.close();

  // ———————————————— report ————————————————
  const noisy = consoleIssues.filter(
    (m) => !/favicon|DevTools|Download the React DevTools/i.test(m)
  );
  noisy.length === 0
    ? ok("no console errors/warnings")
    : bad(`console issues (${noisy.length})`, noisy.slice(0, 6).join("\n    "));

  console.log("\n———— LINEDOWN UI verification ————");
  for (const r of results) {
    console.log(`${r.pass ? " PASS" : "*FAIL"}  ${r.n}${r.d ? `\n        ${r.d}` : ""}`);
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(
    `\n${results.length - failed}/${results.length} passed · shots in ui/shots/\n`
  );
  process.exit(failed ? 1 : 0);
};

run().catch((e) => {
  console.error("verify crashed:", e);
  process.exit(1);
});
