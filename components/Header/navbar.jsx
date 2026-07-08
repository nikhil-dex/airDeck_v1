"use client";

import { useSession } from "next-auth/react";
import { Home, Presentation, Menu } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

const UserAvatar = ({ user, size = 32 }) => (
  <div className="relative">
    {user?.image ? (
      <Image
        src={user.image}
        alt="User Image"
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        unoptimized={true}
      />
    ) : (
      <div
        className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center text-white text-sm font-bold"
        style={{ width: size, height: size }}
      >
        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
      </div>
    )}
  </div>
);

const Navbar = ({ onToggleSidebar }) => {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="flex items-center justify-between bg-black/40 backdrop-blur-xl px-4 sm:px-6 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-white/10 relative z-50">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-gray-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link href="/" className="text-3xl font-extrabold tracking-tight glitch" data-text="PPTgen">
          PPTgen
        </Link>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-gray-300">
        <Link href="/" className="hover:text-[#5eadff] flex items-center gap-1 transition-colors">
          <Home className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>

        {!loading && session?.user ? (
          <>
            <Link href="/presentations" className="hover:text-[#5eadff] flex items-center gap-1 transition-colors">
              <Presentation className="w-4 h-4" />
              <span className="hidden lg:inline">My Decks</span>
            </Link>

            <Link href="/profile" className="flex items-center gap-2 hover:text-[#5eadff] transition-colors" title="Profile">
              <UserAvatar user={session.user} size={32} />
              <span className="hidden lg:inline text-sm font-medium">{session.user.name}</span>
            </Link>
          </>
        ) : (
          <Link href="/signin" className="btn-accent px-4 py-1.5 rounded-lg">
            Sign In
          </Link>
        )}
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-white/10 text-gray-200 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu */}
          <div ref={mobileMenuRef} className="absolute top-full left-0 right-0 bg-[#0d0d12] border-b border-white/10 shadow-2xl z-[9999] md:hidden">
            <nav className="flex flex-col p-4 space-y-3">
              <Link
                href="/"
                className="text-gray-300 hover:text-[#5eadff] flex items-center gap-2 py-2 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4 text-gray-500" /> Home
              </Link>

              {!loading && session?.user ? (
                <>
                  <Link
                    href="/presentations"
                    className="text-gray-300 hover:text-[#5eadff] flex items-center gap-2 py-2 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Presentation className="w-4 h-4 text-gray-500" /> My Decks
                  </Link>

                  <Link
                    href="/profile"
                    className="flex items-center gap-2 py-2 text-gray-300 hover:text-[#5eadff] transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserAvatar user={session.user} size={24} />
                    <span className="text-sm font-medium">{session.user.name}</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/signin"
                  className="btn-accent px-4 py-2 rounded-lg text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;
