"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Upload Judgment", icon: "📄" },
  { href: "/verify", label: "Verify", icon: "✔" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Government top stripe */}
      <div className="gov-stripe fixed top-0 left-0 right-0 z-50" />

      <nav
        className="fixed top-1 left-0 right-0 z-40 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm"
        style={{ top: "4px" }}
      >
        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded flex items-center justify-center text-white font-bold text-base"
            style={{ background: "#1e3a8a" }}
          >
            ⚖
          </div>
          <div>
            <div className="font-bold text-gray-900 text-base leading-tight">NyayaSetu</div>
            <div className="text-xs text-gray-500 leading-tight">Court Judgment Action System</div>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="text-sm">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Government badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded border border-green-200 bg-green-50 text-green-800 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Government Use — Verified Output Only
        </div>
      </nav>
    </>
  );
}
