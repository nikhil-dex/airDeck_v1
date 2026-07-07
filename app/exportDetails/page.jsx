"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Header/navbar"
import { Download, Presentation, FileCode } from 'lucide-react';
import { downloadAsPptx, downloadHtmlFile } from "@/lib/exporters";
import SlideFrame from "@/components/SlideFrame";
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
    loading: 'bg-gray-400 cursor-not-allowed',
    success: 'bg-green-500 hover:bg-green-600 focus:ring-green-400',
    error: 'bg-red-500 hover:bg-red-600 focus:ring-red-400',
  }[exportStatus];

  const isDisabled = exportStatus === 'loading';








useEffect(() => {
  if (status === "unauthenticated") router.push('/signin');
}, [status, router]);

if (status !== "authenticated") {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="text-center">
        <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  )
}
return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
    <Navbar />
    <div className="container mx-auto px-4 py-8">
      <button
        className="mb-6 px-5 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        onClick={() => router.back()}
      >
        ← Go Back
      </button>

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-black via-purple-900 to-fuchsia-600 bg-clip-text text-transparent">
            Export Your Presentation
          </h1>
          <p className="text-lg text-gray-600">
            Add a title and download your presentation as PowerPoint
          </p>
        </div>



        <form onSubmit={(e) => { e.preventDefault(); handleExport(); }} className="space-y-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <label htmlFor="title" className="block text-lg font-semibold text-gray-900 mb-3">
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
              className="block w-full px-5 py-4 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-black transition-all outline-none"
              disabled={isDisabled}
            />
            <p className="mt-3 text-sm text-gray-500">This will be used as your filename and first slide title</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden shadow-inner">
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
              className="px-8 py-4 flex justify-center items-center gap-3 text-lg font-semibold rounded-xl shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white transition-all duration-200 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              <Presentation className="w-6 h-6" />
              <span>
                {saveStatus === "saving" ? "Saving..." : editingId ? "Update Deck" : "Generate Link"}
              </span>
            </button>
          </div>

          {shareLink && (
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🎉 {editingId ? "Deck updated — same link, new content" : "Your presentation is live"}
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 bg-gray-50 outline-none"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-semibold transition-colors text-center"
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
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 font-medium">
              {saveError}
            </div>
          )}
        </form>
      </div>
    </div>
  </div>
);
}
