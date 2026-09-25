import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createAnimal,
  getAnimal,
  getAnimals,
  getLocations,
  getRanch,
  updateAnimal,
} from "../lib/api";
import { supabase } from "../lib/supabase";
import { isIntegerTag } from "../lib/sortTags";
import { errorMessage, isUniqueViolation } from "../lib/errors";
import type { Animal, AnimalSex, AnimalStatus, DobPrecision, Location } from "../types";

const STATUSES: AnimalStatus[] = ["active", "sold", "dead", "culled", "missing"];
const SEXES: AnimalSex[] = ["female", "male", "unknown"];

export default function AnimalForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [ranchId, setRanchId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [speciesList, setSpeciesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tag, setTag] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<AnimalSex>("unknown");
  const [dob, setDob] = useState("");
  const [approxAge, setApproxAge] = useState("");
  const [status, setStatus] = useState<AnimalStatus>("active");
  const [locationId, setLocationId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existing, setExisting] = useState<Animal | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ranch, locs, animals] = await Promise.all([getRanch(), getLocations(), getAnimals()]);
        setRanchId(ranch?.id ?? null);
        setLocations(locs);
        setSpeciesList([...new Set(animals.map((a) => a.species))].sort());
        const unassigned = locs.find((l) => l.name === "Unassigned") ?? locs[0];
        setLocationId(unassigned?.id ?? "");

        if (editing && id) {
          const a = await getAnimal(id);
          if (a) {
            setExisting(a);
            setTag(a.tag_number);
            setSpecies(a.species);
            setBreed(a.breed ?? "");
            setSex((a.sex as AnimalSex) ?? "unknown");
            setDob(a.date_of_birth ?? "");
            setApproxAge(a.approx_age_days != null ? String(a.approx_age_days) : "");
            setStatus(a.status);
            setLocationId(a.location_id ?? unassigned?.id ?? "");
            setNotes(a.notes ?? "");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, id]);

  const dobPrecision = useMemo<DobPrecision>(() => {
    if (dob) return "exact";
    if (approxAge) return "approximate";
    return "unknown";
  }, [dob, approxAge]);

  async function uploadPhotoIfAny(): Promise<string | null> {
    if (!photoFile || !ranchId) return existing?.photo_url ?? null;
    const ext = photoFile.name.split(".").pop() || "jpg";
    const path = `${ranchId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("animal-photos").upload(path, photoFile, {
      upsert: true,
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("animal-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isIntegerTag(tag)) {
      setError("Tag number must be digits only (v1). Suffixes come later.");
      return;
    }
    if (!species.trim()) {
      setError("Species is required.");
      return;
    }
    if (status === "active" && !locationId) {
      setError("Active animals need a location.");
      return;
    }

    setBusy(true);
    try {
      let photoUrl: string | null = existing?.photo_url ?? null;
      try {
        photoUrl = await uploadPhotoIfAny();
      } catch {
        // Photo is optional — don't block the save if storage upload fails.
        photoUrl = existing?.photo_url ?? null;
      }

      const payload = {
        ranch_id: ranchId!,
        tag_number: tag.trim(),
        species: species.trim(),
        breed: breed.trim() || null,
        sex,
        date_of_birth: dob || null,
        approx_age_days: approxAge ? Number(approxAge) : null,
        dob_precision: dobPrecision,
        status,
        location_id: locationId || null,
        photo_url: photoUrl,
        notes: notes.trim() || null,
        archived_at: existing?.archived_at ?? null,
      };

      if (editing && id) {
        await updateAnimal(id, payload);
        navigate(`/animals/${id}`);
      } else {
        const created = await createAnimal(payload);
        navigate(`/animals/${created.id}`);
      }
    } catch (err) {
      setError(
        isUniqueViolation(err) ? "That tag number already exists on this ranch." : errorMessage(err)
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-head">
        <h1>{editing ? `Edit #${existing?.tag_number ?? ""}` : "Add tag"}</h1>
        <button className="ghost" onClick={() => navigate(-1)}>Cancel</button>
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={submit}>
        <label htmlFor="tag">Tag number (digits only)</label>
        <input id="tag" inputMode="numeric" value={tag} onChange={(e) => setTag(e.target.value)} required />

        <label htmlFor="species">Species</label>
        <input
          id="species"
          list="species-list"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          placeholder="cow, pig, goat, chicken…"
          required
        />
        <datalist id="species-list">
          {speciesList.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <div className="row-inline">
          <div>
            <label htmlFor="breed">Breed (optional)</label>
            <input id="breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
          </div>
          <div>
            <label htmlFor="sex">Sex</label>
            <select id="sex" value={sex} onChange={(e) => setSex(e.target.value as AnimalSex)}>
              {SEXES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row-inline">
          <div>
            <label htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <label htmlFor="approx">…or approx age (days)</label>
            <input id="approx" inputMode="numeric" value={approxAge} onChange={(e) => setApproxAge(e.target.value)} disabled={Boolean(dob)} />
          </div>
        </div>
        <div className="subtle">Age precision: {dobPrecision}</div>

        <div className="row-inline">
          <div>
            <label htmlFor="status">Status</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value as AnimalStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="location">Location</label>
            <select id="location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Unassigned</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="photo">Photo (optional)</label>
        <input id="photo" type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />

        <label htmlFor="notes">Notes</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="spacer" />
        <button className="primary block" type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Add tag"}
        </button>
      </form>
    </div>
  );
}
