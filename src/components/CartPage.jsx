import { useState } from 'react';

function ProductCard({ img, title, subtitle, price, onChooseProduct, buyNow }) {
  return (
    <div className="product-card">
      <div className="product-media">
        <img src={img} alt={title} />
      </div>
      <div className="product-info">
        <h3 className="product-title">{title}</h3>
        <div className="product-sub">{subtitle}</div>
        <div className="product-foot">
          <div className="product-price">{price}</div>
          <button className="buy-button" onClick={onChooseProduct}>{buyNow}</button>
        </div>
      </div>
    </div>
  );
}

function getProducts(store) {
  return [
    {
      id: 'basic',
      img: '/cart1.svg',
      title: store.basicTitle,
      subtitle: store.basicDescription,
      price: '29,99 PLN',
    },
    {
      id: 'expanded',
      img: '/cart2.svg',
      title: store.expandedTitle,
      subtitle: store.expandedDescription,
      price: '49,99 PLN',
    },
    {
      id: 'collector',
      img: '/cart3.svg',
      title: store.collectorTitle,
      subtitle: store.collectorDescription,
      price: '99,99 PLN',
    },
  ];
}

export default function CartPage({ t }) {
  const { store } = t.cart;
  const products = getProducts(store);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('blik');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function startCheckout(event) {
    event.preventDefault();
    if (!selectedProduct || isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(import.meta.env.VITE_PAYMENTS_API_URL || '/api/checkout.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          customerName,
          customerEmail,
          paymentMethod,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.redirectUrl) {
        throw new Error(data.error || store.checkoutError);
      }
      window.location.assign(data.redirectUrl);
    } catch (checkoutError) {
      setError(checkoutError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="cart-page">
      <header className="cart-header">
        <div>
          <h2>{store.title}</h2>
          <p className="muted">{store.demoNotice}</p>
        </div>
      </header>

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
            buyNow={store.buyNow}
            onChooseProduct={() => {
              setSelectedProduct(product);
              setError('');
            }}
          />
        ))}
      </div>

      {selectedProduct && (
        <section className="checkout-panel" aria-labelledby="checkout-title">
          <div className="checkout-summary">
            <span>{store.selectedProduct}</span>
            <strong>{selectedProduct.title}</strong>
            <strong>{selectedProduct.price}</strong>
          </div>
          <form className="checkout-form" onSubmit={startCheckout}>
            <h3 id="checkout-title">{store.paymentDetails}</h3>
            <label>
              {store.name}
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" required />
            </label>
            <label>
              {store.email}
              <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} autoComplete="email" required />
            </label>
            <fieldset className="payment-methods">
              <legend>{store.paymentMethod}</legend>
              <label>
                <input type="radio" name="paymentMethod" value="blik" checked={paymentMethod === 'blik'} onChange={(event) => setPaymentMethod(event.target.value)} />
                BLIK
              </label>
              <label>
                <input type="radio" name="paymentMethod" value="bank-transfer" checked={paymentMethod === 'bank-transfer'} onChange={(event) => setPaymentMethod(event.target.value)} />
                {store.bankTransfer}
              </label>
            </fieldset>
            <p className="checkout-note">{store.paymentGatewayNotice}</p>
            {error && <p className="checkout-error" role="alert">{error}</p>}
            <div className="checkout-actions">
              <button type="button" className="cancel-button" onClick={() => setSelectedProduct(null)}>{store.cancel}</button>
              <button className="buy-button" type="submit" disabled={isSubmitting}>{isSubmitting ? store.redirecting : store.pay.replace('{price}', selectedProduct.price)}</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

