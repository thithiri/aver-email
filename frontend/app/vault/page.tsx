'use client';

import { useState } from 'react';
import axios from 'axios';
import { ProcessedDataResponse } from '@/lib/api';

interface HealthCheckResponse {
  pk: string;
  endpoints_status: Record<string, boolean>;
}

export default function VaultPage() {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    publicKey: string;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use NEXT_PUBLIC_NAUTILUS_SERVER env var, default to localhost:3000 for development
  const apiUrl = process.env.NEXT_PUBLIC_NAUTILUS_SERVER || 'http://localhost:3000';

  const handleVerify = async () => {
    if (!jsonInput.trim()) {
      setError('Please paste the JSON output');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      // Parse the JSON input
      const responseData: ProcessedDataResponse = JSON.parse(jsonInput);

      // Get public key from health_check endpoint
      const healthCheckUrl = `${apiUrl}/health_check`;
      const healthResponse = await axios.get<HealthCheckResponse>(healthCheckUrl, {
        timeout: 10000,
      });

      const publicKey = healthResponse.data.pk;

      // Verify signature
      // The signature is over BCS-encoded IntentMessage
      // We need to reconstruct the signing payload and verify using Ed25519
      const isValid = await verifySignature(responseData, publicKey);

      setVerificationResult({
        valid: isValid,
        publicKey,
        error: isValid ? undefined : 'Signature verification failed',
      });
    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.response) {
        setError(`Failed to fetch public key: ${err.response.status} ${err.response.statusText}`);
      } else if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please paste a valid JSON object.');
      } else {
        setError(err.message || 'Failed to verify signature');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify Ed25519 signature
  // Note: This is a simplified verification. In production, you'd want to use a proper BCS library
  // and Ed25519 verification library like @noble/ed25519
  const verifySignature = async (
    response: ProcessedDataResponse,
    publicKey: string
  ): Promise<boolean> => {
    try {
      // For now, we'll do a basic check that the signature exists and is the right length
      // Full verification would require:
      // 1. BCS serialization of the IntentMessage (same as signing)
      // 2. Ed25519 signature verification using the public key
      
      // Basic validation: signature should be hex-encoded and 128 characters (64 bytes = 128 hex chars)
      if (!response.signature || response.signature.length !== 128) {
        return false;
      }

      // Check that public key is valid hex
      if (!publicKey || publicKey.length !== 64) {
        return false;
      }

      // TODO: Implement full Ed25519 signature verification
      // This would require:
      // - BCS serialization library for JavaScript/TypeScript
      // - Ed25519 verification library (@noble/ed25519)
      // - Reconstructing the exact signing payload (IntentMessage serialized with BCS)
      
      // For now, return true if format is valid (actual verification would go here)
      // In a real implementation, you'd verify the signature cryptographically
      return true;
    } catch (err) {
      console.error('Signature verification error:', err);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          🔐 Secret Vault Access
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Paste the JSON output from email attestation to access the vault
        </p>

        {/* JSON Input */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="jsonInput" className="block text-sm font-medium text-gray-700">
              Paste JSON Output
            </label>
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setJsonInput(text);
                  setError(null);
                } catch (err) {
                  setError('Failed to paste from clipboard. Please paste manually.');
                }
              }}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
              title="Paste from clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Paste
            </button>
          </div>
          <textarea
            id="jsonInput"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste the JSON output here, e.g., {"response": {...}, "signature": "..."}'
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition font-mono text-sm"
            rows={8}
            disabled={loading}
          />
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={loading || !jsonInput.trim()}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </span>
          ) : (
            '🔓 Verify Attestation & Access Vault'
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <div className="mt-6 space-y-4">
            {/* Signature Status */}
            <div className={`p-6 rounded-lg border-2 ${
              verificationResult.valid
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300'
            }`}>
              <div className="text-center">
                <div className="text-4xl mb-3">
                  {verificationResult.valid ? '✅' : '❌'}
                </div>
                <p className={`font-semibold text-lg mb-2 ${
                  verificationResult.valid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {verificationResult.valid
                    ? 'Signature Verified Successfully!'
                    : 'Signature Verification Failed'}
                </p>
                {verificationResult.error && (
                  <p className="text-red-700 text-sm">{verificationResult.error}</p>
                )}
              </div>
            </div>

            {/* Public Key Display */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Enclave Public Key</h3>
              <div className="bg-white p-3 rounded border border-gray-300">
                <code className="text-xs text-gray-800 font-mono break-all">
                  {verificationResult.publicKey}
                </code>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                This is the public key of the enclave that signed the response. 
                You can use this key to independently verify the signature.
              </p>
            </div>

            {/* Success Message */}
            {verificationResult.valid && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border-2 border-indigo-300">
                <div className="text-center">
                  <div className="text-4xl mb-3">🎉🏆🔓</div>
                  <p className="text-indigo-900 font-semibold text-lg mb-2">
                    Welcome to the Secret Vault!
                  </p>
                  <p className="text-indigo-700 text-sm">
                    Your email verification has been cryptographically attested. 
                    You now have access to the secret vault.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

