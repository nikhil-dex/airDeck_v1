// Safety net for AI-generated slides whose content overflows the fixed
// 1920x1080 canvas. The script runs INSIDE the slide's sandboxed iframe
// (we can't measure it from outside without allow-same-origin): it checks
// the real rendered content size and, only when it spills past the canvas,
// scales the slide root down so everything is visible.
const AUTO_FIT_SCRIPT = `<script data-pptgen-autofit>(function () {
  function fit() {
    var body = document.body;
    var root = body.children.length === 1 ? body.children[0] : body;
    var w = Math.max(document.documentElement.scrollWidth, body.scrollWidth, root.scrollWidth);
    var h = Math.max(document.documentElement.scrollHeight, body.scrollHeight, root.scrollHeight);
    var s = Math.min(1920 / w, 1080 / h);
    if (s < 0.999) {
      root.style.transformOrigin = "top center";
      root.style.transform = "scale(" + s + ")";
    }
  }
  if (document.readyState === "complete") setTimeout(fit, 60);
  else window.addEventListener("load", function () { setTimeout(fit, 60); });
})();<\/script>`;

export function withAutoFit(html) {
  if (typeof html !== "string" || html.includes("data-pptgen-autofit")) return html;
  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${AUTO_FIT_SCRIPT}</body>`)
    : html + AUTO_FIT_SCRIPT;
}
