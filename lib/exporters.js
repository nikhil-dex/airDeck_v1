// Client-side deck exporters, shared by the export page and My Decks.
// Browser-only: uses iframes, html-to-image and file downloads.
import * as htmlToImage from "html-to-image";
import PptxGenJS from "pptxgenjs";
import { withAutoFit } from "./slideAutofit";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildStandaloneHtml(title, slides) {
  const safeTitle = String(title).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  // Escape "</" so slide HTML can't terminate the viewer's <script> block.
  const slidesJson = JSON.stringify(slides.map(withAutoFit)).replace(/<\//g, "<\\/");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0b0f1a; height: 100vh; overflow: hidden; font-family: system-ui, sans-serif; }
  /* Slides are authored at 1920x1080; render at that size and scale to fit the window. */
  #frame { position: absolute; width: 1920px; height: 1080px; border: 0; background: #fff; transform-origin: top left; }
  .hud { position: fixed; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,.65); padding: 8px 14px; border-radius: 999px; opacity: 0; transition: opacity .25s; z-index: 10; }
  body:hover .hud { opacity: 1; }
  .hud button { background: rgba(255,255,255,.12); color: #fff; border: 0; border-radius: 8px; padding: 6px 14px; font-size: 14px; cursor: pointer; }
  .hud button:hover { background: rgba(255,255,255,.28); }
  .hud span { color: #fff; font-size: 14px; min-width: 52px; text-align: center; }
  /* Touch navigation: invisible edge strips (tap = prev/next, swipe works too).
     Touches on the slide iframe never reach this page, so these are the touch surface. */
  .tapzone { position: fixed; top: 0; bottom: 0; width: 18%; z-index: 5; display: none; }
  #tapL { left: 0; } #tapR { right: 0; }
  @media (pointer: coarse) {
    .tapzone { display: block; }
    .hud { opacity: 1; } /* no hover on touch screens — keep controls visible */
  }
</style>
</head>
<body>
<iframe id="frame" sandbox="allow-scripts" title="Slide"></iframe>
<div id="tapL" class="tapzone"></div>
<div id="tapR" class="tapzone"></div>
<div class="hud">
  <button id="prev">&#8592;</button>
  <span id="counter"></span>
  <button id="next">&#8594;</button>
  <button id="fs">Fullscreen</button>
</div>
<script>
  var slides = ${slidesJson};
  var i = 0;
  var frame = document.getElementById("frame");
  var counter = document.getElementById("counter");
  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    var s = Math.min(w / 1920, h / 1080);
    frame.style.transform = "scale(" + s + ")";
    frame.style.left = ((w - 1920 * s) / 2) + "px";
    frame.style.top = ((h - 1080 * s) / 2) + "px";
  }
  window.addEventListener("resize", layout);
  layout();
  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    frame.srcdoc = slides[i];
    counter.textContent = (i + 1) + " / " + slides.length;
  }
  document.getElementById("prev").onclick = function () { show(i - 1); };
  document.getElementById("next").onclick = function () { show(i + 1); };
  var fsBtn = document.getElementById("fs");
  var docEl = document.documentElement;
  if (!docEl.requestFullscreen && !docEl.webkitRequestFullscreen) {
    fsBtn.style.display = "none"; // iOS Safari: no Fullscreen API; page already fills the screen
  }
  fsBtn.onclick = function () {
    if (docEl.requestFullscreen) docEl.requestFullscreen();
    else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
  };
  function bindZone(el, dir) {
    var sx = 0, sy = 0;
    el.addEventListener("touchstart", function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(i + (dx < 0 ? 1 : -1));
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) show(i + dir);
    }, { passive: true });
  }
  bindZone(document.getElementById("tapL"), -1);
  bindZone(document.getElementById("tapR"), 1);
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); show(i + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(i - 1); }
    else if (e.key === "f" || e.key === "F") { document.documentElement.requestFullscreen(); }
  });
  show(0);
</script>
</body>
</html>`;
}

export function downloadHtmlFile(title, slides) {
  const html = buildStandaloneHtml(title, slides);
  const blob = new Blob([html], { type: "text/html" });
  triggerDownload(blob, `${String(title).trim() || "presentation"}.html`);
}

export async function captureSlidesAsImages(slides) {
  const images = [];

  for (let i = 0; i < slides.length; i++) {
    const tempIframe = document.createElement("iframe");
    tempIframe.style.width = "1920px";
    tempIframe.style.height = "1080px";
    tempIframe.style.position = "absolute";
    tempIframe.style.left = "-9999px";
    tempIframe.style.top = "-9999px";

    tempIframe.srcdoc = withAutoFit(slides[i]);
    document.body.appendChild(tempIframe);

    try {
      await new Promise((resolve) => {
        tempIframe.onload = () => setTimeout(resolve, 350);
      });

      const dataUrl = await htmlToImage.toPng(tempIframe.contentDocument.body, {
        backgroundColor: "white",
        quality: 1,
        width: 1920,
        height: 1080,
        pixelRatio: 2,
      });

      images.push(dataUrl);
    } finally {
      tempIframe.remove();
    }
  }

  return images;
}

export async function downloadAsPptx(title, slides) {
  const images = await captureSlidesAsImages(slides);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  images.forEach((img) => {
    const slide = pptx.addSlide();
    slide.addImage({
      data: img,
      x: 0,
      y: 0,
      w: 10,
      h: 5.625, // 16:9 height in inches
    });
  });

  await pptx.writeFile(`${String(title).trim() || "presentation"}.pptx`);
}
