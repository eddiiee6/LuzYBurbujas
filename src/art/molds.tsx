import type { ReactNode } from 'react';
import type { MoldArt } from '../types';
import { darken, lighten, mix } from '../lib/color';

/**
 * Ilustraciones de los moldes.
 * Sistema de coordenadas: el molde mide 100 unidades de ancho, el origen (0,0)
 * es la orilla inferior al centro y hacia arriba es negativo. El escenario lo
 * escala según el ancho real del molde en cm.
 * La vista es de frente y un poco desde arriba (~30°): los círculos
 * horizontales se aplastan a la mitad en vertical.
 */

export interface MoldArtSpec {
  /** Altura del dibujo (unidades) para encuadrar. */
  height: number;
  /** Dónde va la mecha si es vela. */
  wickY: number;
  /** Distancia del borde inferior al centro de la huella (para asentarlo). */
  footY: number;
  render: (p: { color: string; uid: string }) => ReactNode;
}

/** Repite una forma plana varias veces hacia abajo para simular grosor. */
function extrude(shape: (fill: string, stroke?: string) => ReactNode, color: string, depth: number, step = 1.5) {
  const layers: ReactNode[] = [];
  for (let off = depth; off > 0; off -= step) {
    const t = off / depth;
    layers.push(
      <g key={off} transform={`translate(0 ${off})`}>
        {shape(mix(darken(color, 0.32), darken(color, 0.12), 1 - t))}
      </g>,
    );
  }
  return layers;
}

/* ---------------------------- Margarita --------------------------- */
const margarita: MoldArtSpec = {
  height: 70,
  wickY: -40,
  footY: 25,
  render: ({ color, uid }) => {
    const petals = (fill: string, stroke?: string) => (
      <g transform="scale(1 0.5)">
        {Array.from({ length: 13 }, (_, i) => {
          const a = (i * 360) / 13;
          return (
            <ellipse
              key={i}
              cx={29}
              cy={0}
              rx={21}
              ry={9.5}
              transform={`rotate(${a})`}
              fill={fill}
              stroke={stroke}
              strokeWidth={stroke ? 1.2 : 0}
            />
          );
        })}
      </g>
    );
    return (
      <g transform="translate(0 -39)">
        <defs>
          <radialGradient id={`${uid}-c`} cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor={lighten(color, 0.35)} />
            <stop offset="1" stopColor={darken(color, 0.15)} />
          </radialGradient>
        </defs>
        {extrude(petals, color, 13)}
        {petals(`url(#${uid}-c)`, darken(color, 0.18))}
        {/* veta central de cada pétalo */}
        <g transform="scale(1 0.5)" opacity={0.35}>
          {Array.from({ length: 13 }, (_, i) => (
            <line key={i} x1={14} x2={42} y1={0} y2={0} stroke={darken(color, 0.3)} strokeWidth={1.4} strokeLinecap="round" transform={`rotate(${(i * 360) / 13})`} />
          ))}
        </g>
        {/* centro abombado con puntitos */}
        <ellipse cx={0} cy={-2} rx={14} ry={8} fill={darken(color, 0.12)} />
        <ellipse cx={0} cy={-4} rx={13} ry={7} fill={lighten(color, 0.15)} />
        {Array.from({ length: 16 }, (_, i) => {
          const a = i * 2.4;
          const r = 2 + (i % 5) * 2.1;
          return <circle key={i} cx={Math.cos(a) * r} cy={-4 + Math.sin(a) * r * 0.5} r={1.2} fill={darken(color, 0.25)} opacity={0.6} />;
        })}
      </g>
    );
  },
};

/* --------------------------- Cempasúchil -------------------------- */
const cempasuchil: MoldArtSpec = {
  height: 110,
  wickY: -102,
  footY: 22,
  render: ({ color, uid }) => {
    const rings = 10;
    const blobs: ReactNode[] = [];
    for (let k = 0; k < rings; k++) {
      const t = k / (rings - 1);
      const r = 48 * Math.cos(t * (Math.PI / 2)) + 6;
      const cy = -24 - 72 * Math.sin(t * (Math.PI / 2));
      const n = Math.max(5, Math.round(r / 2.6));
      const items = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + k * 0.45;
        return { x: Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.5, front: Math.sin(a) };
      })
        .filter((p) => t > 0.35 || p.front > -0.35)
        .sort((a, b) => a.y - b.y);
      items.forEach((p, i) =>
        blobs.push(
          <path
            key={`${k}-${i}`}
            d={`M${p.x - 8},${p.y} q1,-7 4.5,-4.5 q2.5,-5 4.5,-1 q3,-4 4.5,1 q4,0 2.5,5.5 q-8,4.5 -16,-1z`}
            fill={mix(darken(color, 0.15), lighten(color, 0.3), Math.min(1, t + (i % 3) * 0.12))}
            stroke={darken(color, 0.28)}
            strokeWidth={1}
            strokeLinejoin="round"
          />,
        ),
      );
    }
    return (
      <g>
        <defs>
          <radialGradient id={`${uid}-d`} cx="0.45" cy="0.3" r="0.75">
            <stop offset="0" stopColor={lighten(color, 0.1)} />
            <stop offset="1" stopColor={darken(color, 0.3)} />
          </radialGradient>
        </defs>
        <ellipse cx={0} cy={-24} rx={52} ry={24} fill={darken(color, 0.3)} />
        <path d="M-54,-26 C-54,-80 -30,-104 0,-104 C30,-104 54,-80 54,-26 C40,-6 -40,-6 -54,-26z" fill={`url(#${uid}-d)`} />
        {blobs}
      </g>
    );
  },
};

