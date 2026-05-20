const express = require("express");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-core");
// const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");

const app = express();

const cache = new Map();
//const CACHE_TTL = 1000 * 60 * 60; // 60 minutes
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

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
    //const cacheKey = req.originalUrl;
    const cacheKey = req.path;

    //Add Warm Detection In Handler
    const isWarmRequest = req.query.warm === "1";
  
    const cached = cache.get(cacheKey);
  
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (isWarmRequest) {
        cached.timestamp = Date.now();
      }
      //console.log("CACHE HIT:", cacheKey);
      console.log(isWarmRequest ? "WARM HIT:" : "CACHE HIT:", cacheKey);
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

    // bypass tilda word injection
    $("*").each(function () {
      const el = $(this);
      const html = el.html();
      // merge broken strong splits like RESTAU <strong>RA</strong> NT
      if (html && html.includes("</strong><strong")) {
        el.html(html.replace(/<\/strong>\s*<strong>/g, ""));
      }
    });

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

    // fix only this specific hiking link
$('#rec822566513 a[href="/barentsburgsightseeinghiking"]').attr(
  "href",
  "/pyramidensightseeinghiking"
);

    const elements = $("p, h1, h2, h3, h4, h5, h6, a, button, span, li, div, strong, title, em, u").not(".t967__additional-langs, .t967__additional-langs *").not("#cardbtn1_797128826, #cardbtn1_797128826 *").filter(function () {
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
translated = translated.replace(/북극 모험을 위한 5일간의 사냥/g, "5일 동안의 북극 모험");
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
translated = translated.replace(/피라미덴로/g, "피라미덴으로");
translated = translated.replace(/피라미덴를/g, "피라미덴을");
translated = translated.replace(/정착지/g, "마을");
translated = translated.replace(/충분한/g, "NOK");
translated = translated.replace(/90 NOK0/g, "900 NOK");
translated = translated.replace(/금발/g, "블론드");
translated = translated.replace(/몰래 플래터/g, "스낵 플래터");
translated = translated.replace(/원시인 갈비/g, "캐이브맨 갈비");
translated = translated.replace(/С초콜릿칩쿠키/g, "초콜릿칩쿠키");
translated = translated.replace(/그만큼 SWIMMINGPOOL/g, "SWIMMINGPOOL");
translated = translated.replace(/글쎄, 우리 피트니스/g, "우리 피트니스");
translated = translated.replace(/모든 분동 및/g, "모든 웨이트 및");
translated = translated.replace(/그만큼 수영장/g, "수영장");
translated = translated.replace(/닫은/g, "휴무");
translated = translated.replace(/그만큼/g, "");
translated = translated.replace(/홍보IC이자형/g, "입장료");
translated = translated.replace(/이면 충분/g, "nok");
translated = translated.replace("개/그룹", "nok/그룹");
translated = translated.replace("명/인", "nok/인");
translated = translated.replace(/북한 사람들/g, "북쪽 사람들");
translated = translated.replace(/홍보/g, "");
translated = translated.replace(/이자형/g, "");
translated = translated.replace(/IC/g, "입장료");
translated = translated.replace(/내 거/g, "광산");
translated = translated.replace(/독특한 E를 제공하는 독특한 장소/g, "");
translated = translated.replace(/CE/g, "");
translated = translated.replace(/엑스페리엔/g, "독특한 경험을 선사하는 특별한 장소");
translated = translated.replace(/놀랍다/g, "");
translated = translated.replace(/g 광산과 그 노동자의 내용물에 관한 사실./g, "");
translated = translated.replace(/때로는 광산에 대한 통찰력도 제공합니다./g, "광산과 그곳에서 일했던 노동자들에 관한 때로는 놀라운 이야기들도 들려줍니다");
translated = translated.replace(/케이./g, "");
translated = translated.replace(/r 크라신/g, " 크라신");
translated = translated.replace(/바르 크라신/g, "바 크라신");
translated = translated.replace(/노르웨이 인/g, "노르웨이");
translated = translated.replace(/덴마크 말/g, "덴마크");
translated = translated.replace(/스웨덴어/g, "스웨덴");
translated = translated.replace(/우리의 개집 부지를 둘러보며/g, "켄넬 투어에 참여하여");
translated = translated.replace(/우리 설립의/g, "이곳의");
translated = translated.replace(/얻으십시오. 무제한의 시간을/g, "얻으십시오. 무제한의 시간으로");
translated = translated.replace(/바렌츠부르크(바렌츠부르크)/g, "바렌츠부르크");
translated = translated.replace(/NOK 790 단축 및 NOK 1190 아버지/g, "짧은 체험 790 NOK & 긴 체험 1190 NOK");
translated = translated.replace(/신뢰 Arcticugol/g, "TRUST Arcticugol");
translated = translated.replace(/통합 연방 여행사 등록 RTO 017351의 등록 번호/g, "통합 연방 관광사업자 등록부 등록번호 RTO 017351");
translated = translated.replace(/크리스마스 07-11/g, "7월 07-11일");
translated = translated.replace(/NOK 0/g, "0 NOK");
translated = translated.replace(/SNGL에 대한 추가 지불/g, "싱글룸 추가 요금");
translated = translated.replace(/제공된 드라이슈트(슈트, 부츠, 벙어리장갑)를 입고 d/g, "제공된 드라이슈트(슈트, 부츠, 벙어리장갑)를 입고");
translated = translated.replace(/오픈 RIB 보트를 타고 출발/g, "오픈 RIB 보트를 타고");
translated = translated.replace(/, 다음 정류장:/g, "로 출발하며 다음 일정 진행:");
translated = translated.replace(/주변에서 하이킹/g, "주변을 가이드와 함께 하이킹");
translated = translated.replace(/오늘의 활동에서는 그룹은 만에서 카약을 타거나 가이드와 함께하는 것 중 하나를 선택할 수 있습니다./g, "오늘 액티비티는 베이에서 카약을 타거나 피라미덴");
translated = translated.replace(/피라미덴 — 최종 결정은/g, "하는 것 중 하나를 선택하게 되며, 최종 결정은");
translated = translated.replace(/4 레스토랑에서 아침 식사/g, "레스토랑에서 4회 아침 식사");
translated = translated.replace(/4 레스토랑에서 저녁 식사 세트/g, "레스토랑에서 4회 저녁 식사 세트");
translated = translated.replace(/북극 모험 사냥/g, "북극 모험을 찾아서");
translated = translated.replace(/북극 모험을 위한 사냥/g, "북극 모험을 찾아서");
translated = translated.replace(/SNGL 숙박에 대한 추가 지불/g, "싱글룸 숙박 추가 요금");
translated = translated.replace(/옮기다:/g, "이동:");
translated = translated.replace(/장비 및 장비:/g, "장비:");
translated = translated.replace(/광산 정착/g, "광산 마을");
translated = translated.replace(/요청 시 이용 가능한 날짜/g, "예약 가능 날짜는 문의 바랍니다");
translated = translated.replace(/롱이어비엔(롱이어비엔)/g, "롱이어비엔");
translated = translated.replace(/1 바렌츠부르크 레스토랑에서 점심 식사/g, "바렌츠부르크 레스토랑에서 점심 식사 1회");
translated = translated.replace(/노르덴스키올드 빙하와 스발바르 제도의 험준한 절벽의 숨막히는 전경을 감상할 수 있는 롱이어비엔에서 소련의 유령 도시인 피라미덴으로 항해해 보세요./g, "롱위에아르뷔엔에서 출발하여 소련 시대의 유령 도시 피라미덴으로 항해합니다. 노르덴셸드 빙하와 스발바르의 험준한 절벽이 선사하는 숨막히는 풍경을 감상해보세요.");
translated = translated.replace(/숨겨진 보석/g, "숨겨진 명소");
translated = translated.replace(/극지의 날/g, "백야");
translated = translated.replace(/1 Pyramid 레스토랑에서 점심 식사/g, "피라미덴 레스토랑에서 1회 점심 식사");
translated = translated.replace(/황야 사파리/g, "야생 탐험 사파리");
translated = translated.replace(/고래, 해마/g, "고래, 바다코끼리");
translated = translated.replace(/모든 종류의 야생 동물을 사냥하고/g, "다양한 야생동물을 찾아 나서며");
//translated = translated.replace(/please wear trekking boots — sneakers are not suitable/g, "트레킹 부츠 착용 필수 — 운동화는 적합하지 않습니다");
translated = translated.replace(/피라미덴 방문: 되살아난 소련 유령 도시/g, "되살아난 소련 유령 도시인 피라미덴을 방문해 보세요");
translated = translated.replace(/문화 궁전/g, "문화의 전당");
translated = translated.replace(/피라미덴는/g, "피라미덴은");
translated = translated.replace(/스노모빌을 타고 숨막히는 북극 풍경을/g, "은 스노모빌을 타고 숨막히는 북극 풍경을");
translated = translated.replace(/빠른 소개를 원하시거나/g, "를 선택하시거나 더 깊은 경험을 위해 ");
translated = translated.replace(/간단한 소개를 원하시거나/g, "를 선택하시거나 더 깊은 경험을 위해 ");
translated = translated.replace(/더 깊은 경험을 위해 피라미덴에서 하룻밤을 묵으세요./g, "를 선택하여 피라미덴에서 하룻밤을 묵으세요.");
translated = translated.replace(/Hotel Pyramiden/g, "피라미덴 호텔");
translated = translated.replace(/NT 피라미덴/g, "피라미덴 레스토랑");
translated = translated.replace(/호언장담 피라미덴/g, "피라미덴 레스토랑");
translated = translated.replace(/식당/g, "");
translated = translated.replace(/Pyramiden Restaurant/g, "피라미덴 레스토랑");
translated = translated.replace(/제공하고 싶습/g, "제공하려 합");
translated = translated.replace(/The Bar of the Pyramiden Hotel은/g, "피라미덴 호텔의 바는");
translated = translated.replace(/칠아웃 존이/g, "라운지(chillout zone)가");
translated = translated.replace(/이 꼭 봐야 할 이유/g, "에 꼭 참여해야 할 이유");
translated = translated.replace(/Pyramiden/g, "피라미덴");
translated = translated.replace(/호텔에서 모든 수준과 관심 분야/g, "호텔에서 출발하는, 모든 수준과 관심 분야");
translated = translated.replace(/, 물론 아름다운 산과 폭포/g, " 뿐만 아니라 아름다운 산과 폭포도 방문해 보세요.");
translated = translated.replace(/호텔 피라미덴/g, "피라미덴 호텔");
translated = translated.replace(/스위트\/SNGL 숙박 시설/g, "스위트룸/싱글룸");
translated = translated.replace(/DBL\/TWIN 표준/g, "더블/트윈 스탠다드룸");
translated = translated.replace(/SNGL 표준/g, "싱글 스탠다드룸");
translated = translated.replace(/우수한/g, "수페리어룸");
translated = translated.replace(/SNGL 우수/g, "수페리어 싱글룸");
translated = translated.replace(/계절에 따라 개장했/g, "시즌제로 운영되어 오고 있");
translated = translated.replace(/소련/g, "구소련");
translated = translated.replace(/노란색/g, "황색");
translated = translated.replace(/지속:/g, "소요 시간 및 거리:");
translated = translated.replace(/페투로/g, "페투니아북타");
translated = translated.replace(/깨짐/g, "");
translated = translated.replace(/깃 달기/g, "");
translated = translated.replace(/전환점/g, "반환점");
translated = translated.replace(/거점이었던 집이/g, "거점이었던 집입니");
translated = translated.replace(/차를 위한 정차가 계획된/g, "티타임을 위한");
translated = translated.replace(/현장 점심/g, "도시락");
translated = translated.replace(/조수 일정에 따라 경로의/g, "조수 일정에 따라 이동 경로의");
translated = translated.replace(/광산 입구 투어 "갤러리"/g, '광산 입구 "갤러리(갱도)" 투어');
translated = translated.replace(/산비탈에 있는 갤러리를 통해/g, "산비탈에 있는 갤러리(갱도)를 통해");
translated = translated.replace(/호텔에는 모든 수준과 관심/g, "호텔에서 출발하는, 모든 수준과 관심 분야");
translated = translated.replace(/장기 타운/g, "롱이어비엔");
translated = translated.replace(/갖춘 넓은 조을/g, "갖춘 넓은 조식당을");
translated = translated.replace(/그게 법이에요!/g, "그게 규칙이에요!");
translated = translated.replace(/Svalbard/g, "스발바르");
translated = translated.replace(/Spitsbergen/g, "스피츠베르겐");
translated = translated.replace(/마을 외부에는 도로가/g, "롱이어비엔, 바렌츠부르크, 뉘올레순과 같은 마을 외부에는 도로가");
translated = translated.replace(/롱이어비엔, 바렌츠부르크, 뉘올레순. /g, "");
translated = translated.replace(/노르웨이 남극 영토와 달리 스발바르 제도는 종속국이 아니지만/g, "노르웨이 남극 영토와 달리, 스발바르 제도는 종속된 지역이 아니지만");
translated = translated.replace(/스발바르는 군사시설 설치를 금지하는 조약으로 비무장지대다. /g, "스발바르는 비무장지대로, 조약이 군사시설 설치를 금지하고 있습니다. ");
translated = translated.replace(/영구 민간인 인구가 거주하는/g, "영구거주하는 민간인 인구가 있는");
translated = translated.replace(/강렬한 고래 사냥/g, "집중적인 고래 사냥");
translated = translated.replace(/육상 조리기구/g, "육지에 기반을 둔 조리기구");
translated = translated.replace(/수년에 걸쳐 산업/g, "이는 수년에 걸쳐 산업");
translated = translated.replace(/광범위한 기지국 시스템과 외곽 수렵 캠프를 활동에 사용했지만/g, "여러 기지와 외곽 사냥 캠프를 활용하는 광범위한 체계를 사용했지만");
translated = translated.replace(/경제적 착취를 주도/g, "경제적 개발을 주도");
translated = translated.replace(/스발바르 제도가 정착된/g, "스발바르 제도에 다시 정착이 이루어진");
translated = translated.replace(/채굴이 제한되어/g, "제한적으로 채굴을 진행하고");
translated = translated.replace(/이전에는 광산 작업을/g, "그러나 과거에는 채굴 작업을");
translated = translated.replace(/북극의 밤이/g, "극야가");
translated = translated.replace(/북극의 밤을/g, "극야 기간을");
translated = translated.replace(/물개, 해마, 북극곰/g, "물개, 바다코끼리, 북극곰");
translated = translated.replace(/주요 관광 명소/g, "주요 관광 명물");
translated = translated.replace(/보호받는 동안/g, "북극곰은 보호의 대상이지만");
translated = translated.replace(/마을 외부에 있는/g, "마을 외부로 나가는");
translated = translated.replace(/자기 방어를 위해/g, "자기 방어 차원에서");
translated = translated.replace(/프란츠 조셉 랜드는/g, "프란츠 조셉 랜드에는");
translated = translated.replace(/을 공유하며/g, "이 공통으로 서식하고 있으며");
translated = translated.replace(/장거리 여행이라면 롱이어비엔에서 휴식을 취한 뒤 다음날 황야로 떠나는 것이 좋다./g, "장거리 여행의 경우, 다음 날 야생 자연 지역으로 출발하기 전에 롱이어비엔에서 충분히 휴식을 취하는 것을 추천합니다.");
translated = translated.replace(/더 많은 정보를 원하시면 방문해주세요/g, "더 많은 정보를 원하시면 다음 사이트를 참조하세요:");
translated = translated.replace(/Russkiy Dom Guesthouse/g, "루스키 돔 게스트하우스");
translated = translated.replace(/전송에는 약 소요됩니다. 15분/g, "이동 시간은 약 15분이며");
translated = translated.replace(/돌아다니는 방법/g, "이동 및 교통 안내");
//translated = translated.replace(/황야에 들어가는/g, "야생 자연으로 들어가는");
translated = translated.replace(/어 황야에 들어가는 모든 사람이 적절한 안전 장비를 갖추고 있는지 확인합니다./g, "으며, 이는 야생 지역으로 들어가는 모든 사람이 적절한 안전 장비를 갖추도록 하기 위한 것입니다.");
translated = translated.replace(/대략 있습니다. /g, "");
translated = translated.replace(/총 40km의 도로/g, "대략 40km의 도로");
translated = translated.replace(/북극의 황야로 들어가려면/g, "북극의 야생 지역으로 들어가려면");
translated = translated.replace(/인정된 회사/g, "공인된 업체");
translated = translated.replace(/알코올 한도는/g, "혈중알코올농도 허용 기준은");
translated = translated.replace(/알코올 한도/g, "주류 제한");
translated = translated.replace(/ATC 그루만트/g, "여행사 그루만트");
translated = translated.replace(/술에 취하지 않은 고객은/g, "고객이 충분히 술이 깨지 않은 상태라고 판단될 경우");
translated = translated.replace(/모자, 머리띠 및\/또는 모자/g, "모자, 헤드밴드 및/또는 캡 모자");
translated = translated.replace(/니트 또는 양털 버프/g, "니트나 플리스 소재의 버프(넥워머)");
translated = translated.replace(/색안경/g, "선글라스");
translated = translated.replace(/수하물 운반용 건조 가방/g, "짐 운반용 방수 가방");
translated = translated.replace(/카메라를 담는 건조 가방/g, "카메라를 담는 방수 가방");
translated = translated.replace(/가방 운송은 개방형 보트에 의해 수행되므로 편안함을 위해 딱딱한 시체가 없는 방수 가방에 수하물을 포장하는 것이 좋습니다. 필요한 경우 수하물을 추가 보호 범위로 포장하므로 필수는 아니지만 추가 보호 계층이 유용할 것입니다./g, "편안한 여행을 위해 방수 기능이 있는 소프트백(딱딱한 프레임이 없는 가방)에 짐을 챙기는 것을 강력히 권장합니다. 짐 운반은 개방형 보트를 통해 이루어지기 때문입니다. 필수 사항은 아니며, 필요 시 추가 방수 커버로 짐을 보호해 드리지만, 추가적인 방수 보호가 있으면 더욱 유용합니다.");
translated = translated.replace(/이동 온도는 항상/g, "이동 템포는 항상");
translated = translated.replace(/운송이 복잡할 수 있지만/g, "여행이 난이도가 있을 수 있지만");
translated = translated.replace(/러시아스키/g, "루스키");
translated = translated.replace(/GUESTHOUSE RUSSKIY DOM/g, "루스키 돔 게스트하우스");
translated = translated.replace(/들판길의 도시락/g, "이동 도중에 제공되는 도시락");
translated = translated.replace(/유당 프리/g, "락토스 프리");
translated = translated.replace(/북극과 스발바르 지방의 다양한 속성 외에도/g, "북극과 스발바르 지방이라는 속성을 반영하는 다양한 상품들 외에도");
translated = translated.replace(/노르웨이어와 러시아의/g, "노르웨이와 러시아의");
translated = translated.replace(/기타 알코올 음료는 오후 1시까지만 /g, "기타 알코올 음료는 1시까지만 ");
translated = translated.replace(/무선 침묵 및 드론 금지 구역/g, "전파 사용 제한(radio silence) 및 드론 금지 구역");
translated = translated.replace(/찍는 규칙을 숙지하십시오/g, "촬영할 때 적용되는 규정을 숙지해야 합니다");
translated = translated.replace(/운송 및 운송/g, "이동 및 교통수단");
translated = translated.replace(/LONGYEARBYEN/g, "롱이어비엔");
translated = translated.replace(/전조등/g, "헤드램프");
translated = translated.replace(/열 팩/g, "발열팩");
translated = translated.replace(/시체 가방/g, "소프트백(천 소재 가방)");
translated = translated.replace(/스발바르 여행사에서 잘 알려진/g, "스발바르 기반의 여행사들에게 잘 알려진 제품인,");
translated = translated.replace(/스발바르의 여행사에서 잘 알려진/g, "스발바르 기반의 여행사들에게 잘 알려진 제품인,");
// i see sarcasm here xD
translated = translated.replace(/국경군의 북극 분포/g, "국경군의 북극 주둔");
translated = translated.replace(/이와 유사한/g, "이에 준하는");
translated = translated.replace(/스노모빌 스위트/g, "스노모빌 슈트");
translated = translated.replace(/이 스위트룸은 -5도/g, "이 슈트는 -5도");
translated = translated.replace(/합성 발라클라바/g, "합성 소재 발라클라바");
translated = translated.replace(/47까지의 크기;/g, "47까지의 사이즈가 준비되어 있습니다.");
translated = translated.replace(/장갑(클림, 스콧)/g, "벙어리장갑(Klim, Scott)");
translated = translated.replace(/생태학/g, "환경 보호 관련 기준");
translated = translated.replace(/미적 요구 사항/g, "디자인적 기준");
translated = translated.replace(/음주나 음주가 적발될/g, "음주 상태 또는 음주 행위가 확인될");
translated = translated.replace(/투숙객은/g, "참가자는");
translated = translated.replace(/다음과 같은 목적으로/g, "다음과 같은 경우");
translated = translated.replace(/호스팅 회사/g, "숙박 운영사");
translated = translated.replace(/들판에서 먹는 도시락/g, "이동 도중에 제공되는 도시락");
translated = translated.replace(/고기 육수/g, "고기 국물");
translated = translated.replace(/술을 마시지 않은/g, "술이 깨지 않은");
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

    
    $("body").append(`
<script>
// tilda slide fix
// ✅ slider CSS
const style = document.createElement("style");
style.innerHTML = \`
.simple-slider {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 640px;
  margin: auto;
}

.simple-slider-track {
  display: flex;
  transition: transform 0.3s ease;
}

.simple-slide {
  min-width: 100%;
}

.simple-slide img {
  width: 100%;
  display: block;
}

.simple-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.5);
  color: white;
  border: none;
  padding: 10px;
  cursor: pointer;
  z-index: 10;
}

.simple-arrow.left {
  left: 10px;
}

.simple-arrow.right {
  right: 10px;
}
\`;

document.head.appendChild(style);


// bypass tilda zoom
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

//popup when submit
document.addEventListener("click", function(e) {

  //const btn = e.target.closest('#form819685955 button[type="submit"]');
  const btn = e.target.closest('form button[type="submit"]');

  if (btn) {
    alert("문의는 카카오톡(catfoo)으로 부탁드립니다");
  }

});



// slider replacement
document.querySelectorAll('.t-slds').forEach((slider, index) => {

  const images = [

    // normal img sliders
    ...[...slider.querySelectorAll('img')]
      .map(img => img.getAttribute('data-original') || img.src),
  
    // T670 background-image sliders
    ...[...slider.querySelectorAll('.t-bgimg')]
      .map(div => div.getAttribute('data-original'))
  
  ].filter(Boolean);

  if (!images.length) return;

  const newSlider = document.createElement("div");
  newSlider.className = "simple-slider";

  newSlider.innerHTML = \`
    <div class="simple-slider-track">
      \${images.map(url => \`
        <div class="simple-slide">
          <img src="\${url}">
        </div>
      \`).join("")}
    </div>

    <button class="simple-arrow left">‹</button>
    <button class="simple-arrow right">›</button>
  \`;

  slider.replaceWith(newSlider);

  const track = newSlider.querySelector(".simple-slider-track");

  let current = 0;

  function update() {
    track.style.transform = \`translateX(-\${current * 100}%)\`;
  }

  newSlider.querySelector(".left").onclick = () => {
    current = (current - 1 + images.length) % images.length;
    update();
  };

  newSlider.querySelector(".right").onclick = () => {
    current = (current + 1) % images.length;
    update();
  };
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