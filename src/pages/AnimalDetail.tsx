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
import { getDueItems, ANIMAL_DUE_HORIZON_DAYS } from "../lib/protocolEngine";
import { formatDisplayDate, todayIso } from "../lib/date";
import { formatAnimalAgeLine } from "../lib/ageInWords";
import { activeWithdrawalForAnimal } from "../lib/withdrawals";
import type { Animal, AnimalEvent, AnimalStatus, DueItem, EventType, Location, Protocol } from "../types";

const EVENT_TYPES: EventType[] = ["vaccine", "treatment", "check", "other"];
const STATUSES: AnimalStatus[] = ["active", "sold", "dead", "culled", "missing"];

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
  const [showStatus, setShowStatus] = useState(false);
  const [statusPick, setStatusPick] = useState<AnimalStatus>("active");
  const [statusBusy, setStatusBusy] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [locationPick, setLocationPick] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);

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
    () => (animal ? getDueItems(animal, protocols, events, today, ANIMAL_DUE_HORIZON_DAYS) : []),
    [animal, protocols, events, today]
  );
  const activeWithhold = useMemo(
    () => (animal ? activeWithdrawalForAnimal(events, animal.id, today) : null),
    [animal, events, today]
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

  async function saveStatus() {
    if (!animal) return;
    const next = statusPick;
    if (next !== animal.status && next !== "active") {
      const label = next.charAt(0).toUpperCase() + next.slice(1);
      if (!confirm(`Set tag #${animal.tag_number} to ${label}? It will leave the default Active list.`)) return;
    }
    setStatusBusy(true);
    setError(null);
    try {
      await updateAnimal(animal.id, { status: next });
      if (next === "active") {
        setShowStatus(false);
        await load();
      } else {
        navigate("/ranch");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
      setStatusBusy(false);
    }
  }

  function openStatusPicker() {
    if (!animal) return;
    setShowLocation(false);
    setStatusPick(animal.status);
    setShowStatus(true);
  }

  function openLocationPicker() {
    if (!animal) return;
    setShowStatus(false);
    setLocationPick(animal.location_id ?? locations[0]?.id ?? "");
    setShowLocation(true);
  }

  async function saveLocation() {
    if (!animal || !locationPick) return;
    setLocationBusy(true);
    setError(null);
    try {
      await updateAnimal(animal.id, { location_id: locationPick });
      setShowLocation(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Location update failed");
    } finally {
      setLocationBusy(false);
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
        <div className="notice">Archived on {formatDisplayDate(animal.archived_at.slice(0, 10))} · use Unarchive below to restore.</div>
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
            <div>{formatAnimalAgeLine(animal, today)}</div>
          </div>
        </div>
        {activeWithhold && (
          <div style={{ marginTop: 8 }}>
            <div className="subtle">Meat/milk withhold until</div>
            <div>{formatDisplayDate(activeWithhold)}</div>
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <div className="subtle">Notes</div>
          <div>{animal.notes?.trim() ? animal.notes : "None"}</div>
        </div>
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
              <span className={`pill ${d.status}`}>{formatDisplayDate(d.dueDate)}</span>
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
                  {formatDisplayDate(e.event_date)}
                  {e.protocol_id ? ` · ${protocols.find((p) => p.id === e.protocol_id)?.name ?? "protocol"}` : ""}
                  {e.withdrawal_until ? ` · meat/milk withhold until ${formatDisplayDate(e.withdrawal_until)}` : ""}
                </div>
                {e.notes && <div className="subtle">{e.notes}</div>}
              </div>
            </div>
          </div>
        ))
      )}

      <div className="spacer" />
      {showStatus ? (
        <div className="card">
          <label htmlFor="status-pick">Status</label>
          <select
            id="status-pick"
            value={statusPick}
            onChange={(e) => setStatusPick(e.target.value as AnimalStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="spacer" />
          <div className="row-inline">
            <button className="primary block" disabled={statusBusy} onClick={saveStatus}>
              {statusBusy ? "Saving…" : "Save status"}
            </button>
            <button className="block" type="button" disabled={statusBusy} onClick={() => setShowStatus(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="primary block" onClick={openStatusPicker}>Change status</button>
      )}
      <div className="spacer" />
      {showLocation ? (
        <div className="card">
          <label htmlFor="location-pick">Location</label>
          <select
            id="location-pick"
            value={locationPick}
            onChange={(e) => setLocationPick(e.target.value)}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <div className="spacer" />
          <div className="row-inline">
            <button className="accent block" disabled={locationBusy || !locationPick} onClick={saveLocation}>
              {locationBusy ? "Saving…" : "Save location"}
            </button>
            <button className="block" type="button" disabled={locationBusy} onClick={() => setShowLocation(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        !animal.archived_at && (
          <button className="accent block" onClick={openLocationPicker}>Change location</button>
        )
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
      <label htmlFor="ewith">Meat/milk withhold until (optional)</label>
      <input id="ewith" type="date" value={withdrawal} onChange={(e) => setWithdrawal(e.target.value)} />
      <label htmlFor="enotes">Notes</label>
      <textarea id="enotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="spacer" />
      <button className="primary block" type="submit" disabled={busy}>{busy ? "Saving…" : "Log event"}</button>
    </form>
  );
}
