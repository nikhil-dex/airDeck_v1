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
    <header className="flex items-center justify-between bg-white/80 backdrop-blur-sm shadow-lg px-4 sm:px-6 py-3 border-b border-white/20 relative z-50">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <h1 className="text-4xl font-extrabold mb-3 bg-[linear-gradient(90deg,#000,#7c3aed,#000)] bg-[length:200%_200%] animate-gradient bg-clip-text text-transparent">
          PPTgen
        </h1>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-gray-700">
        <Link href="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
          <Home className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>

        {!loading && session?.user ? (
          <>
            <Link href="/presentations" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
              <Presentation className="w-4 h-4" />
              <span className="hidden lg:inline">My Decks</span>
            </Link>

            <Link href="/profile" className="flex items-center gap-2 hover:text-blue-600 transition-colors" title="Profile">
              <UserAvatar user={session.user} size={32} />
              <span className="hidden lg:inline text-sm font-medium">{session.user.name}</span>
            </Link>
          </>
        ) : (
          <Link href="/signin" className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors">
            Sign In
          </Link>
        )}
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-[9998] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu */}
          <div ref={mobileMenuRef} className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl z-[9999] md:hidden">
            <nav className="flex flex-col p-4 space-y-3">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 flex items-center gap-2 py-2 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4 text-gray-600" /> Home
              </Link>

              {!loading && session?.user ? (
                <>
                  <Link
                    href="/presentations"
                    className="text-gray-700 hover:text-blue-600 flex items-center gap-2 py-2 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Presentation className="w-4 h-4 text-gray-600" /> My Decks
                  </Link>

                  <Link
                    href="/profile"
                    className="flex items-center gap-2 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserAvatar user={session.user} size={24} />
                    <span className="text-sm font-medium">{session.user.name}</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/signin"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-center"
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
