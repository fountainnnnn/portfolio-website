// Server Component (can export metadata)
import MLGame from "../../components/MLGame.jsx"; // direct import

export const metadata = { title: "Interactive ML Mini-Game — Your Name" };

export default function Page() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "96px 16px" }}>
      <h1 style={{ margin: "0 0 8px" }}>Interactive ML Mini-Game</h1>
      <p style={{ opacity: 0.8, marginTop: 0, marginBottom: 16 }}>
        Left-click = <span style={{ color: "#60a5fa" }}>blue (1)</span>, Right-click =
        <span style={{ color: "#f97316" }}> orange (0)</span>.
      </p>
      <MLGame />
    </main>
  );
}
