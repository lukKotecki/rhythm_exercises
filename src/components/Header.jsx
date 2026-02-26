import { useState } from 'react';

export default function Header({ currentPage, onChangePage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pages = ['Home', 'Instructions', 'About', 'Settings'];

  function toggleMenu() {
    setMenuOpen((o) => !o);
  }

  function handleSelection(page) {
    onChangePage(page);
    setMenuOpen(false);
  }

  return (
    <header className="app-header">
      <h1>Rhythm Exercise</h1>
      <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
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
