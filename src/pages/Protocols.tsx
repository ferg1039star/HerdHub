import { useEffect, useState } from "react";
import { createProtocol, deleteProtocol, getProtocols, getRanch, updateProtocol } from "../lib/api";
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

  const [editId, setEditId] = useState<string | null>(null);
  const [eSpecies, setESpecies] = useState("");
  const [eName, setEName] = useState("");
  const [eTrigger, setETrigger] = useState<ProtocolTrigger>("interval");
  const [eAgeDays, setEAgeDays] = useState("");
  const [eIntervalDays, setEIntervalDays] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eBusy, setEBusy] = useState(false);

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

  function validateTriggerFields(
    t: ProtocolTrigger,
    age: string,
    interval: string
  ): string | null {
    if ((t === "age" || t === "both") && !age) return "Age trigger needs an age in days.";
    if ((t === "interval" || t === "both") && !interval) return "Interval trigger needs an interval in days.";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!species.trim() || !name.trim()) {
      setError("Species and task name are required.");
      return;
    }
    const trigErr = validateTriggerFields(trigger, ageDays, intervalDays);
    if (trigErr) {
      setError(trigErr);
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

  function startEdit(p: Protocol) {
    setEditId(p.id);
    setESpecies(p.species);
    setEName(p.name);
    setETrigger(p.trigger_type);
    setEAgeDays(p.age_days != null ? String(p.age_days) : "");
    setEIntervalDays(p.interval_days != null ? String(p.interval_days) : "");
    setENotes(p.notes ?? "");
    setError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    if (!eSpecies.trim() || !eName.trim()) {
      setError("Species and task name are required.");
      return;
    }
    const trigErr = validateTriggerFields(eTrigger, eAgeDays, eIntervalDays);
    if (trigErr) {
      setError(trigErr);
      return;
    }
    setEBusy(true);
    setError(null);
    try {
      await updateProtocol(editId, {
        species: eSpecies.trim(),
        name: eName.trim(),
        trigger_type: eTrigger,
        age_days: eTrigger === "age" || eTrigger === "both" ? Number(eAgeDays) : null,
        interval_days: eTrigger === "interval" || eTrigger === "both" ? Number(eIntervalDays) : null,
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
        protocols.map((p) => {
          if (editId === p.id) {
            return (
              <form key={p.id} className="card" onSubmit={saveEdit}>
                <label htmlFor={`es-${p.id}`}>Species</label>
                <input id={`es-${p.id}`} value={eSpecies} onChange={(e) => setESpecies(e.target.value)} />
                <label htmlFor={`en-${p.id}`}>Task name</label>
                <input id={`en-${p.id}`} value={eName} onChange={(e) => setEName(e.target.value)} />
                <label htmlFor={`et-${p.id}`}>Trigger</label>
                <select id={`et-${p.id}`} value={eTrigger} onChange={(e) => setETrigger(e.target.value as ProtocolTrigger)}>
                  {TRIGGERS.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
                <div className="row-inline">
                  {(eTrigger === "age" || eTrigger === "both") && (
                    <div>
                      <label htmlFor={`ea-${p.id}`}>Age (days)</label>
                      <input id={`ea-${p.id}`} inputMode="numeric" value={eAgeDays} onChange={(e) => setEAgeDays(e.target.value)} />
                    </div>
                  )}
                  {(eTrigger === "interval" || eTrigger === "both") && (
                    <div>
                      <label htmlFor={`ei-${p.id}`}>Interval (days)</label>
                      <input id={`ei-${p.id}`} inputMode="numeric" value={eIntervalDays} onChange={(e) => setEIntervalDays(e.target.value)} />
                    </div>
                  )}
                </div>
                <label htmlFor={`enotes-${p.id}`}>Notes</label>
                <textarea id={`enotes-${p.id}`} value={eNotes} onChange={(e) => setENotes(e.target.value)} />
                <div className="spacer" />
                <div className="row-inline">
                  <button className="primary block" type="submit" disabled={eBusy}>{eBusy ? "Saving…" : "Save"}</button>
                  <button className="block" type="button" onClick={() => setEditId(null)}>Cancel</button>
                </div>
              </form>
            );
          }

          return (
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
              </div>
              <div className="spacer" />
              <div className="row-inline">
                <button className="block" onClick={() => startEdit(p)}>Edit</button>
                <button className="danger block" onClick={() => remove(p.id)}>Delete</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
