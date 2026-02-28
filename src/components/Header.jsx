import { useState } from 'react';

export default function Header({
  currentPage,
  onChangePage,
  sidebarOpen,
  onToggleSidebar,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pages = ['Home', 'Instructions', 'About', 'Settings'];

  function handleSelection(page) {
    onChangePage(page);
    setMenuOpen(false);
  }

  return (
    <header className="app-header">
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
