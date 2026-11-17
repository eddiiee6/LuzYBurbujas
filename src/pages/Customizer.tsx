import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCatalog, useLookup } from '../data/CatalogContext';
import { comboOffered, hasPhotos, photosFor } from '../lib/gallery';
import { FitPhoto } from '../components/FitPhoto';
import { PhotoPending } from '../components/PhotoPending';
import { Chips, Picker, Swatches } from '../components/Picker';
import { useCart } from '../lib/cart';
import { availableTypes, designPrice, moldColors, money, plateAllowsType, plateKindLabel, plateFits, typeLabel } from '../lib/rules';
import type { Design, Plate, ProductType } from '../types';

const SWIPE = 0.14; // fracción del ancho de la foto para cambiar de opción

export default function Customizer() {
  const { catalog } = useCatalog();
  const look = useLookup();
  const cart = useCart();
  const [params, setParams] = useSearchParams();
  const stageRef = useRef<HTMLDivElement>(null);

  const molds = catalog.molds.filter((m) => m.active);
  const plates = catalog.plates.filter((p) => p.active);
  const colors = catalog.colors.filter((c) => c.active);
  const essences = catalog.essences.filter((e) => e.active);

  /* ---------- estado leído de la URL (así se puede compartir) ---------- */
  const mold = molds.find((m) => m.slug === params.get('molde')) ?? molds[0];
  // Con fotos: solo jabón/vela si hay al menos una foto de ese tipo.
  const types = mold ? availableTypes(mold).filter((t) => !hasPhotos(mold) || mold.gallery!.some((g) => !g.type || g.type === t)) : [];
  const type = (types.find((t) => t === params.get('tipo')) ?? types[0] ?? 'jabon') as ProductType;
  const moldColorList = mold ? moldColors(catalog.colors, mold) : colors;
  const startColorId = mold?.defaultColorId ?? '';
  const color =
    moldColorList.find((c) => c.id === params.get('color')) ??
    moldColorList.find((c) => c.id === startColorId) ??
    moldColorList[0];
  const plateParam = params.get('placa');
  // Solo las presentaciones que se ofrecen para este tipo (jabón o vela).
  // …y solo las que tienen foto real de esta combinación (si el molde ya tiene fotos).
  const typePlates = mold ? plates.filter((p) => plateAllowsType(p, type) && comboOffered(mold, p.id, type)) : [];
  const soloOffered = !mold || comboOffered(mold, null, type);
  // Por defecto "Sin placa": la presentación solo cambia si el cliente la elige.
  // Si "Sin placa" no tiene foto, se empieza por la primera presentación que sí tenga.
  const plate: Plate | null = typePlates.find((p) => p.id === plateParam) ?? (soloOffered ? null : (typePlates[0] ?? null));
  const essence = look.essence.get(params.get('esencia') ?? '') ?? null;

  const [photoIdx, setPhotoIdx] = useState(0);
  // El texto de "desliza…" se oculta después de la primera vez que se usa.
  const [hintSeen, setHintSeen] = useState(() => {
    try {
      return localStorage.getItem('lyb.hint') === '1';
    } catch {
      return false;
    }
  });
  const markHint = () => {
    if (hintSeen) return;
    setHintSeen(true);
    try {
      localStorage.setItem('lyb.hint', '1');
    } catch {
      /* sin almacenamiento */
    }
  };
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [drag, setDrag] = useState<{ zone: 'mold' | 'plate'; startX: number; dx: number } | null>(null);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
    setAdded(false);
  };

  const plateOptions = useMemo(() => [...(soloOffered ? [null] : []), ...typePlates], [soloOffered, typePlates]);
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
    essenceId: essence?.id ?? null,
  };
  const price = designPrice(catalog, design);

  const stepMold = (dir: 1 | -1) => {
    markHint();
    const i = molds.indexOf(mold);
    const m = molds[(i + dir + molds.length) % molds.length];
    const t = availableTypes(m).includes(type) ? type : availableTypes(m)[0];
    update({ molde: m.slug, tipo: t ?? null, color: m.defaultColorId });
    setPhotoIdx(0);
  };
  const stepPlate = (dir: 1 | -1) => {
    markHint();
    const i = plateOptions.indexOf(plate);
    const p = plateOptions[(i + dir + plateOptions.length) % plateOptions.length];
    update({ placa: p ? p.id : 'ninguna' });
    setPhotoIdx(0);
  };

  /* ---------- deslizar con el dedo sobre el escenario ---------- */
  const toStage = (px: number) => px / (stageRef.current?.getBoundingClientRect().width || 400);
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

  // Foto real de esta combinación (molde + presentación + tipo), si existe.
  const realPhotos = photosFor(mold, plate?.id ?? null, type, color.id);
  const realPhoto = realPhotos.length ? realPhotos[photoIdx % realPhotos.length] : null;
  const photoColor = realPhoto?.colorId ? look.color.get(realPhoto.colorId) : undefined;

  const download = async () => {
    if (!realPhoto) return;
    try {
      const blob = await (await fetch(realPhoto.url)).blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${mold.slug}${plate ? `-${plate.id}` : ''}.${blob.type.split('/')[1] ?? 'jpg'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      alert('No se pudo descargar la foto en este navegador.');
    }
  };

  const addToCart = () => {
    cart.add(design, qty);
    setAdded(true);
  };

  const plateSubtitle = plate
    ? fit.ok
      ? `${plate.lengthCm} × ${plate.widthCm} cm · ${plateKindLabel[plate.kind]} · +${money(plate.price)}`
      : fit.reason
    : 'Solo el producto';

  return (
    <main className="customizer container">
      <div className="stage-col">
        <div
          ref={stageRef}
          className={`stage-wrap ${drag ? 'dragging' : ''}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setDrag(null)}
        >
          {realPhoto ? (
            <div className="real-photo">
              <FitPhoto
                key={realPhoto.url}
                className="anim-fade"
                src={realPhoto.url}
                alt={`${mold.name}${plate ? ` en ${plate.name.toLowerCase()}` : ''}`}
                style={drag ? { transform: `translateX(${drag.dx * 100}%)` } : undefined}
              />
              <span className="real-badge">📷 Foto real</span>
              {photoColor && photoColor.id !== color.id && (
                <span className="real-note">
                  Foto de referencia en {photoColor.name.toLowerCase()} · la tuya será {color.name.toLowerCase()}
                </span>
              )}
              {realPhotos.length > 1 && (
                <div className="real-dots" onPointerDown={(e) => e.stopPropagation()}>
                  {realPhotos.map((g, i) => (
                    <button
                      key={g.id}
                      type="button"
                      aria-label={`Foto ${i + 1}`}
                      aria-pressed={g === realPhoto}
                      onClick={() => setPhotoIdx(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <PhotoPending />
          )}
          {!fit.ok && <div className="stage-badge">🚫 {fit.reason}</div>}
          <div className="stage-hint" aria-hidden style={hintSeen ? { opacity: 0 } : undefined}>
            <span>⇆ desliza arriba para cambiar el molde</span>
            <span>⇆ desliza abajo para cambiar la presentación</span>
          </div>
        </div>
        <div className="stage-actions">
          <button type="button" className="btn ghost small" onClick={share}>
            🔗 Compartir diseño
          </button>
          {realPhoto && (
            <button type="button" className="btn ghost small" onClick={download}>
              ⬇︎ Descargar foto
            </button>
          )}
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
                  setPhotoIdx(0);
                }}
              >
                {m.gallery?.length ? <img className="thumb-photo" src={m.gallery[0].url} alt="" /> : <PhotoPending small />}
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
          options={moldColorList}
          value={color.id}
          onChange={(id) => update({ color: id })}
        />

        <Picker
          label="Presentación"
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
                    update({ placa: p ? p.id : 'ninguna' });
                    setPhotoIdx(0);
                  }}
                >
                  {photosFor(mold, p?.id ?? null, type).length > 0 && <span aria-label="con foto real">📷 </span>}
                  {p ? p.name.replace(/^Placa /, '') : 'Sin placa'}
                </button>
              );
            })}
          </div>
        </Picker>

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
            {fit.ok ? `Agregar al pedido · ${money(price * qty)}` : 'Elige otra presentación'}
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
