import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalog, useLookup } from '../data/CatalogContext';
import { arrangementUnitPrice, useCart, whatsappHello } from '../lib/cart';
import { availableTypes, displayColorId, money, typeLabel } from '../lib/rules';
import { coverPhoto } from '../lib/gallery';
import { Stage } from '../components/Stage';
import type { Arrangement, ArrangementPiece, Catalog } from '../types';
import { Chips } from '../components/Picker';
import { FitPhoto } from '../components/FitPhoto';

/** Tarjeta de arreglo para la lista y la portada. */
export function ArrangementCard({ a }: { a: Arrangement }) {
  return (
    <Link to={`/arreglos/${a.slug}`} className="mold-card arr-card">
      <div className="arr-card-photo">{a.photos[0] ? <FitPhoto src={a.photos[0]} alt={a.name} /> : <span>💐</span>}</div>
      <div className="mold-card-body">
        <span className="eyebrow">Arreglo</span>
        <h3>{a.name}</h3>
        <div className="prices">
          <span className="price-tag">
            <b>{money(a.price)}</b>
          </span>
          {(a.pieces ?? 0) > 0 && <span className="price-tag">Elige {a.pieces} piezas</span>}
          {a.customColors && <span className="price-tag">Colores a tu gusto</span>}
        </div>
        <span className="card-cta">Ver arreglo →</span>
      </div>
    </Link>
  );
}

function CustomCta() {
  const { catalog } = useCatalog();
  return (
    <div className="events card">
      <div>
        <span className="eyebrow">Hecho a tu medida</span>
        <h2>¿Quieres uno a tu gusto?</h2>
        <p>Dinos la ocasión, los colores y tu presupuesto, y te armamos un arreglo especial.</p>
      </div>
      <a className="btn primary" href={whatsappHello(catalog, '¡Hola! Quiero un arreglo a mi gusto 💐')} target="_blank" rel="noreferrer">
        Pedir por WhatsApp
      </a>
    </div>
  );
}

export default function Arrangements() {
  const { catalog } = useCatalog();
  const list = catalog.arrangements.filter((a) => a.active);
  return (
    <main className="section container">
      <h1 className="page-title">
        <span className="title-script">Arreglos</span>
      </h1>
      <p className="muted center">Velas y jabones artesanales acomodados en cestas con flores secas y musgo. Listos para regalar.</p>
      {list.length ? (
        <div className="grid-cards">
          {list.map((a) => (
            <ArrangementCard key={a.id} a={a} />
          ))}
        </div>
      ) : (
        <p className="muted center">Muy pronto tendremos arreglos aquí. Mientras, pídenos uno a tu gusto 👇</p>
      )}
      <section className="section">
        <CustomCta />
      </section>
    </main>
  );
}

/** Lugares del arreglo, rellenados con las piezas sugeridas o "a elección". */
function initialPieces(a: Arrangement | undefined): ArrangementPiece[] {
  const n = a?.pieces ?? 0;
  return Array.from({ length: n }, (_, i) => a?.defaultPieces?.[i] ?? { moldId: null, type: null });
}

/** Miniatura de un molde: su foto real o la ilustración. */
function MoldThumb({ moldId }: { moldId: string | null }) {
  const look = useLookup();
  const mold = moldId ? look.mold.get(moldId) : undefined;
  if (!mold) return <span className="piece-thumb piece-any">🎁</span>;
  const photo = coverPhoto(mold);
  if (photo) return <img className="piece-thumb" src={photo.url} alt="" />;
  const colorId = displayColorId(mold);
  return (
    <span className="piece-thumb">
      <Stage bare mold={mold} type="jabon" color={look.color.get(colorId)?.hex ?? '#f5a3c0'} colorId={colorId} plate={null} veinColor={null} />
    </span>
  );
}

