"use client";

import { idlToFunctions } from "@/utils/idl-to-json";
import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";

const IDLConverter = () => {
  const [idlContent, setIdlContent] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("idl");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      setError("No file selected");
      return;
    }
    const file = files[0];
    if (!file) return;

    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (!content) {
          setError("Failed to read file content");
          return;
        }
        if (typeof content === "string") {
          setIdlContent(content);
        } else {
          setError("File content is not a valid string");
        }

        if (typeof content === "string") {
          const idlJson = JSON.parse(content);
          const ts = idlToFunctions(idlJson);
          setGeneratedCode(ts);
        } else {
          setError("File content is not a valid string");
        }
      } catch (err) {
        setError(
          `Error processing file: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file");
    };
    reader.readAsText(file);
  };

  const handleConvert = () => {
    try {
      if (!idlContent) {
        setError("Please upload an IDL JSON file first");
        return;
      }

      const idlJson = JSON.parse(idlContent);
      const ts = idlToFunctions(idlJson);
      setGeneratedCode(ts);
      setError("");
      setActiveTab("ts");
    } catch (err) {
      setError(
        `Conversion error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const downloadGeneratedCode = () => {
    if (!generatedCode) return;

    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(".json", ".ts") || "generated-functions.ts";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("File downloaded successfully");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy to clipboard");
      });
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Solana IDL to TypeScript Functions Converter
        </h1>

        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              onClick={triggerFileInput}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition-colors shadow-sm"
            >
              Upload IDL
            </button>
            {fileName && (
              <span className="ml-2 text-gray-700 font-medium">{fileName}</span>
            )}
          </div>

          <button
            onClick={handleConvert}
            className={`font-medium px-4 py-2 rounded-md transition-colors shadow-sm ${
              !idlContent
                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
            disabled={!idlContent}
          >
            Convert to TypeScript
          </button>

          {generatedCode && (
            <button
              onClick={downloadGeneratedCode}
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium px-4 py-2 rounded-md transition-colors shadow-sm"
            >
              Download TypeScript
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden flex rounded-t-lg overflow-hidden mb-0">
        <button
          className={`flex-1 py-3 font-medium text-center transition-colors ${
            activeTab === "idl"
              ? "bg-white text-blue-600 border-t-2 border-blue-500"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setActiveTab("idl")}
        >
          IDL JSON
        </button>
        <button
          className={`flex-1 py-3 font-medium text-center transition-colors ${
            activeTab === "ts"
              ? "bg-white text-blue-600 border-t-2 border-blue-500"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setActiveTab("ts")}
        >
          TypeScript
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 bg-white rounded-lg md:rounded-t-lg shadow-md overflow-hidden">
        <div
          className={`md:w-1/2 flex flex-col border-r overflow-hidden ${
            activeTab === "idl" ? "block" : "hidden md:block"
          }`}
        >
          <div className="flex justify-between items-center p-3 bg-gray-100 border-b">
            <h2 className="font-semibold text-gray-800">IDL JSON</h2>
            {idlContent && (
              <button
                onClick={() => copyToClipboard(idlContent)}
                className="flex items-center space-x-1 text-xs bg-black text-white hover:bg-white hover:text-black px-3 py-1.5 rounded transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                <span>Copy</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4 bg-white">
            <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
              {idlContent
                ? JSON.stringify(JSON.parse(idlContent), null, 2)
                : "Upload an IDL JSON file to see the content here."}
            </pre>
          </div>
        </div>

        <div
          className={`md:w-1/2 flex flex-col overflow-hidden ${
            activeTab === "ts" ? "block" : "hidden md:block"
          }`}
        >
          <div className="flex justify-between items-center p-3 bg-gray-100 border-b">
            <h2 className="font-semibold text-gray-800">
              Generated TypeScript
            </h2>
            {generatedCode && (
              <button
                onClick={() => copyToClipboard(generatedCode)}
                className="flex items-center space-x-1 text-xs bg-black text-white hover:bg-white hover:text-black px-3 py-1.5 rounded transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                <span>Copy</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4 bg-white">
            <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
              {generatedCode || "Generated TypeScript code will appear here."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDLConverter;
