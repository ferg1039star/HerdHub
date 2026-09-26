import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createEvent, getAnimals, getEvents, getMaintenance, getProtocols, getRanch } from "../lib/api";
import { dueStatus, getRanchDueBoard } from "../lib/protocolEngine";
import { todayIso } from "../lib/date";
import type { Animal, AnimalEvent, DueItem, MaintenanceItem, Protocol, Ranch } from "../types";

export default function Home() {
  const [ranch, setRanch] = useState<Ranch | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [events, setEvents] = useState<AnimalEvent[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doneBusy, setDoneBusy] = useState<string | null>(null);
  const today = todayIso();

  const load = useCallback(async () => {
    const [r, a, p, e, m] = await Promise.all([
      getRanch(),
      getAnimals(),
      getProtocols(),
      getEvents(),
      getMaintenance(),
    ]);
    setRanch(r);
    setAnimals(a);
    setProtocols(p);
    setEvents(e);
    setMaintenance(m);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const due = useMemo(
    () => getRanchDueBoard(animals, protocols, events, today),
    [animals, protocols, events, today]
  );
  const animalBuckets = useMemo(() => bucketDue(due), [due]);
  const maintBuckets = useMemo(() => bucketMaintenance(maintenance, today), [maintenance, today]);

  async function doneToday(item: DueItem) {
    const animal = animals.find((a) => a.id === item.animalId);
    if (!animal) return;
    setDoneBusy(`${item.animalId}-${item.protocolId}`);
    setError(null);
    try {
      await createEvent({
        ranch_id: animal.ranch_id,
        animal_id: animal.id,
        protocol_id: item.protocolId,
        type: "treatment",
        event_date: today,
        product: null,
        withdrawal_until: null,
        notes: null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log event");
    } finally {
      setDoneBusy(null);
    }
  }

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
      <DueBucket label="Overdue" tone="overdue" items={animalBuckets.overdue} onDoneToday={doneToday} doneBusy={doneBusy} />
      <DueBucket label="Due today" tone="due" items={animalBuckets.due} onDoneToday={doneToday} doneBusy={doneBusy} />
      <DueBucket label="Next 14 days" tone="upcoming" items={animalBuckets.upcoming} onDoneToday={doneToday} doneBusy={doneBusy} />
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

function DueBucket({
  label,
  tone,
  items,
  onDoneToday,
  doneBusy,
}: {
  label: string;
  tone: string;
  items: DueItem[];
  onDoneToday: (item: DueItem) => void;
  doneBusy: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="subtle" style={{ marginTop: 6 }}>{label}</div>
      {items.map((i) => {
        const key = `${i.animalId}-${i.protocolId}`;
        return (
          <div key={key} className={`card due-row ${tone}`}>
            <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
              <Link to={`/animals/${i.animalId}`} style={{ flex: 1, color: "inherit" }}>
                <div className="tag-num">#{i.tagNumber} <span className="subtle">{i.species}</span></div>
                <div className="subtle">{i.reason}{i.approximate ? " · approx" : ""}</div>
              </Link>
              <span className={`pill ${tone}`}>{i.dueDate}</span>
            </div>
            <div className="spacer" />
            <button className="primary block" disabled={doneBusy === key} onClick={() => onDoneToday(i)}>
              {doneBusy === key ? "Saving…" : "Done today"}
            </button>
          </div>
        );
      })}
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
