'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { templates, Template } from '@/lib/templates';
import { processData, ProcessedDataResponse } from '@/lib/api';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_NAUTILUS_SERVER || 'http://localhost:3000';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessedDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleCopyJson = async () => {
    if (!result) return;
    
    try {
      const jsonString = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.eml')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a .eml file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.eml')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a .eml file');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!file || !selectedTemplate) {
      setError('Please select both a file and a template');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Read file as base64
      const base64Message = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result && typeof reader.result === 'string') {
            // Remove data URL prefix (data:application/octet-stream;base64,)
            const base64 = reader.result.includes(',')
              ? reader.result.split(',')[1]
              : reader.result;
            resolve(base64);
          } else if (reader.result instanceof ArrayBuffer) {
            // Convert ArrayBuffer to base64
            const bytes = new Uint8Array(reader.result);
            const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
            resolve(btoa(binary));
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call API
      console.log('Calling API:', apiUrl);
      console.log('Template regexes:', selectedTemplate.regexes);
      console.log('Message length (base64):', base64Message.length);
      
      const response = await processData(apiUrl, {
        payload: {
          message: base64Message,
          regexes: selectedTemplate.regexes,
          templateBlobId: selectedTemplate.blobId,
        },
      });

      console.log('Response received:', response);
      setResult(response);
    } catch (err: any) {
      console.error('Error processing email:', err);
      let errorMessage = 'Failed to process email';
      
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.error || 
                      err.response.data?.message || 
                      `Server error: ${err.response.status} ${err.response.statusText}`;
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check if the API is running and the URL is correct.';
      } else {
        // Error setting up the request
        errorMessage = err.message || 'Failed to process email';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [file, selectedTemplate, apiUrl]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Email Attestation
            </h1>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email File (.eml)
            </label>
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-0 text-center hover:border-gray-400 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept=".eml"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="bg-green-50 p-4 rounded-md min-h-24 flex flex-col items-center justify-center">
                    <p className="text-m text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Click to change</p>
                  </div>
                  ) : (
                    <div className="p-4 rounded-md min-h-24 flex items-center justify-center">
                      <p className="text-sm text-gray-600">
                        Drag and drop your .eml file here, or click to browse
                      </p>
                    </div>
                  )}
              </label>
            </div>
          </div>

          {/* Template Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose a template to attest against
              <Link
                href="/templates"
                className="ml-2 text-blue-600 hover:text-blue-800 font-medium text-sm underline"
              >
                (Learn more about templates)
              </Link>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !file || !selectedTemplate}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Processing...' : 'Verify Email'}
          </button>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Party Invitation Link */}
          {!result && (
            <div className="mt-14 mb-2">
              <Link
                href="/party"
                className="w-full h-20 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 text-center font-semibold shadow-md hover:shadow-lg"
              >
                🎉 Get invited to the party hosted by Walrus! Get an invitation email now! 🎉
              </Link>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Result</h2>
              
              <div className="space-y-4">
                {/* DKIM Signatures */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">DKIM Signatures</h3>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm">
                      Total: {result.response.data.dkim_signatures.total_count} | 
                      Verified: {result.response.data.dkim_signatures.verified_count}
                    </p>
                  </div>
                </div>

                {/* Regex Validations */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Regex Validations</h3>
                  <div className="space-y-2">
                    {result.response.data.regex_validations.map((validation, idx) => (
                      <div key={idx} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {validation.field}: {validation.regex}
                            </p>
                            {validation.matched_text && (
                              <p className="text-xs text-gray-600 mt-1">
                                Matched: {validation.matched_text}
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              validation.matched
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {validation.matched ? '✓ Matched' : '✗ Failed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Signature</h3>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs font-mono break-all">{result.signature}</p>
                  </div>
                </div>

                {/* Full Response (Collapsible) */}
                <details 
                  className="mt-4"
                  open={detailsOpen}
                  onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
                >
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        detailsOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    <span>View Full Attestation Response (JSON)</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleCopyJson();
                      }}
                      className="ml-auto px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                      title="Copy JSON to clipboard"
                    >
                      {copied ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </summary>
                  <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>

                {/* Celebratory Message for Party Invites */}
                {selectedTemplate && 
                 (selectedTemplate.id === 'main-party-invite' || selectedTemplate.id === 'after-party-invite') && 
                 result && 
                 result.response.data.regex_validations.every(v => v.matched) && 
                 result.response.data.dkim_signatures.verified_count > 0 && (
                  <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 border-2 border-purple-300 rounded-lg shadow-lg">
                    <div className="text-center">
                      <div className="text-5xl mb-4">🎉✨🔐</div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        Congratulations! Your Invitation is Verified! 🎊
                      </h3>
                      <p className="text-gray-700 mb-4 text-lg">
                        Copy the JSON output above and use it to access the secret vault.
                      </p>
                      <Link
                        href="/vault"
                        className="inline-block mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
                      >
                        🔓 Access Secret Vault
                      </Link>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

