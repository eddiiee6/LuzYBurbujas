import { useState } from 'react';
import { useCatalog } from '../data/CatalogContext';
import { MoldCard } from '../components/MoldCard';
import { availableTypes, plateKindLabel, plateTypes, typeLabel } from '../lib/rules';
import type { ProductType } from '../types';

export default function CatalogPage() {
  const { catalog } = useCatalog();
  const [col, setCol] = useState<string>('todas');
  const [type, setType] = useState<ProductType | 'todos'>('todos');

  const molds = catalog.molds.filter(
    (m) =>
      m.active &&
      (col === 'todas' || m.collectionId === col) &&
      (type === 'todos' || availableTypes(m).includes(type)),
  );

  return (
    <main className="section container">
      <h1 className="page-title">
        <span className="title-script">Catálogo</span>
      </h1>
      <div className="filters">
        <div className="chips" role="group" aria-label="Colección">
          <button type="button" className="chip" aria-pressed={col === 'todas'} onClick={() => setCol('todas')}>
            Todas
          </button>
          {catalog.collections.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={col === c.id} onClick={() => setCol(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Tipo">
          {(['todos', 'jabon', 'vela'] as const).map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={type === t} onClick={() => setType(t)}>
              {t === 'todos' ? 'Jabón y vela' : t === 'jabon' ? 'Jabones' : 'Velas'}
            </button>
          ))}
        </div>
      </div>
      {molds.length ? (
        <div className="grid-cards">
          {molds.map((m) => (
            <MoldCard key={m.id} mold={m} />
          ))}
        </div>
      ) : (
        <p className="muted center">No hay productos con esos filtros.</p>
      )}

      <section className="section">
        <h2 className="section-title">Presentaciones</h2>
        <p className="muted center">Placas de yeso marmoleadas, contenedores y cajitas de regalo para tus velas y jabones.</p>
        <ul className="plate-list">
          {catalog.plates
            .filter((p) => p.active)
            .map((p) => (
              <li key={p.id} className="card">
                <b>{p.name}</b>
                <span>
                  {p.lengthCm} × {p.widthCm} cm · {plateKindLabel[p.kind]} · {plateTypes(p).map((t) => typeLabel[t].toLowerCase()).join(' y ')}
                </span>
                <span className="price-tag">+ ${p.price}</span>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
