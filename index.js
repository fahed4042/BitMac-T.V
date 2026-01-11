import express from "express";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("✅ BitMac Extractor LIVE");
});

app.get("/extract", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.json({ status: "error", message: "No URL provided" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: puppeteer.executablePath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    // 🚀 تسريع التحميل
    await page.setRequestInterception(true);
    page.on("request", r => {
      const type = r.resourceType();
      if (["image", "font", "stylesheet"].includes(type)) {
        r.abort();
      } else {
        r.continue();
      }
    });

    const found = new Set();

    page.on("request", r => {
      const u = r.url();
      if (u.includes(".m3u8") || u.includes(".mp4")) {
        found.add(u);
      }
    });

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(6000);

    await browser.close();

    if (found.size === 0) {
      return res.json({
        status: "failed",
        message: "No direct links found (Protected or DRM)"
      });
    }

    res.json({
      status: "success",
      links: [...found]
    });

  } catch (e) {
    if (browser) await browser.close();
    res.json({
      status: "error",
      message: "Extraction failed",
      error: e.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});
