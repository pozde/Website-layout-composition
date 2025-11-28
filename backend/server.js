// server.js
const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const NAV_TIMEOUT = 60_000;

// Extract HTML and bounding box for a selector
const extractAllSegmentHTML = async (page, selector, role) => {
  const els = await page.$$(selector);
  const out = [];

  for (const el of els) {
    const { x, y } = await el.boundingBox();
    const width = await page.evaluate((e) => e.scrollWidth, el);
    const height = await page.evaluate((e) => e.scrollHeight, el);
    const html = await page.evaluate((e) => e.outerHTML, el);

    out.push({ role, rect: { x, y, width, height }, html });
  }
  return out;
};

app.post("/segment", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    page.on("console", (msg) => page.evaluate(() => {}) /* no-op */ && console.log("PAGE›", msg.text()));

    // Apply the longer timeout globally
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);

    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) " + "AppleWebKit/537.36 (KHTML, like Gecko) " + "Chrome/122.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    // Navigate errors
    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: NAV_TIMEOUT,
      });
      if (!response || response.status() >= 400) {
        await browser.close();
        return res.status(502).json({
          error: `HTTP ${response ? response.status() : "NO_RESPONSE"} from ${url}`,
        });
      }
      await page.waitForSelector("body", { timeout: NAV_TIMEOUT });
    } catch (navErr) {
      console.error(`Navigation to ${url} failed:`, navErr);
      await browser.close();
      return res.status(502).json({ error: `Navigation to ${url} failed: ${navErr.message}` });
    }

    // Inject script analyzer.js
    const script = fs.readFileSync(path.join(__dirname, "analyzer.js"), "utf8");
    await page.evaluate(script);

    // Pull out each segment
    const segmentSelectors = [
      { role: "header", selector: ".segment-header" },
      { role: "navbar", selector: ".segment-navbar" },
      { role: "main", selector: ".segment-main" },
      { role: "sidebar", selector: ".segment-sidebar" },
      { role: "gallery", selector: ".segment-gallery" },
      { role: "footer", selector: ".segment-footer" },
    ];

    let segments = [];
    for (const { role, selector } of segmentSelectors) {
      const hits = await extractAllSegmentHTML(page, selector, role);
      segments = segments.concat(hits);
    }

    await browser.close();
    return res.json({ segments });
  } catch (err) {
    // Any other errors
    if (browser) await browser.close();
    console.error("Segmentation error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
