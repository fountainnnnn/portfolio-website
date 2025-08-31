import "./globals.css";
import Link from "next/link";
import { Manrope } from "next/font/google";
import MouseTrailWrapper from "@/components/mousetrailwrapper"; // new wrapper

const manrope = Manrope({ subsets: ["latin"], weight: ["300", "400", "700", "800"] });

const nav = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/ml-game", label: "ML Game" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={manrope.className}
        style={{
          background: "#0b0f1a",
          color: "#e5e7eb",
          margin: 0,
          position: "relative",
        }}
      >
        {/* MouseTrail injected here, but wrapped as client component */}
        <MouseTrailWrapper />

        {/* NAVBAR */}
        <header
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: 24,
          }}
        >
          <nav
            style={{
              background: "#1f2937",
              borderRadius: 12,
              padding: "12px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "85%",
              boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            }}
          >
            <Link
              href="/"
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: "#f9fafb",
                textDecoration: "none",
              }}
            >
              Mervin&apos;s Neural Lab
            </Link>

            <div style={{ display: "flex", gap: 20 }}>
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  style={{
                    color: "#d1d5db",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        {/* MAIN CONTENT */}
        <main style={{ marginTop: 0 }}>{children}</main>
      </body>
    </html>
  );
}
