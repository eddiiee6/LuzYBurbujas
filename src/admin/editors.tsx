import type { Arrangement, ArrangementPiece, Catalog, Collection, ColorOption, Essence, GalleryPhoto, Mold, Plate } from '../types';
import { useState } from 'react';
import { plateFits, plateKindLabel, plateTypes } from '../lib/rules';
import { photosFor } from '../lib/gallery';
import { Check, ColorInput, Field, Num, PhotoList, Select, Text, slugify } from './fields';
import { prepareCutout } from '../lib/image';
import { friendlyError, repo } from '../data/repo';
import { FitPhoto } from '../components/FitPhoto';
import { PhotoPending } from '../components/PhotoPending';

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

type Ed<T> = { item: T; set: (patch: Partial<T>) => void; catalog: Catalog };

export function MoldEditor({ item, set, catalog }: Ed<Mold>) {
  const cover = item.gallery?.[0];
  // Qué combinaciones ya tienen foto real y cuáles faltan.
  const types = (['jabon', 'vela'] as const).filter((t) => typeof item.prices[t] === 'number');
  const combos = types.flatMap((t) =>
    [null, ...catalog.plates.filter((p) => p.active && plateFits(item, p, t).ok)].map((p) => ({
      label: `${t === 'vela' ? 'Vela' : 'Jabón'} · ${p ? p.name : 'Sola'}`,
      ok: photosFor(item, p?.id ?? null, t).length > 0,
    })),
  );
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
          <Field label="Ancho de la base (cm)" hint="Decide en qué presentaciones cabe">
            <Num value={item.baseWidthCm} onChange={(v) => set({ baseWidthCm: v ?? 5 })} />
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
        <fieldset className="afit">
          <legend>📷 Fotos reales</legend>
          <small>
            Es lo que ve el cliente. En cada foto indica la presentación (sola, placa, cesta, cajita, tarjeta). Solo se ofrecen las
            combinaciones con foto (📷); las que faltan (⏳) no aparecen. Mientras el molde no tenga ninguna foto, se muestra como "Foto en
            preparación".
          </small>
          <GalleryEditor mold={item} catalog={catalog} onChange={(gallery) => set({ gallery })} />
          {combos.length > 0 && (
            <div className="combo-list">
              <span className="eyebrow">Combinaciones</span>
              {combos.map((c) => (
                <span key={c.label} className={`combo ${c.ok ? 'ok' : ''}`}>
                  {c.ok ? '📷' : '⏳'} {c.label}
                </span>
              ))}
            </div>
          )}
        </fieldset>
        <fieldset className="afit">
          <legend>Colores</legend>
          <Field label="Colores que se ofrecen" hint="Si no marcas ninguno, se ofrecen todos. El color pedido va en el WhatsApp.">
            <ColorToggles colors={catalog.colors} value={item.allowedColorIds} onChange={(allowedColorIds) => set({ allowedColorIds })} />
          </Field>
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
        <div className="editor-preview">{cover ? <FitPhoto src={cover.url} alt={item.name} /> : <PhotoPending note="Sube la primera foto real." />}</div>
      </div>
    </div>
  );
}

