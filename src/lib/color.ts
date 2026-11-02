/** Utilidades de color para sombrear las ilustraciones. */

function parse(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function mix(a: string, b: string, t: number) {
  const A = parse(a);
  const B = parse(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
export const darken = (c: string, t: number) => mix(c, '#2a1414', t);

/** Valores 0..1 para un filtro feColorMatrix que tiñe una foto clara. */
export function tintMatrix(hex: string) {
  const [r, g, b] = parse(hex).map((v) => v / 255);
  // Multiplica la luminancia de la foto por el color elegido.
  return [
    `${0.299 * r} ${0.587 * r} ${0.114 * r} 0 0`,
    `${0.299 * g} ${0.587 * g} ${0.114 * g} 0 0`,
    `${0.299 * b} ${0.587 * b} ${0.114 * b} 0 0`,
    '0 0 0 1 0',
  ].join(' ');
}

/** Generador pseudoaleatorio con semilla: el marmoleado no "salta" al redibujar. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
