import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  return (
    <div className="as-shell">
      <Sidebar />
      <main className="as-main">
        <Topbar />
        <div className="container" style={{ padding: 0 }}>
          {children}
        </div>
      </main>
    </div>
  );
}