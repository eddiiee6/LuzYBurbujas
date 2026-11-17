import { useEffect, useRef, type ReactNode } from 'react';
import { FitPhoto } from './FitPhoto';
import { PhotoPending } from './PhotoPending';

export interface SheetOption {
  id: string;
  title: string;
  subtitle?: ReactNode;
  /** Foto real de la opción; sin foto se muestra "en preparación". */
  photo?: string | null;
  /** Si no se puede elegir, el motivo. */
  disabled?: string;
}

/**
 * Ventana para elegir una opción viendo su foto (molde o presentación).
 * En celular sale desde abajo como hoja; en computadora, al centro.
 */
export function SelectSheet({
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  title: string;
  options: SheetOption[];
  value: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Cerrar con Escape, bloquear el scroll del fondo y llevar el foco a la ventana.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"], .sheet-option:not(:disabled)')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panel} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-grip" aria-hidden />
          <h2>{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="sheet-grid">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="sheet-option"
              aria-pressed={o.id === value}
              disabled={!!o.disabled}
              onClick={() => {
                onSelect(o.id);
                onClose();
              }}
            >
              <span className="sheet-photo">{o.photo ? <FitPhoto src={o.photo} alt="" /> : <PhotoPending small />}</span>
              <strong>{o.title}</strong>
              {o.disabled ? <small className="warn">{o.disabled}</small> : o.subtitle && <small>{o.subtitle}</small>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
