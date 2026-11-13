import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useCatalog } from '../data/CatalogContext';
import { useCart, whatsappHello } from '../lib/cart';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Inicio">
      <svg viewBox="0 0 48 48" aria-hidden width="38" height="38">
        <circle cx="24" cy="24" r="22" fill="#f9d7e3" />
        <g fill="#b58ad6">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="24" cy="13" rx="5.5" ry="9" transform={`rotate(${a} 24 24)`} />
          ))}
        </g>
        <circle cx="24" cy="24" r="5" fill="#f5c04a" />
        <circle cx="40" cy="9" r="4" fill="none" stroke="#e5487f" strokeWidth="1.6" />
        <circle cx="44" cy="17" r="2" fill="none" stroke="#e5487f" strokeWidth="1.2" />
      </svg>
      <span>
        Luz y burbujas <b>Lulú</b>
      </span>
    </Link>
  );
}

export default function Layout() {
  const { catalog, error } = useCatalog();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const close = () => setOpen(false);

  return (
    <>
      <header className="site-header">
        <div className="container header-row">
          <Logo />
          <button type="button" className="menu-btn" aria-expanded={open} aria-label="Menú" onClick={() => setOpen(!open)}>
            {open ? '✕' : '☰'}
          </button>
          <nav className={`nav ${open ? 'open' : ''}`} onClick={close}>
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <NavLink to="/catalogo">Catálogo</NavLink>
            <NavLink to="/personaliza">Personaliza</NavLink>
            <NavLink to="/arreglos">Arreglos</NavLink>
            <NavLink to="/pedido" className="cart-link">
              Mi pedido {count > 0 && <span className="badge">{count}</span>}
            </NavLink>
          </nav>
        </div>
      </header>
      {error && <div className="banner warn">⚠️ {error}. Mostrando el catálogo base.</div>}
      <Outlet />
      <footer className="site-footer">
        <div className="container footer-row">
          <div>
            <Logo />
            <p>{catalog.settings.tagline}</p>
          </div>
          <div className="footer-links">
            <a href={whatsappHello(catalog)} target="_blank" rel="noreferrer">
              💬 WhatsApp
            </a>
            {catalog.settings.instagram && (
              <a href={catalog.settings.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            )}
            {catalog.settings.facebook && (
              <a href={catalog.settings.facebook} target="_blank" rel="noreferrer">
                Facebook
              </a>
            )}
            <Link to="/admin">Administrar</Link>
          </div>
        </div>
      </footer>
      {pathname !== '/pedido' && (
      <a className="wa-float" href={whatsappHello(catalog)} target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
          <path
            fill="currentColor"
            d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1 2.2.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3z"
          />
        </svg>
      </a>
      )}
    </>
  );
}
