import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCatalog, useLookup } from '../data/CatalogContext';
import { Stage, stageToPng } from '../components/Stage';
import { Chips, Picker, Swatches } from '../components/Picker';
import { useCart } from '../lib/cart';
import { availableTypes, designPrice, money, plateFits, typeLabel, veinName } from '../lib/rules';
import type { Design, Plate, ProductType } from '../types';

const SWIPE = 55; // unidades del escenario para cambiar de opción

export default function Customizer() {
  const { catalog } = useCatalog();
  const look = useLookup();
  const cart = useCart();
  const [params, setParams] = useSearchParams();
  const svgRef = useRef<SVGSVGElement>(null);

  const molds = catalog.molds.filter((m) => m.active);
  const plates = catalog.plates.filter((p) => p.active);
  const colors = catalog.colors.filter((c) => c.active);
  const essences = catalog.essences.filter((e) => e.active);

  /* ---------- estado leído de la URL (así se puede compartir) ---------- */
  const mold = molds.find((m) => m.slug === params.get('molde')) ?? molds[0];
  const types = mold ? availableTypes(mold) : [];
  const type = (types.find((t) => t === params.get('tipo')) ?? types[0] ?? 'jabon') as ProductType;
  const color = look.color.get(params.get('color') ?? '') ?? look.color.get(mold?.defaultColorId ?? '') ?? colors[0];
  const plateParam = params.get('placa');
  const plate: Plate | null =
    plateParam === 'ninguna' ? null : (plates.find((p) => p.id === plateParam) ?? plates[0] ?? null);
  const vein = plate
    ? (plate.veinColors.find((v) => v.replace('#', '') === params.get('veta')) ?? plate.veinColors[0] ?? null)
    : null;
  const essence = look.essence.get(params.get('esencia') ?? '') ?? null;

  const [lit, setLit] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [drag, setDrag] = useState<{ zone: 'mold' | 'plate'; startX: number; dx: number } | null>(null);
  const [anim, setAnim] = useState({ mold: 0, plate: 0 });

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
    setAdded(false);
  };

  const plateOptions = useMemo(() => [null, ...plates], [plates]);
  const fit = mold && plate ? plateFits(mold, plate, type) : ({ ok: true } as const);

  if (!mold || !color) {
    return (
      <main className="container section">
        <p>Aún no hay moldes en el catálogo.</p>
      </main>
    );
  }

  const design: Design = {
    moldId: mold.id,
    type,
    colorId: color.id,
    plateId: plate?.id ?? null,
    veinColor: vein,
    essenceId: essence?.id ?? null,
  };
  const price = designPrice(catalog, design);
  const theme = look.collection.get(mold.collectionId)?.theme;

  const stepMold = (dir: 1 | -1) => {
    const i = molds.indexOf(mold);
    const m = molds[(i + dir + molds.length) % molds.length];
    const t = availableTypes(m).includes(type) ? type : availableTypes(m)[0];
    update({ molde: m.slug, tipo: t ?? null, color: m.defaultColorId });
    setAnim((a) => ({ ...a, mold: a.mold + 1 }));
  };
  const stepPlate = (dir: 1 | -1) => {
    const i = plateOptions.indexOf(plate);
    const p = plateOptions[(i + dir + plateOptions.length) % plateOptions.length];
    update({ placa: p ? p.id : 'ninguna', veta: null });
    setAnim((a) => ({ ...a, plate: a.plate + 1 }));
  };

  /* ---------- deslizar con el dedo sobre el escenario ---------- */
  const toStage = (px: number) => (px * 400) / (svgRef.current?.getBoundingClientRect().width || 400);
  const onDown = (e: PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const zone = (e.clientY - r.top) / r.height < 0.6 ? 'mold' : 'plate';
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ zone, startX: e.clientX, dx: 0 });
  };
  const onMove = (e: PointerEvent) => {
    if (drag) setDrag({ ...drag, dx: toStage(e.clientX - drag.startX) });
  };
  const onUp = () => {
    if (!drag) return;
    if (Math.abs(drag.dx) > SWIPE) {
      const dir = drag.dx < 0 ? 1 : -1;
      if (drag.zone === 'mold') stepMold(dir);
      else stepPlate(dir);
    }
    setDrag(null);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${mold.name} · ${catalog.settings.businessName}`, url });
      else {
        await navigator.clipboard.writeText(url);
        alert('¡Enlace copiado! Pégalo donde quieras compartir tu diseño.');
      }
    } catch {
      /* el usuario canceló */
    }
  };

  const download = async () => {
    if (!svgRef.current) return;
    try {
      const blob = await stageToPng(svgRef.current);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${mold.slug}-${color.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      alert('No se pudo generar la imagen en este navegador.');
    }
  };

  const addToCart = () => {
    cart.add(design, qty);
    setAdded(true);
  };

  const plateSubtitle = plate
    ? fit.ok
      ? `${plate.lengthCm} × ${plate.widthCm} cm · ${plate.kind === 'contenedor' ? 'contenedor' : 'plana'} · +${money(plate.price)}`
      : fit.reason
    : 'Solo el producto';

  return (
    <main className="customizer container">
      <div className="stage-col">
        <div
          className={`stage-wrap ${drag ? 'dragging' : ''}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setDrag(null)}
        >
          <Stage
            ref={svgRef}
            className="stage"
            mold={mold}
            type={type}
            color={color.hex}
            plate={plate}
            veinColor={vein}
            theme={theme}
            lit={lit}
            moldAnim={`m${anim.mold}`}
            plateAnim={`p${anim.plate}`}
            dragMold={drag?.zone === 'mold' ? drag.dx : 0}
            dragPlate={drag?.zone === 'plate' ? drag.dx : 0}
          />
          {!fit.ok && <div className="stage-badge">🚫 {fit.reason}</div>}
          <div className="stage-hint" aria-hidden>
            <span>⇆ desliza arriba para cambiar el molde</span>
            <span>⇆ desliza abajo para cambiar la placa</span>
          </div>
          {type === 'vela' && (
            <button type="button" className="lit-toggle" onClick={() => setLit(!lit)} onPointerDown={(e) => e.stopPropagation()}>
              {lit ? '🕯️ Apagar' : '🔥 Encender'}
            </button>
          )}
        </div>
        <div className="stage-actions">
          <button type="button" className="btn ghost small" onClick={share}>
            🔗 Compartir diseño
          </button>
          <button type="button" className="btn ghost small" onClick={download}>
            ⬇︎ Descargar imagen
          </button>
        </div>
      </div>

      <div className="controls">
        <h1 className="title-script">Personaliza</h1>

        <Picker
          label="Molde"
          title={mold.name}
          subtitle={mold.description}
          onPrev={() => stepMold(-1)}
          onNext={() => stepMold(1)}
        >
          <div className="thumbs">
            {molds.map((m) => (
              <button
                key={m.id}
                type="button"
                className="thumb"
                aria-pressed={m.id === mold.id}
                aria-label={m.name}
                onClick={() => {
                  const t = availableTypes(m).includes(type) ? type : availableTypes(m)[0];
                  update({ molde: m.slug, tipo: t ?? null, color: m.defaultColorId });
                  setAnim((a) => ({ ...a, mold: a.mold + 1 }));
                }}
              >
                <Stage bare mold={m} type="jabon" color={look.color.get(m.defaultColorId)?.hex ?? '#f5a3c0'} plate={null} veinColor={null} />
              </button>
            ))}
          </div>
        </Picker>

        <Chips
          label="¿Jabón o vela?"
          value={type}
          onChange={(t) => update({ tipo: t })}
          options={types.map((t) => ({ id: t, name: `${typeLabel[t]} ${money(mold.prices[t] ?? 0)}` }))}
        />

        <Swatches
          label="Color"
          options={colors}
          value={color.id}
          onChange={(id) => update({ color: id })}
        />

        <Picker
          label="Placa de yeso"
          title={plate ? plate.name : 'Sin placa'}
          subtitle={plateSubtitle}
          warn={!fit.ok}
          onPrev={() => stepPlate(-1)}
          onNext={() => stepPlate(1)}
        >
          <div className="plate-dots">
            {plateOptions.map((p) => {
              const ok = !p || plateFits(mold, p, type).ok;
              return (
                <button
                  key={p?.id ?? 'ninguna'}
                  type="button"
                  className={`plate-dot ${ok ? '' : 'no-fit'}`}
                  aria-pressed={p === plate}
                  onClick={() => {
                    update({ placa: p ? p.id : 'ninguna', veta: null });
                    setAnim((a) => ({ ...a, plate: a.plate + 1 }));
                  }}
                >
                  {p ? p.name.replace(/^Placa /, '') : 'Sin placa'}
                </button>
              );
            })}
          </div>
        </Picker>

        {plate && plate.veinColors.length > 0 && (
          <Swatches
            label="Color de las vetas"
            options={plate.veinColors.map((v) => ({ id: v, hex: v, name: veinName(v) }))}
            value={vein}
            onChange={(v) => update({ veta: v.replace('#', '') })}
          />
        )}

        <Chips
          label="Esencia"
          value={essence?.id ?? 'ninguna'}
          onChange={(id) => update({ esencia: id === 'ninguna' ? null : id })}
          options={[
            { id: 'ninguna', name: 'Sin aroma' },
            ...essences.map((e) => ({ id: e.id, name: e.name, dot: e.color })),
          ]}
        />

        <div className="summary card">
          <div>
            <span className="eyebrow">Tu diseño</span>
            <p className="summary-line">
              {typeLabel[type]} {mold.name} {color.name.toLowerCase()}
              {plate ? ` + ${plate.name.toLowerCase()}` : ''}
            </p>
            <p className="price">
              {money(price)} <small>c/u</small>
            </p>
          </div>
          <div className="qty">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Menos">
              −
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              aria-label="Cantidad"
            />
            <button type="button" onClick={() => setQty(qty + 1)} aria-label="Más">
              +
            </button>
          </div>
          <button type="button" className="btn primary wide" disabled={!fit.ok} onClick={addToCart}>
            {fit.ok ? `Agregar al pedido · ${money(price * qty)}` : 'Elige otra placa'}
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
