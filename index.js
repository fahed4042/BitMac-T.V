import express from "express";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/extract", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ status: "error", message: "No URL provided" });

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: puppeteer.executablePath(), // من النسخة اللي نزلناها
      headless: true,
      args: ["--no-sandbox","--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("video source"))
           .map(v => v.src)
           .filter(Boolean)
    );

    await browser.close();

    if (links.length === 0)
      return res.json({ status: "failed", message: "No video links found" });

    res.json({ status: "success", links });

  } catch(e) {
    if(browser) await browser.close();
    res.json({ status:"error", message: e.message });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log("🚀 Server running on port "+PORT));
