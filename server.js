const express = require("express");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-core");
// const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");

const app = express();

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 60 minutes

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

let browser;

async function getBrowser() {
  if (browser) return browser;

  const isProd = process.env.NODE_ENV === "production";

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

  return browser;
}

app.use(async (req, res) => {
    const cacheKey = req.originalUrl;
  
    const cached = cache.get(cacheKey);
  
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("CACHE HIT:", cacheKey);
      return res.send(cached.html);
    }
  
    console.log("CACHE MISS:", cacheKey);


  const browser = await getBrowser();
  let page;

  try {
    page = await browser.newPage();

    const targetUrl = "https://goarctica.com" + req.originalUrl;

    await page.goto(targetUrl, {
      waitUntil: "networkidle2", 
      timeout: 120000
    });

    console.log("Requested:", targetUrl);
console.log("Final URL:", page.url());

    let html = await page.content();

    const $ = cheerio.load(html);

    // EN link to not be /
    $('.t967__additional-langs a').each(function () {
      if ($(this).text().trim() === "EN") {
        $(this).attr("href", "https://goarctica.com/");
      }
    });

    // tilda link fix
    $('a[href]').each(function () {
      const href = $(this).attr('href');
    
      if (!href) return;
    
      if (href.includes('tilda.ru')) {
        const path = href.replace(/https?:\/\/tilda\.ru/, '');
        $(this).attr('href', path || '/');
      }
    });

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
translated = translated.replace(/그루먼트/g, "그루만트");
translated = translated.replace(/모험 및 발견/g, "모험 및 탐험");
translated = translated.replace(/일년 내내 경험을/g, "연중 다양한 경험을");
translated = translated.replace(/광산 역사가 문화와 연중 내내 접대되는/g, "탄광의 역사와 문화를 연중 내내 경험할 수 있는");
translated = translated.replace(/북극 모험 투어 및 목적지/g, "북극 어드벤처 투어와 방문 가능 지역들");
translated = translated.replace(/사람의 손길이 닿지 않은 자연이 시간이 멈춰버린 버려진 아름다움을 둘러싸고 있는/g, "사람의 손길이 닿지 않은 자연과 시간이 멈춘 듯한 폐허의 아름다움이 공존하는,");
translated = translated.replace(/정착지인/g, "마을인");
translated = translated.replace(/전설적인 피라미덴/g, "그리고 전설적인 피라미덴");
translated = translated.replace(/정착지를/g, "마을을");
translated = translated.replace(/블라티덴/g, "blåtiden");
translated = translated.replace(/그 이후부터 5월 첫째 주까지 제공됩니다./g, "그로부터 5월 첫째 주까지 우리는 바렌츠부르크, 그루만트, 콜스베이 그리고 템펠피요르덴까지를 돌아보는 ");
translated = translated.replace(/바렌츠부르크, 그루만트 & Colesbay 및 Tempelfjorden까지/g, "를 제공합니다");
translated = translated.replace(/확장된 모험을 원하는 사람들을 위해 우리는 다음을 제공합니다./g, "확장된 모험을 원하는 사람들을 위해 우리는 ");
translated = translated.replace(/, 군도의 서쪽 부분과/g, "를 제공하며, 이는 군도의 서쪽 부분과");
translated = translated.replace(/롱이어비엔에서 스노모빌로 약 5~6시간이/g, "는 롱이어비엔에서 스노모빌로 약 5~6시간이");
translated = translated.replace(/계획을 세우는 것이 좋습니다. 우리의/g, "계획을 세우는 것이 좋습니다. 우리의 ");
translated = translated.replace(/4월은 우리 회사에 합류하기 가장 좋은 시기입니다./g, "4월은 ");
translated = translated.replace(/는 군도의 가장 상징적인 장소로 여러분을 데려가는/g, "에 참여하기 가장 좋은 시기입니다. 이 투어는 군도의 가장 상징적인 장소로 여러분을 데려가는");
translated = translated.replace(/5월 둘째 주까지 투어 운영을 중단하므로/g, "5월 둘째 주부터 투어 운영을 중단하므로");
translated = translated.replace(/어렵습니다. 눈이 녹고 풍경이 변하면서 거의 아무것도 볼 수 없게 될 수도 있습니다./g, "어렵습니다. 눈이 녹고 풍경이 ");
//translated = translated.replace(/RIB 보트가 바다를 항해하기 시작하고/g, "RIB 보트(고속 고무보트)가 바다를 항해하기 시작하고");
translated = translated.replace(/6월부터 8월 말까지 제공됩니다./g, "6월부터 8월 말까지는");
translated = translated.replace(/, 계절 조건에 따라 야생 동물과 빙하 전망을 감상할 수 있는 최적의 경로를 선택하는 유연한 "오늘의 어획량" 프로그램이 특징입니다. 우리의/g, "를 운영하며, 계절과 날씨에 따라 최적의 야생동물 관찰 및 빙하 경로를 선택하는 유연한 “오늘의 코스(Catch of the Day)” 프로그램이 포함되어 있습니다. 또한 6월 초부터 9월까지는");
translated = translated.replace(/6월 초부터 9월까지 운행되며 이 러시아 마을을 탐험하고 허스키 개썰매 타기를 즐길 수 있는 기회를 제공합니다. 트레킹을 좋아하는 분들을 위해 추천해 드립니다./g, "를 통해 이 러시아 정착지를 탐험하고 허스키 개썰매 체험도 즐기실 수 있습니다. 트레킹을 좋아하시는 분들을 위해 아늑한 캐빈에서 숙박하는");
translated = translated.replace(/스발바르의 황야에 푹 빠져들기에 완벽한 아늑한 캐빈 스테이를 제공합니다./g, "도 준비되어 있어, 스발바르의 대자연을 깊이 있게 경험하실 수 있습니다.");
translated = translated.replace(/피라미덴 베이의 얼음이 녹는 6월 중순부터 9월 말까지 우리와 함께하실 수 있습니다./g, "6월 중순, 피라미덴 만의 얼음이 녹기 시작하는 시기부터 9월 말까지는");
translated = translated.replace(/, 이 버려진 정착지의 매혹적인 역사와 아름다움을 발견하세요./g, "에 참여하실 수 있으며, 이 버려진 정착지의 매혹적인 역사와 아름다움을 만나보실 수 있습니다.");
translated = translated.replace(/10월 첫째 주 이후에는 투어를 일시 중지합니다. 날씨는 예측하기가 매우 어렵습니다. 기온이 낮아지고 북극의 밤이 서서히 돌아오며 풍경이/g, "투어는 10월 첫째 주 이후에는 잠시 중단됩니다. 이 시기의 날씨는 매우 예측하기 어렵고, 기온이 떨어지며 극야가 점차 시작되고 풍경이");
// translated = translated.replace(/Grumant/g, "그루만트");




$(node).replaceWith(translated);
          } catch (e) {
            console.log("번역 오류:", e.message);
          }
        }
      }
    }

    // adding text at the end of specific container
    const container = $("#accordion1_825002837 .t585__text");

