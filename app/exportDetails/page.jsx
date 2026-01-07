"use client";

import { useState,useRef, useEffect,useCallback } from "react";
import Navbar from "../../components/Header/navbar"
import { Download, Presentation } from 'lucide-react';
import * as htmlToImage from "html-to-image";
import PptxGenJS from "pptxgenjs";
import { useRouter } from "next/navigation";
import {useSession} from "next-auth/react"


export default function CodeIDE() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [credit, setCredit] = useState(session?.user?.credit || 0);
const [code, setCode] = useState([]);
const [point, setPoint] = useState(0);
const [title, setTitle] = useState('');
const [exportStatus, setExportStatus] = useState("");
//const [collapsed, setCollapsed] = useState(false);

const captureAllSlides = async () => {
  const images = [];

  for (let i = 0; i < code.length; i++) {
    const tempIframe = document.createElement("iframe");
    tempIframe.style.width = "1920px";
    tempIframe.style.height = "1080px";
    tempIframe.style.position = "absolute";
    tempIframe.style.left = "-9999px";
    tempIframe.style.top = "-9999px";

    tempIframe.srcdoc = code[i];
    document.body.appendChild(tempIframe);

    await new Promise((resolve) => {
      tempIframe.onload = () => setTimeout(resolve, 350);
    });

    const dataUrl = await htmlToImage.toPng(
      tempIframe.contentDocument.body,
      {
        backgroundColor: "white",
        quality: 1,
        width: 1920,
        height: 1080,
        pixelRatio: 2,
      }
    );

    images.push(dataUrl);
    tempIframe.remove();
  }

  return images;
};


const generatePPT = async (images) => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  images.forEach((img) => {
    const slide = pptx.addSlide();
    slide.addImage({
      data: img,
      x: 0,
      y: 0,
      w: 10,
      h: 5.625,  // correct 16:9 height
    });
  });

  await pptx.writeFile(`${title || "presentation"}.pptx`);
};




useEffect(() => {
  const pages = JSON.parse(localStorage.getItem("pptPages")) || [];
  setCode(pages);
}, []);
  const editorRef = useRef(null);
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };



  const updateCode = (value) => {
    const newSlides = [...code];
    newSlides[point] = value;
    setCode(newSlides);
  };



 // Placeholder function for exporting to PPT
const handleExport = useCallback(async () => {
  if (!title.trim()) {
    alert('Please enter a title before exporting.');
    return;
  }

  try {
    setExportStatus("loading");
//mongodb
    //   try{
    //   console.log(session?.user?.id);
    //   const res = fetch("/api/save-ppt",{
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ code , user: session?.user?.id}),
    //   });
    // }catch(err){
    //   console.log("mongodb error",err);
    // }


    const images = await captureAllSlides();
    await generatePPT(images);

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

  const savePpt = async () => {
     if (!title.trim()) {
    alert('Please enter a title before exporting.');
    return;
  }

 
//mongodb
    //   try{
    //   console.log(session?.user?.id);
    //   const res = fetch("/api/save-ppt",{
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ code , user: session?.user?.id}),
    //   });
    // }catch(err){
    //   console.log("mongodb error",err);
    // }
    
  }

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
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Export Your Presentation
            </h1>
            <p className="text-lg text-gray-600">
              Add a title and download your presentation as PowerPoint
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleExport(); savePpt(); }} className="space-y-8">
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
                className="block w-full px-5 py-4 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-all outline-none"
                disabled={isDisabled}
              />
              <p className="mt-3 text-sm text-gray-500">This will be used as your filename and first slide title</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
              <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                <iframe
                  className="w-full h-full"
                  srcDoc={code[point]}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="submit"
                onClick={handleExport}
                disabled={isDisabled}
                className={`px-8 py-4 flex justify-center items-center gap-3 text-lg font-semibold rounded-xl shadow-lg text-white transition-all duration-200 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 ${buttonStyle}`}
              >
                {exportStatus === 'loading' ? (
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Download className="w-6 h-6"/>
                )}
                <span>{buttonText}</span>
              </button>

              <button
                type="button"
                onClick={savePpt}
                className="px-8 py-4 flex justify-center items-center gap-3 text-lg font-semibold rounded-xl shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white transition-all duration-200 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                <Presentation className="w-6 h-6"/>
                <span>Generate Link</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
