'use client';

import { useState } from 'react';
import Link from 'next/link';
import { templates } from '@/lib/templates';

export default function TemplatesPage() {
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  const toggleTemplate = (templateId: string) => {
    setExpandedTemplates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* What are Templates Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 What are Templates?</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Templates are pre-configured sets of <strong>regex patterns</strong> that validate different aspects of an email message:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Sender validation</strong>: Verify the email comes from a trusted domain or specific address</li>
              <li><strong>Recipient validation</strong>: Check if the email is sent to authorized recipients</li>
              <li><strong>Subject validation</strong>: Match specific subject line patterns</li>
              <li><strong>Body validation</strong>: Extract and verify content within the email body</li>
              <li><strong>Date validation</strong>: Ensure emails are within a specific time range</li>
            </ul>
            <p className="mt-4">
              Each template combines <strong>DKIM signature verification</strong> (cryptographic proof of email authenticity) 
              with <strong>regex pattern matching</strong> to ensure emails meet your specific requirements.
            </p>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-4">🛡 Immutable Templates</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              As templates are stored on Walrus, they are immutable and cannot be changed once created.
            </p>
            <p className="mt-4">
              Hence, attestation for verified emails against specified templates can always be verified for the validation rules.
            </p>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">💡 Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Use Case 1 */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">🎓 Educational Institutions</h3>
              <p className="text-gray-700 text-sm">
                Verify student emails from .edu domains and ensure they were received within a specific academic year. 
                Perfect for validating student status or academic credentials.
              </p>
            </div>

            {/* Use Case 2 */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">🏢 Corporate Email Verification</h3>
              <p className="text-gray-700 text-sm">
                Validate emails from specific corporate domains (e.g., @mystenlabs.com) to ensure internal communications 
                are authentic and from authorized senders.
              </p>
            </div>

            {/* Use Case 3 */}
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">🎉 Event Invitations</h3>
              <p className="text-gray-700 text-sm">
                Verify party invitations with secret codes. Extract invitation details like party type and unique access codes 
                to grant entry to exclusive events.
              </p>
            </div>

            {/* Use Case 4 */}
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">🔐 Access Control</h3>
              <p className="text-gray-700 text-sm">
                Use email verification as a form of access control. Only emails that pass both DKIM verification and regex 
                validation can unlock access to protected resources or secret vaults.
              </p>
            </div>

            {/* Use Case 5 */}
            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">📧 Transaction Receipts</h3>
              <p className="text-gray-700 text-sm">
                Verify payment receipts by checking sender domains (e.g., @stripe.com), extracting receipt numbers, 
                and validating payment dates for financial record-keeping.
              </p>
            </div>

            {/* Use Case 6 */}
            <div className="border-l-4 border-indigo-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">🛡️ Security & Compliance</h3>
              <p className="text-gray-700 text-sm">
                Ensure emails meet compliance requirements by validating sender identity, content patterns, 
                and timestamps. Critical for audit trails and regulatory compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Available Templates Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 Sample Templates</h2>
          <div className="space-y-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-m font-semibold text-gray-900 mb-1">{template.name}</h3>
                    <p className="text-gray-600 text-xs">{template.description}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={() => toggleTemplate(template.id)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <span>Validation Rules</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        expandedTemplates.has(template.id) ? 'rotate-180' : ''
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
                  </button>
                  {expandedTemplates.has(template.id) && (
                    <div className="mt-3 space-y-2">
                      {template.regexes.map((regex, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                              {regex.field}
                            </span>
                            <span className="text-xs text-gray-500">matches</span>
                          </div>
                          <code className="text-xs text-gray-800 font-mono bg-white px-2 py-1 rounded block mt-1">
                            {regex.regex}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Upload Email</h3>
                <p className="text-gray-700 text-sm">
                  Upload a .eml email file that you want to verify. The email is encoded and sent to the Nautilus enclave.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">DKIM Verification</h3>
                <p className="text-gray-700 text-sm">
                  The enclave verifies DKIM signatures using DNS queries (over HTTPS) to ensure the email is cryptographically 
                  authentic and hasn't been tampered with.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Regex Validation</h3>
                <p className="text-gray-700 text-sm">
                  The selected template's regex patterns are applied to validate sender, recipient, subject, body, and date fields. 
                  All patterns must match for verification to succeed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Signed Response</h3>
                <p className="text-gray-700 text-sm">
                  If all validations pass, the enclave returns a cryptographically signed response that proves the email 
                  verification was performed in a trusted environment. This signature can be verified independently.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Trust Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔒 Security & Trust</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Nautilus - trusted execution environment</h3>
              <p className="text-gray-700 text-sm">
                All email attestation happens inside an AWS Nitro Enclave - a hardware-backed trusted execution environment 
                that ensures your email data is processed securely and cannot be accessed by unauthorized parties.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Cryptographic Attestation</h3>
              <p className="text-gray-700 text-sm">
                Every attestation result is cryptographically signed, providing proof that the verification was performed 
                in the trusted enclave and attested on-chain on the Sui blockchain. This attestation can be independently verified by anyone.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            🚀 Start Verifying Emails
          </Link>
        </div>
      </div>
    </div>
  );
}

