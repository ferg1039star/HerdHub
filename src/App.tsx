import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import MyRanch from "./pages/MyRanch";
import AnimalForm from "./pages/AnimalForm";
import AnimalDetail from "./pages/AnimalDetail";
import Protocols from "./pages/Protocols";
import Maintenance from "./pages/Maintenance";
import Settings from "./pages/Settings";
import TabBar from "./components/TabBar";
import type { ReactNode } from "react";

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <>
      <div className="app-shell">{children}</div>
      <TabBar />
    </>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="loading">Loading…</div> : session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/ranch" element={<Protected><MyRanch /></Protected>} />
      <Route path="/animals/new" element={<Protected><AnimalForm /></Protected>} />
      <Route path="/animals/:id" element={<Protected><AnimalDetail /></Protected>} />
      <Route path="/animals/:id/edit" element={<Protected><AnimalForm /></Protected>} />
      <Route path="/protocols" element={<Protected><Protocols /></Protected>} />
      <Route path="/maintenance" element={<Protected><Maintenance /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
