import React from 'react';

export default function CartButton({ onClick, t }) {
  const label = t?.cart?.buttonLabel || 'Buy rhythm dice';
  return (
    <button
      className="cart-button menu-action"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M7 4h-2l-1 2v2h2l3.6 7.59-1.35 2.44A1 1 0 0 0 9 19h10v-2H9.42a.25.25 0 0 1-.23-.15L10.1 15h7.45a1 1 0 0 0 .92-.63l2-5A1 1 0 0 0 20 8H7.21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10" cy="20" r="1" fill="currentColor" />
        <circle cx="18" cy="20" r="1" fill="currentColor" />
      </svg>
    </button>
  );
}
