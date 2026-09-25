import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addLocation,
  deleteLocation,
  deleteRanchData,
  getLocations,
  getRanch,
  updateRanchName,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Location, Ranch } from "../types";

const PRIVACY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL as string | undefined;
const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL as string | undefined;

export default function Settings() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [ranch, setRanch] = useState<Ranch | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const [r, l] = await Promise.all([getRanch(), getLocations()]);
    setRanch(r);
    setName(r?.name ?? "");
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
  }, []);

  async function saveName() {
    if (!ranch) return;
    setError(null);
    try {
      await updateRanchName(ranch.id, name.trim() || "My Ranch");
      setNotice("Ranch name saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function addLoc() {
    if (!ranch || !newLocation.trim()) return;
    setError(null);
    try {
      const lastSort = locations.length ? locations[locations.length - 1].sort_order : 0;
      await addLocation(ranch.id, newLocation.trim(), lastSort + 1);
      setNewLocation("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add location");
    }
  }

  async function removeLoc(id: string) {
    if (!confirm("Delete this location? Animals there become Unassigned.")) return;
    await deleteLocation(id);
    await load();
  }

  async function deleteAccount() {
    if (!ranch) return;
    if (confirmName !== ranch.name) {
      setError("Type the ranch name exactly to confirm deletion.");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteRanchData(ranch.id);
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-head"><h1>Settings</h1></div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <h2>Ranch</h2>
      <div className="card">
        <label htmlFor="rname">Ranch name</label>
        <input id="rname" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="spacer" />
        <button className="primary" onClick={saveName}>Save name</button>
      </div>

      <h2>Locations</h2>
      <div className="card">
        <div className="row-inline">
          <input placeholder="Add a pen / pasture…" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
          <button className="primary" style={{ flex: "0 0 auto" }} onClick={addLoc}>Add</button>
        </div>
        <ul className="list-reset" style={{ marginTop: 10 }}>
          {locations.map((l) => (
            <li key={l.id} className="card row" style={{ marginBottom: 6 }}>
              <span>{l.name}</span>
              <button className="ghost" onClick={() => removeLoc(l.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>

      {(PRIVACY_URL || SUPPORT_URL) && (
        <>
          <h2>Legal & support</h2>
          <div className="card">
            {PRIVACY_URL && <div><a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy policy</a></div>}
            {SUPPORT_URL && <div style={{ marginTop: 6 }}><a href={SUPPORT_URL} target="_blank" rel="noreferrer">Support</a></div>}
          </div>
        </>
      )}

      <h2>Account</h2>
      <div className="card">
        <button className="block" onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}>
          Sign out
        </button>
      </div>

      <h2 style={{ color: "var(--danger)" }}>Danger zone</h2>
      <div className="card">
        <div className="subtle">
          Deleting removes all ranch data — animals, events, protocols, locations, maintenance, and photos.
          Type the ranch name <strong>{ranch?.name}</strong> to confirm.
        </div>
        <div className="spacer" />
        <input placeholder="Ranch name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
        <div className="spacer" />
        <button className="danger block" onClick={deleteAccount} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete account & ranch data"}
        </button>
      </div>
    </div>
  );
}
