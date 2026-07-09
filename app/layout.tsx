import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "../providers/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for OG image URLs in link unfurls.
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: "Pptgen",
  description: "Transform your ideas into stunning presentations with AI - Create professional PPTs in an instant",
  // iOS: run without browser chrome when launched from the home screen.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PPTgen",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f1a",
  // Let content extend under the iPhone notch/home indicator in standalone mode.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <AuthProvider>
       
        {children}
      
       </AuthProvider>
      </body>
    </html>
  );
}
