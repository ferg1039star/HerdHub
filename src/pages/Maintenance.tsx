import { useEffect, useMemo, useState } from "react";
import {
  createMaintenance,
  deleteMaintenance,
  getMaintenance,
  getRanch,
  updateMaintenance,
} from "../lib/api";
import { dueStatus } from "../lib/protocolEngine";
import { isMaintenanceDue, maintenanceDueItems, maintenanceLogItems } from "../lib/maintenanceDue";
import { todayIso } from "../lib/date";
import type { MaintenanceItem } from "../types";

export default function Maintenance() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [ranchId, setRanchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [completedOn, setCompletedOn] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eCompleted, setECompleted] = useState("");
  const [eDue, setEDue] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eBusy, setEBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = todayIso();

  const dueItems = useMemo(() => maintenanceDueItems(items), [items]);
  const logItems = useMemo(() => maintenanceLogItems(items), [items]);

  async function load() {
    const [m, r] = await Promise.all([getMaintenance(), getRanch()]);
    setItems(m);
    setRanchId(r?.id ?? null);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    try {
      await createMaintenance({
        ranch_id: ranchId!,
        title: title.trim(),
        completed_on: completedOn || null,
        due_on: dueOn || null,
        notes: notes.trim() || null,
      });
      setTitle("");
      setCompletedOn("");
      setDueOn("");
      setNotes("");
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
    setECompleted(m.completed_on ?? "");
    setEDue(m.due_on ?? "");
    setENotes(m.notes ?? "");
    setError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    if (!eTitle.trim()) {
      setError("Title is required.");
      return;
    }
    setEBusy(true);
    setError(null);
    try {
      await updateMaintenance(editId, {
        title: eTitle.trim(),
        completed_on: eCompleted || null,
        due_on: eDue || null,
        notes: eNotes.trim() || null,
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
      await updateMaintenance(m.id, { completed_on: today });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this maintenance item?")) return;
    await deleteMaintenance(id);
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
          <div className="row-inline">
            <div>
              <label htmlFor="mdone">Completed on</label>
              <input id="mdone" type="date" value={completedOn} onChange={(e) => setCompletedOn(e.target.value)} />
            </div>
            <div>
              <label htmlFor="mdue">Next due</label>
              <input id="mdue" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
            </div>
          </div>
          <label htmlFor="mnotes">Notes</label>
          <textarea id="mnotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="spacer" />
          <button className="primary block" type="submit" disabled={busy}>{busy ? "Saving…" : "Add item"}</button>
        </form>
      )}

      <h2>Due</h2>
      {dueItems.length === 0 ? (
        <div className="empty">Nothing due. Add an item or set a next due date.</div>
      ) : (
        dueItems.map((m) => (
          <MaintenanceCard
            key={`due-${m.id}`}
            m={m}
            today={today}
            editId={editId}
            eTitle={eTitle}
            eCompleted={eCompleted}
            eDue={eDue}
            eNotes={eNotes}
            eBusy={eBusy}
            busyId={busyId}
            showDoneToday
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditId(null)}
            setETitle={setETitle}
            setECompleted={setECompleted}
            setEDue={setEDue}
            setENotes={setENotes}
            onDoneToday={markDone}
            onRemove={remove}
          />
        ))
      )}

      <h2>Log</h2>
      {logItems.length === 0 ? (
        <div className="empty">No completed maintenance yet.</div>
      ) : (
        logItems.map((m) => (
          <MaintenanceCard
            key={`log-${m.id}`}
            m={m}
            today={today}
            editId={editId}
            eTitle={eTitle}
            eCompleted={eCompleted}
            eDue={eDue}
            eNotes={eNotes}
            eBusy={eBusy}
            busyId={busyId}
            showDoneToday={isMaintenanceDue(m)}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditId(null)}
            setETitle={setETitle}
            setECompleted={setECompleted}
            setEDue={setEDue}
            setENotes={setENotes}
            onDoneToday={markDone}
            onRemove={remove}
            logView
          />
        ))
      )}
    </div>
  );
}

function MaintenanceCard({
  m,
  today,
  editId,
  eTitle,
  eCompleted,
  eDue,
  eNotes,
  eBusy,
  busyId,
  showDoneToday,
  logView,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  setETitle,
  setECompleted,
  setEDue,
  setENotes,
  onDoneToday,
  onRemove,
}: {
  m: MaintenanceItem;
  today: string;
  editId: string | null;
  eTitle: string;
  eCompleted: string;
  eDue: string;
  eNotes: string;
  eBusy: boolean;
  busyId: string | null;
  showDoneToday: boolean;
  logView?: boolean;
  onStartEdit: (m: MaintenanceItem) => void;
  onSaveEdit: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  setETitle: (v: string) => void;
  setECompleted: (v: string) => void;
  setEDue: (v: string) => void;
  setENotes: (v: string) => void;
  onDoneToday: (m: MaintenanceItem) => void;
  onRemove: (id: string) => void;
}) {
  if (editId === m.id) {
    return (
      <form className="card" onSubmit={onSaveEdit}>
        <label htmlFor={`et-${m.id}`}>Title</label>
        <input id={`et-${m.id}`} value={eTitle} onChange={(e) => setETitle(e.target.value)} />
        <div className="row-inline">
          <div>
            <label htmlFor={`ec-${m.id}`}>Completed on</label>
            <input id={`ec-${m.id}`} type="date" value={eCompleted} onChange={(e) => setECompleted(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`ed-${m.id}`}>Next due</label>
            <input id={`ed-${m.id}`} type="date" value={eDue} onChange={(e) => setEDue(e.target.value)} />
          </div>
        </div>
        <label htmlFor={`en-${m.id}`}>Notes</label>
        <textarea id={`en-${m.id}`} value={eNotes} onChange={(e) => setENotes(e.target.value)} />
        <div className="spacer" />
        <div className="row-inline">
          <button className="primary block" type="submit" disabled={eBusy}>{eBusy ? "Saving…" : "Save"}</button>
          <button className="block" type="button" onClick={onCancelEdit}>Cancel</button>
        </div>
      </form>
    );
  }

  const st = m.due_on && isMaintenanceDue(m) ? dueStatus(m.due_on, today) : null;

  return (
    <div className="card">
      <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
        <div style={{ flex: 1 }}>
          <h3>{m.title}</h3>
          {logView ? (
            <div className="subtle">
              Performed {m.completed_on}
              {m.notes ? ` · ${m.notes}` : ""}
            </div>
          ) : (
            <>
              <div className="subtle">
                {m.completed_on ? `Last done ${m.completed_on}` : "Not done yet"}
                {m.due_on ? ` · due ${m.due_on}` : ""}
              </div>
              {m.notes && <div className="subtle">{m.notes}</div>}
            </>
          )}
        </div>
        <div className="right">
          {st && <span className={`pill ${st}`}>{st}</span>}
        </div>
      </div>
      <div className="spacer" />
      <div className="row-inline">
        {showDoneToday && (
          <button className="primary block" disabled={busyId === m.id} onClick={() => onDoneToday(m)}>
            {busyId === m.id ? "Saving…" : "Done today"}
          </button>
        )}
        <button className="block" onClick={() => onStartEdit(m)}>Edit</button>
        <button className="danger block" onClick={() => onRemove(m.id)}>Delete</button>
      </div>
    </div>
  );
}