const textNodes = container.contents().filter(function () {
  return this.type === "text";
});

// get last text node in that container
const lastTextNode = textNodes.last()[0];

if (lastTextNode && lastTextNode.data.trim() === ".") {
  lastTextNode.data = "으로 변하면서 거의 아무것도 볼 수 없게 될 수도 있습니다.";
}

// for prod, logic works differently(puppeteer -> sparticuz), so need to remove certain text additionally
const container1 = $("#accordion1_825002837 .t585__text");

const fullText = container1.text();

const targetStart = "날씨는 예측하기가 매우 어렵기 때문에 눈이 녹고 풍경이";
const unwanted = " 변하면서 거의 아무것도 볼 수 없게 될 수도 있습니다.";

const combined = targetStart + unwanted;

if (fullText.includes(combined)) {
  let removedOnce = false;

  container1.contents().each(function () {
    if (this.type !== "text") return;

    if (!removedOnce && this.data.includes(combined)) {
      this.data = this.data.replace(combined, targetStart + " ");
      removedOnce = true;
    }
  });
}

    // adding text at the end of specific container
    const container2 = $("#accordion2_825002837 .t585__text");

const textNodes2 = container2.contents().filter(function () {
  return this.type === "text";
});

// get last text node in that container
const lastTextNode2 = textNodes2.last()[0];

if (lastTextNode2 && lastTextNode2.data.trim() === ".") {
  lastTextNode2.data = "로 바뀌기 때문에 기대만큼 많은 것을 보지 못할 수도 있습니다.";
}

    // bypass tilda zoom
    $("body").append(`
<script>
document.addEventListener("click", function(e) {
    const el = e.target.closest('.t-zoomable');
    if (!el) return;

    const url = el.getAttribute('data-img-zoom-url');
    if (!url) return;

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.9)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = 9999;

    const img = document.createElement("img");
    img.src = url;
    img.style.maxWidth = "90%";
    img.style.maxHeight = "90%";

    overlay.appendChild(img);

    overlay.addEventListener("click", () => overlay.remove());

    document.body.appendChild(overlay);
});
</script>
`);

    //res.send($.html());
    const finalHtml = $.html();

cache.set(cacheKey, {
  html: finalHtml,
  timestamp: Date.now(),
});

res.send(finalHtml);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  } finally {
    if (page) await page.close();
  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});

if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    fetch("https://barentsburg.onrender.com")
      .then(() => console.log("keep-alive ping"))
      .catch(err => console.log("ping error:", err.message));
  }, 5 * 60 * 1000);
}