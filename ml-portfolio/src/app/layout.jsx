import Link from "next/link";

const nav = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/ml-game", label: "ML Game" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning style={{ background: "#0b0f1a", color: "#e5e7eb" }}>
        <header style={{ position: "fixed", insetInline: 0, top: 0, zIndex: 50 }}>
          <nav style={{ maxWidth: 960, margin: "0 auto", padding: "12px 16px",
                        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link href="/" style={{ fontWeight: 600, color: "inherit", textDecoration: "none" }}>
              YourName
            </Link>
            <div style={{ display: "flex", gap: 16 }}>
              {nav.map(n => (
                <Link key={n.href} href={n.href} style={{ color: "inherit", textDecoration: "none" }}>
                  {n.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <div style={{ paddingTop: 56 }} />
        {children}
      </body>
    </html>
  );
}
