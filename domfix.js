// dom fix before translation

function domfix($) {
    
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
}
module.exports = domfix;