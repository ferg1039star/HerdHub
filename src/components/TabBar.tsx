import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/ranch", label: "My Ranch", icon: "🐄", end: false },
  { to: "/protocols", label: "Protocols", icon: "💉", end: false },
  { to: "/maintenance", label: "Maintenance", icon: "🛠️", end: false },
  { to: "/settings", label: "Settings", icon: "⚙️", end: false },
];

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="ic">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
