import { useEffect, useMemo, useState } from "react";
import "./App.css";
import heroImage from "./assets/hero.png";

const PYTHON_API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const RECORDS_API = (import.meta.env.VITE_RECORDS_API_URL || "http://localhost:8080/api/stoppages").replace(/\/+$/, "");
const UPLOAD_API = (import.meta.env.VITE_UPLOAD_API_URL || "http://localhost:8080/api/upload/xlsx").replace(/\/+$/, "");
const AI_API = `${PYTHON_API}/ask`;
const JAVA_API = (
  import.meta.env.VITE_JAVA_API_URL || "http://localhost:8080").replace(/\/+$/, "");

const INTRO_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1680463990599-9d318aaecf71?auto=format&fit=crop&w=2000&q=85",
    title: "Mining operations",
    subtitle: "Powering operations through reliable equipment"
  },
  {
    src: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=2000&q=85",
    title: "Industrial intelligence",
    subtitle: "Turning operational data into decisions"
  },
  {
    src: "https://images.unsplash.com/photo-1668243304566-2e78ebd48960?auto=format&fit=crop&w=2000&q=85",
    title: "People behind the operations",
    subtitle: "Safety, teamwork and operational excellence"
  },
];

const NAV_ITEMS = [ 
  { id: "overview", icon: "O", label: "Overview" },
  { id: "analytics", icon: "A", label: "Analytics" },
  { id: "records", icon: "E&R_", label: "Equipment & Records" }, 
  { id: "downloads", icon: "D", label: "Downloads" }, 
  { id: "data", icon: "DM", label: "Data Management" }, 
  { id: "ai", icon: "AI", label: "MINE AI" },
];

function normalizeRecord(item = {}) {
  return {
    stoppageId: item.stoppageId ?? item.Stoppage_ID ?? "",
    equipmentId: item.equipmentId ?? item.Equipment_ID ?? "",
    equipmentType: item.equipmentType ?? item.Equipment_Type ?? "",
    mineLocation: item.mineLocation ?? item.Mine_Location ?? "",
    stoppageDate: item.stoppageDate ?? item.Stoppage_Date ?? "",
    startTime: item.startTime ?? item.Start_Time ?? "",
    endTime: item.endTime ?? item.End_Time ?? "",
    durationMinutes: Number(item.durationMinutes ?? item.Duration_Minutes ?? 0),
    stoppageCategory: item.stoppageCategory ?? item.Stoppage_Category ?? "",
    stoppageReason: item.stoppageReason ?? item.Stoppage_Reason ?? "",
    reportedBy: item.reportedBy ?? item.Reported_By ?? "",
    remarks: item.remarks ?? item.Remarks ?? "",
  };
}

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");
const formatMinutes = (value) => `${formatNumber(value)} min`;

