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

/**
 * Recoloreado que conserva luces y sombras (como "colorear" en un editor de fotos):
 * la foto se pasa a escala de grises y cada nivel de gris se convierte en un tono
 * del color elegido. El brillo promedio de la foto (`mid`) queda exactamente en el
 * color elegido; lo más oscuro tiende a sombra y lo más claro a brillo.
 * Devuelve las tablas para feFuncR/G/B de un feComponentTransfer.
 */
export function colorizeTables(hex: string, mid = 0.55): [string, string, string] {
  const m = Math.min(0.85, Math.max(0.15, mid));
  const steps = 16;
  return parse(hex).map((v) => {
    const c = v / 255;
    const vals: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const out = t <= m ? c * (0.18 + 0.82 * (t / m)) : c + (1 - c) * 0.7 * ((t - m) / (1 - m));
      vals.push(out.toFixed(3));
    }
    return vals.join(' ');
  }) as [string, string, string];
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