export function PlateEditor({ item, set, catalog }: Ed<Plate>) {
  return (
    <div className="editor-fields">
      <Field label="Nombre" hint='Ej. "Placa ovalada", "Cesta de yeso", "Cajita con musgo", "Tarjeta Iluminas"'>
        <Text value={item.name} onChange={(name) => set({ name })} />
      </Field>
      <Field label="Descripción">
        <Text value={item.description} onChange={(description) => set({ description })} />
      </Field>
      <div className="row2">
        <Field label="Tipo">
          <Select
            value={item.kind}
            onChange={(kind) => set({ kind, forTypes: undefined })}
            options={[
              { value: 'plana', label: 'Placa' },
              { value: 'contenedor', label: 'Contenedor (cesta)' },
              { value: 'caja', label: 'Cajita de regalo' },
              { value: 'tarjeta', label: 'Tarjeta impresa' },
            ]}
          />
        </Field>
        <Field label="Precio adicional">
          <Num step={1} value={item.price} onChange={(v) => set({ price: v ?? 0 })} />
        </Field>
      </div>
      <Field label="Se ofrece para" hint="Por defecto: placas para jabones, contenedores para velas; cajitas y tarjetas para los dos.">
        <div className="row2">
          {(['vela', 'jabon'] as const).map((t) => (
            <Check
              key={t}
              label={t === 'vela' ? 'Velas' : 'Jabones'}
              value={plateTypes(item).includes(t)}
              onChange={(v) => {
                const next = v ? [...plateTypes(item), t] : plateTypes(item).filter((x) => x !== t);
                if (next.length) set({ forTypes: Array.from(new Set(next)) });
              }}
            />
          ))}
        </div>
      </Field>
      <div className="row3">
        <Field label="Largo (cm)">
          <Num value={item.lengthCm} onChange={(v) => set({ lengthCm: v ?? 0 })} />
        </Field>
        <Field label="Ancho (cm)">
          <Num value={item.widthCm} onChange={(v) => set({ widthCm: v ?? 0 })} />
        </Field>
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
      </div>
      <Field label="¿Qué moldes caben?" hint={`Se calcula con las medidas (0 = sin límite). Desmarca los que no van en esta ${plateKindLabel[item.kind]}.`}>
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
                      blockedMoldIds: e.target.checked ? item.blockedMoldIds.filter((x) => x !== m.id) : [...item.blockedMoldIds, m.id],
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
      <small className="muted">Las fotos de cada molde en esta presentación se suben en Moldes → 📷 Fotos reales.</small>
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

export function ArrangementEditor({ item, set, catalog }: Ed<Arrangement>) {
  const n = item.pieces ?? 0;
  const defaults = Array.from({ length: n }, (_, i) => item.defaultPieces?.[i] ?? { moldId: null, type: null });
  const setPiece = (i: number, patch: Partial<ArrangementPiece>) =>
    set({ defaultPieces: defaults.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
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
      <Field label="Número de piezas que elige el cliente" hint="0 = arreglo fijo (no se eligen piezas). Ej. Bandeja 12, Concha 3, Cesta 5, Bolsa 3.">
        <Num step={1} value={item.pieces ?? 0} onChange={(v) => set({ pieces: Math.max(0, Math.min(40, Math.round(v ?? 0))) })} />
      </Field>
      {n > 0 && (
        <fieldset className="afit">
          <legend>Piezas sugeridas</legend>
          <small>Lo que aparece ya elegido; el cliente lo puede cambiar. Déjalas en "A elección" para que el cliente elija desde cero.</small>
          <ol className="piece-list">
            {defaults.map((p, i) => (
              <li key={i} className="piece-row admin-piece">
                <span className="pill">{i + 1}</span>
                <div className="row2">
                  <Select
                    value={p.moldId ?? ''}
                    onChange={(moldId) => setPiece(i, { moldId: moldId || null })}
                    options={[{ value: '', label: 'A elección' }, ...catalog.molds.map((m) => ({ value: m.id, label: m.name }))]}
                  />
                  <Select
                    value={p.type ?? ''}
                    onChange={(t) => setPiece(i, { type: (t || null) as ArrangementPiece['type'] })}
                    options={[
                      { value: '', label: 'Jabón o vela' },
                      { value: 'jabon', label: 'Jabón' },
                      { value: 'vela', label: 'Vela' },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ol>
        </fieldset>
      )}
      <Check label="El cliente puede escribir los colores que quiere" value={item.customColors} onChange={(customColors) => set({ customColors })} />
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

/** Galería de fotos reales de un molde, cada una etiquetada con su presentación. */
function GalleryEditor({ mold, catalog, onChange }: { mold: Mold; catalog: Catalog; onChange: (g: GalleryPhoto[]) => void }) {
  const gallery = mold.gallery ?? [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const update = (i: number, patch: Partial<GalleryPhoto>) => onChange(gallery.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= gallery.length) return;
    const next = [...gallery];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const plates = catalog.plates;
  return (
    <div className="gallery-editor">
      {gallery.map((g, i) => (
        <div key={g.id} className="gallery-row">
          <img src={g.url} alt="" />
          <div className="gallery-tags">
            <Select
              value={g.plateId ?? ''}
              onChange={(v) => update(i, { plateId: v || null })}
              options={[{ value: '', label: 'Sola (sin placa)' }, ...plates.map((p) => ({ value: p.id, label: p.name }))]}
            />
            <Select
              value={g.type ?? ''}
              onChange={(v) => update(i, { type: (v || null) as GalleryPhoto['type'] })}
              options={[
                { value: '', label: 'Vela y jabón' },
                { value: 'vela', label: 'Vela' },
                { value: 'jabon', label: 'Jabón' },
              ]}
            />
            <Select
              value={g.colorId ?? ''}
              onChange={(v) => update(i, { colorId: v || null })}
              options={[{ value: '', label: 'Color: no indicar' }, ...catalog.colors.map((c) => ({ value: c.id, label: `Color: ${c.name}` }))]}
            />
            <div className="aphotos-actions">
              <button type="button" className="link-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover antes">
                ↑
              </button>
              <button type="button" className="link-btn" onClick={() => onChange(gallery.filter((_, j) => j !== i))}>
                Quitar
              </button>
              <button type="button" className="link-btn" onClick={() => move(i, 1)} disabled={i === gallery.length - 1} aria-label="Mover después">
                ↓
              </button>
            </div>
            {i === 0 && <small className="muted">Portada del molde en el catálogo</small>}
          </div>
        </div>
      ))}
      <label className="btn ghost small">
        {busy ? 'Subiendo…' : '+ Agregar fotos reales'}
        <input
          type="file"
          accept="image/png,image/webp,image/jpeg"
          multiple
          hidden
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            if (!files.length) return;
            setBusy(true);
            setErr(null);
            try {
              const added: GalleryPhoto[] = [];
              for (const f of files) {
                const { blob } = await prepareCutout(f, 1200);
                const url = await repo.uploadImage(blob, `${mold.slug || mold.id}-foto`);
                added.push({ id: Math.random().toString(36).slice(2, 10), url, plateId: null, type: null, colorId: null });
              }
              onChange([...gallery, ...added]);
            } catch (x) {
              setErr(friendlyError(x));
            } finally {
              setBusy(false);
              e.target.value = '';
            }
          }}
        />
      </label>
      {err && <small className="warn">{err}</small>}
    </div>
  );
}
