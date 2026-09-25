import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAnimals, getEvents, getMaintenance, getProtocols, getRanch } from "../lib/api";
import { getRanchDueBoard } from "../lib/protocolEngine";
import { dueStatus } from "../lib/protocolEngine";
import { todayIso } from "../lib/date";
import type { DueItem, MaintenanceItem, Ranch } from "../types";

export default function Home() {
  const [ranch, setRanch] = useState<Ranch | null>(null);
  const [due, setDue] = useState<DueItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = todayIso();

  useEffect(() => {
    (async () => {
      try {
        const [r, animals, protocols, events, maint] = await Promise.all([
          getRanch(),
          getAnimals(),
          getProtocols(),
          getEvents(),
          getMaintenance(),
        ]);
        setRanch(r);
        setDue(getRanchDueBoard(animals, protocols, events, today));
        setMaintenance(maint);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [today]);

  const animalBuckets = useMemo(() => bucketDue(due), [due]);
  const maintBuckets = useMemo(() => bucketMaintenance(maintenance, today), [maintenance, today]);

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{ranch?.name ?? "My Ranch"}</h1>
          <div className="subtle">Due board · {today}</div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <h2>Animal care</h2>
      <DueBucket label="Overdue" tone="overdue" items={animalBuckets.overdue} />
      <DueBucket label="Due today" tone="due" items={animalBuckets.due} />
      <DueBucket label="Next 14 days" tone="upcoming" items={animalBuckets.upcoming} />
      {due.length === 0 && (
        <div className="empty">
          Nothing due. <Link to="/protocols">Add a protocol</Link> or <Link to="/ranch">add animals</Link>.
        </div>
      )}

      <h2>Ranch maintenance</h2>
      <MaintBucket label="Overdue" tone="overdue" items={maintBuckets.overdue} />
      <MaintBucket label="Due today" tone="due" items={maintBuckets.due} />
      <MaintBucket label="Next 14 days" tone="upcoming" items={maintBuckets.upcoming} />
      {maintenance.length === 0 && (
        <div className="empty">
          No maintenance yet. <Link to="/maintenance">Add an item</Link>.
        </div>
      )}

      <h2>Shortcuts</h2>
      <div className="row-inline">
        <Link className="btn block" to="/ranch">🐄 My Ranch</Link>
        <Link className="btn block" to="/protocols">💉 Protocols</Link>
      </div>
      <div className="spacer" />
      <div className="row-inline">
        <Link className="btn block" to="/maintenance">🛠️ Maintenance</Link>
        <Link className="btn block" to="/settings">⚙️ Settings</Link>
      </div>
    </div>
  );
}

function bucketDue(items: DueItem[]) {
  return {
    overdue: items.filter((i) => i.status === "overdue"),
    due: items.filter((i) => i.status === "due"),
    upcoming: items.filter((i) => i.status === "upcoming"),
  };
}

function bucketMaintenance(items: MaintenanceItem[], today: string) {
  const withDue = items.filter((m) => m.due_on);
  return {
    overdue: withDue.filter((m) => dueStatus(m.due_on!, today) === "overdue"),
    due: withDue.filter((m) => dueStatus(m.due_on!, today) === "due"),
    upcoming: withDue.filter((m) => dueStatus(m.due_on!, today) === "upcoming"),
  };
}

function DueBucket({ label, tone, items }: { label: string; tone: string; items: DueItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="subtle" style={{ marginTop: 6 }}>{label}</div>
      {items.map((i) => (
        <Link key={`${i.animalId}-${i.protocolId}`} className={`card due-row ${tone}`} to={`/animals/${i.animalId}`}>
          <div className="card row">
            <div>
              <div className="tag-num">#{i.tagNumber} <span className="subtle">{i.species}</span></div>
              <div className="subtle">{i.reason}{i.approximate ? " · approx" : ""}</div>
            </div>
            <span className={`pill ${tone}`}>{i.dueDate}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MaintBucket({ label, tone, items }: { label: string; tone: string; items: MaintenanceItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="subtle" style={{ marginTop: 6 }}>{label}</div>
      {items.map((m) => (
        <Link key={m.id} className={`card due-row ${tone}`} to="/maintenance">
          <div className="card row">
            <div>
              <h3>{m.title}</h3>
              {m.notes && <div className="subtle">{m.notes}</div>}
            </div>
            <span className={`pill ${tone}`}>{m.due_on}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
