"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Header/navbar"
import { Download, Presentation, FileCode } from 'lucide-react';
import { downloadAsPptx, downloadHtmlFile } from "@/lib/exporters";
import SlideFrame from "@/components/SlideFrame";
import AuroraBackground from "@/components/AuroraBackground";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"


export default function ExportDetails() {
  const router = useRouter();
  const { status } = useSession();
  // Slides arrive from the editor via localStorage. When an existing deck
  // was opened via "Edit deck", pptEditingId is set and saving updates it
  // instead of creating a new one.
  const [code] = useState(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem("pptPages")) || [];
  });
  const [editingId] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("pptEditingId") || ""
  );
  const [title, setTitle] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("pptEditingTitle") || ""
  );
  const [exportStatus, setExportStatus] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | error
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  //const [collapsed, setCollapsed] = useState(false);

  const GenLink = async () => {
    if (!title.trim()) {
      setSaveStatus("error");
      setSaveError("Please enter a title before generating a link.");
      return;
    }

    try {
      setSaveStatus("saving");
      setSaveError("");
      setShareLink("");

      // Editing an existing deck updates it in place (same id, same link);
      // otherwise a new deck is created.
      const response = editingId
        ? await fetch(`/api/ppt/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, code }),
          })
        : await fetch("/api/save-ppt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, code }),
          });
      const data = await response.json();

      if (!response.ok || data.error) {
        setSaveStatus("error");
        setSaveError(data.error || "Failed to save presentation.");
        return;
      }

      setShareLink(`${window.location.origin}/present/${editingId || data.id}`);
      setSaveStatus("idle");
    } catch (err) {
      console.error("Error generating link:", err);
      setSaveStatus("error");
      setSaveError("Failed to save presentation.");
    }
  };

  const downloadHtml = () => {
    if (!title.trim()) {
      setSaveStatus("error");
      setSaveError("Please enter a title before downloading.");
      return;
    }

    downloadHtmlFile(title, code);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the link is visible and selectable as a fallback.
    }
  };



  // Placeholder function for exporting to PPT
  const handleExport = useCallback(async () => {
    if (!title.trim()) {
      alert('Please enter a title before exporting.');
      return;
    }

    try {
      setExportStatus("loading");




      await downloadAsPptx(title, code);

      setExportStatus("success");
      setTimeout(() => setExportStatus("idle"), 3000);

    } catch (err) {
      console.error(err);
      setExportStatus("error");
      setTimeout(() => setExportStatus("idle"), 3000);
    }

  }, [code, title]);


  const buttonText = {
    idle: 'Export as PPT',
    loading: 'Generating...',
    success: 'Export Successful!',
    error: 'Export Failed',
  }[exportStatus];

  const buttonStyle = {
    idle: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-400',
    loading: 'bg-white/10 text-gray-400 cursor-not-allowed',
    success: 'bg-green-500 hover:bg-green-600 focus:ring-green-400',
    error: 'bg-red-500 hover:bg-red-600 focus:ring-red-400',
  }[exportStatus];

  const isDisabled = exportStatus === 'loading';








useEffect(() => {
  if (status === "unauthenticated") router.push('/signin');
}, [status, router]);

if (status !== "authenticated") {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070709]">
      <div className="text-center">
        <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#5eadff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  )
}
return (
  <div className="min-h-screen bg-[#070709]">
    <AuroraBackground />
    <div className="page-content">
    <Navbar />
    <div className="container mx-auto px-4 py-8">
      <button
        className="mb-6 px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold transition-all duration-200 flex items-center gap-2"
        onClick={() => router.back()}
      >
        ← Go Back
      </button>

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-3 text-gradient">
            Export Your Presentation
          </h1>
          <p className="text-lg text-gray-400">
            Add a title, share it as a link, or download it
          </p>
        </div>



        <form onSubmit={(e) => { e.preventDefault(); handleExport(); }} className="space-y-8">
          <div className="glass-card p-8">
            <label htmlFor="title" className="block text-lg font-semibold text-gray-100 mb-3">
              Presentation Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Enter your presentation title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-[#5eadff]/50 focus:border-[#5eadff] text-lg text-gray-100 transition-all outline-none"
              disabled={isDisabled}
            />
            <p className="mt-3 text-sm text-gray-500">This will be used as your filename and first slide title</p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Preview</h3>
            <div className="aspect-video w-full bg-black/40 rounded-lg overflow-hidden">
              <SlideFrame html={code[0]} className="w-full h-full" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="submit"
              disabled={isDisabled}
              className={`px-8 py-4 flex justify-center items-center gap-3 text-lg font-semibold rounded-xl shadow-lg text-white transition-all duration-200 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 ${buttonStyle}`}
            >
              {exportStatus === 'loading' ? (
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Download className="w-6 h-6 text-black" />
              )}
              <span>{buttonText}</span>
            </button>

            <button
              type="button"
              onClick={downloadHtml}
              disabled={isDisabled}
              className="px-8 py-4 flex justify-center items-center gap-3 text-lg font-semibold rounded-xl shadow-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white transition-all duration-200 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-300"
            >
              <FileCode className="w-6 h-6" />
              <span>Download HTML</span>
            </button>

            <button
              type="button"
              onClick={GenLink}
              disabled={isDisabled || saveStatus === "saving"}
              className="btn-accent px-8 py-4 flex justify-center items-center gap-3 text-lg rounded-xl transform hover:scale-105 transition-all duration-200 focus:outline-none"
            >
              <Presentation className="w-6 h-6" />
              <span>
                {saveStatus === "saving" ? "Saving..." : editingId ? "Update Deck" : "Generate Link"}
              </span>
            </button>
          </div>

          {shareLink && (
            <div className="glass-card p-6 border-[#b3ffc8]/25">
              <h3 className="text-lg font-semibold text-gray-100 mb-3">
                🎉 {editingId ? "Deck updated — same link, new content" : "Your presentation is live"}
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 outline-none"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="btn-accent px-6 py-3 rounded-xl"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold transition-colors text-center"
                >
                  Open
                </a>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Anyone with this link can view your presentation fullscreen.
              </p>
            </div>
          )}

          {saveStatus === "error" && saveError && (
            <div className="bg-red-400/5 border border-red-400/20 rounded-2xl p-4 text-red-400 font-medium">
              {saveError}
            </div>
          )}
        </form>
      </div>
    </div>
    </div>
  </div>
);
}
