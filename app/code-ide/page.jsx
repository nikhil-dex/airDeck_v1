"use client";

import { useState, useEffect } from "react";
import Navbar from "../../components/Header/navbar";
import SlideFrame from "@/components/SlideFrame";
import Editor from "@monaco-editor/react";
import beautify from "js-beautify";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const BEAUTIFY_OPTIONS = {
  indent_size: 2,
  wrap_line_length: 120,
  preserve_newlines: true,
  end_with_newline: true,
};

export default function CodeIDE() {
  const { status } = useSession();
  const router = useRouter();
  const [point, setPoint] = useState(0);
  const [editorCollapsed, setEditorCollapsed] = useState(false);

  // Slides are handed over from the generator via localStorage.
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return [];
    const pages = JSON.parse(localStorage.getItem("pptPages")) || [];
    return pages.map((page) => beautify.html(page, BEAUTIFY_OPTIONS));
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  const updateCode = (value) => {
    const newSlides = [...code];
    newSlides[point] = value;
    setCode(newSlides);
  };

  // Arrow-key navigation between slides
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") {
        setPoint((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setPoint((prev) => (prev < code.length - 1 ? prev + 1 : prev));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [code.length]);

  // Save & go to export page
  const exportHandle = () => {
    localStorage.setItem("pptPages", JSON.stringify(code));
    router.push("/exportDetails");
  };

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-300 font-medium">Loading Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900">
      <Navbar />
      <div className="flex h-screen">

        <div className="absolute top-16 right-4 z-50 flex items-center gap-2">
          <button
            onClick={exportHandle}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Done Editing
          </button>
          <span className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg">
            Slide {point + 1} / {code.length}
          </span>
        </div>

        <button
          onClick={() => setEditorCollapsed(!editorCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-r-lg shadow-lg transition-all"
          title={editorCollapsed ? "Show editor" : "Hide editor"}
        >
          {editorCollapsed ? <>&#8594;</> : <>&#8592;</>}
        </button>

        {/* Editor */}
        <div className={`${editorCollapsed ? "w-0" : "w-1/2"} border-r border-gray-700 transition-all duration-500 ease-in-out overflow-hidden`}>
          <Editor
            height="100%"
            defaultLanguage="html"
            value={code[point]}
            onChange={updateCode}
            theme="vs-dark"
          />
        </div>

        {/* Preview */}
        <div className={`${editorCollapsed ? "w-full" : "w-1/2"} transition-all duration-500 ease-in-out bg-gray-800 p-4`}>
          <SlideFrame
            html={code[point]}
            className="w-full h-full rounded-lg shadow-2xl"
          />
        </div>

        {/* Navigation Buttons */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-800 px-6 py-3 rounded-full shadow-2xl border border-gray-700">
          <button
            onClick={() => setPoint(point - 1)}
            disabled={point === 0}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 hover:shadow-lg"
          >
            ← Prev
          </button>

          <span className="text-white font-bold px-4 py-2 bg-gray-700 rounded-lg min-w-[60px] text-center">{point + 1}</span>

          <button
            onClick={() => setPoint(point + 1)}
            disabled={point >= code.length - 1}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 hover:shadow-lg"
          >
            Next →
          </button>
        </div>

      </div>
    </div>
  );
}
