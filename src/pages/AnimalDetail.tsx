import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createEvent,
  getAnimal,
  getAnimalEvents,
  getLocations,
  getProtocols,
  updateAnimal,
} from "../lib/api";
import { getDueItems } from "../lib/protocolEngine";
import { todayIso } from "../lib/date";
import type { Animal, AnimalEvent, DueItem, EventType, Location, Protocol } from "../types";

const EVENT_TYPES: EventType[] = ["vaccine", "treatment", "check", "other"];

export default function AnimalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [events, setEvents] = useState<AnimalEvent[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEvent, setShowEvent] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [doneBusy, setDoneBusy] = useState<string | null>(null);

  const today = todayIso();

  async function load() {
    if (!id) return;
    const [a, ev, p, l] = await Promise.all([
      getAnimal(id),
      getAnimalEvents(id),
      getProtocols(),
      getLocations(),
    ]);
    setAnimal(a);
    setEvents(ev);
    setProtocols(p);
    setLocations(l);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const due = useMemo(
    () => (animal ? getDueItems(animal, protocols, events, today) : []),
    [animal, protocols, events, today]
  );
  const speciesProtocols = useMemo(
    () => protocols.filter((p) => animal && p.species.toLowerCase() === animal.species.toLowerCase()),
    [protocols, animal]
  );

  async function archive() {
    if (!animal) return;
    if (!confirm(`Archive tag #${animal.tag_number}? It leaves the active list but events and status are kept.`)) return;
    setActionBusy(true);
    setError(null);
    try {
      await updateAnimal(animal.id, { archived_at: new Date().toISOString() });
      navigate("/ranch");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed");
      setActionBusy(false);
    }
  }

  async function unarchive() {
    if (!animal) return;
    if (!confirm(`Unarchive tag #${animal.tag_number}? It returns to the ranch list.`)) return;
    setActionBusy(true);
    setError(null);
    try {
      await updateAnimal(animal.id, { archived_at: null });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unarchive failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function doneToday(item: DueItem) {
    if (!animal) return;
    setDoneBusy(item.protocolId);
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
  if (!animal) return <div className="empty">Tag not found. <Link to="/ranch">Back to My Ranch</Link></div>;

  const locName = locations.find((l) => l.id === animal.location_id)?.name ?? "Unassigned";

  return (
    <div>
      <div className="page-head">
        <h1>#{animal.tag_number}</h1>
        <Link className="btn" to={`/animals/${animal.id}/edit`}>Edit</Link>
      </div>

      {error && <div className="error">{error}</div>}

      {animal.archived_at && (
        <div className="notice">Archived on {animal.archived_at.slice(0, 10)} · use Unarchive below to restore.</div>
      )}

      <div className="card">
        {animal.photo_url && (
          <img src={animal.photo_url} alt={`Tag ${animal.tag_number}`} style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
        )}
        <div className="subtle">Species</div>
        <div>{animal.species}{animal.breed ? ` · ${animal.breed}` : ""}</div>
        <div className="row-inline" style={{ marginTop: 8 }}>
          <div><div className="subtle">Sex</div><div>{animal.sex ?? "unknown"}</div></div>
          <div><div className="subtle">Status</div><div>{animal.status}</div></div>
          <div><div className="subtle">Location</div><div>{locName}</div></div>
        </div>
        <div className="row-inline" style={{ marginTop: 8 }}>
          <div>
            <div className="subtle">Age</div>
            <div>
              {animal.date_of_birth
                ? `DOB ${animal.date_of_birth}`
                : animal.approx_age_days != null
                  ? `~${animal.approx_age_days} days (approx)`
                  : "unknown"}
            </div>
          </div>
        </div>
        {animal.notes && (<><div className="subtle" style={{ marginTop: 8 }}>Notes</div><div>{animal.notes}</div></>)}
      </div>

      <h2>Due items</h2>
      {due.length === 0 ? (
        <div className="empty">Nothing due for this tag.</div>
      ) : (
        due.map((d) => (
          <div key={d.protocolId} className={`card due-row ${d.status}`}>
            <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
              <div>
                <h3>{d.protocolName}</h3>
                <div className="subtle">{d.reason}{d.approximate ? " · approx date" : ""}</div>
              </div>
              <span className={`pill ${d.status}`}>{d.dueDate}</span>
            </div>
            <div className="spacer" />
            <button
              className="primary block"
              disabled={doneBusy === d.protocolId}
              onClick={() => doneToday(d)}
            >
              {doneBusy === d.protocolId ? "Saving…" : "Done today"}
            </button>
          </div>
        ))
      )}

      <div className="page-head" style={{ marginTop: 20 }}>
        <h2 style={{ margin: 0 }}>Event history</h2>
        <button className="primary" onClick={() => setShowEvent((v) => !v)}>{showEvent ? "Close" : "+ Add event"}</button>
      </div>

      {showEvent && (
        <AddEventForm
          animal={animal}
          protocols={speciesProtocols}
          onSaved={async () => {
            setShowEvent(false);
            await load();
          }}
        />
      )}

      {events.length === 0 ? (
        <div className="empty">No events yet.</div>
      ) : (
        events.map((e) => (
          <div key={e.id} className="card">
            <div className="card row" style={{ margin: 0, border: "none", padding: 0 }}>
              <div>
                <h3>{e.type}{e.product ? ` · ${e.product}` : ""}</h3>
                <div className="subtle">
                  {e.event_date}
                  {e.protocol_id ? ` · ${protocols.find((p) => p.id === e.protocol_id)?.name ?? "protocol"}` : ""}
                  {e.withdrawal_until ? ` · withdrawal until ${e.withdrawal_until}` : ""}
                </div>
                {e.notes && <div className="subtle">{e.notes}</div>}
              </div>
            </div>
          </div>
        ))
      )}

      <div className="spacer" />
      {animal.archived_at ? (
        <button className="primary block" disabled={actionBusy} onClick={unarchive}>
          {actionBusy ? "Working…" : "Unarchive tag"}
        </button>
      ) : (
        <button className="danger block" disabled={actionBusy} onClick={archive}>
          {actionBusy ? "Working…" : "Archive tag"}
        </button>
      )}
    </div>
  );
}

function AddEventForm({
  animal,
  protocols,
  onSaved,
}: {
  animal: Animal;
  protocols: Protocol[];
  onSaved: () => void;
}) {
  const [type, setType] = useState<EventType>("treatment");
  const [eventDate, setEventDate] = useState(todayIso());
  const [protocolId, setProtocolId] = useState("");
  const [product, setProduct] = useState("");
  const [withdrawal, setWithdrawal] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createEvent({
        ranch_id: animal.ranch_id,
        animal_id: animal.id,
        protocol_id: protocolId || null,
        type,
        event_date: eventDate,
        product: product.trim() || null,
        withdrawal_until: withdrawal || null,
        notes: notes.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="row-inline">
        <div>
          <label htmlFor="etype">Type</label>
          <select id="etype" value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {EVENT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div>
          <label htmlFor="edate">Date</label>
          <input id="edate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
        </div>
      </div>
      <label htmlFor="eprot">Link to protocol (optional)</label>
      <select id="eprot" value={protocolId} onChange={(e) => setProtocolId(e.target.value)}>
        <option value="">— none —</option>
        {protocols.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
      </select>
      <label htmlFor="eprod">Product / description</label>
      <input id="eprod" value={product} onChange={(e) => setProduct(e.target.value)} />
      <label htmlFor="ewith">Withdrawal until (optional)</label>
      <input id="ewith" type="date" value={withdrawal} onChange={(e) => setWithdrawal(e.target.value)} />
      <label htmlFor="enotes">Notes</label>
      <textarea id="enotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="spacer" />
      <button className="primary block" type="submit" disabled={busy}>{busy ? "Saving…" : "Log event"}</button>
    </form>
  );
}
