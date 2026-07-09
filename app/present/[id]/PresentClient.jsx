"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Maximize, ChevronLeft, ChevronRight, X, ArrowLeft } from "lucide-react";
import SlideFrame from "@/components/SlideFrame";

// Public presentation viewer — no sign-in required, anyone with the link can watch.
export default function PresentClient() {
  const { id } = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // iOS Safari has no Fullscreen API for page elements, so we fall back to
  // pinning the stage over the whole viewport ("fake" fullscreen).
  const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);
  const stageRef = useRef(null);
  const touchRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/ppt/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTitle(data.title || "");
          const loaded = Array.isArray(data.slides) ? data.slides : [];
          setSlides(loaded);

          // Deep link: /present/xyz#3 opens on slide 3.
          const fromHash = parseInt(window.location.hash.slice(1), 10);
          if (fromHash >= 1 && fromHash <= loaded.length) {
            setIndex(fromHash - 1);
          }
        }
      })
      .catch(() => setError("Failed to load presentation."))
      .finally(() => setLoading(false));
  }, [id]);

  // Keep the URL hash in sync so the current slide is always linkable.
  // replaceState avoids polluting browser history with every slide turn.
  useEffect(() => {
    if (slides.length === 0) return;
    window.history.replaceState(null, "", `#${index + 1}`);
  }, [index, slides.length]);

  // Respond when someone edits the hash by hand (or a link jumps slides).
  useEffect(() => {
    const onHashChange = () => {
      const n = parseInt(window.location.hash.slice(1), 10);
      if (n >= 1 && n <= slides.length) setIndex(n - 1);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [slides.length]);

  const next = useCallback(() => {
    setIndex((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((p) => (p > 0 ? p - 1 : p));
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  const enterFullscreen = () => {
    const el = stageRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen();
    } else if (el?.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else {
      setIsFakeFullscreen(true);
    }
  };

  const handleTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const makeTouchEnd = (tapDirection) => (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      // swipe
      if (dx < 0) next();
      else prev();
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // tap on an edge zone
      if (tapDirection < 0) prev();
      else next();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070709]">
        <p className="text-gray-300 font-medium animate-pulse">Loading presentation...</p>
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070709]">
        <div className="text-center">
          <p className="text-2xl text-white font-bold mb-2">Presentation not found</p>
          <p className="text-gray-400">{error || "This deck has no slides."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 min-w-0">
          {/* Phones (especially installed PWA) have no browser back button —
              give them one. Desktop keeps the browser's own navigation. */}
          <button
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/");
            }}
            className="md:hidden p-2 -ml-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 shrink-0 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-300 text-sm font-medium">
            {index + 1} / {slides.length}
          </span>
          <button
            onClick={enterFullscreen}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            title="Present fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-6">
        <div
          ref={stageRef}
          className={
            isFakeFullscreen
              ? "fixed inset-0 z-50 bg-black"
              : "relative w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl"
          }
        >
          {/* SlideFrame sandboxes with allow-scripts only, so shared decks keep
              their animations but can't touch this site's cookies or storage.
              The previous/next slides stay mounted but invisible — stable keys
              mean advancing just flips opacity instead of reloading an iframe,
              so transitions are instant in both directions. */}
          {slides.map((slide, i) => {
            if (Math.abs(i - index) > 1) return null;
            return (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-150 ${
                  i === index ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <SlideFrame html={slide} title={`Slide ${i + 1}`} className="w-full h-full" />
              </div>
            );
          })}

          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20">
            <div
              className="h-full bg-gradient-to-r from-[#b3ffc8] via-[#5eadff] to-[#ff6ef7] transition-all duration-300 ease-out"
              style={{ width: `${((index + 1) / slides.length) * 100}%` }}
            />
          </div>

          <button
            onClick={prev}
            disabled={index === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white disabled:opacity-20 disabled:cursor-default transition-all"
            title="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            disabled={index >= slides.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white disabled:opacity-20 disabled:cursor-default transition-all"
            title="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Touch-only edge zones: tap = prev/next, horizontal swipe works too.
              The slide iframe is cross-origin so touches on it never reach us —
              these strips are the touch navigation surface. Center stays free
              for interactive slide content. */}
          <div
            className="absolute left-0 top-0 h-full w-1/6 z-10 md:hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={makeTouchEnd(-1)}
          />
          <div
            className="absolute right-0 top-0 h-full w-1/6 z-10 md:hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={makeTouchEnd(1)}
          />

          {isFakeFullscreen && (
            <button
              onClick={() => setIsFakeFullscreen(false)}
              className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-20 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors"
              title="Exit fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {isFakeFullscreen && (
            <span className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-20 text-white/70 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
              {index + 1} / {slides.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
