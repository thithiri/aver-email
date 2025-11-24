'use client';

import { useState } from 'react';
import { sendInvite } from '@/lib/api';

type PartyType = 'main party' | 'after party';

export default function EntryPage() {
  const [email, setEmail] = useState<string>('');
  const [partyType, setPartyType] = useState<PartyType>('main party');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await sendInvite('', {
        email,
        party_type: partyType,
      });
      setSuccess(result.message || `Invitation sent successfully to ${email}!`);
      setEmail(''); // Clear the form
    } catch (err: any) {
      console.error('Error sending invite:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to send invitation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Walrus Party Invitation
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              required
              disabled={loading}
            />
          </div>

          {/* Party Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Party Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="partyType"
                  value="main party"
                  checked={partyType === 'main party'}
                  onChange={(e) => setPartyType(e.target.value as PartyType)}
                  className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  disabled={loading}
                />
                <span className="text-gray-700 font-medium">Main Party</span>
              </label>
              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="partyType"
                  value="after party"
                  checked={partyType === 'after party'}
                  onChange={(e) => setPartyType(e.target.value as PartyType)}
                  className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  disabled={loading}
                />
                <span className="text-gray-700 font-medium">After Party</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              'Send me an email invite'
            )}
          </button>
        </form>

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg shadow-md">
            <div className="text-center">
              <div className="text-4xl mb-3">🎉✨🔐</div>
              <p className="text-green-800 font-semibold text-base mb-2">
                {success}
              </p>
              <p className="text-green-700 text-sm">
                📧 Check your invitation email and get attested to access the secret vault! 🏆
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

