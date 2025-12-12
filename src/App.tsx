import React, { useEffect, useState, type JSX } from "react";

const API_URL = "https://cozie-kohl.vercel.app/api/home";

type ApiData = any;

export default function App(): JSX.Element {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Server responded ${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Cozie — Server Status</h1>

        {loading && (
          <div style={styles.center}>
            <div style={styles.spinner} aria-hidden />
            <div>Loading data from server...</div>
          </div>
        )}

        {!loading && error && (
          <div style={styles.errorBox}>
            <strong>Error fetching server data</strong>
            <div style={{ marginTop: 8 }}>{error}</div>
            <button style={styles.button} onClick={fetchData}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div style={styles.successBox}>
            <strong>Server response</strong>
            <pre style={styles.pre}>{JSON.stringify(data, null, 2)}</pre>
            <button style={styles.button} onClick={fetchData}>
              Refresh
            </button>
          </div>
        )}

        {!loading && !error && !data && (
          <div style={styles.center}>No data available from server.</div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg,#f6f9fc,#eef6ff)",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 820,
    background: "green",
    borderRadius: 12,
    padding: 28,
    boxShadow: "0 6px 24px rgba(32,40,60,0.12)",
    boxSizing: "border-box",
  },
  title: { margin: 0, marginBottom: 12, fontSize: 22 },
  center: { display: "flex", gap: 12, alignItems: "center" },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    border: "3px solid #01060cff",
    borderTopColor: "#2563eb",
    animation: "spin 1s linear infinite",
  },
  errorBox: {
    background: "#2c2c2cff",
    border: "1px solid #fecaca",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  successBox: {
    background: "#16c24aff",
    border: "1px solid #bbf7d0",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  pre: {
    marginTop: 8,
    maxHeight: 320,
    overflow: "auto",
    background: "#0a7ff3ff",
    padding: 10,
    borderRadius: 6,
    fontSize: 13,
  },
  button: {
    marginTop: 12,
    padding: "8px 12px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};

// Add keyframes for spinner animation via a small global style injection
const styleEl = document.createElement("style");
styleEl.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleEl);
