import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createEvent,
  getAnimals,
  getEvents,
  getLocations,
  getMaintenance,
  getProtocols,
  getRanch,
  logMaintenanceDoneToday,
} from "../lib/api";
import {
  dueStatus,
  getRanchDueBoard,
  HOME_DUE_HORIZON_DAYS,
} from "../lib/protocolEngine";
import { isMaintenanceDue } from "../lib/maintenanceDue";
import { displayMaintenanceTag, sortMaintenanceByTag } from "../lib/maintenanceTags";
import { formatDisplayDate, todayIso } from "../lib/date";
import { activeWithdrawalsForRanch } from "../lib/withdrawals";
import type { Animal, AnimalEvent, DueItem, Location, MaintenanceItem, Protocol, Ranch } from "../types";

export default function Home() {
  const [ranch, setRanch] = useState<Ranch | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [events, setEvents] = useState<AnimalEvent[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doneBusy, setDoneBusy] = useState<string | null>(null);
  const [maintDoneBusy, setMaintDoneBusy] = useState<string | null>(null);
  const today = todayIso();

  const load = useCallback(async () => {
    const [r, a, p, e, m, l] = await Promise.all([
      getRanch(),
      getAnimals(),
      getProtocols(),
      getEvents(),
      getMaintenance(),
      getLocations(),
    ]);
    setRanch(r);
    setAnimals(a);
    setProtocols(p);
    setEvents(e);
    setMaintenance(m);
    setLocations(l);
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
    () => getRanchDueBoard(animals, protocols, events, today, HOME_DUE_HORIZON_DAYS),
    [animals, protocols, events, today]
  );
  const animalBuckets = useMemo(() => bucketDue(due), [due]);
  const maintBuckets = useMemo(() => bucketMaintenance(maintenance, today), [maintenance, today]);
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "—";
  const withholdings = useMemo(
    () => activeWithdrawalsForRanch(animals, events, today),
    [animals, events, today]
  );

  async function doneTodayCare(item: DueItem) {
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

  async function doneTodayMaint(m: MaintenanceItem) {
    setMaintDoneBusy(m.id);
    setError(null);
    try {
      await logMaintenanceDoneToday(m.ranch_id, m.id, today);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log maintenance");
    } finally {
      setMaintDoneBusy(null);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-head home-head">
        <div className="home-head-title">
          <h1>{ranch?.name ?? "My Ranch"}</h1>
          <div className="subtle">Due board · {formatDisplayDate(today)}</div>
        </div>
        <div className="home-head-actions">
          <Link className="btn primary" to="/animals/new">+ Tag</Link>
          <Link className="btn primary" to="/maintenance?add=1">+ Maintenance</Link>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {withholdings.length > 0 && (
        <>
          <h2>Meat/milk withhold</h2>
          {withholdings.map((w) => (
            <Link key={w.animalId} className="card" to={`/animals/${w.animalId}`}>
              <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
                <span className="tag-num">#{w.tagNumber}</span>
                <span className="subtle">until {formatDisplayDate(w.until)}</span>
              </div>
            </Link>
          ))}
        </>
      )}

      <h2>Animal care</h2>
      <DueBucket label="Overdue" tone="overdue" items={animalBuckets.overdue} onDoneToday={doneTodayCare} doneBusy={doneBusy} />
      <DueBucket label="Due today" tone="due" items={animalBuckets.due} onDoneToday={doneTodayCare} doneBusy={doneBusy} />
      <DueBucket label="Next 14 days" tone="upcoming" items={animalBuckets.upcoming} onDoneToday={doneTodayCare} doneBusy={doneBusy} />
      {due.length === 0 && (
        <div className="empty">
          Nothing due. <Link to="/protocols">Add a protocol</Link> or <Link to="/ranch">add animals</Link>.
        </div>
      )}

      <h2>Ranch maintenance</h2>
      <MaintBucket label="Overdue" tone="overdue" items={maintBuckets.overdue} locName={locName} onDoneToday={doneTodayMaint} doneBusy={maintDoneBusy} />
      <MaintBucket label="Due today" tone="due" items={maintBuckets.due} locName={locName} onDoneToday={doneTodayMaint} doneBusy={maintDoneBusy} />
      <MaintBucket label="Next 14 days" tone="upcoming" items={maintBuckets.upcoming} locName={locName} onDoneToday={doneTodayMaint} doneBusy={maintDoneBusy} />
      {maintenanceDueCount(maintenance) === 0 && (
        <div className="empty">
          No maintenance due. <Link to="/maintenance">Add an item</Link>.
        </div>
      )}

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
  const withDue = sortMaintenanceByTag(items.filter(isMaintenanceDue));
  return {
    overdue: withDue.filter((m) => dueStatus(m.due_on!, today, HOME_DUE_HORIZON_DAYS) === "overdue"),
    due: withDue.filter((m) => dueStatus(m.due_on!, today, HOME_DUE_HORIZON_DAYS) === "due"),
    upcoming: withDue.filter((m) => dueStatus(m.due_on!, today, HOME_DUE_HORIZON_DAYS) === "upcoming"),
  };
}

function maintenanceDueCount(items: MaintenanceItem[]): number {
  return items.filter(isMaintenanceDue).length;
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
              <span className={`pill ${tone}`}>{formatDisplayDate(i.dueDate)}</span>
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

function MaintBucket({
  label,
  tone,
  items,
  locName,
  onDoneToday,
  doneBusy,
}: {
  label: string;
  tone: string;
  items: MaintenanceItem[];
  locName: (id: string | null) => string;
  onDoneToday: (m: MaintenanceItem) => void;
  doneBusy: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="subtle" style={{ marginTop: 6 }}>{label}</div>
      {items.map((m) => (
        <div key={m.id} className={`card due-row ${tone}`}>
          <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
            <Link to="/maintenance" style={{ flex: 1, color: "inherit" }}>
              <div className="tag-num">{displayMaintenanceTag(m.tag_number)}</div>
              <h3 style={{ margin: "2px 0 0", fontSize: 15 }}>{m.title}</h3>
              <div className="subtle">{locName(m.location_id)}</div>
            </Link>
            <span className={`pill ${tone}`}>{formatDisplayDate(m.due_on)}</span>
          </div>
          <div className="spacer" />
          <button className="primary block" disabled={doneBusy === m.id} onClick={() => onDoneToday(m)}>
            {doneBusy === m.id ? "Saving…" : "Done today"}
          </button>
        </div>
      ))}
    </div>
  );
}
