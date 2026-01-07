
"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "../../components/Header/navbar";
import Editor from "@monaco-editor/react";
import beautify from "js-beautify";
import { useRouter } from "next/navigation";
import {useSession} from "next-auth/react"

export default function CodeIDE() {
  const { data: session } = useSession();
  const [code, setCode] = useState([]);
  const [point, setPoint] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [credit, setCredit] = useState(0)

  const router = useRouter();



  // Load and beautify slides once
  useEffect(() => {
    const pages = JSON.parse(localStorage.getItem("pptPages")) || [];

    const prettyPages = pages.map(page =>
      beautify.html(page, {
        indent_size: 2,
        wrap_line_length: 120,
        preserve_newlines: true,
        end_with_newline: true,
      })
    );

    setCode(prettyPages);
  }, []);

  const editorRef = useRef(null);
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // Beautify on edit
  const updateCode = (value) => {
    const newSlides = [...code];

    newSlides[point] = beautify.html(value, {
      indent_size: 2,
      wrap_line_length: 120,
      preserve_newlines: true,
    });

    setCode(newSlides);
  };

  // Add arrow navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") {
        setPoint((prev) => (prev > 0 ? prev - 1 : prev));
      } 
      else if (e.key === "ArrowRight") {
        setPoint((prev) => (prev < code.length - 1 ? prev + 1 : prev));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [code.length]);

  // Collapse feature
 const handleCollapse = () => {
  const editor = document.getElementById("editor-container");
  const preview = document.getElementById("preview-container");

  editor.classList.remove("w-1/2");
  editor.classList.add("w-0");

  preview.classList.remove("w-1/2");
  preview.classList.add("w-full");

  document.getElementById("collapse-button").classList.add("hidden");
  document.getElementById("uncollapse-button").classList.remove("hidden");
};

const handleUnCollapse = () => {
  const editor = document.getElementById("editor-container");
  const preview = document.getElementById("preview-container");

  editor.classList.remove("w-0");
  editor.classList.add("w-1/2");

  preview.classList.remove("w-full");
  preview.classList.add("w-1/2");

  document.getElementById("uncollapse-button").classList.add("hidden");
  document.getElementById("collapse-button").classList.remove("hidden");
};


  // Save & go to export page
  const exportHandle = () => {
    localStorage.setItem("pptPages", JSON.stringify(code));
    router.push("/exportDetails");
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-300 font-medium">Loading Editor...</p>
        </div>
      </div>
    )
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
          id="collapse-button"
          onClick={handleCollapse}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-r-lg shadow-lg transition-all"
          title="Hide editor"
        >
          &#8592;
        </button>
        <button
          id="uncollapse-button"
          onClick={handleUnCollapse}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-r-lg shadow-lg transition-all hidden"
          title="Show editor"
        >
          &#8594;
        </button>

        {/* Editor */}
        <div id="editor-container" className="w-1/2 border-r border-gray-700 transition-all duration-500 ease-in-out overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="html"
            value={code[point]}
            onChange={updateCode}
            theme="vs-dark"
            onMount={handleEditorDidMount}
          />
        </div>

        {/* Preview */}
       <div
  id="preview-container"
  className="w-1/2 transition-all duration-500 ease-in-out bg-gray-800 p-4"
>
          <iframe
            className="w-full h-full bg-white rounded-lg shadow-2xl"
            srcDoc={code[point]}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Navigation Buttons */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-800 px-6 py-3 rounded-full shadow-2xl border border-gray-700">
          <button
            onClick={point == 0 ? null : () => setPoint(point - 1)}
            disabled={point == 0}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 hover:shadow-lg"
          >
            ← Prev
          </button>

          <span className="text-white font-bold px-4 py-2 bg-gray-700 rounded-lg min-w-[60px] text-center">{point + 1}</span>

          <button
            onClick={point < code.length - 1 ? () => setPoint(point + 1) : null}
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

// "use client";

// import { useState,useRef, useEffect } from "react";
// import Navbar from "../../components/Header/navbar"
// import Editor from "@monaco-editor/react";
// import beautify from "js-beautify";
// import { useRouter } from "next/navigation";


