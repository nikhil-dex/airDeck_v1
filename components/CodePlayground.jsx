"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Monaco must be loaded dynamically (client-only)
const MonacoEditor = dynamic(import("@monaco-editor/react"), { ssr: false });

export default function CodePlayground() {
  const [input, setInput] = useState("// type your JS code");
  const [output, setOutput] = useState("");

  const runCode = () => {
    try {
      const result = eval(input); // WARNING: Only for demo. Replace with API sandbox.
      setOutput(String(result));
    } catch (err) {
      setOutput(String(err));
    }
  };

  return (
    <div className="w-full min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">Monaco Code Editor – Next.js</h1>

      {/* INPUT EDITOR */}
      <div className="border border-gray-700 rounded mb-4">
        <MonacoEditor
          height="300px"
          defaultLanguage="javascript"
          value={input}
          onChange={(v) => setInput(v)}
          theme="vs-dark"
        />
      </div>

      <button
        onClick={runCode}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
      >
        Run Code
      </button>

      <h2 className="text-xl mt-6 mb-2">Output</h2>

      {/* OUTPUT EDITOR (READ ONLY) */}
      <div className="border border-gray-700 rounded p-3 bg-black mt-2">
  {output}
</div>

      {/* <div className="border border-gray-700 rounded">
        <MonacoEditor
          height="200px"
          defaultLanguage="text"
          value={output}
          options={{ readOnly: true }}
          theme="vs-dark"
        />
      </div> */}
    </div>
  );
}
