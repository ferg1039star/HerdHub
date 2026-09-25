import { useEffect, useState } from "react";
import { createMaintenance, deleteMaintenance, getMaintenance, getRanch } from "../lib/api";
import { dueStatus } from "../lib/protocolEngine";
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

  const today = todayIso();

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
      <div className="subtle">Ranch-level upkeep journal.</div>

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

      {items.length === 0 ? (
        <div className="empty">No maintenance items yet.</div>
      ) : (
        items.map((m) => {
          const st = m.due_on ? dueStatus(m.due_on, today) : null;
          return (
            <div key={m.id} className="card">
              <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
                <div>
                  <h3>{m.title}</h3>
                  <div className="subtle">
                    {m.completed_on ? `Done ${m.completed_on}` : "Not done"}
                    {m.due_on ? ` · due ${m.due_on}` : ""}
                  </div>
                  {m.notes && <div className="subtle">{m.notes}</div>}
                </div>
                <div className="right">
                  {st && <span className={`pill ${st}`}>{st}</span>}
                  <div><button className="ghost" onClick={() => remove(m.id)}>Delete</button></div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
