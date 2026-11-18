/** Recuadro para combinaciones que todavía no tienen foto real. */
export function PhotoPending({ small, note }: { small?: boolean; note?: string }) {
  return (
    <div className={`photo-pending ${small ? 'small' : ''}`} role="img" aria-label="Foto en preparación">
      <svg viewBox="0 0 48 48" aria-hidden className="pending-logo">
        <g fill="currentColor" opacity="0.55">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="24" cy="13" rx="5.5" ry="9" transform={`rotate(${a} 24 24)`} />
          ))}
        </g>
        <circle cx="24" cy="24" r="5" fill="#f5c04a" />
      </svg>
      {!small && (
        <>
          <strong>📷 Foto en preparación</strong>
          <span>{note ?? 'Pídelo igual: te mandamos foto por WhatsApp.'}</span>
        </>
      )}
    </div>
  );
}
