
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Cpu,
  Database,
  LayoutDashboard,
  Menu,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./index.css";

const API_URL = "http://localhost:8082/api/incidents";

const traffic = [
  { time: "09:00", incidents: 4, resolved: 3 },
  { time: "10:00", incidents: 7, resolved: 5 },
  { time: "11:00", incidents: 5, resolved: 4 },
  { time: "12:00", incidents: 11, resolved: 8 },
  { time: "13:00", incidents: 8, resolved: 7 },
  { time: "14:00", incidents: 14, resolved: 10 },
  { time: "15:00", incidents: 9, resolved: 8 },
  { time: "16:00", incidents: 6, resolved: 5 },
];

const initialServices = [
  { name: "API Gateway", detail: "Request routing", status: "Operational", uptime: "99.98%", icon: Wifi },
  { name: "Compute Cluster", detail: "Application workloads", status: "Degraded", uptime: "98.42%", icon: Cpu },
  { name: "MySQL Database", detail: "Primary database", status: "Operational", uptime: "99.99%", icon: Database },
  { name: "Authentication", detail: "Identity and access", status: "Operational", uptime: "99.95%", icon: ShieldCheck },
];

function Badge({ children, type = "" }) {
  return <span className={`badge ${type}`}>{children}</span>;
}

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    service: "API Gateway",
    severity: "Medium",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadIncidents() {
      setLoading(true);
      setApiError("");

      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("The API response was not an incident list.");
        }

        if (!cancelled) {
          setIncidents(data);
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(
            `${error.message}. Check that the Java backend is running on port 8081.`
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadIncidents();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      incidents.filter((item) => {
        const matchesQuery = `${item.id} ${item.title} ${item.service}`
          .toLowerCase()
          .includes(query.toLowerCase());

        return (
          matchesQuery &&
          (statusFilter === "All" || item.status === statusFilter)
        );
      }),
    [incidents, query, statusFilter]
  );

  const openCount = incidents.filter((item) => item.status === "Open").length;
  const activeCount = incidents.filter((item) => item.status !== "Resolved").length;
  const resolvedCount = incidents.filter((item) => item.status === "Resolved").length;

  function showMessage(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function createIncident(event) {
    event.preventDefault();

    if (!form.title.trim() || busy) return;

    setBusy(true);
    setApiError("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          service: form.service,
          severity: form.severity,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Server returned HTTP ${response.status}`);
      }

      const created = await response.json();

      setIncidents((old) => [
        created,
        ...old.filter((item) => item.id !== created.id),
      ]);
      setShowCreate(false);
      setForm({ title: "", service: "API Gateway", severity: "Medium" });
      showMessage("Incident created successfully");
    } catch (error) {
      setApiError(`Could not create incident: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id, status) {
    if (busy) return;

    const previous = incidents.find((item) => item.id === id);
    if (!previous || previous.status === status) return;

    setBusy(true);
    setApiError("");

    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Server returned HTTP ${response.status}`);
      }

      let updated;
      const responseText = await response.text();

      if (responseText.trim()) {
        updated = JSON.parse(responseText);
      } else {
        updated = { ...previous, status };
      }

      if (!updated.status) updated = { ...previous, ...updated, status };

      setIncidents((old) =>
        old.map((item) => (item.id === id ? { ...item, ...updated } : item))
      );
      setSelected((old) =>
        old && old.id === id ? { ...old, ...updated, status } : old
      );
      showMessage(`Incident ${id} updated to ${status}`);
    } catch (error) {
      setApiError(`Could not update incident: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={23} /></div>
          <div><strong>SentinelOps<span> AI</span></strong><small>INTELLIGENT OPERATIONS</small></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileMenu(false)}><X size={19} /></button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace">
          <div className="workspace-avatar">P</div>
          <div><strong>Production</strong><small>Infrastructure</small></div>
          <ChevronDown size={16} />
        </div>

        <div className="nav-label">OVERVIEW</div>
        <nav>
          <a className="nav-item active" href="#dashboard"><LayoutDashboard size={18} />Dashboard</a>
          <a className="nav-item" href="#incidents"><ShieldAlert size={18} />Incidents <span className="nav-count">{activeCount}</span></a>
          <a className="nav-item" href="#services"><Server size={18} />Services</a>
          <a className="nav-item" href="#analytics"><TrendingUp size={18} />Analytics</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="ai-card">
            <div className="ai-card-icon"><Zap size={18} /></div>
            <strong>AI monitoring active</strong>
            <p>Anomaly detection is monitoring your infrastructure.</p>
            <div className="ai-live"><span /> Model operational</div>
          </div>
          <div className="sidebar-user">
            <div className="user-avatar">A</div>
            <div><strong>Admin User</strong><small>Platform administrator</small></div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />}

      <main className="main-area" id="dashboard">
        <header className="topbar">
          <button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenu(true)}><Menu size={21} /></button>
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Dashboard</strong></div>
          <div className="topbar-actions">
            <div className="environment"><span /> Production</div>
            <button className="icon-btn notification-btn" aria-label="Notifications" onClick={() => showMessage("You are all caught up on notifications")}><Bell size={19} /><i /></button>
            <div className="top-avatar">A</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span /> SYSTEMS OVERVIEW</div>
              <h1>Operations dashboard</h1>
              <p>Monitor your infrastructure health and incident activity in real time.</p>
            </div>
            <button className="primary-btn" onClick={() => setShowCreate(true)}><span>+</span> Create incident</button>
          </section>

          {apiError && (
            <div role="alert" style={{ padding: 14, marginBottom: 16, border: "1px solid #ef4444", borderRadius: 10, color: "#fecaca", background: "#451a1a" }}>
              <strong>API connection issue</strong>
              <p style={{ margin: "6px 0 0" }}>{apiError}</p>
              <button className="outline-btn" style={{ marginTop: 10 }} onClick={() => window.location.reload()}>Retry connection</button>
            </div>
          )}

          <section className="metrics-grid">
            <article className="metric-card"><div className="metric-top"><span>Active incidents</span><div className="metric-icon purple"><AlertCircle size={19} /></div></div><div className="metric-value">{activeCount}<span className="metric-trend warning"><TrendingUp size={14} /> Live</span></div><div className="metric-foot">Incidents needing attention</div><div className="metric-line purple-line" /></article>
            <article className="metric-card"><div className="metric-top"><span>Open incidents</span><div className="metric-icon orange"><ShieldAlert size={19} /></div></div><div className="metric-value">{openCount}<span className="metric-trend warning">Requires action</span></div><div className="metric-foot">Awaiting investigation</div><div className="metric-line orange-line" /></article>
            <article className="metric-card"><div className="metric-top"><span>Services operational</span><div className="metric-icon green"><CheckCircle2 size={19} /></div></div><div className="metric-value">3<span className="metric-muted"> / 4 services</span></div><div className="metric-foot">One service experiencing degradation</div><div className="metric-line green-line" /></article>
            <article className="metric-card"><div className="metric-top"><span>Resolved incidents</span><div className="metric-icon blue"><Activity size={19} /></div></div><div className="metric-value">{resolvedCount}<span className="metric-trend positive">Updated</span></div><div className="metric-foot">Successfully mitigated</div><div className="metric-line blue-line" /></article>
          </section>

          <section className="content-grid" id="analytics">
            <article className="panel chart-panel">
              <div className="panel-heading"><div><h2>Incident activity</h2><p>Incident volume throughout the day</p></div><div className="chart-legend"><span><i className="legend-purple" />Detected</span><span><i className="legend-green" />Resolved</span></div></div>
              <div className="chart-summary"><strong>64</strong><span>events today</span><Badge type="success">Demo chart</Badge></div>
              <div className="chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={traffic} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}><defs><linearGradient id="detectedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.24} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient><linearGradient id="resolvedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.14} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 5" stroke="#273248" vertical={false} /><XAxis dataKey="time" tick={{ fill: "#8290a8", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8290a8", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#111b2c", border: "1px solid #28354b", borderRadius: 10, color: "#fff" }} /><Area type="monotone" dataKey="incidents" name="Detected" stroke="#a78bfa" strokeWidth={2.5} fill="url(#detectedFill)" /><Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" strokeWidth={2} fill="url(#resolvedFill)" /></AreaChart></ResponsiveContainer></div>
            </article>

            <article className="panel services-panel" id="services">
              <div className="panel-heading"><div><h2>Service health</h2><p>Infrastructure component status</p></div><button className="text-btn" onClick={() => showMessage("Showing all monitored services")}>View all</button></div>
              <div className="service-list">{initialServices.map((service) => { const Icon = service.icon; return <div className="service-row" key={service.name}><div className="service-icon"><Icon size={19} /></div><div className="service-info"><strong>{service.name}</strong><small>{service.detail}</small></div><div className="service-state"><Badge type={service.status === "Operational" ? "success" : "warning"}>{service.status}</Badge><small>{service.uptime}</small></div></div>; })}</div>
              <div className="service-footer"><span><i className="status-dot green-dot" />3 operational</span><span><i className="status-dot orange-dot" />1 degraded</span></div>
            </article>
          </section>

          <section className="panel incidents-panel" id="incidents">
            <div className="panel-heading incidents-heading"><div><h2>Recent incidents</h2><p>Track, investigate and resolve infrastructure issues</p></div><button className="outline-btn" onClick={() => { setStatusFilter("All"); setQuery(""); }}>View all incidents <span>→</span></button></div>
            <div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search incidents..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All</option><option>Open</option><option>Investigating</option><option>Resolved</option></select><span className="results-count">{loading ? "Loading..." : `${filtered.length} incidents`}</span></div>
            <div className="table-scroll"><table><thead><tr><th>INCIDENT</th><th>SERVICE</th><th>SEVERITY</th><th>STATUS</th><th>CREATED</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className="incident-row"><td><div className="incident-title"><strong>{item.title}</strong><small>{item.id}</small></div></td><td>{item.service}</td><td><Badge type={(item.severity || "Medium").toLowerCase()}><span className="severity-dot" />{item.severity}</Badge></td><td><Badge type={(item.status || "Open").toLowerCase()}>{item.status}</Badge></td><td className="time-cell"><Clock3 size={14} />{item.time}</td><td><button className="row-action" aria-label={`View ${item.id}`} onClick={(e) => { e.stopPropagation(); setSelected(item); }}>→</button></td></tr>)}</tbody></table>{!loading && filtered.length === 0 && <div className="empty-state">No incidents match your search.</div>}</div>
            <div className="table-footer">Showing {filtered.length} of {incidents.length} incidents <span>{loading ? "Loading from backend..." : "Connected to Java backend"}</span></div>
          </section>

          <footer className="footer"><span>SentinelOps AI <span className="footer-dot">·</span> Intelligent operations platform</span><span><i className="status-dot green-dot" />Backend API <span className="footer-dot">·</span> Port 8082</span></footer>
        </div>
      </main>

      {showCreate && <div className="modal-backdrop" onClick={() => !busy && setShowCreate(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><h2>Create incident</h2><p>Report a new infrastructure issue.</p></div><button className="icon-btn" disabled={busy} onClick={() => setShowCreate(false)}><X size={20} /></button></div><form onSubmit={createIncident}><label>Incident title<input required autoFocus placeholder="Describe the issue..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Service<select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}><option>API Gateway</option><option>Compute Cluster</option><option>MySQL Database</option><option>Analytics Service</option><option>Auth Service</option></select></label><label>Severity<select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><div className="modal-actions"><button type="button" className="outline-btn" disabled={busy} onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? "Saving..." : "Create incident"}</button></div></form></div></div>}

      {selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside className="detail-drawer" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">INCIDENT DETAILS</span><h2>{selected.id}</h2></div><button className="icon-btn" onClick={() => setSelected(null)}><X size={20} /></button></div><h3>{selected.title}</h3><p className="drawer-description">Review the incident information and update its current status.</p><div className="detail-field"><span>Severity</span><Badge type={(selected.severity || "Medium").toLowerCase()}>{selected.severity}</Badge></div><div className="detail-field"><span>Service</span><strong>{selected.service}</strong></div><div className="detail-field"><span>Status</span><Badge type={(selected.status || "Open").toLowerCase()}>{selected.status}</Badge></div><div className="detail-field"><span>Created</span><strong>{selected.time}</strong></div><div className="drawer-note"><CircleHelp size={18} /><span>Incident data is loaded from the Java backend. Changes are sent to the API.</span></div><label>Update status<select disabled={busy} value={selected.status} onChange={(e) => changeStatus(selected.id, e.target.value)}><option>Open</option><option>Investigating</option><option>Resolved</option></select></label><button className="primary-btn drawer-done" onClick={() => setSelected(null)}>Done</button></aside></div>}

      {notice && <div className="toast"><CheckCircle2 size={18} />{notice}<button onClick={() => setNotice("")}><X size={15} /></button></div>}
    </div>
  );
}
