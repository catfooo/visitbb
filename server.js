const express = require("express");
const cheerio = require("cheerio");
// const puppeteer = require("puppeteer-core");
const puppeteer = require("puppeteer");

const app = express();

// Google Translate
async function translateText(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data[0].map(item => item[0]).join("");
}

const overrides = {
  "contact us": "문의하기",
  "barentsburg": "바렌츠부르크",
  "Barentsburg": "바렌츠부르크",
  //"WHAT TO DO": "즐길 거리",
  //"EAT & DRINK": "식사와 음료",
  //"Longyearbyen": "롱이어비엔",
  // "barentsburg": "바렌츠부르크",
  //"MORE": "더 보기",
};

app.use(async (req, res) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const targetUrl = "https://example.com";

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const html = await page.content();

    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send("error: " + err.message);

  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});