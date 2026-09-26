import { useEffect, useMemo, useState } from "react";
import {
  createMaintenance,
  deleteMaintenance,
  deleteMaintenanceLog,
  getLocations,
  getMaintenance,
  getMaintenanceLog,
  getRanch,
  logMaintenanceDoneToday,
  updateMaintenance,
} from "../lib/api";
import { dueStatus } from "../lib/protocolEngine";
import { maintenanceDueItems } from "../lib/maintenanceDue";
import { buildMaintenanceLogRows, type MaintenanceLogRow } from "../lib/maintenanceLog";
import { displayMaintenanceTag } from "../lib/maintenanceTags";
import { todayIso } from "../lib/date";
import type { Location, MaintenanceItem } from "../types";

export default function Maintenance() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [logRows, setLogRows] = useState<MaintenanceLogRow[]>([]);
  const [ranchId, setRanchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [createdOn, setCreatedOn] = useState(todayIso());
  const [dueOn, setDueOn] = useState("");
  const [locationId, setLocationId] = useState("");
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eCreatedOn, setECreatedOn] = useState("");
  const [eDue, setEDue] = useState("");
  const [eLocationId, setELocationId] = useState("");
  const [eBusy, setEBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = todayIso();

  const dueItems = useMemo(() => maintenanceDueItems(items), [items]);
  const defaultLocationId = useMemo(
    () => locations.find((l) => l.name === "Back Pasture")?.id ?? locations[0]?.id ?? "",
    [locations]
  );

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "—";

  async function load() {
    const [m, r, l, logs] = await Promise.all([
      getMaintenance(),
      getRanch(),
      getLocations(),
      getMaintenanceLog(),
    ]);
    setItems(m);
    setRanchId(r?.id ?? null);
    setLocations(l);
    setLogRows(buildMaintenanceLogRows(logs, m));
  }

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
  }, []);

  useEffect(() => {
    if (!locationId && defaultLocationId) setLocationId(defaultLocationId);
  }, [defaultLocationId, locationId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!locationId) {
      setError("Location is required.");
      return;
    }
    setBusy(true);
    try {
      await createMaintenance({
        ranch_id: ranchId!,
        title: title.trim(),
        location_id: locationId,
        created_on: createdOn || today,
        due_on: dueOn || null,
        completed_on: null,
        notes: null,
      });
      setTitle("");
      setCreatedOn(today);
      setDueOn("");
      setLocationId(defaultLocationId);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(m: MaintenanceItem) {
    setEditId(m.id);
    setETitle(m.title);
    setECreatedOn(m.created_on);
    setEDue(m.due_on ?? "");
    setELocationId(m.location_id ?? defaultLocationId);
    setError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    if (!eTitle.trim()) {
      setError("Title is required.");
      return;
    }
    if (!eLocationId) {
      setError("Location is required.");
      return;
    }
    setEBusy(true);
    setError(null);
    try {
      await updateMaintenance(editId, {
        title: eTitle.trim(),
        location_id: eLocationId,
        created_on: eCreatedOn || today,
        due_on: eDue || null,
      });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setEBusy(false);
    }
  }

  async function markDone(m: MaintenanceItem) {
    setBusyId(m.id);
    setError(null);
    try {
      await logMaintenanceDoneToday(m.ranch_id, m.id, today);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this maintenance item and its log history?")) return;
    await deleteMaintenance(id);
    await load();
  }

  async function removeLogLine(id: string) {
    if (!confirm("Remove this log entry? The maintenance item stays.")) return;
    await deleteMaintenanceLog(id);
    await load();
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-head">
        <h1>Maintenance</h1>
        <button className="primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ Add"}</button>
      </div>
      <div className="subtle">Ranch-level maintenance journal.</div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <form className="card" onSubmit={submit}>
          <label htmlFor="mtitle">Title</label>
          <input id="mtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fix north fence" />
          <label htmlFor="mcreated">Created on</label>
          <input id="mcreated" type="date" value={createdOn} onChange={(e) => setCreatedOn(e.target.value)} required />
          <label htmlFor="mloc">Location</label>
          <select id="mloc" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <label htmlFor="mdue">Next due</label>
          <input id="mdue" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          <div className="spacer" />
          <button className="primary block" type="submit" disabled={busy}>{busy ? "Saving…" : "Add item"}</button>
        </form>
      )}

      <h2>Due</h2>
      {dueItems.length === 0 ? (
        <div className="empty">Nothing due. Add an item or set a next due date.</div>
      ) : (
        dueItems.map((m) => (
          <DueMaintenanceCard
            key={`due-${m.id}`}
            m={m}
            today={today}
            locationName={locName(m.location_id)}
            editId={editId}
            eTitle={eTitle}
            eCreatedOn={eCreatedOn}
            eDue={eDue}
            eLocationId={eLocationId}
            eBusy={eBusy}
            busyId={busyId}
            locations={locations}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditId(null)}
            setETitle={setETitle}
            setECreatedOn={setECreatedOn}
            setEDue={setEDue}
            setELocationId={setELocationId}
            onDoneToday={markDone}
            onRemove={remove}
          />
        ))
      )}

      <h2>Log</h2>
      {logRows.length === 0 ? (
        <div className="empty">No completed maintenance yet.</div>
      ) : (
        logRows.map((row) => (
          <div key={row.id} className="card">
            <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
              <div style={{ flex: 1 }}>
                <div className="tag-num">{displayMaintenanceTag(row.tag_number)}</div>
                <div>
                  {row.title} · {locName(row.location_id)} · {row.performed_on}
                </div>
                {row.notes && <div className="subtle">{row.notes}</div>}
              </div>
              <button className="ghost" onClick={() => removeLogLine(row.id)}>Remove</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function DueMaintenanceCard({
  m,
  today,
  locationName,
  editId,
  eTitle,
  eCreatedOn,
  eDue,
  eLocationId,
  eBusy,
  busyId,
  locations,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  setETitle,
  setECreatedOn,
  setEDue,
  setELocationId,
  onDoneToday,
  onRemove,
}: {
  m: MaintenanceItem;
  today: string;
  locationName: string;
  editId: string | null;
  eTitle: string;
  eCreatedOn: string;
  eDue: string;
  eLocationId: string;
  eBusy: boolean;
  busyId: string | null;
  locations: Location[];
  onStartEdit: (m: MaintenanceItem) => void;
  onSaveEdit: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  setETitle: (v: string) => void;
  setECreatedOn: (v: string) => void;
  setEDue: (v: string) => void;
  setELocationId: (v: string) => void;
  onDoneToday: (m: MaintenanceItem) => void;
  onRemove: (id: string) => void;
}) {
  if (editId === m.id) {
    return (
      <form className="card" onSubmit={onSaveEdit}>
        <label htmlFor={`et-${m.id}`}>Title</label>
        <input id={`et-${m.id}`} value={eTitle} onChange={(e) => setETitle(e.target.value)} />
        <label htmlFor={`ecr-${m.id}`}>Created on</label>
        <input id={`ecr-${m.id}`} type="date" value={eCreatedOn} onChange={(e) => setECreatedOn(e.target.value)} />
        <label htmlFor={`eloc-${m.id}`}>Location</label>
        <select id={`eloc-${m.id}`} value={eLocationId} onChange={(e) => setELocationId(e.target.value)} required>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <label htmlFor={`ed-${m.id}`}>Next due</label>
        <input id={`ed-${m.id}`} type="date" value={eDue} onChange={(e) => setEDue(e.target.value)} />
        <div className="spacer" />
        <div className="row-inline">
          <button className="primary block" type="submit" disabled={eBusy}>{eBusy ? "Saving…" : "Save"}</button>
          <button className="block" type="button" onClick={onCancelEdit}>Cancel</button>
        </div>
      </form>
    );
  }

  const st = m.due_on ? dueStatus(m.due_on, today) : null;

  return (
    <div className="card">
      <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
        <div style={{ flex: 1 }}>
          <div className="tag-num">{displayMaintenanceTag(m.tag_number)}</div>
          <h3 style={{ margin: "2px 0 0" }}>{m.title}</h3>
          <div className="subtle">
            {locationName}
            {m.due_on ? ` · due ${m.due_on}` : ""}
          </div>
        </div>
        <div className="right">
          {st && <span className={`pill ${st}`}>{st}</span>}
        </div>
      </div>
      <div className="spacer" />
      <div className="row-inline">
        <button className="primary block" disabled={busyId === m.id} onClick={() => onDoneToday(m)}>
          {busyId === m.id ? "Saving…" : "Done today"}
        </button>
        <button className="block" onClick={() => onStartEdit(m)}>Edit</button>
        <button className="danger block" onClick={() => onRemove(m.id)}>Delete</button>
      </div>
    </div>
  );
}
