import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import Landing from "./pages/Landing";
import Overview from "./pages/app/Overview";
import Findings from "./pages/app/Findings";
import Repositories from "./pages/app/Repositories";
import Rules from "./pages/app/Rules";
import Playground from "./pages/app/Playground";
import Integrations from "./pages/app/Integrations";
import Settings from "./pages/app/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="repos" element={<Repositories />} />
        <Route path="findings" element={<Findings />} />
        <Route path="rules" element={<Rules />} />
        <Route path="playground" element={<Playground />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
