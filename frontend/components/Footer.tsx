'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Navigation Links */}
          <div>
            <ul className="flex flex-wrap gap-4 justify-center text-sm">
              <li>
                <Link 
                  href="/" 
                  className="hover:text-white transition-colors"
                >
                  📧 Email Attestation
                </Link>
              </li>
              <li>
                <Link 
                  href="/templates" 
                  className="hover:text-white transition-colors"
                >
                  📋 Templates
                </Link>
              </li>
              <li>
                <Link 
                  href="/party" 
                  className="hover:text-white transition-colors"
                >
                  🎉 Party Invitation
                </Link>
              </li>
              <li>
                <Link 
                  href="/vault" 
                  className="hover:text-white transition-colors"
                >
                  🔐 Secret Vault
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs">
          <p>© {new Date().getFullYear()} AVER.EMAIL - Powered by Walrus, Nautilus and Seal of the SUI stack.</p>
        </div>
      </div>
    </footer>
  );
}

