import { useEffect, useLayoutEffect, useRef, useState } from "react";

const BASE = import.meta.env.BASE_URL;
const SEASON = 2024;

const TABS = [
  {
    key: "drivers",
    label: "Drivers",
    nameHeader: "Driver",
    file: "data/drivers.json",
    map: (r) => ({
      rank: r.driver_position,
      name: r.driver_name,
      sub: r.team_name ?? null, // optional: shown under the driver name if present
      points: r.driver_points,
      wins: r.driver_wins,
      podiums: r.driver_podiums, // optional
    }),
  },
  {
    key: "teams",
    label: "Constructors",
    nameHeader: "Constructor",
    file: "data/teams.json",
    map: (r) => ({
      rank: r.team_position,
      name: r.team_name,
      sub: null,
      points: r.team_points,
      wins: Number(r.team_wins),
      podiums: r.team_podiums, // optional
    }),
  },
];

const show = (v) => (v == null ? "–" : v);

export default function App() {
  const [tab, setTab] = useState("drivers");
  const [data, setData] = useState({});
  const [status, setStatus] = useState("loading");
  const [height, setHeight] = useState(null);
  const innerRef = useRef(null);

  // Load both files once so switching tabs is instant.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      TABS.map((t) =>
        fetch(`${BASE}${t.file}`)
          .then((r) => {
            if (!r.ok) throw new Error(r.status);
            return r.json();
          })
          .then((rows) => [t.key, rows.map(t.map)])
      )
    )
      .then((entries) => {
        if (cancelled) return;
        setData(Object.fromEntries(entries));
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Track the natural height of the table so the wrapper can animate to it.
  useLayoutEffect(() => {
    if (status !== "ready" || !innerRef.current) return;
    const el = innerRef.current;
    const update = () => setHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

  const current = TABS.find((t) => t.key === tab);
  const rows = data[tab] ?? [];
  // Only show the Podiums column if the data actually has it.
  const hasPodiums = Object.values(data).some((list) => list.some((r) => r.podiums != null));

  return (
    <main className="card">
      <header className="head">
        <h1>Formula 1</h1>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls="standings-panel"
            className={tab === t.key ? "tab active" : "tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="body" id="standings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <h2>{SEASON} Standings</h2>

        {status === "loading" && <p className="msg">Loading standings…</p>}
        {status === "error" && (
          <p className="msg">Couldn’t load standings. Check that the JSON files exist in public/data.</p>
        )}

        {status === "ready" && (
          <div className="reveal" style={height != null ? { height } : undefined}>
            <div ref={innerRef}>
              <table key={tab} className="fade">
                <colgroup>
                  <col className="c-rank" />
                  <col />
                  <col className="c-num" />
                  <col className="c-num" />
                  {hasPodiums && <col className="c-num" />}
                </colgroup>
                <thead>
                  <tr>
                    <th className="rank">Rank</th>
                    <th className="who-h">{current.nameHeader}</th>
                    <th>Points</th>
                    <th>Wins</th>
                    {hasPodiums && <th>Podiums</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${tab}-${r.rank}-${r.name}`}>
                      <td className="rank">{r.rank}</td>
                      <td className="who">
                        <div className="name">{r.name}</div>
                        {r.sub && <div className="sub">{r.sub}</div>}
                      </td>
                      <td>{show(r.points)}</td>
                      <td>{show(r.wins)}</td>
                      {hasPodiums && <td>{show(r.podiums)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
