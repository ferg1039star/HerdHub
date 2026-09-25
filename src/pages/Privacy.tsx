import { Link } from "react-router-dom";

const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL as string | undefined;

// Placeholder policy suitable for internal testing / store review scaffolding.
// Replace the copy (and/or set VITE_PRIVACY_POLICY_URL to a hosted page) before
// a public store submission.
export default function Privacy() {
  return (
    <div className="app-shell">
      <div className="page-head">
        <h1>Privacy Policy</h1>
        <Link className="btn" to="/settings">Back</Link>
      </div>
      <div className="card">
        <p className="subtle">Last updated: 2026</p>
        <h3>What HerdHub stores</h3>
        <p>
          HerdHub stores only the ranch data you enter: your account email (for sign-in), your ranch name and
          optional location text, and the livestock records you create — tags, species, locations, care
          protocols, events, maintenance items, and any photos you upload.
        </p>
        <h3>How it is used</h3>
        <p>
          Your data is used solely to operate the app for you. Row-Level Security scopes every record to your
          ranch, so no other account can read or modify your data. HerdHub does not sell your data, show ads, or
          use third-party trackers.
        </p>
        <h3>Data deletion</h3>
        <p>
          You can permanently delete your account and all associated data at any time from{" "}
          <Link to="/settings">Settings → Danger zone</Link>. Deletion removes your login, ranch records, and
          uploaded photos, and cannot be undone.
        </p>
        <h3>Contact</h3>
        <p>
          Questions about your data? {SUPPORT_URL ? <a href={SUPPORT_URL} target="_blank" rel="noreferrer">Contact support</a> : <Link to="/support">Contact support</Link>}.
        </p>
      </div>
    </div>
  );
}
