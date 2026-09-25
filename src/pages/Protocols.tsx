import { useEffect, useState } from "react";
import { createProtocol, deleteProtocol, getProtocols, getRanch } from "../lib/api";
import type { Protocol, ProtocolTrigger } from "../types";

const TRIGGERS: ProtocolTrigger[] = ["age", "interval", "both"];

export default function Protocols() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [ranchId, setRanchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [species, setSpecies] = useState("");
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<ProtocolTrigger>("interval");
  const [ageDays, setAgeDays] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [p, r] = await Promise.all([getProtocols(), getRanch()]);
    setProtocols(p);
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
    if (!species.trim() || !name.trim()) {
      setError("Species and task name are required.");
      return;
    }
    if ((trigger === "age" || trigger === "both") && !ageDays) {
      setError("Age trigger needs an age in days.");
      return;
    }
    if ((trigger === "interval" || trigger === "both") && !intervalDays) {
      setError("Interval trigger needs an interval in days.");
      return;
    }
    setBusy(true);
    try {
      await createProtocol({
        ranch_id: ranchId!,
        species: species.trim(),
        name: name.trim(),
        trigger_type: trigger,
        age_days: trigger === "age" || trigger === "both" ? Number(ageDays) : null,
        interval_days: trigger === "interval" || trigger === "both" ? Number(intervalDays) : null,
        notes: notes.trim() || null,
      });
      setSpecies("");
      setName("");
      setTrigger("interval");
      setAgeDays("");
      setIntervalDays("");
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
    if (!confirm("Delete this protocol? Due items derived from it disappear.")) return;
    await deleteProtocol(id);
    await load();
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-head">
        <h1>Protocols</h1>
        <button className="primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ Add"}</button>
      </div>
      <div className="subtle">Species rules. Tags inherit them automatically.</div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <form className="card" onSubmit={submit}>
          <label htmlFor="pspecies">Species</label>
          <input id="pspecies" value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="cow" />
          <label htmlFor="pname">Task name</label>
          <input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Deworm" />
          <label htmlFor="ptrigger">Trigger</label>
          <select id="ptrigger" value={trigger} onChange={(e) => setTrigger(e.target.value as ProtocolTrigger)}>
            {TRIGGERS.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
          <div className="row-inline">
            {(trigger === "age" || trigger === "both") && (
              <div>
                <label htmlFor="page">Age (days)</label>
                <input id="page" inputMode="numeric" value={ageDays} onChange={(e) => setAgeDays(e.target.value)} />
              </div>
            )}
            {(trigger === "interval" || trigger === "both") && (
              <div>
                <label htmlFor="pint">Interval (days)</label>
                <input id="pint" inputMode="numeric" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
              </div>
            )}
          </div>
          <label htmlFor="pnotes">Notes</label>
          <textarea id="pnotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="spacer" />
          <button className="primary block" type="submit" disabled={busy}>{busy ? "Saving…" : "Add protocol"}</button>
        </form>
      )}

      {protocols.length === 0 ? (
        <div className="empty">No protocols yet. Add an age or interval rule.</div>
      ) : (
        protocols.map((p) => (
          <div key={p.id} className="card">
            <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
              <div>
                <h3>{p.species} · {p.name}</h3>
                <div className="subtle">
                  {p.trigger_type}
                  {p.age_days != null ? ` · age ${p.age_days}d` : ""}
                  {p.interval_days != null ? ` · every ${p.interval_days}d` : ""}
                </div>
                {p.notes && <div className="subtle">{p.notes}</div>}
              </div>
              <button className="ghost" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
