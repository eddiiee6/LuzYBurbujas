import { DEFAULT_MOLD_FIT, DEFAULT_PLATE_FIT, DEFAULT_WAX, type Arrangement, type Catalog, type Collection, type ColorOption, type Essence, type Mold, type MoldArt, type Plate } from '../types';
import { Stage } from '../components/Stage';
import { useState } from 'react';
import { moldColors, plateColors, plateFits, plateTypes } from '../lib/rules';
import { Check, ColorInput, Field, Num, PhotoInput, PhotoList, Select, Slider, Text, slugify } from './fields';
import { WaxPainter } from './WaxPainter';
import { photoPlateBox } from '../art/plates';
import { friendlyError, repo } from '../data/repo';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Botones para marcar qué colores se ofrecen. */
function ColorToggles({ colors, value, onChange }: { colors: ColorOption[]; value?: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="color-toggles">
      {colors
        .filter((c) => c.active)
        .map((c) => {
          const on = !!value?.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={on}
              onClick={() => onChange(on ? (value ?? []).filter((x) => x !== c.id) : [...(value ?? []), c.id])}
            >
              <i className="dot" style={{ background: c.hex }} />
              {c.name}
            </button>
          );
        })}
    </div>
  );
}

/** Muestras para probar colores bajo la vista previa. */
function PreviewSwatches({ colors, value, onChange, original }: { colors: ColorOption[]; value: string | null; onChange: (id: string | null) => void; original?: boolean }) {
  return (
    <div className="swatches preview-swatches" role="radiogroup" aria-label="Probar color">
      {original && (
        <button type="button" role="radio" aria-checked={value === null} aria-label="Original" title="Original" className="swatch swatch-original" onClick={() => onChange(null)} />
      )}
      {colors.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={c.id === value}
          aria-label={c.name}
          title={`Probar ${c.name}`}
          className="swatch"
          style={{ background: c.hex }}
          onClick={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}

type Ed<T> = { item: T; set: (patch: Partial<T>) => void; catalog: Catalog };

const ARTS: { value: MoldArt; label: string }[] = [
  { value: 'margarita', label: 'Margarita' },
  { value: 'rosa', label: 'Rosa' },
  { value: 'cempasuchil', label: 'Cempasúchil' },
  { value: 'copo', label: 'Copo de nieve' },
  { value: 'pino', label: 'Pino' },
];

export function MoldEditor({ item, set, catalog }: Ed<Mold>) {
  // Muestras para probar en la vista previa cómo se ve cada color.
  const previewColors = moldColors(catalog.colors, item);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = previewColors.find((c) => c.id === previewId) ?? previewColors.find((c) => c.id === (item.photoColorId ?? item.defaultColorId)) ?? previewColors[0];
  const color = catalog.colors.find((c) => c.id === item.defaultColorId)?.hex ?? '#f5a3c0';
  // Vista previa en una placa que se ofrezca para ese tipo (vela → contenedor, jabón → plana).
  const previewType = item.prices.vela != null ? 'vela' : 'jabon';
  const plate = catalog.plates.find((p) => p.active && plateFits(item, p, previewType).ok) ?? null;
  const theme = catalog.collections.find((c) => c.id === item.collectionId)?.theme;
  return (
    <div className="editor-grid">
      <div className="editor-fields">
        <Field label="Nombre">
          <Text value={item.name} onChange={(name) => set({ name, slug: item.slug || slugify(name) })} />
        </Field>
        <Field label="Dirección web" hint={`/personaliza?molde=${item.slug}`}>
          <Text value={item.slug} onChange={(v) => set({ slug: slugify(v) })} />
        </Field>
        <Field label="Descripción">
          <Text value={item.description} onChange={(description) => set({ description })} />
        </Field>
        <div className="row2">
          <Field label="Colección">
            <Select
              value={item.collectionId}
              onChange={(collectionId) => set({ collectionId })}
              options={catalog.collections.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
          <Field label="Ilustración" hint="Se usa si no hay foto">
            <Select value={item.art} onChange={(art) => set({ art })} options={ARTS} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Ancho de la base (cm)" hint="Decide en qué placas cabe">
            <Num value={item.baseWidthCm} onChange={(v) => set({ baseWidthCm: v ?? 5 })} />
          </Field>
          <Field label="Alto (cm)">
            <Num value={item.heightCm} onChange={(v) => set({ heightCm: v ?? 2 })} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Precio jabón" hint="Vacío = no se ofrece">
            <Num step={1} value={item.prices.jabon} onChange={(v) => set({ prices: { ...item.prices, jabon: v } })} />
          </Field>
          <Field label="Precio vela" hint="Vacío = no se ofrece">
            <Num step={1} value={item.prices.vela} onChange={(v) => set({ prices: { ...item.prices, vela: v } })} />
          </Field>
        </div>
        <Field label="Foto sin fondo" hint="PNG o WebP transparente, tomada de frente y un poco desde arriba.">
          <PhotoInput value={item.photo} name={item.slug} onChange={(photo, photoAspect, photoLuma) => set({ photo, photoAspect, photoLuma })} />
        </Field>
        {item.photo && (
          <fieldset className="afit">
            <legend>Ajuste de la foto</legend>
            <small>Mueve hasta que se vea bien apoyado en la placa de la vista previa.</small>
            <Slider
              label="Tamaño"
              value={(item.photoFit ?? DEFAULT_MOLD_FIT).scale}
              min={0.5}
              max={1.8}
              step={0.01}
              def={1}
              format={pct}
              onChange={(scale) => set({ photoFit: { ...DEFAULT_MOLD_FIT, ...item.photoFit, scale } })}
            />
            <Slider
              label="Subir / bajar"
              value={(item.photoFit ?? DEFAULT_MOLD_FIT).offsetY}
              min={-40}
              max={40}
              step={1}
              def={0}
              onChange={(offsetY) => set({ photoFit: { ...DEFAULT_MOLD_FIT, ...item.photoFit, offsetY } })}
            />
          </fieldset>
        )}
        <fieldset className="afit">
          <legend>Colores</legend>
          {item.photo && (
            <>
              <Field label="¿De qué color es la foto?" hint="Con ese color se muestra la foto tal cual.">
                <Select
                  value={item.photoColorId ?? ''}
                  onChange={(photoColorId) => set({ photoColorId: photoColorId || undefined })}
                  options={[{ value: '', label: 'Elige el color…' }, ...catalog.colors.map((c) => ({ value: c.id, label: c.name }))]}
                />
              </Field>
              <Check
                label="Recolorear la foto a los demás colores (conserva luces y sombras)"
                value={!!item.photoTintable}
                onChange={(photoTintable) => set({ photoTintable })}
              />
            </>
          )}
          {(!item.photo || item.photoTintable) && (
            <Field label="Colores que se ofrecen" hint="Si no marcas ninguno, se ofrecen todos.">
              <ColorToggles colors={catalog.colors} value={item.allowedColorIds} onChange={(allowedColorIds) => set({ allowedColorIds })} />
            </Field>
          )}
          <Field label="Color con el que aparece primero">
            <Select
              value={item.defaultColorId}
              onChange={(defaultColorId) => set({ defaultColorId })}
              options={catalog.colors.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
        </fieldset>
        <div className="row2">
          <Check label="Visible en el sitio" value={item.active} onChange={(active) => set({ active })} />
          <Check label="Destacado en inicio" value={!!item.featured} onChange={(featured) => set({ featured })} />
        </div>
        <Field label="Orden">
          <Num step={1} value={item.order} onChange={(v) => set({ order: v ?? 0 })} />
        </Field>
      </div>
      <div className="editor-preview-col">
        <div className="editor-preview">
          <Stage
            mold={item}
            type={previewType}
            color={preview?.hex ?? color}
            colorId={preview?.id ?? item.defaultColorId}
            plate={plate}
            veinColor={plate?.veinColors[0] ?? null}
            theme={theme}
            lit
          />
        </div>
        <PreviewSwatches colors={previewColors} value={preview?.id ?? null} onChange={setPreviewId} />
      </div>
    </div>
  );
}

export function PlateEditor({ item, set, catalog }: Ed<Plate>) {
  const fit = { ...DEFAULT_PLATE_FIT, ...item.photoFit };
  const setFit = (patch: Partial<typeof fit>) => set({ photoFit: { ...fit, ...patch } });
  const wax = { ...DEFAULT_WAX, ...item.photoFit };
  const [painting, setPainting] = useState(false);
  const [paintingFront, setPaintingFront] = useState(false);
  const [paintMsg, setPaintMsg] = useState<string | null>(null);
  // Óvalo de los controles, en fracciones de la foto, para "Empezar con óvalo".
  const box = photoPlateBox(item);
  const waxRx = (box.w * wax.waxWidth) / 2;
  const oval = {
    cx: 0.5,
    cy: (box.h / 2 + fit.seatY + wax.waxY) / box.h,
    rx: wax.waxWidth / 2,
    ry: (waxRx * wax.waxTilt) / box.h,
  };
  const mold = catalog.molds.find((m) => m.active) ?? catalog.molds[0];
  const color = catalog.colors.find((c) => c.id === (mold?.photoColorId ?? mold?.defaultColorId))?.hex ?? '#f5a3c0';
  const platePreviewColors = plateColors(catalog.colors, item);
  const [platePreviewId, setPlatePreviewId] = useState<string | null>(null);
  const platePreview = platePreviewColors.find((c) => c.id === platePreviewId) ?? null;
  return (
    <div className="editor-grid">
      <div className="editor-fields">
        <Field label="Nombre">
          <Text value={item.name} onChange={(name) => set({ name })} />
        </Field>
        <Field label="Descripción">
          <Text value={item.description} onChange={(description) => set({ description })} />
        </Field>
        <div className="row2">
          <Field label="Forma">
            <Select
              value={item.shape}
              onChange={(shape) => set({ shape })}
              options={[
                { value: 'ovalada', label: 'Ovalada' },
                { value: 'redonda', label: 'Redonda' },
                { value: 'rectangular', label: 'Rectangular' },
                { value: 'cesta', label: 'Cesta' },
              ]}
            />
          </Field>
          <Field label="Tipo" hint="Contenedor = la cera va dentro">
            <Select
              value={item.kind}
              onChange={(kind) => set({ kind, forTypes: undefined })}
              options={[
                { value: 'plana', label: 'Plana' },
                { value: 'contenedor', label: 'Contenedor' },
                { value: 'caja', label: 'Cajita de regalo' },
              ]}
            />
          </Field>
        </div>
        <Field label="Se ofrece para" hint="Normalmente: contenedores para velas y placas planas para jabones.">
          <div className="row2">
            {(['vela', 'jabon'] as const).map((t) => {
              const on = plateTypes(item).includes(t);
              return (
                <Check
                  key={t}
                  label={t === 'vela' ? 'Velas' : 'Jabones'}
                  value={on}
                  onChange={(v) => {
                    const next = v ? [...plateTypes(item), t] : plateTypes(item).filter((x) => x !== t);
                    if (next.length) set({ forTypes: Array.from(new Set(next)) });
                  }}
                />
              );
            })}
          </div>
        </Field>
        <div className="row3">
          <Field label="Largo (cm)">
            <Num value={item.lengthCm} onChange={(v) => set({ lengthCm: v ?? 8 })} />
          </Field>
          <Field label="Ancho (cm)">
            <Num value={item.widthCm} onChange={(v) => set({ widthCm: v ?? 6 })} />
          </Field>
          <Field label="Alto (cm)">
            <Num value={item.heightCm} onChange={(v) => set({ heightCm: v ?? 0.7 })} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Tamaño">
            <Select
              value={item.size}
              onChange={(size) => set({ size })}
              options={[
                { value: 'chica', label: 'Chica' },
                { value: 'grande', label: 'Grande' },
              ]}
            />
          </Field>
          <Field label="Precio adicional">
            <Num step={1} value={item.price} onChange={(v) => set({ price: v ?? 0 })} />
          </Field>
        </div>
        <Field label="Colores de veta que se ofrecen">
          <div className="vein-list">
            {item.veinColors.map((v, i) => (
              <span key={i} className="vein-item">
                <ColorInput value={v} onChange={(nv) => set({ veinColors: item.veinColors.map((x, j) => (j === i ? nv : x)) })} />
                <button type="button" className="link-btn" onClick={() => set({ veinColors: item.veinColors.filter((_, j) => j !== i) })}>
                  ✕
                </button>
              </span>
            ))}
            <button type="button" className="btn ghost small" onClick={() => set({ veinColors: [...item.veinColors, '#f29bb8'] })}>
              + Color
            </button>
          </div>
        </Field>
        <Field label="Foto sin fondo (opcional)" hint="Si no hay foto, el sitio dibuja la placa con vetas.">
          <PhotoInput value={item.photo} name={item.id} onChange={(photo, photoAspect, photoLuma) => set({ photo, photoAspect, photoLuma })} />
        </Field>
        {item.photo && (
          <fieldset className="afit">
            <legend>Color de la placa</legend>
            <Check
              label="Permitir cambiar el color de la placa (recolorea la foto, aparte del color de la vela)"
              value={!!item.photoTintable}
              onChange={(photoTintable) => set({ photoTintable })}
            />
            {item.photoTintable && (
              <Field label="Colores que se ofrecen" hint="Si no marcas ninguno, se ofrecen todos. Siempre se puede elegir el color original.">
                <ColorToggles colors={catalog.colors} value={item.photoColorIds} onChange={(photoColorIds) => set({ photoColorIds })} />
              </Field>
            )}
          </fieldset>
        )}
        {item.photo && (
          <fieldset className="afit">
            <legend>Ajuste de la foto</legend>
            <small>Endereza la placa y elige dónde se apoya el producto. Mira la vista previa.</small>
            <Slider
              label="Tamaño"
              value={fit.scale}
              min={0.5}
              max={1.8}
              step={0.01}
              def={1}
              format={pct}
              onChange={(scale) => setFit({ scale })}
            />
            <Slider label="Girar" value={fit.rotate} min={-30} max={30} step={0.5} def={0} format={(v) => `${v}°`} onChange={(rotate) => setFit({ rotate })} />
            <Slider
              label="Inclinación (aplastar / estirar)"
              value={fit.squash}
              min={0.4}
              max={1.6}
              step={0.01}
              def={1}
              format={pct}
              onChange={(squash) => setFit({ squash })}
            />
            <Slider label="Punto de apoyo (arriba / abajo)" value={fit.seatY} min={-60} max={60} step={1} def={0} onChange={(seatY) => setFit({ seatY })} />
          </fieldset>
        )}
        {item.photo && item.kind === 'contenedor' && (
          <fieldset className="afit">
            <legend>Cera dentro del contenedor</legend>
            <small>Para que el contenedor se vea relleno y con la vela asentada.</small>
            <Check label="Rellenar con cera" value={fit.waxOn ?? true} onChange={(waxOn) => setFit({ waxOn })} />
            {(fit.waxOn ?? true) && (
              <Field label="Color de la cera">
                <Select
                  value={fit.waxColor ?? 'vela'}
                  onChange={(waxColor) => setFit({ waxColor })}
                  options={[
                    { value: 'vela', label: 'Igual que la vela' },
                    { value: '#f7f3ee', label: 'Blanca' },
                    { value: '#f3e6cf', label: 'Crema' },
                    ...catalog.colors
                      .filter((c) => c.active && !['#f7f3ee', '#f3e6cf'].includes(c.hex.toLowerCase()))
                      .map((c) => ({ value: c.hex.toLowerCase(), label: c.name })),
                  ]}
                />
              </Field>
            )}
            {(fit.waxOn ?? true) && (
              <div className="chips" role="radiogroup" aria-label="Forma de la cera">
                <button type="button" className="chip" role="radio" aria-checked={fit.waxMode !== 'pintado'} onClick={() => setFit({ waxMode: 'ovalo' })}>
                  ⬭ Óvalo
                </button>
                <button type="button" className="chip" role="radio" aria-checked={fit.waxMode === 'pintado'} onClick={() => setFit({ waxMode: 'pintado' })}>
                  🖌️ Pintada a mano
                </button>
              </div>
            )}
            {(fit.waxOn ?? true) && fit.waxMode === 'pintado' && (
              <div className="paint-row">
                {fit.waxMask ? <img className="paint-thumb" src={fit.waxMask} alt="Zona de cera pintada" /> : <span className="muted">Todavía no pintas la zona.</span>}
                <button type="button" className="btn primary small" onClick={() => setPainting(true)}>
                  {fit.waxMask ? '🖌️ Editar zona de cera' : '🖌️ Pintar zona de cera'}
                </button>
                {paintMsg && <small className="admin-msg">{paintMsg}</small>}
              </div>
            )}
            {(fit.waxOn ?? true) && fit.waxMode !== 'pintado' && (
              <>
                <Slider label="Ancho de la cera" value={wax.waxWidth} min={0.3} max={1} step={0.01} def={DEFAULT_WAX.waxWidth} format={pct} onChange={(waxWidth) => setFit({ waxWidth })} />
                <Slider label="Inclinación de la cera" value={wax.waxTilt} min={0.1} max={0.7} step={0.01} def={DEFAULT_WAX.waxTilt} format={pct} onChange={(waxTilt) => setFit({ waxTilt })} />
                <Slider label="Altura de la cera (arriba / abajo)" value={wax.waxY} min={-60} max={60} step={1} def={DEFAULT_WAX.waxY} onChange={(waxY) => setFit({ waxY })} />
              </>
            )}
          </fieldset>
        )}
        {item.photo && item.kind === 'caja' && (
          <fieldset className="afit">
            <legend>Lo que va delante del producto</legend>
            <small>
              Pinta el acetato del frente, el moño y el relleno de enfrente. Eso se dibuja encima de la vela o el jabón para que se vea dentro de
              la cajita. Usa la foto de la cajita vacía.
            </small>
            <div className="paint-row">
              {fit.frontMask ? <img className="paint-thumb" src={fit.frontMask} alt="Zona del frente pintada" /> : <span className="muted">Todavía no pintas el frente.</span>}
              <button type="button" className="btn primary small" onClick={() => setPaintingFront(true)}>
                {fit.frontMask ? '🖌️ Editar el frente' : '🖌️ Pintar el frente'}
              </button>
            </div>
          </fieldset>
        )}
        {paintingFront && item.photo && (
          <WaxPainter
            photo={item.photo}
            mask={fit.frontMask}
            title="Pinta lo que va delante del producto"
            hint="Lo rosa queda por encima de la vela o el jabón."
            onCancel={() => setPaintingFront(false)}
            onDone={async ({ blob }) => {
              try {
                const frontMask = await repo.uploadImage(blob, `frente-${item.id}`);
                setFit({ frontMask });
                setPaintingFront(false);
              } catch (e) {
                throw new Error(friendlyError(e));
              }
            }}
          />
        )}
        {painting && item.photo && (
          <WaxPainter
            photo={item.photo}
            mask={fit.waxMask}
            oval={oval}
            onCancel={() => setPainting(false)}
            onDone={async ({ blob, box: waxBox }) => {
              try {
                const waxMask = await repo.uploadImage(blob, `cera-${item.id}`);
                setFit({ waxMode: 'pintado', waxMask, waxBox });
                setPaintMsg('Listo. Revisa la vista previa y toca "Guardar cambios".');
                setPainting(false);
              } catch (e) {
                throw new Error(friendlyError(e));
              }
            }}
          />
        )}
        <Field label="¿Qué moldes caben?" hint="Se calcula con las medidas. Desmarca los que no caben aunque las medidas digan que sí.">
          <div className="fit-list">
            {catalog.molds.map((m) => {
              const blocked = item.blockedMoldIds.includes(m.id);
              const auto = plateFits(m, { ...item, blockedMoldIds: [] }, plateTypes(item)[0]);
              return (
                <label key={m.id} className="acheck">
                  <input
                    type="checkbox"
                    checked={!blocked && auto.ok}
                    disabled={!auto.ok}
                    onChange={(e) =>
                      set({
                        blockedMoldIds: e.target.checked
                          ? item.blockedMoldIds.filter((x) => x !== m.id)
                          : [...item.blockedMoldIds, m.id],
                      })
                    }
                  />
                  {m.name} ({m.baseWidthCm} cm){!auto.ok && <small className="warn"> · {auto.reason}</small>}
                </label>
              );
            })}
          </div>
        </Field>
        <div className="row2">
          <Check label="Visible en el sitio" value={item.active} onChange={(active) => set({ active })} />
          <Field label="Orden">
            <Num step={1} value={item.order} onChange={(v) => set({ order: v ?? 0 })} />
          </Field>
        </div>
      </div>
      <div className="editor-preview-col">
        <div className="editor-preview">
          {mold && (
            <Stage
              mold={mold}
              type={plateTypes(item)[0]}
              color={color}
              colorId={mold.photoColorId ?? mold.defaultColorId}
              plate={item}
              veinColor={item.veinColors[0] ?? null}
              plateColor={platePreview?.hex ?? null}
              lit
            />
          )}
        </div>
        {platePreviewColors.length > 0 && (
          <PreviewSwatches colors={platePreviewColors} value={platePreview?.id ?? null} onChange={setPlatePreviewId} original />
        )}
      </div>
    </div>
  );
}

export function ColorEditor({ item, set }: Ed<ColorOption>) {
  return (
    <div className="editor-fields">
      <div className="row2">
        <Field label="Nombre">
          <Text value={item.name} onChange={(name) => set({ name })} />
        </Field>
        <Field label="Color">
          <ColorInput value={item.hex} onChange={(hex) => set({ hex })} />
        </Field>
      </div>
      <div className="row2">
        <Check label="Visible" value={item.active} onChange={(active) => set({ active })} />
        <Field label="Orden">
          <Num step={1} value={item.order} onChange={(v) => set({ order: v ?? 0 })} />
        </Field>
      </div>
    </div>
  );
}

export function EssenceEditor({ item, set }: Ed<Essence>) {
  return (
    <div className="editor-fields">
      <div className="row2">
        <Field label="Nombre">
          <Text value={item.name} onChange={(name) => set({ name })} />
        </Field>
        <Field label="Color del icono">
          <ColorInput value={item.color} onChange={(color) => set({ color })} />
        </Field>
      </div>
      <Field label="Descripción">
        <Text value={item.description} onChange={(description) => set({ description })} />
      </Field>
      <div className="row2">
        <Check label="Visible" value={item.active} onChange={(active) => set({ active })} />
        <Field label="Orden">
          <Num step={1} value={item.order} onChange={(v) => set({ order: v ?? 0 })} />
        </Field>
      </div>
    </div>
  );
}

export function CollectionEditor({ item, set }: Ed<Collection>) {
  return (
    <div className="editor-fields">
      <Field label="Nombre">
        <Text value={item.name} onChange={(name) => set({ name })} />
      </Field>
      <Field label="Descripción">
        <Text value={item.description} onChange={(description) => set({ description })} />
      </Field>
      <div className="row3">
        <Field label="Fondo">
          <ColorInput value={item.theme.bg} onChange={(bg) => set({ theme: { ...item.theme, bg } })} />
        </Field>
        <Field label="Fondo 2">
          <ColorInput value={item.theme.bg2} onChange={(bg2) => set({ theme: { ...item.theme, bg2 } })} />
        </Field>
        <Field label="Acento">
          <ColorInput value={item.theme.accent} onChange={(accent) => set({ theme: { ...item.theme, accent } })} />
        </Field>
      </div>
    </div>
  );
}

export function ArrangementEditor({ item, set }: Ed<Arrangement>) {
  return (
    <div className="editor-fields">
      <Field label="Nombre">
        <Text value={item.name} onChange={(name) => set({ name, slug: item.slug || slugify(name) })} />
      </Field>
      <Field label="Dirección web" hint={`/arreglos/${item.slug}`}>
        <Text value={item.slug} onChange={(v) => set({ slug: slugify(v) })} />
      </Field>
      <Field label="Descripción">
        <textarea rows={3} value={item.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <Field label="Qué incluye" hint="Una pieza por renglón. Ej. Vela tulipán, Jabón mariposa, Flores secas, Musgo, Cesta.">
        <textarea
          rows={5}
          value={item.includes.join('\n')}
          onChange={(e) => set({ includes: e.target.value.split('\n') })}
          onBlur={(e) => set({ includes: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) })}
        />
      </Field>
      <Field label="Precio">
        <Num step={1} value={item.price} onChange={(v) => set({ price: v ?? 0 })} />
      </Field>
      <Field label="Fotos" hint="Fotos reales del arreglo, con fondo. La primera es la principal.">
        <PhotoList value={item.photos} name={item.slug || item.id} onChange={(photos) => set({ photos })} />
      </Field>
      <Check label="El cliente puede pedirlo en otros colores" value={item.customColors} onChange={(customColors) => set({ customColors })} />
      <div className="row2">
        <Check label="Visible en el sitio" value={item.active} onChange={(active) => set({ active })} />
        <Check label="Destacado en inicio" value={!!item.featured} onChange={(featured) => set({ featured })} />
      </div>
      <Field label="Orden">
        <Num step={1} value={item.order} onChange={(v) => set({ order: v ?? 0 })} />
      </Field>
    </div>
  );
}
