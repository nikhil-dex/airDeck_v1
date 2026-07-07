"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Navbar from "../../components/Header/navbar";
import SlideFrame from "@/components/SlideFrame";
import Editor from "@monaco-editor/react";
import beautify from "js-beautify";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Monitor, ChevronLeft, ChevronRight, Save, Plus, Copy, Trash2,
  ChevronUp, ChevronDown, Wand2, Check, Loader2,
  PanelLeftClose, PanelLeftOpen, PanelLeft, PanelBottom,
} from "lucide-react";

const BEAUTIFY_OPTIONS = {
  indent_size: 2,
  wrap_line_length: 120,
  preserve_newlines: true,
  end_with_newline: true,
};

const BLANK_SLIDE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; }
    .slide {
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: radial-gradient(circle at 50% 120%, #000 0%, #0a0e27 60%, #000 100%);
      color: #fff;
      font-family: system-ui, sans-serif;
      text-align: center;
    }
    h1 { font-size: 96px; margin: 0 0 24px; }
    p { font-size: 40px; color: #9aa3c0; margin: 0; }
  </style>
</head>
<body>
  <div class="slide">
    <h1>New Slide</h1>
    <p>Edit this slide's HTML in the editor</p>
  </div>
</body>
</html>
`;

// Monaco is unusable on a phone keyboard, so below md we show a
// preview + save/export path instead of the editor.
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true
  );
}

export default function CodeIDE() {
  const { status } = useSession();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [point, setPoint] = useState(0);

  // Split position as % of the window; drag the divider to resize.
  const [editorWidth, setEditorWidth] = useState(45);
  const [dragging, setDragging] = useState(false);
  const [filmstripOpen, setFilmstripOpen] = useState(true);
  // Filmstrip dock side — "left" (vertical) or "bottom" (horizontal, frees
  // width for code). Remembered across sessions.
  const [strip, setStrip] = useState(() =>
    typeof window === "undefined" ? "left" : localStorage.getItem("pptStripPos") || "left"
  );
  const lastWidthRef = useRef(45);

  const setStripPos = (pos) => {
    setStrip(pos);
    localStorage.setItem("pptStripPos", pos);
  };

  // Slides are handed over from the generator via localStorage.
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return [];
    const pages = JSON.parse(localStorage.getItem("pptPages")) || [];
    return pages.map((page) => beautify.html(page, BEAUTIFY_OPTIONS));
  });
  const [deckTitle] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("pptEditingTitle") || ""
  );

  // Preview mirrors `code`, debounced while typing so the slide's animations
  // don't restart on every keystroke; slide operations flush it immediately.
  const [previewCode, setPreviewCode] = useState(code);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving
  const codeRef = useRef(code);
  const previewTimer = useRef(null);
  const saveTimer = useRef(null);

  const flushSave = () => {
    clearTimeout(saveTimer.current);
    localStorage.setItem("pptPages", JSON.stringify(codeRef.current));
    setSaveStatus("saved");
  };

  // Single entry point for every slide mutation: updates state, schedules
  // the autosave, and updates the preview (immediately or debounced).
  const applyCode = (next, { instantPreview = false } = {}) => {
    setCode(next);
    codeRef.current = next;

    setSaveStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 800);

    clearTimeout(previewTimer.current);
    if (instantPreview) {
      setPreviewCode(next);
    } else {
      previewTimer.current = setTimeout(() => setPreviewCode(next), 400);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  const updateCode = (value) => {
    const next = [...codeRef.current];
    next[point] = value;
    applyCode(next);
  };

  // ── Slide operations ────────────────────────────────────────────
  const addSlide = () => {
    const next = [...code];
    next.splice(point + 1, 0, BLANK_SLIDE);
    applyCode(next, { instantPreview: true });
    setPoint(point + 1);
  };

  const duplicateSlide = () => {
    const next = [...code];
    next.splice(point + 1, 0, code[point]);
    applyCode(next, { instantPreview: true });
    setPoint(point + 1);
  };

  const deleteSlide = () => {
    if (code.length <= 1) return;
    if (!window.confirm(`Delete slide ${point + 1}? This cannot be undone.`)) return;
    const next = code.filter((_, i) => i !== point);
    applyCode(next, { instantPreview: true });
    setPoint(Math.min(point, next.length - 1));
  };

  const moveSlide = (dir) => {
    const target = point + dir;
    if (target < 0 || target >= code.length) return;
    const next = [...code];
    [next[point], next[target]] = [next[target], next[point]];
    applyCode(next, { instantPreview: true });
    setPoint(target);
  };

  const formatSlide = () => {
    const next = [...code];
    next[point] = beautify.html(next[point], BEAUTIFY_OPTIONS);
    applyCode(next, { instantPreview: true });
  };

  // Arrow keys switch slides — but never while typing in the editor.
  // Ctrl/Cmd+S saves immediately instead of opening the browser dialog.
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flushSave();
        return;
      }

      const t = e.target;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" ||
          (t.closest && t.closest(".monaco-editor")))
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        setPoint((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setPoint((prev) => (prev < codeRef.current.length - 1 ? prev + 1 : prev));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const startDrag = (e) => {
    e.preventDefault();
    setDragging(true);

    const onMove = (ev) => {
      const pct = (ev.clientX / window.innerWidth) * 100;
      setEditorWidth(Math.min(80, Math.max(15, pct)));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const toggleEditor = () => {
    if (editorWidth === 0) {
      setEditorWidth(lastWidthRef.current || 45);
    } else {
      lastWidthRef.current = editorWidth;
      setEditorWidth(0);
    }
  };

  // Save & go to export page
  const exportHandle = () => {
    flushSave();
    router.push("/exportDetails");
  };

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070709]">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#5eadff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-300 font-medium">Loading Editor...</p>
        </div>
      </div>
    );
  }

  // ---------- Mobile: no code editing, but preview + save/export ----------
  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center px-4 py-6 gap-5">
          <div className="w-full max-w-lg glass-card p-5 text-center">
            <Monitor className="w-8 h-8 mx-auto mb-2 text-[#5eadff]" />
            <p className="text-white font-semibold">Code editing needs a desktop</p>
            <p className="text-gray-400 text-sm mt-1">
              You can preview your slides here and continue straight to save &amp; export.
            </p>
          </div>

          <div className="w-full max-w-lg">
            <SlideFrame
              html={code[point]}
              className="w-full aspect-video rounded-xl shadow-2xl"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPoint(point - 1)}
              disabled={point === 0}
              className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30"
              title="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white font-bold px-4 py-2 bg-white/10 rounded-lg">
              {point + 1} / {code.length}
            </span>
            <button
              onClick={() => setPoint(point + 1)}
              disabled={point >= code.length - 1}
              className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30"
              title="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={exportHandle}
            className="w-full max-w-lg btn-accent px-6 py-4 rounded-xl text-lg flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" /> Save &amp; Export
          </button>
        </div>
      </div>
    );
  }

  // ---------- Desktop: IDE layout ----------
  const toolBtn =
    "p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="h-screen bg-[#070709] flex flex-col overflow-hidden">
      {/* ── IDE toolbar ── */}
      <div className="h-14 shrink-0 flex items-center justify-between px-4 bg-black/40 backdrop-blur-xl border-b border-white/10 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-xl font-extrabold glitch shrink-0" data-text="PPTgen">
            PPTgen
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-300 text-sm font-medium truncate">
            {deckTitle || "Untitled deck"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={addSlide} className={toolBtn} title="Add slide after this one">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={duplicateSlide} className={toolBtn} title="Duplicate this slide">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={() => moveSlide(-1)} disabled={point === 0} className={toolBtn} title="Move slide up">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={() => moveSlide(1)} disabled={point >= code.length - 1} className={toolBtn} title="Move slide down">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={formatSlide} className={toolBtn} title="Format this slide's HTML">
            <Wand2 className="w-4 h-4" />
          </button>
          <button
            onClick={deleteSlide}
            disabled={code.length <= 1}
            className="p-2 rounded-lg bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Delete this slide"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500" title="Edits autosave locally — Ctrl+S saves instantly">
            {saveStatus === "saving" ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Check className="w-3.5 h-3.5 text-[#b3ffc8]" /> Saved</>
            )}
          </span>
          <button
            onClick={exportHandle}
            className="btn-accent px-5 py-2 rounded-lg text-sm"
          >
            Done Editing
          </button>
        </div>
      </div>

      <div className={`flex-1 flex min-h-0 ${strip === "bottom" ? "flex-col" : ""}`}>
        {/* ── Filmstrip docked left (vertical) ── */}
        {strip === "left" && (
          <div
            className={`${filmstripOpen ? "w-44" : "w-10"} shrink-0 flex flex-col bg-black/30 border-r border-white/10 transition-[width] duration-300 ease-in-out`}
          >
            <div className="shrink-0 flex items-center border-b border-white/10">
              {filmstripOpen ? (
                <>
                  <span className="text-xs font-medium text-gray-400 pl-3 py-2 mr-auto">Slides</span>
                  <button
                    onClick={() => setStripPos("bottom")}
                    className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    title="Dock slides to bottom"
                  >
                    <PanelBottom className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFilmstripOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    title="Collapse slide list"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setFilmstripOpen(true)}
                  className="w-full flex justify-center p-2 text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
                  title="Expand slide list"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
            </div>

            {filmstripOpen ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {previewCode.map((slide, i) => (
                  <button
                    key={i}
                    onClick={() => setPoint(i)}
                    className={`relative block w-full rounded-lg overflow-hidden transition-all ${
                      i === point
                        ? "ring-2 ring-[#5eadff] shadow-lg shadow-[#5eadff]/20"
                        : "ring-1 ring-white/10 opacity-60 hover:opacity-100"
                    }`}
                    title={`Slide ${i + 1}`}
                  >
                    <div className="pointer-events-none">
                      <SlideFrame html={slide} className="w-full aspect-video" />
                    </div>
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              // Collapsed rail: numbered dots keep jump-to-slide one click away.
              <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1.5">
                {previewCode.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPoint(i)}
                    className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${
                      i === point
                        ? "bg-[#5eadff] text-[#0a0a12]"
                        : "bg-white/5 text-gray-400 hover:bg-white/15"
                    }`}
                    title={`Slide ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex min-h-0 min-w-0">
        {/* ── Editor ── */}
        <div
          style={{ width: `${editorWidth}%` }}
          className={`overflow-hidden ${dragging ? "" : "transition-[width] duration-300 ease-in-out"}`}
        >
          <Editor
            height="100%"
            defaultLanguage="html"
            value={code[point]}
            onChange={updateCode}
            theme="vs-dark"
            options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 13 }}
          />
        </div>

        {/* ── Drag handle ── */}
        <div
          onMouseDown={startDrag}
          className={`w-1.5 shrink-0 cursor-col-resize group relative z-30 ${dragging ? "bg-[#5eadff]" : "bg-white/10 hover:bg-[#5eadff]"} transition-colors`}
          title="Drag to resize"
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="w-1 h-1 rounded-full bg-white" />
            <span className="w-1 h-1 rounded-full bg-white" />
            <span className="w-1 h-1 rounded-full bg-white" />
          </div>
        </div>

        {/* ── Preview ── */}
        <div className={`flex-1 min-w-0 bg-black/30 p-4 relative ${dragging ? "" : "transition-all duration-300 ease-in-out"}`}>
          <SlideFrame
            html={previewCode[point]}
            className="w-full h-full rounded-lg shadow-2xl"
          />
          <button
            onClick={toggleEditor}
            className="absolute top-6 left-6 z-30 p-2 rounded-lg bg-black/50 hover:bg-black/80 text-white text-xs transition-colors"
            title={editorWidth === 0 ? "Show editor" : "Fullscreen preview"}
          >
            {editorWidth === 0 ? "Show editor" : "Focus preview"}
          </button>
        </div>

        </div>

        {/* ── Filmstrip docked bottom (horizontal) ── */}
        {strip === "bottom" && (
          <div
            className={`${filmstripOpen ? "h-28" : "h-9"} shrink-0 flex bg-black/30 border-t border-white/10 transition-[height] duration-300 ease-in-out`}
          >
            <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-1 border-r border-white/10">
              {filmstripOpen ? (
                <>
                  <button
                    onClick={() => setStripPos("left")}
                    className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
                    title="Dock slides to left"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFilmstripOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
                    title="Collapse slide list"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setFilmstripOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
                  title="Expand slide list"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
            </div>

            {filmstripOpen ? (
              <div className="flex-1 overflow-x-auto flex items-center gap-3 px-3">
                {previewCode.map((slide, i) => (
                  <button
                    key={i}
                    onClick={() => setPoint(i)}
                    className={`relative shrink-0 w-36 rounded-lg overflow-hidden transition-all ${
                      i === point
                        ? "ring-2 ring-[#5eadff] shadow-lg shadow-[#5eadff]/20"
                        : "ring-1 ring-white/10 opacity-60 hover:opacity-100"
                    }`}
                    title={`Slide ${i + 1}`}
                  >
                    <div className="pointer-events-none">
                      <SlideFrame html={slide} className="w-full aspect-video" />
                    </div>
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto flex items-center gap-1.5 px-2">
                {previewCode.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPoint(i)}
                    className={`w-6 h-6 shrink-0 rounded text-[10px] font-bold transition-colors ${
                      i === point
                        ? "bg-[#5eadff] text-[#0a0a12]"
                        : "bg-white/5 text-gray-400 hover:bg-white/15"
                    }`}
                    title={`Slide ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* While dragging, catch mouse events before Monaco/the iframe swallow them */}
        {dragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
      </div>
    </div>
  );
}
