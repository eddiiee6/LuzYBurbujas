import type { ReactNode } from 'react';

/** Selector estilo videojuego: ‹ opción actual › */
export function Picker({
  label,
  title,
  subtitle,
  warn,
  onPrev,
  onNext,
  children,
}: {
  label: string;
  title: string;
  subtitle?: ReactNode;
  warn?: boolean;
  onPrev: () => void;
  onNext: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="picker" aria-label={label}>
      <div className="picker-head">
        <span className="eyebrow">{label}</span>
      </div>
      <div className="picker-row">
        <button type="button" className="arrow" onClick={onPrev} aria-label={`${label} anterior`}>
          ‹
        </button>
        <div className="picker-current" aria-live="polite">
          <strong>{title}</strong>
          {subtitle && <small className={warn ? 'warn' : undefined}>{subtitle}</small>}
        </div>
        <button type="button" className="arrow" onClick={onNext} aria-label={`${label} siguiente`}>
          ›
        </button>
      </div>
      {children}
    </section>
  );
}

export function Swatches({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; hex: string; name: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <section className="field">
      <span className="eyebrow">
        {label}
        {value && <em> · {options.find((o) => o.id === value)?.name}</em>}
      </span>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === value}
            aria-label={o.name}
            title={o.name}
            className="swatch"
            style={{ background: o.hex }}
            onClick={() => onChange(o.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; name: ReactNode; dot?: string; disabled?: boolean }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <section className="field">
      <span className="eyebrow">{label}</span>
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === value}
            disabled={o.disabled}
            className="chip"
            onClick={() => onChange(o.id)}
          >
            {o.dot && <i className="dot" style={{ background: o.dot }} />}
            {o.name}
          </button>
        ))}
      </div>
    </section>
  );
}
