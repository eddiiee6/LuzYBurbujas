import { useState, type ReactNode } from 'react';
import { friendlyError, repo } from '../data/repo';
import { prepareCutout } from '../lib/image';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="afield">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Text({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Num({ value, onChange, step = 0.1 }: { value: number | undefined; onChange: (v: number | undefined) => void; step?: number }) {
  return (
    <input
      type="number"
      step={step}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  );
}

export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="acheck">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="acolor">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Varias fotos (con fondo) para un arreglo: subir, ordenar y quitar. */
export function PhotoList({ value, name, onChange }: { value: string[]; name: string; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="aphotos">
      <div className="aphotos-grid">
        {value.map((src, i) => (
          <figure key={src + i} className="aphotos-item">
            <img src={src} alt="" />
            {i === 0 && <span className="pill">Principal</span>}
            <div className="aphotos-actions">
              <button type="button" className="link-btn" onClick={() => move(i, -1)} aria-label="Mover antes" disabled={i === 0}>
                ←
              </button>
              <button type="button" className="link-btn" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                Quitar
              </button>
              <button type="button" className="link-btn" onClick={() => move(i, 1)} aria-label="Mover después" disabled={i === value.length - 1}>
                →
              </button>
            </div>
          </figure>
        ))}
      </div>
      <label className="btn ghost small">
        {busy ? 'Subiendo…' : '+ Agregar fotos'}
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
              const urls: string[] = [];
              for (const f of files) {
                const { blob } = await prepareCutout(f, 1200);
                urls.push(await repo.uploadImage(blob, name));
              }
              onChange([...value, ...urls]);
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

/** Una sola foto (con o sin fondo): subir, cambiar o quitar. */
export function SinglePhoto({ value, name, onChange }: { value?: string; name: string; onChange: (v: string | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="aphotos">
      {value && (
        <div className="aphotos-grid">
          <figure className="aphotos-item">
            <img src={value} alt="" />
          </figure>
        </div>
      )}
      <div className="aphotos-actions single">
        <label className="btn ghost small">
          {busy ? 'Subiendo…' : value ? 'Cambiar foto' : '+ Subir foto'}
          <input
            type="file"
            accept="image/png,image/webp,image/jpeg"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              setErr(null);
              try {
                const { blob } = await prepareCutout(f, 1200);
                onChange(await repo.uploadImage(blob, name));
              } catch (x) {
                setErr(friendlyError(x));
              } finally {
                setBusy(false);
                e.target.value = '';
              }
            }}
          />
        </label>
        {value && (
          <button type="button" className="link-btn" onClick={() => onChange(undefined)}>
            Quitar foto
          </button>
        )}
      </div>
      {err && <small className="warn">{err}</small>}
    </div>
  );
}
