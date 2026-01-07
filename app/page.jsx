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
    return <div>Loading...</div>
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
    <div>
      <Navbar credit={credit} />
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        Enter the prompt to generate PPT-style HTML pages
      </h1>

      <textarea
        className="border w-full p-2"
        rows="6"
        onChange={(e) => setPrompt(e.target.value)}
        value={prompt}
      />

      <button
        onClick={sendRequest}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Generating..." : "Generate"}
      </button>

      <hr className="my-6" />

      <h1 className="text-lg font-bold">Output</h1>
      <div className="mt-3 p-3 border bg-gray-50 text-black" dangerouslySetInnerHTML={{ __html: response }}></div>
    </div>
    <h2>previous ppts</h2>
  
    </div>
  );
}
