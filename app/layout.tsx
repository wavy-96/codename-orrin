import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({ 
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ["latin"],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Interview Prep - AI-Powered Interview Practice",
  description: "Practice interviews with AI-powered interviewers. Get personalized feedback and improve your interview skills with voice-based conversations.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Interview Prep",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F5F1E6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
