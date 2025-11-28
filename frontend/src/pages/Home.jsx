export default function Home({ onStart }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#111",
        color: "#fff",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: "20px 0" }}>Alat za kompoziciju layouta</h1>
      <p style={{ maxWidth: 600, margin: "10px 0", lineHeight: 1.5 }}>Ovaj alat Vam omogućava da pomoću dvije ili više već postojećih web stranica dizajnirate layout Vaše stranice. </p>
      <p>U par klikova dizajnirajte skicu layouta Vaše web stranice!</p>

      <button
        onClick={onStart}
        style={{
          padding: "12px 24px",
          fontSize: "1.2em",
          borderRadius: 6,
          background: "#646cff",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Počni sa segmentacijom
      </button>
    </div>
  );
}
