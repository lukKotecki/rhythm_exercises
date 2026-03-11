import { useState } from 'react';

export default function Header({
  currentPage,
  onChangePage,
  sidebarOpen,
  onToggleSidebar,
  onStart,
  onPause,
  onReset,
  running,
  hasBars,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pages = ['Home', 'Instructions', 'About', 'Settings'];

  function handleSelection(page) {
    onChangePage(page);
    setMenuOpen(false);
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className={`menu-toggle${sidebarOpen ? ' active' : ''}`}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          aria-pressed={sidebarOpen}
          title="Settings"
        >
          ⚙️
        </button>
        <h1>Rhythm Exercise</h1>
      </div>
      <div className="header-controls">
        <button className="start-button" onClick={onStart} disabled={running}>
          {running ? 'Running...' : 'Start'}
        </button>
        <button className="start-button" onClick={onPause} disabled={!running}>
          Stop
        </button>
        <button className="start-button" onClick={onReset} disabled={running || !hasBars}>
          Reset
        </button>
      </div>
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      {menuOpen && (
        <nav className="page-menu">
          <ul>
            {pages.map((p) => (
              <li key={p}>
                <button
                  className={p === currentPage ? 'active' : ''}
                  onClick={() => handleSelection(p)}
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
