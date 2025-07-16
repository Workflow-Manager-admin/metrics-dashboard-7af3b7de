import React, { useEffect, useState, useMemo } from "react";

// PUBLIC_INTERFACE
/**
 * MetricsDashboard fetches app generation metrics and displays them
 * in a sortable, filterable, paginated, responsive table with summary stats.
 * Features: filtering (name/model/version/date), search, pagination,
 * sort by column, summary, clickable links, light/dark mode support.
 */
function MetricsDashboard({ theme }) {
  // Table column configs
  const columns = [
    { key: "app_name", label: "App Name", sortable: true },
    { key: "model", label: "Model", sortable: true },
    { key: "cga_version", label: "CGA Version", sortable: true },
    { key: "creation_time", label: "Created At", sortable: true },
    { key: "tokens_used", label: "Tokens", sortable: true },
    { key: "duration_seconds", label: "Time (s)", sortable: true },
    { key: "cost", label: "Cost (USD)", sortable: true },
    { key: "project_link", label: "Project", sortable: false },
  ];

  // State
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filtering/sorting/pagination state
  const [search, setSearch] = useState("");
  const [filterApp, setFilterApp] = useState(""); // app_name
  const [filterModel, setFilterModel] = useState("");
  const [filterVersion, setFilterVersion] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("creation_time");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Fetch metrics from backend
  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    fetch("http://localhost:3001/metrics")
      .then((res) => {
        if (!res.ok) throw new Error("Error fetching metrics");
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message);
        setLoading(false);
      });
  }, []);

  // Filtered, searched, sorted data:
  const filteredMetrics = useMemo(() => {
    let result = [...metrics];

    // Text search filter (App Name, Model, CGA Version)
    const s = search.trim().toLowerCase();
    if (s) {
      result = result.filter(
        (row) =>
          row.app_name?.toLowerCase().includes(s) ||
          row.model?.toLowerCase().includes(s) ||
          row.cga_version?.toLowerCase().includes(s)
      );
    }
    if (filterApp) result = result.filter(row => row.app_name === filterApp);
    if (filterModel) result = result.filter(row => row.model === filterModel);
    if (filterVersion) result = result.filter(row => row.cga_version === filterVersion);
    // Date range (inclusive)
    if (dateFrom) result = result.filter(row => row.creation_time >= dateFrom);
    if (dateTo) result = result.filter(row => row.creation_time <= dateTo);

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "creation_time") {
        cmp = new Date(a[sortBy]) - new Date(b[sortBy]);
      } else if (
        sortBy === "cost" ||
        sortBy === "duration_seconds" ||
        sortBy === "tokens_used"
      ) {
        cmp = (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
      } else {
        cmp = (a[sortBy] ?? "").localeCompare(b[sortBy] ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    metrics,
    search,
    filterApp,
    filterModel,
    filterVersion,
    dateFrom,
    dateTo,
    sortBy,
    sortDir,
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMetrics.length / PAGE_SIZE));
  const paginatedMetrics = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMetrics.slice(start, start + PAGE_SIZE);
  }, [filteredMetrics, page]);

  // Unique filter options
  const appOptions = useMemo(
    () =>
      Array.from(new Set(metrics.map((m) => m.app_name))).sort(),
    [metrics]
  );
  const modelOptions = useMemo(
    () =>
      Array.from(new Set(metrics.map((m) => m.model))).sort(),
    [metrics]
  );
  const versionOptions = useMemo(
    () =>
      Array.from(new Set(metrics.map((m) => m.cga_version))).sort(),
    [metrics]
  );

  // Summary stats
  const summary = useMemo(() => {
    const count = filteredMetrics.length;
    const cost = filteredMetrics.reduce(
      (sum, m) => sum + (typeof m.cost === "number" ? m.cost : 0), 0);
    const avgCost = count ? (cost / count) : 0;
    const avgTime =
      count
        ? filteredMetrics.reduce(
            (sum, m) => sum + (typeof m.duration_seconds === "number" ? m.duration_seconds : 0),
            0
          ) / count
        : 0;
    const totalTokens = filteredMetrics.reduce(
      (sum, m) => sum + (typeof m.tokens_used === "number" ? m.tokens_used : 0),
      0
    );
    return {
      count,
      totalCost: cost,
      avgCost,
      avgTime,
      totalTokens,
    };
  }, [filteredMetrics]);

  // Handler for sorting columns
  const onSort = (colKey) => {
    if (sortBy === colKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(colKey);
      setSortDir("asc");
    }
  };

  // Handler to clear all filters
  const clearFilters = () => {
    setSearch("");
    setFilterApp("");
    setFilterModel("");
    setFilterVersion("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Make sure page stays in range if filter reduces # of pages
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [filteredMetrics.length, page, totalPages]);

  // Date helpers
  function inputDate(val) {
    // ISO-8601 date (not datetime)
    if (!val) return "";
    return val.length > 10 ? val.slice(0, 10) : val;
  }

  // Theme'd table row highlight
  const rowHoverBg =
    theme === "dark"
      ? "rgba(255,255,255,0.02)"
      : "rgba(0,0,0,0.03)";

  // Main rendering
  return (
    <div className="metrics-dashboard" style={{
      maxWidth: 1200,
      margin: "0 auto",
      padding: "2rem 1rem 5rem 1rem",
    }}>
      <h1 style={{
        fontSize: "2.3rem",
        fontWeight: 700,
        color: "var(--text-primary)",
        marginBottom: 12,
        letterSpacing: 0.05,
      }}>
        Kavia Metrics Dashboard
      </h1>
      {/* Summary Stats */}
      <section style={{
        display: "flex",
        gap: 32,
        flexWrap: "wrap",
        marginBottom: 24,
        justifyContent: "center"
      }}>
        <SummaryCard label="Records" value={summary.count}/>
        <SummaryCard label="Total Cost" value={`$${summary.totalCost.toFixed(2)}`}/>
        <SummaryCard label="Avg. Cost" value={`$${summary.avgCost.toFixed(2)}`}/>
        <SummaryCard label="Avg. Time" value={`${summary.avgTime.toFixed(1)}s`}/>
        <SummaryCard label="Total Tokens" value={summary.totalTokens}/>
      </section>

      {/* Filter/Sort Bar */}
      <div className="filters-bar" style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        alignItems: "end",
        justifyContent: "space-between",
        marginBottom: 14,
        background: "var(--bg-secondary)",
        padding: "12px 12px 14px 12px",
        borderRadius: 12,
        border: "1px solid var(--border-color)",
        boxShadow: "0 2px 10px 0 rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {/* Search */}
          <input
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name/model/version"
            style={inputStyle()}
            aria-label="Global search"
          />
          {/* AppName Filter */}
          <select value={filterApp} onChange={e => { setFilterApp(e.target.value); setPage(1); }} style={inputStyle()} aria-label="Filter by app">
            <option value="">All Apps</option>
            {appOptions.map(val => <option key={val} value={val}>{val}</option>)}
          </select>
          {/* Model Filter */}
          <select value={filterModel} onChange={e => { setFilterModel(e.target.value); setPage(1); }} style={inputStyle()} aria-label="Filter by model">
            <option value="">All Models</option>
            {modelOptions.map(val => <option key={val} value={val}>{val}</option>)}
          </select>
          {/* CGA Version */}
          <select value={filterVersion} onChange={e => { setFilterVersion(e.target.value); setPage(1); }} style={inputStyle()} aria-label="Filter by version">
            <option value="">All CGA</option>
            {versionOptions.map(val => <option key={val} value={val}>{val}</option>)}
          </select>
          {/* Date Range Filter */}
          <label style={{ ...labelStyle(), marginLeft: 6 }}>
            From:
            <input
              type="date"
              value={inputDate(dateFrom)}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              style={inputStyle()}
            />
          </label>
          <label style={labelStyle()}>
            To:
            <input
              type="date"
              value={inputDate(dateTo)}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              style={inputStyle()}
            />
          </label>
        </div>
        <button onClick={clearFilters} className="btn-clear" style={{
          ...inputStyle(),
          padding: "7px 21px",
          fontWeight: 500,
          background: "var(--button-bg)",
          color: "var(--button-text)",
          borderRadius: "7px",
          cursor: "pointer"
        }}>
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="metrics-table-container" style={{
        overflowX: "auto",
        marginBottom: 20,
        background: "var(--bg-secondary)",
        borderRadius: 10,
        border: "1px solid var(--border-color)",
        boxShadow: "0 0.5px 5px 0 rgba(0,0,0,0.025)"
      }}>
        <table
          className="metrics-table"
          style={{
            minWidth: 900,
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "1rem",
            color: "var(--text-primary)",
          }}
        >
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{
                  cursor: col.sortable ? "pointer" : "default",
                  padding: "12px 10px",
                  userSelect: "none",
                  fontWeight: 700,
                  background: "var(--bg-secondary)",
                  borderBottom: "2px solid var(--border-color)",
                  textAlign: "left"
                }} onClick={col.sortable ? () => onSort(col.key) : undefined}>
                  {col.label}
                  {sortBy === col.key && (
                    <span style={{ fontSize: "0.89em", marginLeft: 3 }}>
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={{ textAlign: "center", fontSize: 20, height: 100 }}>Loading...</td></tr>
            ) : fetchError ? (
              <tr><td colSpan={columns.length} style={{ color: "red", textAlign: "center", fontWeight: 700 }}>{fetchError}</td></tr>
            ) : paginatedMetrics.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ textAlign: "center" }}>No data</td></tr>
            ) : (
              paginatedMetrics.map((row, idx) => (
                <tr key={row.app_name + row.creation_time + idx}
                  style={{
                    background: idx % 2 === 0
                      ? "transparent"
                      : rowHoverBg,
                    transition: "background 0.2s",
                    cursor: row.project_link ? "pointer" : "default"
                  }}
                >
                  <td style={tdStyle()}>{row.app_name}</td>
                  <td style={tdStyle()}>{row.model}</td>
                  <td style={tdStyle()}>{row.cga_version}</td>
                  <td style={tdStyle()}>
                    {row.creation_time ? (
                      new Date(row.creation_time).toLocaleString()
                    ) : ""}
                  </td>
                  <td style={tdStyle()}>{row.tokens_used ?? "-"}</td>
                  <td style={tdStyle()}>{row.duration_seconds != null ? row.duration_seconds.toFixed(1) : "-"}</td>
                  <td style={tdStyle()}>${row.cost != null ? row.cost.toFixed(2) : "-"}</td>
                  <td style={{ ...tdStyle(), textDecoration: row.project_link ? "underline" : "none" }}>
                    {row.project_link ? (
                      <a href={row.project_link} target="_blank" rel="noopener noreferrer"
                        style={{ color: "var(--text-secondary)" }}
                      >Open 🔗</a>
                    ) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        setPage={setPage}
      />

      {/* Responsive spacer for bottom */}
      <div style={{height: 28}} />
    </div>
  );
}

// Summary stat card
function SummaryCard({ label, value }) {
  return (
    <div style={{
      minWidth: 120,
      minHeight: 58,
      background: "var(--bg-secondary)",
      borderRadius: 10,
      border: "1px solid var(--border-color)",
      boxShadow: "0 1px 8px 0 rgba(0,0,0,0.07)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "14px 15px 9px 15px",
      fontSize: "1.13rem",
      color: "var(--text-primary)"
    }}>
      <span style={{
        fontWeight: 700,
        fontSize: 21,
      }}>{value}</span>
      <span style={{
        color: "var(--text-secondary)",
        fontWeight: 400,
        marginTop: 3,
        fontSize: "0.95em"
      }}>{label}</span>
    </div>
  );
}

// Table td styling
function tdStyle() {
  return {
    padding: "10px 10px",
    borderBottom: "1px solid var(--border-color)",
    verticalAlign: "middle",
    fontSize: "1em"
  };
}
// input/select style
function inputStyle() {
  return {
    minWidth: 95,
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid var(--border-color)",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    fontSize: "1em",
    outline: "none",
    transition: "border 0.2s",
  };
}
function labelStyle() {
  return {
    fontWeight: 500,
    color: "var(--text-secondary)",
    fontSize: "0.98em"
  };
}

// Pagination component
function PaginationControls({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  const maxShow = 5;
  let start = Math.max(1, page - Math.floor(maxShow/2));
  let end = Math.min(totalPages, start + maxShow - 1);
  if (end - start < maxShow - 1) {
    start = Math.max(1, end - maxShow + 1);
  }
  let pages = [];
  for (let i = start; i <= end; ++i) pages.push(i);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: 8,
      marginTop: 20,
      marginBottom: 8
    }}>
      <button
        style={paginationBtnStyle()}
        onClick={() => setPage(page - 1)}
        disabled={page <= 1}
        aria-label="Prev page"
      >{"‹"}</button>
      {pages.map(i =>
        <button
          key={i}
          style={{
            ...paginationBtnStyle(),
            fontWeight: i === page ? 700 : 500,
            background: i === page ? "var(--button-bg)" : "var(--bg-secondary)",
            color: i === page ? "var(--button-text)" : "var(--text-primary)",
            border: i === page ? "1.5px solid var(--button-bg)" : "1px solid var(--border-color)",
            boxShadow: i === page ? "0 2px 8px 0 rgba(0,0,0,0.09)" : undefined,
          }}
          onClick={() => setPage(i)}
          aria-label={`Page ${i}`}
        >
          {i}
        </button>
      )}
      <button
        style={paginationBtnStyle()}
        onClick={() => setPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >{"›"}</button>
    </div>
  );
}
function paginationBtnStyle() {
  return {
    padding: "5.3px 13px",
    borderRadius: 7,
    margin: 1,
    border: "1px solid var(--border-color)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontSize: "1em",
    cursor: "pointer",
    transition: "all 0.2s"
  };
}

export default MetricsDashboard;
