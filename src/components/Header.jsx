import { useState } from 'react';

export default function Header({
  t,
  language,
  onChangeLanguage,
  currentPage,
  onChangePage,
  sidebarOpen,
  onToggleSidebar,
  onStart,
  onNext,
  onPause,
  onReset,
  running,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pages = [
    { id: 'home', label: t.nav.home },
    { id: 'instructions', label: t.nav.instructions },
    { id: 'about', label: t.nav.about },
    { id: 'settings', label: t.nav.settings },
  ];

  function handleSelection(page) {
    onChangePage(page);
    setMenuOpen(false);
  }

  function toggleLanguage() {
    onChangeLanguage(language === 'en' ? 'pl' : 'en');
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className={`menu-toggle${sidebarOpen ? ' active' : ''}`}
          onClick={onToggleSidebar}
          aria-label={t.menu.toggleSidebar}
          aria-pressed={sidebarOpen}
          title={t.menu.openSidebar}
        >
          ⚙️
        </button>
        <h1>{t.appTitle}</h1>
      </div>

      <div className="header-controls">
        <button className="start-button header-action" onClick={onReset}>
          {t.controls.generate}
        </button>
        <button className="start-button header-action" onClick={running ? onPause : onNext}>
          {running ? t.controls.stop : t.controls.next}
        </button>
        <button className="start-button header-action" onClick={onStart}>
          {running ? t.controls.repeat : t.controls.start}
        </button>
      </div>

      <div className="header-right">
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={t.menu.toggleMenu}
        >
          ☰
        </button>
      </div>
      {menuOpen && (
        <nav className="page-menu">
          <ul>
            {pages.map((p) => (
              <li key={p.id}>
                <button
                  className={p.id === currentPage ? 'active' : ''}
                  onClick={() => handleSelection(p.id)}
                >
                  {p.label}
                </button>
              </li>
            ))}
            <li className="menu-language-item">
              <div className="menu-language-row">
                <span>{t.menu.language}</span>
                <button
                  className={`language-switch${language === 'pl' ? ' pl' : ''}`}
                  onClick={toggleLanguage}
                  role="switch"
                  aria-checked={language === 'pl'}
                  aria-label={t.menu.language}
                >
                  <span className="language-switch-track">
                    <span className="language-switch-thumb" />
                  </span>
                  <span className="language-switch-label">{language === 'pl' ? t.menu.polishMode : t.menu.englishMode}</span>
                </button>
              </div>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
