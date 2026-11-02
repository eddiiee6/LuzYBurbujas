import { DEFAULT_MOLD_FIT, DEFAULT_PLATE_FIT, type Catalog, type Collection, type ColorOption, type Essence, type Mold, type MoldArt, type Plate } from '../types';
import { Stage } from '../components/Stage';
import { plateFits } from '../lib/rules';
import { Check, ColorInput, Field, Num, PhotoInput, Select, Slider, Text, slugify } from './fields';

const pct = (v: number) => `${Math.round(v * 100)}%`;

type Ed<T> = { item: T; set: (patch: Partial<T>) => void; catalog: Catalog };

const ARTS: { value: MoldArt; label: string }[] = [
  { value: 'margarita', label: 'Margarita' },
  { value: 'rosa', label: 'Rosa' },
  { value: 'cempasuchil', label: 'Cempasúchil' },
  { value: 'copo', label: 'Copo de nieve' },
  { value: 'pino', label: 'Pino' },
];

export function MoldEditor({ item, set, catalog }: Ed<Mold>) {
  const color = catalog.colors.find((c) => c.id === item.defaultColorId)?.hex ?? '#f5a3c0';
  const plate = catalog.plates.find((p) => p.active && p.kind === 'plana') ?? null;
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
        <Field label="Color por defecto">
          <Select
            value={item.defaultColorId}
            onChange={(defaultColorId) => set({ defaultColorId })}
            options={catalog.colors.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label="Foto sin fondo" hint="PNG o WebP transparente, tomada de frente y un poco desde arriba.">
          <PhotoInput value={item.photo} name={item.slug} onChange={(photo, photoAspect) => set({ photo, photoAspect })} />
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
        <Check
          label="Teñir la foto con el color elegido (la foto debe ser blanca o muy clara)"
          value={!!item.photoTintable}
          onChange={(photoTintable) => set({ photoTintable })}
        />
        <div className="row2">
          <Check label="Visible en el sitio" value={item.active} onChange={(active) => set({ active })} />
          <Check label="Destacado en inicio" value={!!item.featured} onChange={(featured) => set({ featured })} />
        </div>
        <Field label="Orden">
          <Num step={1} value={item.order} onChange={(v) => set({ order: v ?? 0 })} />
        </Field>
      </div>
      <div className="editor-preview">
        <Stage mold={item} type={item.prices.vela != null ? 'vela' : 'jabon'} color={color} plate={plate} veinColor={plate?.veinColors[0] ?? null} theme={theme} lit />
      </div>
    </div>
  );
}

export function PlateEditor({ item, set, catalog }: Ed<Plate>) {
  const fit = { ...DEFAULT_PLATE_FIT, ...item.photoFit };
  const setFit = (patch: Partial<typeof fit>) => set({ photoFit: { ...fit, ...patch } });
  const mold = catalog.molds.find((m) => m.active) ?? catalog.molds[0];
  const color = catalog.colors.find((c) => c.id === mold?.defaultColorId)?.hex ?? '#f5a3c0';
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
          <Field label="Tipo" hint="Contenedor = la cera va dentro (solo velas)">
            <Select
              value={item.kind}
              onChange={(kind) => set({ kind })}
              options={[
                { value: 'plana', label: 'Plana' },
                { value: 'contenedor', label: 'Contenedor' },
              ]}
            />
          </Field>
        </div>
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
          <PhotoInput value={item.photo} name={item.id} onChange={(photo, photoAspect) => set({ photo, photoAspect })} />
        </Field>
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
        <Field label="¿Qué moldes caben?" hint="Se calcula con las medidas. Desmarca los que no caben aunque las medidas digan que sí.">
          <div className="fit-list">
            {catalog.molds.map((m) => {
              const blocked = item.blockedMoldIds.includes(m.id);
              const auto = plateFits(m, { ...item, blockedMoldIds: [] }, 'vela');
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
      <div className="editor-preview">
        {mold && (
          <Stage mold={mold} type="vela" color={color} plate={item} veinColor={item.veinColors[0] ?? null} lit />
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
