const express = require("express");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-core");
// const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");

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
    // browser = await puppeteer.launch({
    //   headless: true,
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"]
    // });
    // browser = await puppeteer.launch({
    //   args: chromium.args,
    //   defaultViewport: chromium.defaultViewport,
    //   executablePath: await chromium.executablePath(),
    //   headless: chromium.headless,
    // });
    const isProd = process.env.NODE_ENV === "production";

let browser;

if (isProd) {
  browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
} else {
  const puppeteer = require("puppeteer"); // full version for local
  browser = await puppeteer.launch({
    headless: true,
  });
}

    const page = await browser.newPage();

    const targetUrl = "https://goarctica.com" + req.originalUrl;

    await page.goto(targetUrl, {
      waitUntil: "networkidle2", 
      timeout: 120000
    });

    console.log("Requested:", targetUrl);
console.log("Final URL:", page.url());

    let html = await page.content();

    const $ = cheerio.load(html);

    const elements = $("p, h1, h2, h3, h4, h5, h6, a, button, span, li, div, strong, title").not(".t967__additional-langs, .t967__additional-langs *").filter(function () {
      // Skip elements that have no visible text
      return $(this).text().trim().length > 0;
    });

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
    
      const children = $(el)
        .contents()
        .filter(function () {
          return this.type === "text" && this.data.trim().length > 0;
        });
    
      for (let j = 0; j < children.length; j++) {
        const node = children[j];
        const text = $(node).text().trim();
    
        if (text) {
          try {
            const lower = text.toLowerCase();

// ✅ check overrides first
if (overrides[lower]) {
  $(node).replaceWith(overrides[lower]);
  continue;
}

// ✅ otherwise translate
let translated = await translateText(text);

// ✅ POST-FIX (after translation)
translated = translated.replace(/바렌츠버그/g, "바렌츠부르크");
translated = translated.replace(/해야 할 일/g, "즐길 거리");
translated = translated.replace(/먹고 마시다/g, "식사와 음료");
translated = translated.replace(/롱위에아르뷔엔/g, "롱이어비엔");
translated = translated.replace(/Barentsburg/g, "바렌츠부르크");
translated = translated.replace(/Longyearbyen/g, "롱이어비엔");
translated = translated.replace(/선택하다/g, "빠른 방문을 원하시면");
translated = translated.replace(/빠르게 방문하시거나,/g, "를 선택하거나, 더 깊이 있는 경험을 위해 바렌츠부르크에서 1박을 포함한 ");
translated = translated.replace(/더 깊은 경험을 위해 바렌츠부르크에서 하룻밤을 묵으세요/g, "를 즐기세요");
// translated = translated.replace(/Hotel/g, "호텔");
translated = translated.replace(/호텔 바렌츠부르크/g, "바렌츠부르크 호텔");
translated = translated.replace(/Hotel 바렌츠부르크는/g, "바렌츠부르크 호텔은");
translated = translated.replace(/호스텔 포모르/g, "포모르 호스텔");
translated = translated.replace(/객실 용량은 30개의 TWIN 및 TRIPLE 객실을 포함합니다./g, "객실은 트윈룸과 트리플룸 총 30개로 구성되어 있습니다.");
translated = translated.replace(/총 장소 수: 78/g, "총 수용 인원: 78명");
translated = translated.replace(/ArtArctic 박물관/g, "북극 예술박물관");
translated = translated.replace(/\/ 사람/g, "\/ 인당");
translated = translated.replace(/NOK 90/g, "90 NOK");
translated = translated.replace(/NOK 100\/150/g, "100/150 NOK");
translated = translated.replace(/NOK 790부터/g, "790 NOK부터");
translated = translated.replace(/NOK 800/g, "800 NOK");
translated = translated.replace(/크라스니 메드베드\(Krasniy Medved\)/g, "크라스니 메드비예드");
translated = translated.replace(/Icebreaker Bar Krasin/g, "아이스브레이커 바 크라신");
translated = translated.replace(/크라신\(Krasin\)과/g, "크라신이나");
translated = translated.replace(/레닌\(Lenin\)/g, "레닌");
translated = translated.replace(/"생명수"인/g, '"생명수"');
translated = translated.replace(/© 47TH 병렬 LTD/g, "© 47TH parallel LTD");
translated = translated.replace(/우리 위치로 가는 방법/g, "오시는 길");
translated = translated.replace(/무엇을 포장할 것인가/g, "짐꾸리기 팁");
translated = translated.replace(/겨울 투어 정보 시트/g, "겨울 투어 정보");
translated = translated.replace(/여름 투어 정보 시트/g, "여름 투어 정보");
translated = translated.replace(/질문을 하시나요\?/g, "문의하기");
translated = translated.replace(/피라미드/g, "피라미덴");
translated = translated.replace(/롱이어의 도시/g, "롱이어비엔");
translated = translated.replace(/^더$/, "더 보기");
translated = translated.replace(/여행 회사/g, "전문 여행사");
translated = translated.replace(/Grumant/g, "그루만트");
translated = translated.replace(/북극 옆 7일/g, "7일 동안 북극점 바로 옆까지");
translated = translated.replace(/무한한 북극 3일/g, "3일 동안의 끝없는 북극");
translated = translated.replace(/3일 북극 타임머신/g, "3일 동안의 북극 타임머신");
translated = translated.replace(/2일 무한 북극 익스프레스/g, "2일 동안의 무한 북극 익스프레스");
translated = translated.replace(/롱이어비엔에서 1일 왕복 여행/g, "1일 동안의 롱이어비엔 왕복 여행");
translated = translated.replace(/3시간 스노모빌 사파리/g, "3시간 동안의 스노모빌 사파리");
translated = translated.replace(/2일 피라미덴 탐험/g, "2일 동안의 피라미덴 탐험");
translated = translated.replace(/북극 모험을 위한 5일간의 사냥/g, "5일 동안의 북극 사냥모험");
translated = translated.replace(/아트아틱 갤러리/g, "북극 예술박물관");
translated = translated.replace(/여행할 때/g, "여행 시기");
translated = translated.replace(/우리 정착지에 가는 방법/g, "우리의 마을로 오시는 길");
translated = translated.replace(/현대 북극 생활/g, "현대적인 북극 생활");
// translated = translated.replace(/Grumant/g, "그루만트");




$(node).replaceWith(translated);
          } catch (e) {
            console.log("번역 오류:", e.message);
          }
        }
      }
    }

    res.send($.html());
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  } finally {
    if (browser) await browser.close();
  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});

// 👇 KEEP ALIVE (ONLY ONCE)
if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    fetch("https://barentsburg.onrender.com")
      .then(() => console.log("keep-alive ping"))
      .catch(err => console.log("ping error:", err.message));
  }, 5 * 60 * 1000);
}