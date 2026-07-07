"use client"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from 'next/navigation'
import { useEffect } from "react"
import { Sparkles, Brain, Shield, Zap, ArrowRight } from "lucide-react"
import AuroraBackground from "@/components/AuroraBackground";
export default function SignInPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") router.push('/')
  }, [status, router])

  // Show the spinner while the session resolves or while redirecting away.
  if (status !== "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070709]">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#5eadff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-3 sm:p-4">
      <AuroraBackground />

      <div className="page-content max-w-6xl w-full grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
        {/* Left Side - Hero Content */}
        <div className="text-center lg:text-left space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <div className="text-center mb-8">
              <span className="tag">AI × Presentations as code</span>
              <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight mt-6 mb-3 glitch" data-text="PPTgen">
                PPTgen
              </h1>
            </div>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-lg mx-auto">
              AI-designed presentations engineers edit as code — living slides you share as a link
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="glass-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-[#5eadff]" />
              <span className="font-medium text-sm sm:text-base text-[#5eadff]">Smart AI</span>
            </div>
            <div className="glass-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#b3ffc8]" />
              <span className="font-medium text-sm sm:text-base text-[#b3ffc8]">Secure</span>
            </div>
            <div className="glass-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#ff6ef7]" />
              <span className="font-medium text-sm sm:text-base text-[#ff6ef7]">Fast</span>
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="max-w-md w-full mx-auto">
          <div className="glass-card p-6 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#5eadff] to-[#ff6ef7] rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#0a0a12]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mb-2">Welcome</h2>
              <p className="text-sm sm:text-base text-gray-400">Sign in to start your journey</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl hover:border-[#5eadff]/60 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-gray-100 text-sm sm:text-base">Continue with Google</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
