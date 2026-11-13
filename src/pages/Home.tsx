import { Link } from 'react-router-dom';
import { useCatalog, useLookup } from '../data/CatalogContext';
import { Stage } from '../components/Stage';
import { MoldCard } from '../components/MoldCard';
import { ArrangementCard } from './Arrangements';
import { whatsappHello } from '../lib/cart';
import { displayColorId } from '../lib/rules';

export default function Home() {
  const { catalog } = useCatalog();
  const look = useLookup();
  const molds = catalog.molds.filter((m) => m.active);
  const activeArr = catalog.arrangements.filter((a) => a.active);
  const arrangements = (activeArr.some((a) => a.featured) ? activeArr.filter((a) => a.featured) : activeArr).slice(0, 3);
  const featured = molds.filter((m) => m.featured).length ? molds.filter((m) => m.featured) : molds.slice(0, 3);
  const hero = molds[0];
  const heroPlate = catalog.plates.find((p) => p.active && p.kind === 'plana') ?? null;

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Hecho a mano · Diseños únicos</span>
            <h1>
              <span className="title-script">Velas y jabones</span>
              <br />
              que iluminan tu día
            </h1>
            <p className="lead">{catalog.settings.tagline}. Elige el molde, el color, la esencia y la placa de yeso, y mira cómo queda antes de pedirlo.</p>
            <div className="hero-cta">
              <Link to="/personaliza" className="btn primary">
                ✨ Personaliza el tuyo
              </Link>
              <Link to="/catalogo" className="btn ghost">
                Ver catálogo
              </Link>
            </div>
            <ul className="perks">
              <li>🌿 Ingredientes de calidad</li>
              <li>💜 Hecho a mano</li>
              <li>🎁 Ideal para regalo</li>
            </ul>
          </div>
          {hero && (
            <Link to="/personaliza" className="hero-art" aria-label="Ir al personalizador">
              <Stage
                mold={hero}
                type="vela"
                color={look.color.get(displayColorId(hero))?.hex ?? '#f5a3c0'}
                colorId={displayColorId(hero)}
                plate={heroPlate}
                veinColor={heroPlate?.veinColors[0] ?? null}
                theme={look.collection.get(hero.collectionId)?.theme}
                lit
              />
            </Link>
          )}
        </div>
      </section>

      <section className="section container">
        <h2 className="section-title">¿Cómo funciona?</h2>
        <ol className="steps">
          <li>
            <b>1</b>
            <h3>Elige tu molde</h3>
            <p>Margarita, rosa, cempasúchil… en jabón o en vela.</p>
          </li>
          <li>
            <b>2</b>
            <h3>Combínalo</h3>
            <p>Color, esencia y placa de yeso marmoleada. Desliza para probar.</p>
          </li>
          <li>
            <b>3</b>
            <h3>Pídelo por WhatsApp</h3>
            <p>Tu pedido llega armado con todos los detalles. ¡Así de fácil!</p>
          </li>
        </ol>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2 className="section-title">Favoritos</h2>
          <Link to="/catalogo">Ver todo →</Link>
        </div>
        <div className="grid-cards">
          {featured.map((m) => (
            <MoldCard key={m.id} mold={m} />
          ))}
        </div>
      </section>

      {arrangements.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <h2 className="section-title">Arreglos para regalar</h2>
            <Link to="/arreglos">Ver todos →</Link>
          </div>
          <div className="grid-cards">
            {arrangements.map((a) => (
              <ArrangementCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}

      <section className="section essences-band">
        <div className="container">
          <h2 className="section-title">Elige tu esencia</h2>
          <p className="muted center">Cualquier modelo de vela o jabón con el aroma que más te guste.</p>
          <ul className="essence-list">
            {catalog.essences
              .filter((e) => e.active)
              .map((e) => (
                <li key={e.id} style={{ ['--ess' as string]: e.color }}>
                  <i aria-hidden />
                  <b>{e.name}</b>
                  <span>{e.description}</span>
                </li>
              ))}
          </ul>
        </div>
      </section>

      <section className="section container">
        <div className="events card">
          <div>
            <span className="eyebrow">Bodas · XV años · Bautizos · Cumpleaños</span>
            <h2>¿Recuerdos para tu evento?</h2>
            <p>Hacemos pedidos por mayoreo con los colores y la temática de tu celebración.</p>
          </div>
          <a
            className="btn primary"
            href={whatsappHello(catalog, '¡Hola! Quiero cotizar recuerdos para un evento 🎉')}
            target="_blank"
            rel="noreferrer"
          >
            Cotizar por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