function PieceSlots({ catalog, pieces, onChange }: { catalog: Catalog; pieces: ArrangementPiece[]; onChange: (p: ArrangementPiece[]) => void }) {
  const molds = catalog.molds.filter((m) => m.active);
  const set = (i: number, patch: Partial<ArrangementPiece>) => onChange(pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <section className="field">
      <span className="eyebrow">Elige tus {pieces.length} piezas · puedes mezclar jabones y velas</span>
      <ol className="piece-list">
        {pieces.map((p, i) => {
          const mold = p.moldId ? molds.find((m) => m.id === p.moldId) : undefined;
          const types = mold ? availableTypes(mold) : [];
          return (
            <li key={i} className="piece-row">
              <MoldThumb moldId={p.moldId} />
              <div className="piece-fields">
                <select
                  aria-label={`Pieza ${i + 1}`}
                  value={p.moldId ?? ''}
                  onChange={(e) => {
                    const m = molds.find((x) => x.id === e.target.value);
                    const t = m ? availableTypes(m) : [];
                    set(i, { moldId: m?.id ?? null, type: m ? (p.type && t.includes(p.type) ? p.type : (t[0] ?? null)) : null });
                  }}
                >
                  <option value="">🎁 A elección de Lulú</option>
                  {molds.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {types.length > 1 && (
                  <div className="chips piece-types" role="radiogroup" aria-label={`Tipo de la pieza ${i + 1}`}>
                    {types.map((t) => (
                      <button key={t} type="button" className="chip" role="radio" aria-checked={p.type === t} onClick={() => set(i, { type: t })}>
                        {typeLabel[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function ArrangementPage() {
  const { slug } = useParams();
  const { catalog } = useCatalog();
  const cart = useCart();
  const a = catalog.arrangements.find((x) => x.slug === slug && x.active);
  const [photo, setPhoto] = useState(0);
  const [colors, setColors] = useState('');
  const [essenceId, setEssenceId] = useState<string>('ninguna');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [pieces, setPieces] = useState<ArrangementPiece[]>(() => initialPieces(a));
  // El catálogo puede llegar después (Supabase): rellenar las piezas al tenerlo.
  useEffect(() => {
    setPieces(initialPieces(a));
  }, [a?.id, a?.pieces]);

  if (!a) {
    return (
      <main className="section container center">
        <p className="muted">Este arreglo ya no está disponible.</p>
        <Link to="/arreglos" className="btn primary">
          Ver arreglos
        </Link>
      </main>
    );
  }

  const essences = catalog.essences.filter((e) => e.active);
  const current = a.photos[Math.min(photo, a.photos.length - 1)];

  return (
    <main className="section container arr-page">
      <div className="arr-gallery">
        <div className="arr-main">{current ? <FitPhoto key={current} className="anim-fade" src={current} alt={a.name} /> : <span>💐</span>}</div>
        {a.photos.length > 1 && (
          <div className="arr-thumbs">
            {a.photos.map((src, i) => (
              <button key={src + i} type="button" className="thumb" aria-pressed={i === photo} aria-label={`Foto ${i + 1}`} onClick={() => setPhoto(i)}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="controls">
        <Link to="/arreglos" className="link-btn">
          ← Arreglos
        </Link>
        <h1 className="arr-title">{a.name}</h1>
        <p className="price">{money(a.price)}</p>
        {(catalog.settings.wholesaleMinQty ?? 0) > 0 && (catalog.settings.wholesaleDiscount ?? 0) > 0 && (
          <p className="wholesale">
            🎉 Mayoreo: desde {catalog.settings.wholesaleMinQty} arreglos, {money(arrangementUnitPrice(catalog, a, catalog.settings.wholesaleMinQty!))} c/u
          </p>
        )}
        {a.description && <p>{a.description}</p>}
        {a.includes.length > 0 && (
          <section className="field">
            <span className="eyebrow">Incluye</span>
            <ul className="arr-includes">
              {a.includes.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}

        {pieces.length > 0 && <PieceSlots catalog={catalog} pieces={pieces} onChange={setPieces} />}

        {a.customColors && (
          <label className="field">
            <span className="eyebrow">{pieces.length > 0 ? 'Colores que quieres' : '¿Lo quieres en otros colores?'}</span>
            <input className="arr-input" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Ej. tonos rosa y lila (vacío = como en la foto)" />
          </label>
        )}

        <Chips
          label="Esencia"
          value={essenceId}
          onChange={setEssenceId}
          options={[{ id: 'ninguna', name: 'Sin aroma' }, ...essences.map((e) => ({ id: e.id, name: e.name, dot: e.color }))]}
        />

        <div className="summary card">
          <div className="qty">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Menos">
              −
            </button>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Cantidad" />
            <button type="button" onClick={() => setQty(qty + 1)} aria-label="Más">
              +
            </button>
          </div>
          <button
            type="button"
            className="btn primary wide"
            onClick={() => {
              cart.addArrangement(
                {
                  arrangementId: a.id,
                  colors: colors.trim(),
                  essenceId: essenceId === 'ninguna' ? null : essenceId,
                  ...(pieces.length ? { pieces } : {}),
                },
                qty,
              );
              setAdded(true);
            }}
          >
            Agregar al pedido · {money(arrangementUnitPrice(catalog, a, qty) * qty)}
          </button>
          {added && (
            <p className="added">
              ✓ Agregado. <Link to="/pedido">Ver mi pedido ({cart.count})</Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
