import React, { useState } from "react";

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an IDL JSON file");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create form data to send the file
      const formData = new FormData();
      formData.append("idlFile", file);

      // Send to API endpoint
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedCode(data.code);
    } catch (err) {
      setError(
        `Failed to generate TypeScript: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(generatedCode)
      .then(() => {
        alert("Code copied to clipboard!");
      })
      .catch((err) => {
        setError(`Failed to copy: ${err}`);
      });
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-solana-ts.ts";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Solana IDL to TypeScript Generator
      </h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block mb-2 font-medium">
            Upload IDL JSON File:
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="border p-2 w-full rounded"
          />
        </div>

        <button
          type="submit"
          disabled={!file || isLoading}
          className={`px-4 py-2 rounded ${
            !file || isLoading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          {isLoading ? "Generating..." : "Generate TypeScript"}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {generatedCode && (
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <h2 className="text-xl font-semibold">
              Generated TypeScript Code:
            </h2>
            <div className="space-x-2">
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                Copy
              </button>
              <button
                onClick={downloadCode}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                Download
              </button>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-[600px]">
            <pre className="text-sm">
              <code>{generatedCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
