import type { CSSProperties } from 'react';

/**
 * Muestra una foto completa (sin recortar) dentro de un recuadro de otra
 * proporción. El espacio sobrante se rellena con la misma foto difuminada,
 * como hace Instagram, para que no queden franjas vacías.
 */
export function FitPhoto({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={`fit-photo ${className ?? ''}`}>
      <img className="fit-bg" src={src} alt="" aria-hidden draggable={false} />
      <img className="fit-fg" src={src} alt={alt} draggable={false} style={style} />
    </div>
  );
}
