import { useState, type ReactNode } from 'react';
import { repo } from '../data/repo';

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

export function PhotoInput({ value, name, onChange }: { value?: string; name: string; onChange: (v: string | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="aphoto">
      {value ? <img src={value} alt="" /> : <div className="aphoto-empty">Sin foto · se usa la ilustración</div>}
      <div className="aphoto-actions">
        <label className="btn ghost small">
          {busy ? 'Subiendo…' : value ? 'Cambiar foto' : 'Subir foto'}
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
                onChange(await repo.uploadImage(f, name));
              } catch (x) {
                setErr(x instanceof Error ? x.message : 'No se pudo subir');
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

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
