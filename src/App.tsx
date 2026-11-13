import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { CatalogProvider } from './data/CatalogContext';
import { CartProvider } from './lib/cart';
import Layout from './components/Layout';
import Home from './pages/Home';
import CatalogPage from './pages/CatalogPage';
import Customizer from './pages/Customizer';
import Order from './pages/Order';
import Arrangements, { ArrangementPage } from './pages/Arrangements';

// El panel de administración se descarga solo cuando se visita.
const Admin = lazy(() => import('./admin/Admin'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <main className="section container center">
      <h1 className="page-title">
        <span className="title-script">Ups…</span>
      </h1>
      <p className="muted">Esta página no existe.</p>
      <Link to="/" className="btn primary">
        Ir al inicio
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <CatalogProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollTop />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalogo" element={<CatalogPage />} />
              <Route path="personaliza" element={<Customizer />} />
              <Route path="arreglos" element={<Arrangements />} />
              <Route path="arreglos/:slug" element={<ArrangementPage />} />
              <Route path="pedido" element={<Order />} />
              <Route
                path="admin"
                element={
                  <Suspense fallback={<main className="section container">Cargando…</main>}>
                    <Admin />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </CatalogProvider>
  );
}
