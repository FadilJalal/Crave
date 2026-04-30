import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  return (
    <div className="as-shell">
      <Sidebar />
      <main className="as-main" style={{ padding: 0 }}>
        <Topbar />
        <div className="container" style={{ padding: "30px 40px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}