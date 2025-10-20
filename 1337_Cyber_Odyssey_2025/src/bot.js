const fs = require("fs");
const puppeteer = require("puppeteer");

DOMAIN = "127.0.0.1:3000";
const flag = fs.readFileSync("./flag.txt", "utf8").trim();

async function visit(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--js-flags=--jitless", "--no-sandbox"],
  });
  const page = await browser.newPage();
  try {
    if (!url.startsWith("http://")) {
      throw new Error("invalid url");
    }

    await page.goto(`http://${DOMAIN}/`, {
      timeout: 10000,
      waitUntil: "networkidle0",
    });

    await page.setCookie({
      name: "FLAG",
      value: flag,
      domain: DOMAIN,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });

    console.log(`Visiting: ${url}`);
    await page.goto(url, { timeout: 10000, waitUntil: "networkidle0" });

    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (err) {
    console.error(`Bot encountered an error while processing URL ${url}:`, err);
  } finally {
    await browser.close();
  }
}

module.exports = { visit };
