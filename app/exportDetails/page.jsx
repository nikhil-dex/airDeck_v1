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
    idle: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    loading: 'bg-indigo-400 cursor-not-allowed',
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
    return <div>Loading...</div>
  }
  return (
    <div>
      <Navbar />
      <div className="container mt-5">
        <div className="btn m-2">

        <button className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 p-2 rounded" onClick={() => router.back()}>Go back</button>
        </div>

        <div className="flex w-screen h-screen items-center flex-col">
             {/* <form action=""></form> */}
  
        <form onSubmit={(e) => { e.preventDefault(); handleExport(); savePpt(); }} className="space-y-6">
          {/* Title Input Field */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Presentation Title
            </label>
            <div className="mt-1">
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="Enter the main title for your presentation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition duration-150 ease-in-out"
                disabled={isDisabled}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">This title will be used for the first slide and the filename.</p>
          </div>

    <div style={{height: "50vh", width: "100vh"} } className="flex p-1 bg-white/80 backdrop-blur-sm shadow-lg">
        {/* <div className="absolute z-41 right-0 bg-red-500 text-white px-4 py-2">slides {point+1} of {code.length}</div> */}
      {/* Right Side Preview */}
      <div id={`slide-${point}`} className="w-full">
        <iframe
          className="w-full h-full bg-white rounded-lg"
          srcDoc={code[point]}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
    

   

        <div className="flex justify-center">

    <button
            type="submit"
            onClick={handleExport}
            disabled={isDisabled}
            className={`mt-5 px-2 py-2 flex justify-center items-center space-x-2 border border-transparent text-base font-semibold rounded-xl shadow-md text-white transition duration-200 ease-in-out transform hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonStyle}`}
          >
            {exportStatus === 'loading' ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Download className="w-5 h-5 "/>
            )}
            <span className="bg-gray-100 p-2 rounded-full text-black">{exportStatus === 'loading' ? 'Exporting' : 'Export'} |</span>
          </button>
          <button onClick={savePpt} className="mt-5 px-2 py-2 flex justify-center items-center space-x-2 border border-transparent text-base font-semibold rounded-xl shadow-md text-white transition duration-200 ease-in-out transform hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2">
            <Presentation/> 
           <span className="bg-gray-100 p-2 rounded-full text-black"> 
            generate link |</span>
          </button>
        </div>
        </form>
        <div className="container">

          
        </div>
        </div>
    

        
    </div>
    
    </div>
  );
}
