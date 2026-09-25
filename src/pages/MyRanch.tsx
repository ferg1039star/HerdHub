import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAnimals, getEvents, getLocations, getProtocols } from "../lib/api";
import { getDueItems } from "../lib/protocolEngine";
import { sortAnimalsByTag } from "../lib/sortTags";
import { todayIso } from "../lib/date";
import type { Animal, AnimalEvent, AnimalStatus, DueItem, Location, Protocol } from "../types";

const STATUSES: (AnimalStatus | "all")[] = ["active", "sold", "dead", "culled", "missing", "all"];

export default function MyRanch() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [events, setEvents] = useState<AnimalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<AnimalStatus | "all">("active");
  const [species, setSpecies] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const today = todayIso();

  useEffect(() => {
    (async () => {
      try {
        const [a, l, p, e] = await Promise.all([getAnimals(), getLocations(), getProtocols(), getEvents()]);
        setAnimals(a);
        setLocations(l);
        setProtocols(p);
        setEvents(e);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const speciesOptions = useMemo(
    () => [...new Set(animals.map((a) => a.species))].sort((x, y) => x.localeCompare(y)),
    [animals]
  );

  const filtered = useMemo(() => {
    const list = animals.filter((a) => {
      if (a.archived_at) return false;
      if (status !== "all" && a.status !== status) return false;
      if (species && a.species.toLowerCase() !== species.toLowerCase()) return false;
      if (locationId && a.location_id !== locationId) return false;
      if (search.trim() && !a.tag_number.includes(search.trim())) return false;
      return true;
    });
    return sortAnimalsByTag(list);
  }, [animals, status, species, locationId, search]);

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "Unassigned";

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-head">
        <h1>My Ranch</h1>
        <Link className="btn primary" to="/animals/new">+ Add tag</Link>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="sticky-search">
        <input
          inputMode="numeric"
          placeholder="Search tag number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search tag number"
        />
      </div>

      <div className="chips">
        {STATUSES.map((s) => (
          <button key={s} className={`chip ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>
            {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {speciesOptions.length > 0 && (
        <div className="chips">
          <button className={`chip ${species === null ? "active" : ""}`} onClick={() => setSpecies(null)}>
            All species
          </button>
          {speciesOptions.map((s) => (
            <button key={s} className={`chip ${species === s ? "active" : ""}`} onClick={() => setSpecies(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {locations.length > 0 && (
        <div className="chips">
          <button className={`chip ${locationId === null ? "active" : ""}`} onClick={() => setLocationId(null)}>
            All locations
          </button>
          {locations.map((l) => (
            <button key={l.id} className={`chip ${locationId === l.id ? "active" : ""}`} onClick={() => setLocationId(l.id)}>
              {l.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          No tags in this view. <Link to="/animals/new">Add first tag</Link>.
        </div>
      ) : (
        filtered.map((a) => {
          const urgent = mostUrgent(getDueItems(a, protocols, events, today));
          return (
            <Link key={a.id} className="card" to={`/animals/${a.id}`}>
              <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
                <div>
                  <div className="tag-num">#{a.tag_number}</div>
                  <div className="subtle">
                    {a.species}
                    {a.breed ? ` · ${a.breed}` : ""} · {locName(a.location_id)}
                  </div>
                </div>
                <div className="right">
                  {urgent ? (
                    <span className={`pill ${urgent.status}`}>{urgent.status}</span>
                  ) : (
                    <span className="pill muted">ok</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}

function mostUrgent(items: DueItem[]): DueItem | null {
  const rank = { overdue: 0, due: 1, upcoming: 2 } as const;
  return [...items].sort((a, b) => rank[a.status] - rank[b.status])[0] ?? null;
}
