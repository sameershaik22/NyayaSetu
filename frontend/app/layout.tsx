import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NyayaSetu | Court Judgments to Verified Action Plans",
  description:
    "Government AI system that converts court judgments into structured, human-verified action plans for efficient compliance management.",
  keywords: "court judgment, legal compliance, government action plan, RTI, AI legal tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-slate-100" style={{ paddingTop: "68px" }}>
          {children}
        </main>
        {/* Government footer */}
        <footer className="bg-white border-t border-gray-200 mt-8">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              © 2024 NyayaSetu — Ministry of Law &amp; Justice, Government of India
            </div>
            <div className="text-xs text-gray-400">
              Version 1.0.0 — All outputs are human-verified before use
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