/* ------------------------------ Rosa ------------------------------ */
const rosa: MoldArtSpec = {
  height: 90,
  wickY: -70,
  footY: 18,
  render: ({ color, uid }) => {
    const layer = (r: number, n: number, size: number, cy: number, rot: number, shade: number) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rot;
        return { a, x: Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.5, front: Math.sin(a) };
      })
        .sort((p, q) => p.front - q.front)
        .map((p, i) => {
          const deg = (p.a * 180) / Math.PI + 90;
          return (
            <g key={`${r}-${i}`} transform={`translate(${p.x} ${p.y}) rotate(${deg * 0.15})`}>
              <path
                d={`M${-size},${-size * 0.2} C${-size * 1.05},${-size * 1.5} ${size * 1.05},${-size * 1.5} ${size},${-size * 0.2} C${size * 0.7},${size * 0.6} ${-size * 0.7},${size * 0.6} ${-size},${-size * 0.2}z`}
                fill={`url(#${uid}-p)`}
                stroke={darken(color, 0.3 - shade)}
                strokeWidth={1.1}
              />
              <path d={`M${-size * 0.8},${-size * 0.25} Q0,${-size * 0.75} ${size * 0.8},${-size * 0.25}`} fill="none" stroke={lighten(color, 0.45)} strokeWidth={1.2} opacity={0.7} />
            </g>
          );
        });
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-p`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={lighten(color, 0.3)} />
            <stop offset="1" stopColor={darken(color, 0.15)} />
          </linearGradient>
        </defs>
        <ellipse cx={0} cy={-18} rx={48} ry={18} fill={darken(color, 0.3)} />
        {layer(34, 7, 20, -26, 0.3, 0)}
        {layer(21, 6, 17, -38, 1.1, 0.05)}
        {layer(10, 5, 13, -50, 2.2, 0.1)}
        <ellipse cx={0} cy={-66} rx={9} ry={6} fill={darken(color, 0.1)} />
        <path
          d="M-6,-66 c2,-5 10,-5 11,0 c1,4 -5,6 -8,3"
          fill="none"
          stroke={darken(color, 0.35)}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </g>
    );
  },
};

/* -------------------------- Copo de nieve ------------------------- */
const copo: MoldArtSpec = {
  height: 72,
  wickY: -40,
  footY: 25,
  render: ({ color, uid }) => {
    const arms = (c: string, extra: number) => (
      <g stroke={c} fill={c} strokeLinecap="round">
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 60 - 90})`}>
            <line x1={0} y1={0} x2={44} y2={0} strokeWidth={13 + extra} />
            <line x1={24} y1={0} x2={36} y2={-12} strokeWidth={8 + extra} />
            <line x1={24} y1={0} x2={36} y2={12} strokeWidth={8 + extra} />
          </g>
        ))}
        <circle r={17 + extra / 2} strokeWidth={0} />
      </g>
    );
    const flake = (fill: string, stroke?: string) => (
      <g transform="scale(1 0.5)">
        {stroke && arms(stroke, 2.6)}
        {arms(fill, 0)}
      </g>
    );
    return (
      <g transform="translate(0 -36)">
        <defs>
          <radialGradient id={`${uid}-s`} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" stopColor={lighten(color, 0.4)} />
            <stop offset="1" stopColor={mix(color, '#ffffff', 0.05)} />
          </radialGradient>
        </defs>
        {extrude((f) => flake(f), color, 11)}
        {flake(`url(#${uid}-s)`, darken(color, 0.2))}
        {/* brillo cristalino */}
        <g transform="scale(1 0.5)" opacity={0.55}>
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={6} x2={38} y1={0} y2={0} stroke={lighten(color, 0.7)} strokeWidth={2} strokeLinecap="round" transform={`rotate(${i * 60 - 90})`} />
          ))}
          <polygon points="0,-9 8,-4.5 8,4.5 0,9 -8,4.5 -8,-4.5" fill={lighten(color, 0.6)} />
        </g>
      </g>
    );
  },
};

/* ------------------------------ Pino ------------------------------ */
const pino: MoldArtSpec = {
  height: 168,
  wickY: -160,
  footY: 12,
  render: ({ color, uid }) => {
    const tiers = [
      { yb: -14, w: 100, h: 64 },
      { yb: -56, w: 80, h: 56 },
      { yb: -96, w: 58, h: 60 },
    ];
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-t`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={lighten(color, 0.25)} />
            <stop offset="0.55" stopColor={color} />
            <stop offset="1" stopColor={darken(color, 0.3)} />
          </linearGradient>
        </defs>
        <ellipse cx={0} cy={-10} rx={34} ry={10} fill={darken(color, 0.35)} />
        <ellipse cx={0} cy={-13} rx={32} ry={9} fill={darken(color, 0.15)} />
        {tiers.map(({ yb, w, h }, i) => (
          <g key={i}>
            <path
              d={`M${-w / 2},${yb} Q${-w / 4},${yb + 10} 0,${yb + 9} Q${w / 4},${yb + 10} ${w / 2},${yb} L${w * 0.06},${yb - h} Q0,${yb - h - 4} ${-w * 0.06},${yb - h} Z`}
              fill={`url(#${uid}-t)`}
              stroke={darken(color, 0.32)}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
            {/* textura de ramitas */}
            {Array.from({ length: 4 }, (_, j) => {
              const y = yb - h * (0.2 + j * 0.18);
              const half = (w / 2) * (1 - (yb - y) / h) * 0.75;
              return (
                <path key={j} d={`M${-half},${y + 3} Q0,${y + 8} ${half},${y + 3}`} fill="none" stroke={darken(color, 0.22)} strokeWidth={1} opacity={0.55} />
              );
            })}
          </g>
        ))}
      </g>
    );
  },
};

export const moldArt: Record<MoldArt, MoldArtSpec> = { margarita, cempasuchil, rosa, copo, pino };
