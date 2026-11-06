import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog, useLookup } from '../data/CatalogContext';
import { Stage } from '../components/Stage';
import { describeDesign, useCart, whatsappLink, type Customer } from '../lib/cart';
import { designPrice, money } from '../lib/rules';

export default function Order() {
  const { catalog } = useCatalog();
  const look = useLookup();
  const cart = useCart();
  const [customer, setCustomer] = useState<Customer>({ name: '', date: '', notes: '' });

  const items = cart.items.filter((i) => look.mold.has(i.moldId));
  const total = items.reduce((s, i) => s + designPrice(catalog, i) * i.qty, 0);

  if (!items.length) {
    return (
      <main className="section container center">
        <h1 className="page-title">
          <span className="title-script">Mi pedido</span>
        </h1>
        <p className="muted">Todavía no agregas nada.</p>
        <Link to="/personaliza" className="btn primary">
          ✨ Personaliza tu primera vela
        </Link>
      </main>
    );
  }

  return (
    <main className="section container order">
      <h1 className="page-title">
        <span className="title-script">Mi pedido</span>
      </h1>
      <ul className="order-list">
        {items.map((it) => {
          const mold = look.mold.get(it.moldId)!;
          const plate = it.plateId ? (look.plate.get(it.plateId) ?? null) : null;
          const [first, ...rest] = describeDesign(catalog, it);
          const params = new URLSearchParams({
            molde: mold.slug,
            tipo: it.type,
            color: it.colorId,
            placa: it.plateId ?? 'ninguna',
            ...(it.veinColor ? { veta: it.veinColor.replace('#', '') } : {}),
            ...(it.essenceId ? { esencia: it.essenceId } : {}),
          });
          return (
            <li key={it.id} className="order-item card">
              <Link to={`/personaliza?${params}`} className="order-thumb" aria-label="Editar diseño">
                <Stage
                  mold={mold}
                  type={it.type}
                  color={look.color.get(it.colorId)?.hex ?? '#fff'}
                  colorId={it.colorId}
                  plate={plate}
                  veinColor={it.veinColor}
                  theme={look.collection.get(mold.collectionId)?.theme}
                />
              </Link>
              <div className="order-info">
                <b>{first}</b>
                {rest.map((l) => (
                  <span key={l}>{l}</span>
                ))}
                <span className="muted">{money(designPrice(catalog, it))} c/u</span>
              </div>
              <div className="order-qty">
                <div className="qty">
                  <button type="button" onClick={() => cart.setQty(it.id, it.qty - 1)} aria-label="Menos">
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => cart.setQty(it.id, Number(e.target.value) || 1)}
                    aria-label="Cantidad"
                  />
                  <button type="button" onClick={() => cart.setQty(it.id, it.qty + 1)} aria-label="Más">
                    +
                  </button>
                </div>
                <b>{money(designPrice(catalog, it) * it.qty)}</b>
                <button type="button" className="link-btn" onClick={() => cart.remove(it.id)}>
                  Quitar
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="checkout card">
        <h2>Datos para tu pedido</h2>
        <label>
          Tu nombre
          <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Ej. Ana" />
        </label>
        <label>
          ¿Para cuándo lo necesitas?
          <input type="date" value={customer.date} onChange={(e) => setCustomer({ ...customer, date: e.target.value })} />
        </label>
        <label>
          Notas
          <textarea
            rows={3}
            value={customer.notes}
            onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
            placeholder="Ej. Es para regalo, ¿lo pueden envolver?"
          />
        </label>
        <p className="total">
          Total aproximado <b>{money(total)}</b>
        </p>
        <a className="btn primary wide" href={whatsappLink(catalog, items, customer)} target="_blank" rel="noreferrer">
          💬 Enviar pedido por WhatsApp
        </a>
        <p className="muted small">Te confirmamos disponibilidad, tiempo de entrega y forma de pago por WhatsApp.</p>
        <button type="button" className="link-btn" onClick={() => confirm('¿Vaciar el pedido?') && cart.clear()}>
          Vaciar pedido
        </button>
      </div>
    </main>
  );
}
