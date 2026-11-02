import type { ReactNode } from 'react';
import { DEFAULT_PLATE_FIT, type Plate } from '../types';
import { darken, lighten, mix, seeded } from '../lib/color';

/** Escala del escenario: píxeles (del viewBox) por centímetro real. */
export const PX_PER_CM = 24;
/** Aplastamiento vertical por la perspectiva (~30° desde arriba). */
export const TILT = 0.5;

const PLASTER = '#f6f0e8';

export interface PlateRender {
  /** Lo que va detrás del producto. */
  back: ReactNode;
  /** Lo que va delante (p. ej. el borde frontal de una cesta). */
  front?: ReactNode;
  /** Punto donde se asienta el producto, relativo al centro de la placa. */
  seatY: number;
  /** Escala extra del producto (en contenedores se hunde un poco). */
  productScale: number;
}

/** Vetas de mármol: curvas suaves con semilla para que no cambien al redibujar. */
function Veins({ seed, color, w, h }: { seed: string; color: string; w: number; h: number }) {
  const rnd = seeded(seed + color);
  const paths: ReactNode[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const y0 = -h / 2 + rnd() * h;
    const amp = h * (0.15 + rnd() * 0.35);
    const x0 = -w / 2 - 10;
    const x1 = w / 2 + 10;
    const c1x = x0 + (x1 - x0) * (0.25 + rnd() * 0.2);
    const c2x = x0 + (x1 - x0) * (0.55 + rnd() * 0.2);
    const y1 = y0 + (rnd() - 0.5) * h * 0.8;
    const d = `M${x0},${y0} C${c1x},${y0 - amp} ${c2x},${y1 + amp} ${x1},${y1}`;
    const wide = i < 2;
    paths.push(
      <path
        key={i}
        d={d}
        fill="none"
        stroke={wide ? mix(color, PLASTER, 0.35) : color}
        strokeWidth={wide ? 8 + rnd() * 10 : 1.4 + rnd() * 2.6}
        opacity={wide ? 0.6 : 0.9}
        strokeLinecap="round"
        filter={wide ? 'url(#soft-blur)' : undefined}
      />,
    );
  }
  return <>{paths}</>;
}

/** Contorno de la cara superior (en coordenadas planas, sin perspectiva). */
function topShape(plate: Plate, w: number, h: number, props: Record<string, unknown> = {}) {
  switch (plate.shape) {
    case 'rectangular':
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(w, h) * 0.12} {...props} />;
    case 'redonda':
      return <circle r={w / 2} {...props} />;
    default:
      return <ellipse rx={w / 2} ry={h / 2} {...props} />;
  }
}

function flatPlate(plate: Plate, vein: string, uid: string): PlateRender {
  const w = plate.lengthCm * PX_PER_CM;
  const h = (plate.shape === 'redonda' ? plate.lengthCm : plate.widthCm) * PX_PER_CM;
  const depth = Math.max(6, plate.heightCm * PX_PER_CM * 0.87);
  const sides: ReactNode[] = [];
  for (let off = depth; off > 0; off -= 1.5) {
    sides.push(
      <g key={off} transform={`translate(0 ${off}) scale(1 ${TILT})`}>
        {topShape(plate, w, h, { fill: mix('#c9bcae', '#e6dccf', 1 - off / depth) })}
      </g>,
    );
  }
  return {
    seatY: 0,
    productScale: 1,
    back: (
      <g>
        <defs>
          <clipPath id={`${uid}-clip`}>{topShape(plate, w, h)}</clipPath>
          <radialGradient id={`${uid}-top`} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fffdf9" />
            <stop offset="1" stopColor={PLASTER} />
          </radialGradient>
        </defs>
        <ellipse cx={6} cy={depth + 6} rx={w / 2 + 8} ry={(h / 2) * TILT + 8} fill="#5b3a2e" opacity={0.18} filter="url(#shadow-blur)" />
        {sides}
        {/* manchitas de color en el canto */}
        <g transform={`translate(0 ${depth / 2})`} opacity={0.5}>
          <g transform={`scale(1 ${TILT})`} clipPath={`url(#${uid}-clip)`}>
            <Veins seed={plate.id + 'side'} color={vein} w={w} h={h} />
          </g>
        </g>
        <g transform={`scale(1 ${TILT})`}>
          {topShape(plate, w, h, { fill: `url(#${uid}-top)` })}
          <g clipPath={`url(#${uid}-clip)`}>
            <Veins seed={plate.id} color={vein} w={w} h={h} />
          </g>
          {topShape(plate, w - 2, h - 2, { fill: 'none', stroke: '#ffffff', strokeWidth: 2, opacity: 0.6 })}
        </g>
      </g>
    ),
  };
}

