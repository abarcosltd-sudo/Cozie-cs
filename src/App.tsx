import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Splash from "../Pages/splash";
import Login from "../Pages/login";
import Signup from "../Pages/signup";
import Verification from "../Pages/verification";
import Preference from "../Pages/Preference";

const API_URL = "https://cozie-ntlzuv990-abarcos-projects.vercel.app/api/home";

type ApiData = any;

function Home() {
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
    <div className="page">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="title">Cozie — Server Status</h1>
          <Link to="/splash" className="nav-link">Go to Splash</Link>
        </div>

        {loading && (
          <div className="center">
            <div className="spinner" aria-hidden />
            <div>Loading data from server...</div>
          </div>
        )}

        {!loading && error && (
          <div className="errorBox">
            <strong>Error fetching server data</strong>
            <div style={{ marginTop: 8 }}>{error}</div>
            <button className="button" onClick={fetchData}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="successBox">
            <strong>Server response</strong>
            <pre className="pre">{JSON.stringify(data, null, 2)}</pre>
            <button className="button" onClick={fetchData}>
              Refresh
            </button>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="center">No data available from server.</div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/splash" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/preference" element={<Preference />} />
      </Routes>
    </BrowserRouter>
  );
}

// const styles: Record<string, React.CSSProperties> = {
//   page: {
//     minHeight: "100vh",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     background: "linear-gradient(180deg,#f6f9fc,#eef6ff)",
//     padding: 20,
//   },
//   card: {
//     width: "100%",
//     maxWidth: 820,
//     background: "green",
//     borderRadius: 12,
//     padding: 28,
//     boxShadow: "0 6px 24px rgba(32,40,60,0.12)",
//     boxSizing: "border-box",
//   },
//   title: { margin: 0, marginBottom: 12, fontSize: 22 },
//   center: { display: "flex", gap: 12, alignItems: "center" },
//   spinner: {
//     width: 18,
//     height: 18,
//     borderRadius: 9,
//     border: "3px solid #01060cff",
//     borderTopColor: "#2563eb",
//     animation: "spin 1s linear infinite",
//   },
//   errorBox: {
//     background: "#2c2c2cff",
//     border: "1px solid #fecaca",
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 12,
//   },
//   successBox: {
//     background: "#16c24aff",
//     border: "1px solid #bbf7d0",
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 12,
//   },
//   pre: {
//     marginTop: 8,
//     maxHeight: 320,
//     overflow: "auto",
//     background: "#0a7ff3ff",
//     padding: 10,
//     borderRadius: 6,
//     fontSize: 13,
//   },
//   button: {
//     marginTop: 12,
//     padding: "8px 12px",
//     background: "#2563eb",
//     color: "white",
//     border: "none",
//     borderRadius: 6,
//     cursor: "pointer",
//   },
// };

// // Add keyframes for spinner animation via a small global style injection
// const styleEl = document.createElement("style");
// styleEl.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
// document.head.appendChild(styleEl);