function App() {
  const [screen, setScreen] = useState("intro");
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [introScene, setIntroScene] = useState(0);
  const [introBlack, setIntroBlack] = useState(false);
  const [loadingDots, setLoadingDots] = useState(".");
  const [activePage, setActivePage] = useState("overview");

  const [summary, setSummary] = useState(null);
  const [equipment, setEquipment] = useState({});
  const [reasons, setReasons] = useState({});
  const [categories, setCategories] = useState({});
  const [types, setTypes] = useState({});
  const [locations, setLocations] = useState({});
  const [equipmentAnalytics, setEquipmentAnalytics] = useState([]);
  const [stoppages, setStoppages] = useState([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [analyticsChartIndex, setAnalyticsChartIndex] = useState(0);

  const [search, setSearch] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
     const fetchCsrfToken = async () => {
    const response = await fetch(`${JAVA_API}/api/auth/csrf`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to connect to the authentication service.");
    }

    const data = await response.json();
    setCsrfToken(data.token);
    return data.token;
  };

  const handleGetStarted = async () => {
    setLoginError("");

    try {
      await fetchCsrfToken();
    } catch (err) {
      setLoginError(err.message);
    }

    setScreen("login");
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loginLoading) return;

    setLoginLoading(true);
    setLoginError("");

    try {
      const token = csrfToken || await fetchCsrfToken();

      const response = await fetch(`${JAVA_API}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed.");
      }

      const sessionResponse = await fetch(`${JAVA_API}/api/auth/me`, {
        credentials: "include",
      });

      if (!sessionResponse.ok) {
        throw new Error("Login could not be verified. Please try again.");
      }

      setAuthenticated(true);
      setPassword("");
      setActivePage("overview");
      setScreen("app");

      await fetchCsrfToken();
    } catch (err) {
      setLoginError(err.message || "Unable to log in.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = csrfToken || await fetchCsrfToken();

      const response = await fetch(`${JAVA_API}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-XSRF-TOKEN": token,
        },
      });

      if (!response.ok) {
        throw new Error("Logout failed. Please try again.");
      }
    } catch (err) {
      setLoginError(err.message);
      return;
    }

    setAuthenticated(false);
    setUsername("");
    setPassword("");
    setChatMessages([]);
    setScreen("login");

    await fetchCsrfToken().catch(() => {});
  };

  useEffect(() => {
    const timers = [];
    const moveToBlack = (at) => timers.push(setTimeout(() => setIntroBlack(true), at));
    const moveToScene = (at, scene) => timers.push(setTimeout(() => {
      setIntroScene(scene);
      setIntroBlack(false);
    }, at));

    moveToBlack(1650);
    moveToScene(1850, 1);
    moveToBlack(3500);
    timers.push(setTimeout(() => setScreen("welcome"), 3750));

    const dotTimer = setInterval(() => {
      setLoadingDots((dots) => dots.length >= 3 ? "." : `${dots}.`);
    }, 180);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(dotTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        setError("");
        const recordsResponse = await fetch(RECORDS_API, { credentials: "include" });
        if (!recordsResponse.ok) {
          throw new Error(`Records API: ${recordsResponse.status}`);
        }

        const recordsData = await recordsResponse.json();
        if (cancelled) return;

        const recordsArray = Array.isArray(recordsData)
          ? recordsData
          : Array.isArray(recordsData?.records) ? recordsData.records : [];

        const normalizedRecords = recordsArray.map(normalizeRecord);
        const totalDowntime = normalizedRecords.reduce(
          (total, record) => total + record.durationMinutes, 0
        );

        const sumBy = (getKey) => normalizedRecords.reduce((result, record) => {
          const key = getKey(record) || "Unknown";
          result[key] = (result[key] || 0) + record.durationMinutes;
          return result;
        }, {});

        const countBy = (getKey) => normalizedRecords.reduce((result, record) => {
          const key = getKey(record) || "Unknown";
          result[key] = (result[key] || 0) + 1;
          return result;
        }, {});

        const equipmentStats = {};
        normalizedRecords.forEach((record) => {
          const id = record.equipmentId || "Unknown";
          if (!equipmentStats[id]) {
            equipmentStats[id] = {
              downtime: 0,
              count: 0,
              type: record.equipmentType || "Not available",
              location: record.mineLocation || "Not available",
            };
          }
          equipmentStats[id].downtime += record.durationMinutes;
          equipmentStats[id].count += 1;
        });

        const rankedEquipment = Object.entries(equipmentStats)
          .sort((a, b) => b[1].downtime - a[1].downtime);

        const reasonCounts = countBy((record) => record.stoppageReason);

        setSummary({
          totalStoppages: normalizedRecords.length,
          totalDowntimeMinutes: totalDowntime,
          averageDowntimeMinutes: normalizedRecords.length
            ? totalDowntime / normalizedRecords.length
            : 0,
        });

        setEquipment(Object.fromEntries(
          rankedEquipment.map(([id, stats]) => [id, stats.downtime])
        ));

        setReasons(Object.fromEntries(
          Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])
        ));

        setCategories(sumBy((record) => record.stoppageCategory));
        setTypes(sumBy((record) => record.equipmentType));
        setLocations(sumBy((record) => record.mineLocation));

        setEquipmentAnalytics(rankedEquipment.map(([name, stats]) => ({
          name,
          type: stats.type,
          location: stats.location,
          status: stats.downtime >= 8000
            ? "High Downtime"
            : stats.downtime >= 4000
              ? "Moderate Downtime"
              : "Lower Downtime",
          stoppageCount: stats.count,
          totalDowntimeMinutes: stats.downtime,
        })));

        setStoppages(normalizedRecords);
      } catch (err) {
        if (!cancelled) {
          console.error("Dashboard loading error:", err);
          setError(`Unable to load dashboard data: ${err.message}. Check that Spring Boot is running on port 8080.`);
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const equipmentOptions = useMemo(() => [...new Set(stoppages.map((item) => item.equipmentId).filter(Boolean))].sort(), [stoppages]);
  const categoryOptions = useMemo(() => [...new Set(stoppages.map((item) => item.stoppageCategory).filter(Boolean))].sort(), [stoppages]);
  const locationOptions = useMemo(() => [...new Set(stoppages.map((item) => item.mineLocation).filter(Boolean))].sort(), [stoppages]);

  const filteredStoppages = useMemo(() => {
    const searchText = search.toLowerCase().trim();
    return stoppages.filter((item) => {
      const values = [item.stoppageId, item.equipmentId, item.equipmentType, item.stoppageReason, item.remarks, item.mineLocation];
      return (!searchText || values.some((value) => String(value ?? "").toLowerCase().includes(searchText)))
        && (equipmentFilter === "All" || item.equipmentId === equipmentFilter)
        && (categoryFilter === "All" || item.stoppageCategory === categoryFilter)
        && (locationFilter === "All" || item.mineLocation === locationFilter);
    });
  }, [stoppages, search, equipmentFilter, categoryFilter, locationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStoppages.length / recordsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * recordsPerPage;
  const currentRecords = filteredStoppages.slice(startIndex, startIndex + recordsPerPage);
  const distinctEquipmentCount = new Set(stoppages.map((record) => record.equipmentId).filter(Boolean)).size;

  const resetFilters = () => {
    setSearch("");
    setEquipmentFilter("All");
    setCategoryFilter("All");
    setLocationFilter("All");
    setCurrentPage(1);
  };

  const exportRecords = (records, filename) => {
    const columns = [
      ["Stoppage ID", "stoppageId"],
      ["Equipment ID", "equipmentId"],
      ["Equipment Type", "equipmentType"],
      ["Mine Location", "mineLocation"],
      ["Stoppage Date", "stoppageDate"],
      ["Start Time", "startTime"],
      ["End Time", "endTime"],
      ["Duration Minutes", "durationMinutes"],
      ["Stoppage Category", "stoppageCategory"],
      ["Stoppage Reason", "stoppageReason"],
      ["Reported By", "reportedBy"],
      ["Remarks", "remarks"],
    ];

    const escapeCell = (value) =>
      '"' + String(value ?? "").replace(/"/g, '""') + '"';

    const csv = [
      columns.map(([label]) => escapeCell(label)).join(","),
      ...records.map((record) =>
        columns.map(([, key]) => escapeCell(record[key])).join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const askAI = async (customQuestion = null) => {
    const userQuestion = (customQuestion ?? question).trim();
    if (!userQuestion || aiLoading) return;
    setChatMessages((messages) => [...messages, { role: "user", content: userQuestion }]);
    setQuestion("");
    setAiLoading(true);
    try {
      const response = await fetch(AI_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuestion, data: stoppages }),
      });
      if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
      const result = await response.json();
      setChatMessages((messages) => [...messages, { role: "ai", content: result.answer ?? "The AI returned no answer." }]);
    } catch (err) {
      console.error("AI request error:", err);
      setChatMessages((messages) => [...messages, { role: "ai", content: "Unable to connect to MINE AI. Check that Spring Boot is running on port 8080." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askAI();
    }
  };

  const handleSelectedFile = (file) => {
    setUploadMessage("");
    setUploadError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = file.name.toLowerCase().split(".").pop();

    if (!["xlsx", "xls"].includes(extension)) {
      setSelectedFile(null);
      setUploadError("Please select a valid Excel file (.xlsx or .xls).");
      return;
    }

    setSelectedFile(file);
  };

  const uploadExcel = async (event) => {
    event.preventDefault();
    if (!selectedFile || uploading) return;

    setUploading(true);
    setUploadMessage("");
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(UPLOAD_API, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      let message = responseText.trim();

      try {
        const body = JSON.parse(responseText);
        message = body.detail || body.message || body.status || responseText;
      } catch {
        // The existing Spring Boot endpoint returns plain text.
      }

      if (!response.ok) {
        throw new Error(message || `Upload failed (${response.status})`);
      }

      setUploadMessage(
        `${message || "Upload request completed."} Note: dashboard analytics use the separate Python AI dataset and may not reflect this upload.`
      );

      setSelectedFile(null);

      const input = document.getElementById("excel-upload");
      if (input) input.value = "";

      setRefreshKey((key) => key + 1);
    } catch (err) {
      setUploadError(
        `${err.message}. Confirm the existing upload service is running at ${UPLOAD_API}.`
      );
    } finally {
      setUploading(false);
    }
  };

  if (screen === "intro") {
    return (
      <main className={`intro-screen ${introBlack ? "intro-black" : ""}`}>
        {!introBlack && (
          <>
            <img className="intro-photo" src={INTRO_IMAGES[introScene].src} alt={INTRO_IMAGES[introScene].title} />
            <div className="intro-shade" />
            <div className="intro-caption">
              <span className="eyebrow">MINING INTELLIGENCE PLATFORM</span>
              <h1>{INTRO_IMAGES[introScene].title}</h1>
              <p>{INTRO_IMAGES[introScene].subtitle}</p>
            </div>
          </>
        )}
        {introBlack && <div className="intro-dots">{loadingDots}</div>}
        <div className="intro-progress"><span style={{ width: `${Math.min(100, (introScene + (introBlack ? 0.5 : 1)) / INTRO_IMAGES.length * 100)}%` }} /></div>
      </main>
    );
  }
 if (screen === "welcome") {
  return (
    <main className="welcome-screen">
      <div className="welcome-backdrop" />

      <div className="welcome-panel">
        <div className="welcome-brand">
          MINING <span>INTELLIGENCE</span>
        </div>

        <p className="eyebrow">
          MINING OPERATIONS Â· INTELLIGENCE Â· PERFORMANCE
        </p>

        <h1 className="welcome-title">
          Smarter insights.
          <br />
          <span>Stronger operations.</span>
        </h1>

        <p className="welcome-copy">
          Bring equipment performance, stoppage analytics and AI-assisted
          insights together in one operational workspace.
        </p>

         <button
            className="primary-button welcome-button"
            onClick={handleGetStarted}
         >
           Get started
         </button>


        <div className="welcome-foot">
          <span className="online-dot" />
          Platform workspace <span>â€¢</span> Data-led decisions
        </div>
      </div>

      <div className="welcome-wave" aria-hidden="true">
        Welcome
      </div>
    </main>
  );
}
if (screen === "login") {
return ( <main className="welcome-screen login-screen"> <div className="welcome-backdrop" />

    <div className="welcome-panel login-panel">
      <div className="welcome-brand">
        MINING <span>INTELLIGENCE</span>
      </div>

      <p className="eyebrow">
        SECURE ACCESS · OPERATIONS PLATFORM
      </p>

      <h1 className="welcome-title">
        Welcome back.
        <br />
        <span>Sign in to continue.</span>
      </h1>

      <p className="welcome-copy">
        Access equipment analytics, stoppage records and MINE AI.
      </p>

      <form className="login-form" onSubmit={handleLogin}>
        <label htmlFor="login-username">Username</label>
        <input
          id="login-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {loginError && (
          <p className="login-error" role="alert">
            {loginError}
          </p>
        )}

        <button
          className="primary-button welcome-button"
          type="submit"
          disabled={loginLoading}
        >
          {loginLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="welcome-foot">
        <span className="online-dot" />
        Secure platform access
      </div>
    </div>
  </main>
);

}

  return (
    <div className="platform-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          
          <div><strong>MINING INTELLIGENCE</strong><small>OPERATIONS PLATFORM</small></div>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`} onClick={() => setActivePage(item.id)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
              {item.id === "ai" && <span className="nav-live">LIVE</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span className="online-dot" /><div><strong>System status</strong><small>{error ? "Connection issue" : "Monitoring active"}</small></div></div>
          <div className="sidebar-version">MINING INTELLIGENCE <span>v1.0 Â· LOCAL WORKSPACE</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><div className="breadcrumb">WORKSPACE <span>/</span> {NAV_ITEMS.find((item) => item.id === activePage)?.label.toUpperCase()}</div><h1>{NAV_ITEMS.find((item) => item.id === activePage)?.label}</h1></div>
          <div className="topbar-right"><div className="system-pill"><span className="online-dot" /> {error ? "API CHECK REQUIRED" : "SYSTEM ONLINE"}</div><div className="topbar-avatar">N</div></div>
        </header>

        {error && <div className="error-banner"><strong>Data connection issue</strong><span>{error}</span><button onClick={() => setRefreshKey((key) => key + 1)}>Retry</button></div>}

        {activePage === "overview" && (
          <div className="page-content">
            <section className="page-intro"><div><p className="eyebrow">OPERATIONAL SNAPSHOT</p><h2>Think Ahead.<br /><span>Better Runtime.</span></h2><p>Live summary from the mining equipment stoppage dataset.</p></div><button className="secondary-button" onClick={() => setRefreshKey((key) => key + 1)}>Refresh data</button></section>
            <section className="kpi-grid">
              <KpiCard
                label="TOTAL STOPPAGES"
                value={summary ? formatNumber(summary.totalStoppages) : "T"}
                note="Recorded events"
                icon="T"
                tone="gold"
              />
              <KpiCard
                label="TOTAL DOWNTIME"
                value={summary ? formatNumber(summary.totalDowntimeMinutes) : "T D"}
                note="Minutes lost"
                icon="T D"
                tone="blue"
              />

              <KpiCard
                label="AVERAGE DOWNTIME"
                value={summary ? Number(summary.averageDowntimeMinutes).toFixed(2) : "A D"}
                note="Minutes per stoppage"
                icon="A D"
                tone="violet"
              />

              <KpiCard
                label="EQUIPMENT TRACKED"
                value={formatNumber(distinctEquipmentCount)}
                note="Unique equipment IDs"
                icon="EQ T™"
                tone="green"
              />


             </section>
            <section className="overview-grid">
              <ChartCard title="Equipment downtime" subtitle="Highest total downtime by equipment" data={equipment} suffix=" min" limit={7} />
              <ChartCard title="Most reported reasons" subtitle="Frequency of stoppage reasons" data={reasons} suffix=" events" limit={6} />
            </section>
            <section className="overview-grid three">
              <ChartCard title="Stoppage categories" subtitle="Downtime by category" data={categories} suffix=" min" limit={5} />
              <ChartCard title="Equipment types" subtitle="Downtime by equipment type" data={types} suffix=" min" limit={5} />
              <ChartCard title="Mine locations" subtitle="Downtime by location" data={locations} suffix=" min" limit={5} />
            </section>
            <section className="panel">
              <div className="panel-heading"><div><h3>Equipment performance snapshot</h3><p>Equipment ranked by total downtime</p></div><button className="text-button" onClick={() => setActivePage("records")}>View all records A_R</button></div>
              <EquipmentTable items={equipmentAnalytics.slice(0, 6)} />
            </section>
          </div>
        )}

        {activePage === "analytics" && (
          <div className="page-content analytics-page">
            <section className="page-intro analytics-intro">
              <div>
                <p className="eyebrow">PERFORMANCE EXPLORER</p>
                <h2>Explore the patterns<br /><span>behind lost operating time.</span></h2>
                <p>Compare equipment downtime, stoppage frequency and category distribution using your loaded records.</p>
              </div>
              <button className="secondary-button" onClick={() => setRefreshKey((key) => key + 1)}>
                Refresh data
              </button>
            </section>

            <section className="analytics-chart-panel">
              <div className="analytics-chart-heading">
                <div>
                  <p className="eyebrow">INTERACTIVE DATA VIEW</p>
                  <h3>{[
                    "Equipment downtime trend",
                    "Stoppage reason comparison",
                    "Downtime category distribution"
                  ][analyticsChartIndex]}</h3>
                  <p>{[
                    "Compare total downtime across the highest-ranked equipment.",
                    "Compare how frequently each stoppage reason occurs.",
                    "See how total downtime is distributed across categories."
                  ][analyticsChartIndex]}</p>
                </div>
                <span className="analytics-chart-number">
                  {String(analyticsChartIndex + 1).padStart(2, "0")} <span>/ 03</span>
                </span>
              </div>

              <div className="analytics-chart-tabs" role="group" aria-label="Chart view">
                {["LINE", "BARS", "PIE"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={analyticsChartIndex === index ? "active" : ""}
                    onClick={() => setAnalyticsChartIndex(index)}
                    aria-pressed={analyticsChartIndex === index}
                  >
                    <span>{label}</span> {label} chart
                  </button>
                ))}
              </div>
<AnalyticsChart
                type={["line", "bar", "pie"][analyticsChartIndex]}
                data={[
                  Object.entries(equipment || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 10),
                  Object.entries(reasons || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 8),
                  Object.entries(categories || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 7)
                ][analyticsChartIndex]}
                suffix={[" min", " events", " min"][analyticsChartIndex]}
              />

              <div className="analytics-chart-navigation">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={analyticsChartIndex === 0}
                  onClick={() => setAnalyticsChartIndex((index) => Math.max(0, index - 1))}
                >
                  Previous
                </button>
                <span>{analyticsChartIndex + 1} / 3</span>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={analyticsChartIndex === 2}
                  onClick={() => setAnalyticsChartIndex((index) => Math.min(2, index + 1))}
                >
                  Next 
                </button>
              </div>
            </section>

            <section className="analytics-coverage panel">
              <div className="analytics-coverage-heading">
                <div>
                  <p className="eyebrow">DATA COVERAGE</p>
                  <h3>Operational dataset</h3>
                  <p>Coverage summary calculated from the records returned by the Spring Boot API.</p>
                </div>
                <span className="coverage-live"><span /> LIVE DATA</span>
              </div>

              <div className="coverage-metric-grid">
                {[
                  { label: "Loaded records", value: stoppages.length, note: "Records available for analysis" },
                  { label: "Equipment IDs", value: distinctEquipmentCount, note: "Distinct equipment tracked" },
                  { label: "Mine locations", value: locationOptions.length, note: "Locations represented" },
                  { label: "Stoppage categories", value: categoryOptions.length, note: "Categories represented" }
                ].map((metric) => (
                  <article className="coverage-metric" key={metric.label}>
                    <div className="coverage-metric-top">
                      <span>{metric.label}</span>
                      <strong>{formatNumber(metric.value)}</strong>
                    </div>
                    <div className="coverage-progress" aria-label={`${metric.label}: ${formatNumber(metric.value)}`}>
                      <span style={{
                        width: `${stoppages.length ? Math.max(0, Math.min(100, metric.value / stoppages.length * 100)) : 0}%`
                      }} />
                    </div>
                    <p>{metric.note}</p>
                  </article>
                ))}
              </div>

              <div className="coverage-footnote">
                <span> </span>
                <p>Charts and coverage indicators use the currently loaded records. Use â†» Refresh data to fetch the latest records.</p>
              </div>
            </section>
          </div>
        )}

        {activePage === "records" && (
          <div className="page-content records-page">
            <section className="page-intro compact"><div><p className="eyebrow">EQUIPMENT REGISTER</p><h2>Equipment & stoppage records</h2><p>Search, filter and inspect records returned by the API.</p></div><div className="record-total"><strong>{formatNumber(filteredStoppages.length)}</strong><span>MATCHING RECORDS</span></div></section>
            <section className="panel records-panel">
              <div className="filter-grid">
                <label className="field search-field"><span>Search records</span><input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="ID, equipment, reason, remarksâ€¦" /></label>
                <label className="field"><span>Equipment</span><select value={equipmentFilter} onChange={(e) => { setEquipmentFilter(e.target.value); setCurrentPage(1); }}><option>All</option>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="field"><span>Category</span><select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}><option>All</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="field"><span>Location</span><select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}><option>All</option>{locationOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <button className="secondary-button clear-filters" onClick={resetFilters}>Clear filters</button>
              </div>
              <div className="table-wrap"><table className="data-table"><thead><tr><th>ID</th><th>Equipment</th><th>Type</th><th>Location</th><th>Date</th><th>Duration</th><th>Category</th><th>Reason</th><th>Reported by</th><th>Remarks</th></tr></thead><tbody>
                {currentRecords.map((item, index) => <tr key={`${item.stoppageId}-${index}`}><td className="mono">{item.stoppageId || "ID”"}</td><td className="strong-cell">{item.equipmentId || "EID”"}</td><td>{item.equipmentType || "ETP”"}</td><td>{item.mineLocation || "mi lc"}</td><td>{item.stoppageDate || "DATE"}</td><td className="duration-cell">{formatNumber(item.durationMinutes)} min</td><td><span className="category-tag">{item.stoppageCategory || "Unknown"}</span></td><td>{item.stoppageReason || "SR”"}</td><td>{item.reportedBy || "SR" }</td><td className="remarks-cell">{item.remarks || "SR"}</td></tr>)}
                {currentRecords.length === 0 && <tr><td colSpan={10} className="empty-cell">No matching stoppage records found.</td></tr>}
              </tbody></table></div>
              <div className="table-footer"><span>Showing {filteredStoppages.length ? startIndex + 1 : 0} - - - - {Math.min(startIndex + recordsPerPage, filteredStoppages.length)} of {filteredStoppages.length} records</span><div className="pagination"><button disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}> Previous</button><span>Page <b>{safePage}</b> of <b>{totalPages}</b></span><button disabled={safePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Next</button></div></div>
            </section>
          </div>
        )}

        {activePage === "data" && (
          <div className="page-content data-page">
            <section className="page-intro compact"><div><p className="eyebrow">DATA OPERATIONS</p><h2>Data management</h2><p>Upload an Excel dataset through the existing upload service.</p></div><div className="record-total"><strong>{formatNumber(stoppages.length)}</strong><span>LOADED RECORDS</span></div></section>
            <section className="data-management-grid">
              <form className="panel upload-panel" onSubmit={uploadExcel}>
                <div className="upload-icon">XLSX</div><p className="eyebrow">EXCEL IMPORT</p><h3>Add stoppage records</h3><p className="panel-description">Choose an .xlsx or .xls file to submit it to the existing upload endpoint. The frontend does not modify database configuration.</p>
                <label
                  className={`drop-zone ${isDragging ? "drop-zone-active" : ""} ${selectedFile ? "drop-zone-selected" : ""}`}
                  htmlFor="excel-upload"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setIsDragging(false);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleSelectedFile(e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <span className="drop-icon">{selectedFile ? "file selected" : "upload file "}</span>
                  <strong>{selectedFile ? selectedFile.name : "Drop your Excel file here"}</strong>
                  <small>
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB Â· Ready to upload`
                      : "Drag and drop .xlsx or .xls, or click to browse"}
                  </small>
                  <input
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleSelectedFile(e.target.files?.[0] || null)}
                  />
                </label>
                <div className="upload-note"><strong>Before uploading</strong><span>Use the same column structure as the dataset currently accepted by your backend. Existing records are preserved only if the backend endpoint appends rather than replaces data.</span></div>
                <button className="primary-button upload-button" type="submit" disabled={!selectedFile || uploading}>{uploading ? "Uploadingâ€¦" : "Upload dataset"}</button>
                {uploadMessage && <div className="success-message">{uploadMessage}</div>}{uploadError && <div className="upload-error">{uploadError}</div>}
                <small className="endpoint-note">Upload service: {UPLOAD_API}</small>
              </form>
              <div className="data-side-column">
                <div className="panel data-summary"><p className="eyebrow">CURRENT DATASET</p><h3>Dataset overview</h3><div className="coverage-row"><span>Records loaded</span><strong>{formatNumber(stoppages.length)}</strong></div><div className="coverage-row"><span>Equipment tracked</span><strong>{formatNumber(distinctEquipmentCount)}</strong></div><div className="coverage-row"><span>Mine locations</span><strong>{formatNumber(locationOptions.length)}</strong></div><div className="coverage-row"><span>Categories</span><strong>{formatNumber(categoryOptions.length)}</strong></div><button className="secondary-button full-width" onClick={() => setRefreshKey((key) => key + 1)}>Refresh dataset view</button></div>
                <div className="panel warning-panel"><span className="warning-symbol">!</span><div><h3>Data safety</h3><p>This screen sends the selected file to the configured upload endpoint. Whether rows append, replace or reject duplicates is controlled by the existing backend; verify with a small test file before a production import.</p></div></div>
              </div>
            </section>
          </div>
        )}

        {activePage === "ai" && (
          <div className="page-content ai-page">
            <section className="page-intro compact"><div><p className="eyebrow">AI-ASSISTED OPERATIONS</p><h2>MINE AI</h2><p>Ask natural-language questions about the mining stoppage dataset.</p></div><div className="ai-online-pill"><span className="online-dot" /> AI SERVICE</div></section>
            <section className="mine-ai-layout">
              <aside className="ai-context-panel"><div className="ai-orb">HI!</div><p className="eyebrow">MINE AI ASSISTANT</p><h3>Ask better questions.<br /><span>Find useful signals.</span></h3><p className="muted-note">Answers come from the connected AI service. Verify important operational decisions against source records.</p><div className="ai-context-stat"><span>Records in workspace</span><strong>{formatNumber(stoppages.length)}</strong></div><button className="secondary-button full-width" onClick={() => setChatMessages([])}>+ New conversation</button></aside>
              <div className="panel chat-panel"><div className="chat-heading"><div><h3>Conversation</h3><p>Mining equipment intelligence</p></div><span className="chat-live"><span className="online-dot" /> READY</span></div>
                <div className="chat-body">
                  {chatMessages.length === 0 && <div className="chat-empty"><div className="empty-orb">HI!</div><h3>What would you like to know?</h3><p>Start with a suggested question or type your own.</p><div className="suggestion-grid">{["Which equipment has the highest downtime?","What is the most common stoppage reason?","Which location has the highest downtime?","Summarize mining equipment performance."].map((item) => <button key={item} onClick={() => askAI(item)}>{item}<span> </span></button>)}</div></div>}
                  {chatMessages.map((message, index) => <div className={`chat-message ${message.role === "user" ? "from-user" : "from-ai"}`} key={`${message.role}-${index}`}><div className="message-avatar">{message.role === "user" ? "Y" : "L ai"}</div><div><small>{message.role === "user" ? "YOU" : "MINE AI"}</small><p>{message.content}</p>{message.role === "ai" && <button className="copy-button" onClick={() => navigator.clipboard?.writeText(message.content)}>Copy response</button>}</div></div>)}
                  {aiLoading && <div className="chat-message from-ai"><div className="message-avatar">âœ¦</div><div><small>MINE AI</small><p className="typing">Analyzing mining data<span>.</span><span>.</span><span>.</span></p></div></div>}
                </div>
                <div className="chat-composer"><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={handleAIKeyDown} placeholder="Ask about equipment, downtime, reasons or locationsâ€¦" rows={2} /><button className="primary-button" onClick={() => askAI()} disabled={aiLoading || !question.trim()}>{aiLoading ? "Thinkingâ€¦" : "Send "}</button><small>Enter to send Â· Shift + Enter for a new line</small></div>
              </div>
            </section>
          </div>
        )}

        {activePage === "downloads" && (
          <div className="page-content downloads-page">
            <section className="page-intro compact">
              <div>
                <p className="eyebrow">DATA EXPORT</p>
                <h2>Download your records</h2>
                <p>Export the latest records available from the database API.</p>
              </div>
              <div className="record-total">
                <strong>{formatNumber(stoppages.length)}</strong>
                <span>TOTAL RECORDS</span>
              </div>
            </section>
            <section className="overview-grid">
              <div className="panel download-card">
                <p className="eyebrow">COMPLETE DATASET</p>
                <h3>All stoppage records</h3>
                <p>Download every record currently loaded from Spring Boot, including records outside the active filters.</p>
                <button className="primary-button" disabled={!stoppages.length}
                  onClick={() => exportRecords(stoppages, "mining-stoppage-all-records.csv")}>
                  Download all records 
                </button>
              </div>
              <div className="panel download-card">
                <p className="eyebrow">FILTERED DATASET</p>
                <h3>Matching records</h3>
                <p>Export only records matching the search, equipment, category and location filters on the Records page.</p>
                <strong className="download-count">{formatNumber(filteredStoppages.length)} records selected</strong>
                <button className="secondary-button" disabled={!filteredStoppages.length}
                  onClick={() => exportRecords(filteredStoppages, "mining-stoppage-filtered-records.csv")}>
                  Download filtered records
                </button>
                <button className="text-button" onClick={() => setActivePage("records")}>
                  Open records and filters
                </button>
              </div>
            </section>
            <p className="muted-note">Files are exported as UTF-8 CSV, which opens in Microsoft Excel. Exports use the records currently loaded from the database API.</p>
          </div>
        )}
        <footer className="app-footer"><span>Â© MINING INTELLIGENCE PLATFORM</span><span>OPERATIONAL DATA Â· ANALYTICS Â· AI</span></footer>
      </main>
    </div>
  );
}

function KpiCard({ label, value, note, icon, tone }) {
  return <article className="kpi-card"><div className={`kpi-icon ${tone}`}>{icon}</div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div><div className={`kpi-accent ${tone}`} /></article>;
}

function AnalyticsChart({ type, data = [], suffix = "" }) {
  const rows = (data || [])
    .map(([name, value]) => [String(name), Number(value) || 0])
    .filter(([, value]) => value >= 0);
  const maxValue = Math.max(1, ...rows.map(([, value]) => value));
  const width = 760;
  const height = 290;
  const padX = 44;
  const padY = 28;
  const points = rows.map(([name, value], index) => ({
    name,
    value,
    x: rows.length > 1
      ? padX + index * (width - padX * 2) / (rows.length - 1)
      : width / 2,
    y: height - padY - (value / maxValue) * (height - padY * 2)
  }));
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const total = rows.reduce((sum, [, value]) => sum + value, 0);
  const pieColors = ["#f4c65f", "#70b7ff", "#a78bfa", "#55d6a5", "#fb923c", "#f472b6", "#67e8f9"];
  let angle = 0;
  const pieSegments = rows.map(([name, value], index) => {
    const start = angle;
    angle += total > 0 ? value / total * 360 : 0;
    return {
      name,
      value,
      color: pieColors[index % pieColors.length],
      start,
      end: angle,
      percent: total ? value / total * 100 : 0
    };
  });
  const gradient = `conic-gradient(${pieSegments.map((segment) =>
    `${segment.color} ${segment.start}deg ${segment.end}deg`
  ).join(", ")})`;

  if (!rows.length) {
    return <div className="analytics-chart-empty">No records are available for this chart. â†» Refresh data to try again.</div>;
  }

  return (
    <div className={`analytics-visual analytics-visual-${type}`}>
      {type === "line" && (
        <div className="analytics-svg-wrap">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart of equipment downtime">
            {[0, 1, 2, 3, 4].map((step) => {
              const y = padY + step * (height - padY * 2) / 4;
              return <line key={step} x1={padX} y1={y} x2={width - padX} y2={y} className="chart-gridline" />;
            })}
            <polyline points={linePoints} className="analytics-line" />
            {points.map((point) => (
              <g key={point.name} className="analytics-line-point">
                <title>{`${point.name}: ${formatNumber(point.value)}${suffix}`}</title>
                <circle cx={point.x} cy={point.y} r="5" />
                <text x={point.x} y={Math.max(15, point.y - 13)} textAnchor="middle">
                  {formatNumber(point.value)}
                </text>
                <text x={point.x} y={height - 5} textAnchor="middle" className="chart-axis-label">
                  {point.name.length > 10 ? `${point.name.slice(0, 9)}â€¦` : point.name}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {type === "bar" && (
        <div className="analytics-bars">
          {rows.map(([name, value], index) => (
            <div className="analytics-bar-row" key={name} title={`${name}: ${formatNumber(value)}${suffix}`}>
              <div className="analytics-bar-label">
                <span>{name}</span><strong>{formatNumber(value)}{suffix}</strong>
              </div>
              <div className="analytics-bar-track">
                <span style={{
                  width: `${value / maxValue * 100}%`,
                  transitionDelay: `${index * 45}ms`
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {type === "pie" && (
        <div className="analytics-pie-layout">
          <div
            className="analytics-pie"
            style={{ background: total > 0 ? gradient : "#263343" }}
            role="img"
            aria-label="Pie chart of downtime category distribution"
            title={`Total: ${formatNumber(total)}${suffix}`}
          >
            <div className="analytics-pie-center">
              <strong>{formatNumber(total)}</strong>
              <span>{suffix.trim() || "total"}</span>
            </div>
          </div>
          <div className="analytics-pie-legend">
            {pieSegments.map((segment) => (
              <div className="analytics-legend-row" key={segment.name} title={`${segment.name}: ${formatNumber(segment.value)}${suffix} (${segment.percent.toFixed(1)}%)`}>
                <span className="analytics-legend-dot" style={{ background: segment.color }} />
                <span className="analytics-legend-name">{segment.name}</span>
                <strong>{segment.percent.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, data, suffix = "", limit = 8 }) {
  const rows = Object.entries(data || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, limit);
  const maxValue = rows.length ? Math.max(...rows.map(([, value]) => Number(value) || 0)) : 0;
  return <section className="panel chart-card"><div className="panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="chart-mark">#</span></div>
    {rows.length ? <div className="bar-list">{rows.map(([name, value]) => <div className="bar-row" key={name}><div className="bar-label"><span title={name}>{name}</span><strong>{formatNumber(value)}{suffix}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${maxValue ? (Number(value) / maxValue) * 100 : 0}%` }} /></div></div>)}</div> : <div className="empty-chart">Waiting for analytics dataâ€¦</div>}
  </section>;
}

function EquipmentTable({ items }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Equipment</th><th>Type</th><th>Location</th><th>Status</th><th>Stoppages</th><th>Total downtime</th></tr></thead><tbody>
    {items.map((item) => <tr key={item.name}><td className="strong-cell">{item.name}</td><td>{item.type}</td><td>{item.location}</td><td><span className={`status-tag ${item.status === "High Downtime" ? "high" : item.status === "Moderate Downtime" ? "moderate" : "low"}`}>{item.status}</span></td><td>{formatNumber(item.stoppageCount)}</td><td className="duration-cell">{formatMinutes(item.totalDowntimeMinutes)}</td></tr>)}
    {!items.length && <tr><td colSpan={6} className="empty-cell">No equipment analytics available.</td></tr>}
  </tbody></table></div>;
}

export default App;


