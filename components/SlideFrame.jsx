"use client";

import { useRef, useState, useEffect } from "react";
import { withAutoFit } from "@/lib/slideAutofit";

// Slides are authored on a fixed 1920x1080 canvas. Rendering them in a
// viewport-sized iframe crops them on smaller screens, so instead we render
// at full 1920x1080 and scale the iframe down to fit its container
// (letterboxed and centered when aspect ratios differ).
const SLIDE_W = 1920;
const SLIDE_H = 1080;

// For thumbnails: freeze all animations inside the slide. Dozens of live
// animated iframes exhaust mobile GPUs/memory and crash Safari.
const STILL_CSS =
  '<style data-pptgen-still>*,*::before,*::after{animation-play-state:paused!important;transition:none!important}</style>';

function withStill(html) {
  if (typeof html !== "string" || html.includes("data-pptgen-still")) return html;
  return /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, `${STILL_CSS}</head>`)
    : STILL_CSS + html;
}

export default function SlideFrame({ html, className = "", title = "Slide", still = false }) {
  const containerRef = useRef(null);
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const scale = Math.min(el.clientWidth / SLIDE_W, el.clientHeight / SLIDE_H);
      setLayout({
        scale,
        left: (el.clientWidth - SLIDE_W * scale) / 2,
        top: (el.clientHeight - SLIDE_H * scale) / 2,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {layout && layout.scale > 0 && (
        <iframe
          srcDoc={still ? withStill(withAutoFit(html)) : withAutoFit(html)}
          sandbox="allow-scripts"
          loading="lazy"
          title={title}
          className="absolute bg-white"
          style={{
            width: SLIDE_W,
            height: SLIDE_H,
            border: 0,
            transform: `scale(${layout.scale})`,
            transformOrigin: "top left",
            left: layout.left,
            top: layout.top,
          }}
        />
      )}
    </div>
  );
}