function basket(plate: Plate, vein: string, wax: string, uid: string): PlateRender {
  const rx = (plate.lengthCm * PX_PER_CM) / 2;
  const ry = rx * TILT;
  const wall = plate.heightCm * PX_PER_CM * 0.87;
  const bottomRx = rx * 0.82;
  const body = `M${-rx},0 L${-bottomRx},${wall} A${bottomRx},${bottomRx * TILT} 0 0 0 ${bottomRx},${wall} L${rx},0 A${rx},${ry} 0 0 1 ${-rx},0 Z`;
  return {
    seatY: 2,
    productScale: 0.85,
    back: (
      <g>
        <defs>
          <clipPath id={`${uid}-body`}>
            <path d={body} />
          </clipPath>
          <linearGradient id={`${uid}-wall`} x1="0" x2="1">
            <stop offset="0" stopColor="#e9dfd2" />
            <stop offset="0.4" stopColor="#fffaf3" />
            <stop offset="1" stopColor="#d8cabb" />
          </linearGradient>
          <radialGradient id={`${uid}-wax`} cx="0.45" cy="0.4" r="0.7">
            <stop offset="0" stopColor={lighten(wax, 0.55)} />
            <stop offset="1" stopColor={lighten(wax, 0.2)} />
          </radialGradient>
        </defs>
        <ellipse cx={6} cy={wall + 6} rx={bottomRx + 14} ry={bottomRx * TILT + 8} fill="#5b3a2e" opacity={0.2} filter="url(#shadow-blur)" />
        {/* interior: borde trasero y cera */}
        <ellipse rx={rx} ry={ry} fill="#d9cbbb" />
        <ellipse cx={0} cy={3} rx={rx - 7} ry={ry - 5} fill={`url(#${uid}-wax)`} />
      </g>
    ),
    front: (
      <g>
        <path d={body} fill={`url(#${uid}-wall)`} />
        <g clipPath={`url(#${uid}-body)`}>
          {/* tejido de la cesta */}
          {Array.from({ length: 5 }, (_, i) => (
            <path
              key={i}
              d={`M${-rx - 5},${(wall / 5) * (i + 0.5)} A${rx},${ry} 0 0 0 ${rx + 5},${(wall / 5) * (i + 0.5)}`}
              fill="none"
              stroke={darken(PLASTER, 0.12)}
              strokeWidth={1.2}
            />
          ))}
          {Array.from({ length: 16 }, (_, i) => {
            const x = -rx + ((i + 0.5) * 2 * rx) / 16;
            return <line key={i} x1={x} x2={x * 0.85} y1={ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2))} y2={wall + 20} stroke={darken(PLASTER, 0.1)} strokeWidth={1} />;
          })}
          <g opacity={0.55}>
            <Veins seed={plate.id} color={vein} w={rx * 2} h={wall * 3} />
          </g>
        </g>
        {/* borde frontal del aro */}
        <path d={`M${-rx},0 A${rx},${ry} 0 0 0 ${rx},0`} fill="none" stroke="#fffaf3" strokeWidth={5} strokeLinecap="round" />
        <path d={`M${-rx},0 A${rx},${ry} 0 0 0 ${rx},0`} fill="none" stroke={darken(PLASTER, 0.15)} strokeWidth={1} transform="translate(0 3)" />
      </g>
    ),
  };
}

function photoPlate(plate: Plate): PlateRender {
  // La foto viene recortada al borde de la placa: su ancho es el largo real.
  const fit = { ...DEFAULT_PLATE_FIT, ...plate.photoFit };
  const w = plate.lengthCm * PX_PER_CM * fit.scale;
  const h = w * (plate.photoAspect ?? 0.5) * fit.squash;
  return {
    seatY: fit.seatY,
    productScale: plate.kind === 'contenedor' ? 0.85 : 1,
    back: (
      <g transform={`rotate(${fit.rotate})`}>
        <ellipse cx={6} cy={h * 0.35} rx={w / 2 + 6} ry={h * 0.4} fill="#5b3a2e" opacity={0.18} filter="url(#shadow-blur)" />
        <image href={plate.photo} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="none" />
      </g>
    ),
  };
}

export function renderPlate(plate: Plate, vein: string, wax: string, uid: string): PlateRender {
  if (plate.photo) return photoPlate(plate);
  if (plate.kind === 'contenedor' || plate.shape === 'cesta') return basket(plate, vein, wax, uid);
  return flatPlate(plate, vein, uid);
}
