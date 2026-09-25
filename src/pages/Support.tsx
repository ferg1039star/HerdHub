import { Link } from "react-router-dom";

// Placeholder support page. Replace the contact details (and/or set
// VITE_SUPPORT_URL to a hosted page) before a public store submission.
export default function Support() {
  return (
    <div className="app-shell">
      <div className="page-head">
        <h1>Support</h1>
        <Link className="btn" to="/settings">Back</Link>
      </div>
      <div className="card">
        <h3>Getting help</h3>
        <p>
          HerdHub is a single-operator ranch inventory tracker. For help, questions, or to report a problem,
          reach out via the channel below.
        </p>
        <h3>Contact</h3>
        <p>
          Email: <a href="mailto:support@herdhub.app">support@herdhub.app</a>
        </p>
        <h3>Common tasks</h3>
        <ul>
          <li>Add a tag: <Link to="/ranch">My Ranch → + Add tag</Link></li>
          <li>Set up care rules: <Link to="/protocols">Protocols</Link></li>
          <li>Track ranch upkeep: <Link to="/maintenance">Maintenance</Link></li>
          <li>Delete your account: <Link to="/settings">Settings → Danger zone</Link></li>
        </ul>
      </div>
    </div>
  );
}
