import type { Catalog, ColorOption, Design, Mold, Plate, ProductType } from '../types';

/** Margen mínimo (cm) entre la orilla del molde y la orilla de la placa. */
const MARGIN_CM = 0.2;

export type FitResult = { ok: true } | { ok: false; reason: string };

/** ¿Este molde, en este tipo (jabón/vela), se puede poner en esta placa? */
export function plateFits(mold: Mold, plate: Plate, type: ProductType): FitResult {
  if (plate.kind === 'contenedor' && type !== 'vela')
    return { ok: false, reason: 'Solo para velas (la cera va dentro)' };
  if (plate.blockedMoldIds.includes(mold.id)) return { ok: false, reason: 'No disponible para este molde' };
  const space = Math.min(plate.lengthCm, plate.widthCm);
  if (mold.baseWidthCm + MARGIN_CM > space)
    return { ok: false, reason: `No cabe: el molde mide ${mold.baseWidthCm} cm y la placa ${space} cm` };
  return { ok: true };
}

export function availableTypes(mold: Mold): ProductType[] {
  return (['jabon', 'vela'] as ProductType[]).filter((t) => typeof mold.prices[t] === 'number');
}

/** Colores que se le ofrecen al cliente para este molde. */
export function moldColors(colors: ColorOption[], mold: Mold): ColorOption[] {
  const active = colors.filter((c) => c.active);
  // Foto que no se puede recolorear: solo existe en el color de la foto.
  if (mold.photo && !mold.photoTintable) {
    const own = active.filter((c) => c.id === mold.photoColorId);
    return own.length ? own : active.filter((c) => c.id === mold.defaultColorId);
  }
  const allowed = mold.allowedColorIds?.length ? active.filter((c) => mold.allowedColorIds!.includes(c.id)) : active;
  return allowed.length ? allowed : active;
}

/** Colores para recolorear una placa con foto (independientes de los de la vela). */
export function plateColors(colors: ColorOption[], plate: Plate): ColorOption[] {
  if (!plate.photo || !plate.photoTintable) return [];
  const active = colors.filter((c) => c.active);
  const allowed = plate.photoColorIds?.length ? active.filter((c) => plate.photoColorIds!.includes(c.id)) : active;
  return allowed.length ? allowed : active;
}

/** Color con el que se muestra el molde en tarjetas y miniaturas. */
export function displayColorId(mold: Mold): string {
  return mold.photo && mold.photoColorId ? mold.photoColorId : mold.defaultColorId;
}

export const typeLabel: Record<ProductType, string> = { jabon: 'Jabón', vela: 'Vela' };

export function designPrice(c: Catalog, d: Design): number {
  const mold = c.molds.find((m) => m.id === d.moldId);
  const plate = d.plateId ? c.plates.find((p) => p.id === d.plateId) : undefined;
  return (mold?.prices[d.type] ?? 0) + (plate?.price ?? 0);
}

export const money = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

/** Nombre del color de veta, para el mensaje de WhatsApp. */
export function veinName(hex: string | null): string {
  if (!hex) return '';
  const names: Record<string, string> = {
    '#f29bb8': 'rosa',
    '#8fb8e8': 'azul',
    '#c4a3e3': 'lila',
    '#f3cf6b': 'amarillo',
    '#8fd1b9': 'verde agua',
  };
  return names[hex.toLowerCase()] ?? hex;
}
