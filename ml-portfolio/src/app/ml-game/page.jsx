// Server Component (can export metadata)
import MLGame from "../../components/mlgame.jsx"; // direct import

export const metadata = { title: "Interactive ML Mini-Game — Your Name" };

export default function Page() {
  return (
    <main
      style={{
        width: "100%",
        margin: "0 auto",
        padding: "96px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ margin: "0 0 8px", textAlign: "center" }}>
        Interactive ML Mini-Game
      </h1>
      <p style={{ opacity: 0.8, marginTop: 0, marginBottom: 16, textAlign: "center" }}>
        Left-click = <span style={{ color: "#fecaca" }}>light red (1)</span>, Right-click =
        <span style={{ color: "#67e8f9" }}> cyan (0)</span>.
      </p>

      {/* Wrap to keep the game centered while allowing full width */}
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <MLGame />
      </div>
    </main>
  );
}
