import express from "express";
import puppeteer from "puppeteer-core";
import chromium from "chrome-aws-lambda";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/extract", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.json({ status: "error", message: "No URL provided" });

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: await chromium.executablePath,
      headless: true,
      args: chromium.args
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", r => {
      const t = r.resourceType();
      if (["image", "stylesheet", "font"].includes(t)) r.abort();
      else r.continue();
    });

    const found = new Set();

    page.on("request", r => {
      const u = r.url();
      if (u.includes(".m3u8") || u.includes(".mp4")) found.add(u);
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    await browser.close();

    if (found.size === 0)
      return res.json({ status: "failed", message: "No video links found" });

    res.json({ status: "success", links: [...found] });

  } catch (err) {
    if(browser) await browser.close();
    res.json({ status:"error", message: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log("🚀 Server running on port "+PORT));
