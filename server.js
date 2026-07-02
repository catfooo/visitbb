const express = require("express");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-core");
// const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");
// const Tesseract = require("tesseract.js");
// const sharp = require("sharp");
const translation = require("./translation.js");

const app = express();
app.use(express.static("public"));

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
      //waitUntil: "networkidle2", 
      waitUntil: "domcontentloaded", 
      timeout: 120000
    });

    console.log("Requested:", targetUrl);
console.log("Final URL:", page.url());

    let html = await page.content();

    const $ = cheerio.load(html);

// translated img for pyramiden    
$("#rec797019210 .t107").append(`
  <div style="margin-top:20px; text-align:center;">
    <img 
      src="/images/2.png"
      style="max-width:100%; height:auto;"
      alt=""
    >
  </div>
`);

// replace translated img at when-to-visit
$(".t107 img").attr({
  src: "images/3.png",
  "data-original": "images/3.png",
  "data-img-zoom-url": "images/3.png"
});

//     //Find all images: + download img buffer + OCR the image: + Translate:
//     $("img").each(async function () {
//       const src = $(this).attr("src");
    
//       if (!src) return;
    
//       const fullSrc = src.startsWith("http")
//         ? src
//         : "https://goarctica.com" + src;
    
//       const response = await fetch(fullSrc);
//       const arrayBuffer = await response.arrayBuffer();
//       const buffer = Buffer.from(arrayBuffer);

//       //skip tiny images before OCR:
//       const metadata = await sharp(buffer).metadata();

//       if (metadata.width < 300 || metadata.height < 300) {
//         return; // skip tiny images
//       }

//       // preprocess image for OCR
// const processed = await sharp(buffer)
// .resize({ width: 1600 }) // upscale small text
// .grayscale()
// .normalize()
// .sharpen()
// .threshold(180)
// .toBuffer();
    
//       const result = await Tesseract.recognize(buffer, "eng");
    
//       //console.log(result.data.text);

//       const originalText = result.data.text;

//   console.log("OCR:");
//   console.log(originalText);

//   const translated = await translateText(originalText);

//   console.log("TRANSLATED:");
//   console.log(translated);
//     });

    // bypass tilda word injection//not working
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

translated = translation(translated, el)

// translation block


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

// no ping for northflank deploy
//if (process.env.NODE_ENV === "production") {
if (process.env.NORTHFLANK === "false") {
  setInterval(() => {
    // fetch("https://barentsburg.onrender.com")
    fetch("https://visitbb.up.railway.app")
      .then(() => console.log("keep-alive ping"))
      .catch(err => console.log("ping error:", err.message));
  }, 5 * 60 * 1000);
}