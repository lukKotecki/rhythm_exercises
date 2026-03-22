import { useState } from 'react';

export default function Header({
  currentPage,
  onChangePage,
  sidebarOpen,
  onToggleSidebar,
  onStart,
  onResume,
  onNext,
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
        <button className="start-button header-action" onClick={onReset}>
          Generate
        </button>
        <button className="start-button header-action" onClick={running ? onPause : onNext}>
          {running ? 'Stop' : 'Next'}
        </button>
        <button className="start-button header-action" onClick={onStart}>
          {running ? 'Repeat' : 'Start'}
        </button>
      </div>

      <div className="header-right">
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>
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
