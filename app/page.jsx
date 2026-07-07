"use client";
import { useRouter } from "next/navigation";
import {useSession} from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import Navbar from "@/components/Header/navbar";
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

  const credit = creditLeft ?? session?.user?.credit ?? 0;

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
      headers: { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
  <h1 className="text-4xl font-extrabold mb-3 bg-[linear-gradient(90deg,#000,#7c3aed,#000)] bg-[length:200%_200%] animate-gradient bg-clip-text text-transparent">

    PPTgen
  </h1>
  <p className="text-lg text-gray-600">
    Transform your ideas into stunning HTML presentations with AI
  </p>
</div>


        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-black">
              Describe your presentation
            </label>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${credit > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
              {credit} credit{credit === 1 ? "" : "s"} left
            </span>
          </div>
          <textarea
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-200 text-black transition-all outline-none resize-none"
            rows="8"
            onChange={(e) => setPrompt(e.target.value)}
            value={prompt}
            placeholder="Example: Create a presentation about climate change with 5 slides covering causes, effects, and solutions..."
          />

          <button
            onClick={sendRequest}
            disabled={loading || !prompt.trim()}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating Your Presentation... {elapsed.toFixed(1)}s</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Generate Presentation</span>
              </>
            )}
          </button>
        </div>
        {hasSavedDeck && (
          <div className="text-center mt-8">
            <Link
              href="/exportDetails"
              className="text-2xl font-extrabold bg-gradient-to-r from-black via-purple-900 to-fuchsia-600 bg-clip-text text-transparent hover:opacity-75 transition-opacity"
            >
              Last generated presentation is ready for export! Click here to download.
            </Link>
          </div>
        )}

        {response && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Output</h2>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-red-700 whitespace-pre-wrap break-words">
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
