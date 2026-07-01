"use client";

// Catches errors in the root layout itself. Must render its own <html>/<body>.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
          background: "#0b0d13",
          color: "#eef1f8",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 48 }}>🌀</div>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Something went wrong</h1>
        <button
          onClick={reset}
          style={{
            borderRadius: 12,
            background: "#7c5cff",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
