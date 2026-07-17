"use client";
import { useRouter } from "next/navigation";
import {useSession} from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import Navbar from "@/components/Header/navbar";
import AuroraBackground from "@/components/AuroraBackground";
import { BLANK_SLIDE } from "@/lib/blankSlide";
import { byokHeaders, getByokKey } from "@/lib/byok";
import { PenLine } from "lucide-react";
import { Save } from "lucide-react";
import Link from "next/link";


export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  // Balance returned by the generate API; falls back to the session value.
  const [creditLeft, setCreditLeft] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const [hasSavedDeck] = useState(() =>
    typeof window !== "undefined" && Boolean(localStorage.getItem("pptPages"))
  );
  const [hasByok] = useState(() => Boolean(getByokKey()));

  const credit = creditLeft ?? session?.user?.credit ?? 0;

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

const formatApiError = (data) => {
  if (!data) return "Unknown error";

  if (typeof data.error === "string") return data.error;
  if (typeof data.error === "object" && data.error?.message) {
    return String(data.error.message);
  }
  if (typeof data.message === "string") return data.message;

  try {
    return JSON.stringify(data.error ?? data);
  } catch {
    return "Something went wrong.";
  }
};

// Start a deck from scratch — no prompt, no credit, straight to the editor.
// const startBlankDeck = () => {
//   localStorage.setItem("pptPages", JSON.stringify([BLANK_SLIDE]));
//   localStorage.setItem(
//   "pptGeneratedBy",
//   "ai"
// );
//   localStorage.removeItem("pptEditingId");
//   localStorage.removeItem("pptEditingTitle");
//   router.push("/code-ide");
// };
const startBlankDeck = () => {
  localStorage.setItem(
    "pptPages",
    JSON.stringify([BLANK_SLIDE])
  );

  localStorage.setItem(
    "pptGeneratedBy",
    "user"
  );

  localStorage.removeItem(
    "pptEditingId"
  );

  localStorage.removeItem(
    "pptEditingTitle"
  );

  router.push("/code-ide");
};

const sendRequest = async () => {
  console.log("Sending request with prompt:", prompt);
  setLoading(true);
  setResponse("");

  const startTime = Date.now();
  setElapsed(0);
  timerRef.current = setInterval(() => {
    setElapsed((Date.now() - startTime) / 1000);
  }, 100);
  const took = () => `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

  try {
    const res = await fetch("/api/generate-ppt", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...byokHeaders() },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setResponse(`❌ Error: ${formatApiError(data)} (after ${took()})`);
      return;
    }

    if (!Array.isArray(data.result) || data.result.length === 0) {
      setResponse(`❌ Error: The model returned no slides. Try a more specific prompt. (after ${took()})`);
      return;
    }

    if (typeof data.credit === "number") {
      setCreditLeft(data.credit);
    }

    localStorage.setItem("pptPages", JSON.stringify(data.result));
    // Fresh generation — make sure saving creates a new deck rather than
    // overwriting one that was being edited earlier.
    localStorage.removeItem("pptEditingId");
    localStorage.removeItem("pptEditingTitle");
    router.push("/code-ide");
    console.log("Received pages:", data.result);
  } catch (err) {
    setResponse(`❌ Network error: ${err?.message || "Request failed"} (after ${took()})`);
  } finally {
    clearInterval(timerRef.current);
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#070709]">
      <AuroraBackground />
      <div className="page-content">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10 mt-6">
  <span className="tag">AI × Presentations as code</span>
  <h1 className="text-5xl font-extrabold mt-5 mb-3 text-gradient">
    Ideas in. Decks out.
  </h1>
  <p className="text-lg text-gray-400">
    AI-designed HTML presentations you can edit like code
  </p>
</div>


        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-200">
              Describe your presentation
            </label>
            {hasByok ? (
              <span className="text-sm font-semibold px-3 py-1 rounded-full border border-[#5eadff]/30 text-[#5eadff] bg-[#5eadff]/5" title="Using your own Gemini API key — no credits used">
                Your own API key — free
              </span>
            ) : (
              <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${credit > 0 ? "border-[#b3ffc8]/30 text-[#b3ffc8] bg-[#b3ffc8]/5" : "border-red-400/30 text-red-400 bg-red-400/5"}`}>
                {credit} credit{credit === 1 ? "" : "s"} left
              </span>
            )}
          </div>
          <textarea
            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:border-[#5eadff] focus:ring-1 focus:ring-[#5eadff]/50 text-gray-100 transition-all outline-none resize-none"
            rows="8"
            onChange={(e) => setPrompt(e.target.value)}
            value={prompt}
            placeholder="Example: Create a presentation about climate change with 5 slides covering causes, effects, and solutions..."
          />

          <button
            onClick={sendRequest}
            disabled={loading || !prompt.trim()}
            className="mt-6 w-full btn-accent px-8 py-4 rounded-xl text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating Your Presentation... {elapsed.toFixed(1)}s</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Generate Presentation {hasByok ? "(your key)" : "(1 credit)"}</span>
              </>
            )}
          </button>

          {loading && (
            <p className="mt-3 text-sm text-center text-gray-500">
              Tip: exporting as .pptx flattens slides to images — share the link or
              download HTML to keep animations and interactivity alive.
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm text-gray-500">or</span>
            <button
              onClick={startBlankDeck}
              disabled={loading}
              className="text-sm font-medium text-[#5eadff] hover:text-[#8cc5ff] disabled:opacity-40 flex items-center gap-1.5 transition-colors"
              title="Start a deck from scratch — no AI, no credit"
            >
              <PenLine className="w-4 h-4" /> Start from a blank deck (free)
            </button>
          </div>
        </div>
        {hasSavedDeck && (
          <div className="text-center mt-8">
            <Link
              href="/exportDetails"
              className="text-xl font-bold text-gradient hover:opacity-75 transition-opacity"
            >
              Last generated presentation is ready for export — click here →
            </Link>
          </div>
        )}

        {response && (
          <div className="mt-8 glass-card p-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Output</h2>
            <div className="p-4 bg-red-400/5 rounded-xl border border-red-400/20 text-sm text-red-400 whitespace-pre-wrap break-words">
              {response}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
