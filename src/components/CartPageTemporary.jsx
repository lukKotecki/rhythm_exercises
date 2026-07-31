export default function CartPageTemporary() {
  return (
    <section className="cart-temporary-page" aria-labelledby="cart-temporary-title">
      <div className="cart-temporary-orbit cart-temporary-orbit-one" aria-hidden="true" />
      <div className="cart-temporary-orbit cart-temporary-orbit-two" aria-hidden="true" />

      <div className="cart-temporary-card">
        <div className="cart-temporary-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 4h-2l-1 2v2h2l3.6 7.59-1.35 2.44A1 1 0 0 0 9 19h10v-2H9.42a.25.25 0 0 1-.23-.15L10.1 15h7.45a1 1 0 0 0 .92-.63l2-5A1 1 0 0 0 20 8H7.21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="20" r="1" fill="currentColor" />
            <circle cx="18" cy="20" r="1" fill="currentColor" />
          </svg>
        </div>
        <p className="cart-temporary-eyebrow">KOŚCI RYTMICZNE</p>
        <h2 id="cart-temporary-title">Zamówienia przyjmujemy e-mailowo</h2>
        <p className="cart-temporary-description">
          Aby zamówić fizyczny zestaw „Kości rytmiczne”, napisz do nas — odpowiemy z informacją o dostępności i szczegółach zamówienia.
        </p>
        <a className="cart-temporary-mail" href="mailto:lukkotecki@gmail.com?subject=Zamówienie%20Kości%20rytmiczne">
          <span aria-hidden="true">✉</span>
          lukkotecki@gmail.com
        </a>
        <div className="cart-temporary-divider" aria-hidden="true" />
        <p className="cart-temporary-model-title">Wolisz wydrukować własny zestaw?</p>
        <p className="cart-temporary-description">
          Model 3D kości rytmicznych do samodzielnego wydruku jest dostępny na Cults3D.
        </p>
        <a
          className="cart-temporary-model-link"
          href="https://cults3d.com/en/3d-model/various/rhythm-dices-dices-with-notes"
          target="_blank"
          rel="noreferrer"
        >
          Zobacz model na Cults3D <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