// export default function CodeIDE() {
//   const [code, setCode] = useState([]);
// const [point, setPoint] = useState(0);
// const router = useRouter();
// //   const [collapsed, setCollapsed] = useState(false);
// useEffect(() => {
//   const pages = JSON.parse(localStorage.getItem("pptPages")) || [];

//   // Beautify all HTML pages for easier editing
//   const prettyPages = pages.map(page =>
//     beautify.html(page, {
//       indent_size: 2,
//       wrap_line_length: 120,
//       preserve_newlines: true,
//       max_preserve_newlines: 2,
//       end_with_newline: true,
//     })
//   );

//   setCode(prettyPages);
// }, []);

// useEffect(() => {
//   const pages = JSON.parse(localStorage.getItem("pptPages")) || [];
//   setCode(pages);
// }, []);
//   const editorRef = useRef(null);

//   const handleEditorDidMount = (editor) => {
//     editorRef.current = editor;
//   };



// const updateCode = (value) => {
//   const newSlides = [...code];
//   newSlides[point] = beautify.html(value, {
//     indent_size: 2,
//     wrap_line_length: 120,
//     preserve_newlines: true,
//   });
//   setCode(newSlides);
// };
// useEffect(() => {
//   const handleKey = (e) => {
//     if (e.key === "ArrowLeft") {
//       // Go to previous slide
//       setPoint((prev) => (prev > 0 ? prev - 1 : prev));
//     } 
//     else if (e.key === "ArrowRight") {
//       // Go to next slide
//       setPoint((prev) => (prev < code.length - 1 ? prev + 1 : prev));
//     }
//   };

//   window.addEventListener("keydown", handleKey);

//   return () => window.removeEventListener("keydown", handleKey);
// }, [code.length]);


// const handleCollapse = () => {
//     document.getElementById('editor-container').classList.toggle('hidden');
//     document.getElementById('preview-container').classList.toggle('w-full');
//     document.getElementById('collapse-button').classList.toggle('hidden');
//     document.getElementById('uncollapse-button').classList.remove('hidden');
    
// }
// const handleUnCollapse = () => {
//     document.getElementById('editor-container').classList.remove('hidden');
//     document.getElementById('preview-container').classList.remove('w-full');
//     document.getElementById('uncollapse-button').classList.add('hidden');
//     document.getElementById('collapse-button').classList.remove('hidden');
// }
// const exportHandle =() => {
//     localStorage.setItem("pptPages", JSON.stringify(code));
//     router.push("/exportDetails");
// }


//   return (
//     <div>
//       <Navbar />
//     <div className="flex h-screen">
//         <div className="absolute z-41 right-0 bg-red-500 text-white px-4 py-2">slides {point+1} of {code.length}</div>
//         <button id="collapse-button" onClick={handleCollapse} className="absolute z-40 bg-red-500 text-white px-4 py-2" >^</button>
//         <button id="uncollapse-button" onClick={handleUnCollapse} className="absolute z-40 bg-red-500 text-white px-4 py-2 rotate-180 hidden" >^</button>
        

//       {/* Left Side Editor */}
//       <div id="editor-container" className="w-1/2 border-r">
//         <Editor
//             height="100%"
//             defaultLanguage="html"
//             value={code[point]}
//             onChange={updateCode}
//             theme="vs-dark"
//             onMount={handleEditorDidMount}
//           />
//       </div>

//       {/* Right Side Preview */}
//       <div id="preview-container" className="w-1/2">
//         <iframe
//           className="w-full h-full bg-white"
//           srcDoc={code[point]}
//           sandbox="allow-scripts allow-same-origin"
//         />
//       </div>
//       <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
//          <button onClick={ point==0 ? null : () => setPoint(point -1)} className={`px-3 py-1 m-1 rounded bg-blue-600 text-white`}>prev </button>
//                 <span className="text-blue-600 font-bold bg-white">{point+1}</span>
//                 <button onClick={point<code.length-1 ? () => setPoint(point +1): null} className={`px-3 py-1 m-1 rounded bg-blue-600 text-white`}>next </button>
//       </div>
//       <div className="absolute left-1/2 transform -translate-x-1/2 z-40">
//                 <button onClick={exportHandle} className={`px-3 py-1 m-1 rounded bg-blue-600 text-white`}>Done Editing </button>
//       </div>
//     </div>
//     </div>
//   );
// }