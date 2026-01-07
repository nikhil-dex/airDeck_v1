"use client";

import { useSession, signIn, signOut, } from "next-auth/react";
import { Send, User, Plus, Home, Info, Settings, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

const Navbar = ({ onToggleSidebar, isSidebarCollapsed }) => {
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
        {/* Mobile Sidebar Toggle */}
        <button 
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Desktop Sidebar Toggle */}
        {/* <button 
          onClick={onToggleSidebar}
          className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button> */}
        
        <h1 className="text-lg sm:text-xl font-semibold gradient-text">ppt-genx</h1>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="hidden md:flex gap-3 lg:gap-6 text-gray-700">
        <a href="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
          <Home className="w-4 h-4" /> 
          <span className="hidden lg:inline">Home</span>
        </a>
        <button 
          onClick={() => signOut()}>
          signOut
        </button>

        <a href="/about" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
          <Info className="w-4 h-4" /> 
          <span className="hidden lg:inline">About</span>
        </a>

        {!loading && session?.user ? (
          <>
            <a href="/profile" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
              <div className="relative">
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="User Image"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    unoptimized={true}
                  />
                ) : null}
                <div 
                  className={`w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center text-white text-sm font-bold ${session.user?.image ? 'hidden' : 'flex'}`}
                  style={{ display: session.user?.image ? 'none' : 'flex' }}
                >
                  {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              <span className="hidden lg:inline">Profile</span>
            </a>

            <a href="/profileSetting" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
              <Settings className="w-4 h-4" /> 
              <span className="hidden lg:inline">Settings</span>
            </a>
          </>
        ) : (
          <a href="/api/auth/signin" className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors">
            Sign In
          </a>
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
            <a 
              href="/" 
              className="text-gray-700 hover:text-blue-600 flex items-center gap-2 py-2 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Home className="w-4 h-4 text-gray-600" /> Home
            </a>

            <a 
              href="/about" 
              className="text-gray-700 hover:text-blue-600 flex items-center gap-2 py-2 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Info className="w-4 h-4 text-gray-600" /> About
            </a>

            {!loading && session?.user ? (
              <>
                <a 
                  href="/profile" 
                  className="text-gray-700 hover:text-blue-600 flex items-center gap-2 py-2 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="relative">
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt="User Image"
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                        unoptimized={true}
                      />
                    ) : null}
                    <div 
                      className={`w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold ${session.user?.image ? 'hidden' : 'flex'}`}
                      style={{ display: session.user?.image ? 'none' : 'flex' }}
                    >
                      {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                  Profile
                </a>

                <a 
                  href="/profileSetting" 
                  className="text-gray-700 hover:text-blue-600 flex items-center gap-2 py-2 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="w-4 h-4 text-gray-600" /> Settings
                </a>
              </>
            ) : (
              <a 
                href="/api/auth/signin" 
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </a>
            )}
          </nav>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;
