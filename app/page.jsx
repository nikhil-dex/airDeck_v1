"use client";
import { useRouter } from "next/navigation";
import {useSession} from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import Navbar from "@/components/Header/navbar";
import { Save } from "lucide-react";


export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [credit, setCredit] = useState(session?.user?.credit || 0);

   useEffect(() => {
    if (session === null) {
      router.push('/signin');
    } else if (session !== undefined) {
      setIsLoading(false);
      // Update credit when session loads
      if (session?.user?.credit !== undefined) {
        setCredit(session.user.credit);
      }
    }
  }, [session, router]);

  if(isLoading){
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

const sendRequest = async () => {
  console.log("Sending request with prompt:", prompt);
  setLoading(true);
  setResponse([]);

  try {
    const res = await fetch("/api/generate-ppt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (data.error) {
      setResponse([`❌ Error: ${data.error}`]);
      // localStorage.setItem("pptPages", JSON.stringify([`❌ Error: ${data.error}`]));
    } else {
      setResponse(data.result);
      localStorage.setItem("pptPages", JSON.stringify(data.result)); // ✔ FIXED
      router.push("/code-ide");
    }

    console.log("Received pages:", data.result);
  } catch (err) {
    setResponse([`Network error: ${err.message}`]);
    // localStorage.setItem("pptPages", JSON.stringify([`Network error: ${err.message}`]));
  }

  setLoading(false);
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <Navbar credit={credit} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            AI-Powered Presentation Generator
          </h1>
          <p className="text-lg text-gray-600">
            Transform your ideas into stunning HTML presentations with AI
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Describe your presentation
          </label>
          <textarea
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none"
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
                <span>Generating Your Presentation...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Generate Presentation</span>
              </>
            )}
          </button>
        </div>

        {response.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Output</h2>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200" dangerouslySetInnerHTML={{ __html: response }}></div>
          </div>
        )}
      </div>
    </div>
  );
}
