'use client';

import Link from 'next/link';
import NextImage from 'next/image';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/" className="flex items-center justify-center gap-3">
          <div className="relative w-10 h-10">
            <NextImage 
              src="/logo.png" 
              alt="Aver.Email Logo" 
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Aver.Email
          </h1>
        </Link>
      </div>
    </header>
  );
}

