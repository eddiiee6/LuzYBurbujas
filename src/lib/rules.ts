import type { Catalog, ColorOption, Design, Mold, Plate, ProductType } from '../types';

/** Margen mínimo (cm) entre la orilla del molde y la orilla de la presentación. */
const MARGIN_CM = 0.2;

export type FitResult = { ok: true } | { ok: false; reason: string };

/**
 * Para qué productos se ofrece una presentación. Por defecto: contenedores
 * para velas, placas planas para jabones; cajitas y tarjetas para los dos.
 */
export function plateTypes(plate: Plate): ProductType[] {
  if (plate.forTypes?.length) return plate.forTypes;
  if (plate.kind === 'caja' || plate.kind === 'tarjeta') return ['vela', 'jabon'];
  return plate.kind === 'contenedor' ? ['vela'] : ['jabon'];
}

export const plateKindLabel: Record<Plate['kind'], string> = {
  plana: 'placa',
  contenedor: 'contenedor',
  caja: 'cajita',
  tarjeta: 'tarjeta',
};

/** ¿Esta presentación se ofrece para este tipo de producto? */
export function plateAllowsType(plate: Plate, type: ProductType): boolean {
  return plateTypes(plate).includes(type);
}

/** ¿Este molde, en este tipo (jabón/vela), se puede poner en esta presentación? */
export function plateFits(mold: Mold, plate: Plate, type: ProductType): FitResult {
  if (!plateAllowsType(plate, type)) return { ok: false, reason: `No disponible para ${type === 'vela' ? 'velas' : 'jabones'}` };
  if (plate.blockedMoldIds.includes(mold.id)) return { ok: false, reason: 'No disponible para este molde' };
  const space = Math.min(plate.lengthCm, plate.widthCm);
  if (space > 0 && mold.baseWidthCm + MARGIN_CM > space)
    return { ok: false, reason: `No cabe: el molde mide ${mold.baseWidthCm} cm y la presentación ${space} cm` };
  return { ok: true };
}

export function availableTypes(mold: Mold): ProductType[] {
  return (['jabon', 'vela'] as ProductType[]).filter((t) => typeof mold.prices[t] === 'number');
}

/** Colores que se le ofrecen al cliente para este molde. */
export function moldColors(colors: ColorOption[], mold: Mold): ColorOption[] {
  const active = colors.filter((c) => c.active);
  const allowed = mold.allowedColorIds?.length ? active.filter((c) => mold.allowedColorIds!.includes(c.id)) : active;
  return allowed.length ? allowed : active;
}

export const typeLabel: Record<ProductType, string> = { jabon: 'Jabón', vela: 'Vela' };

export function designPrice(c: Catalog, d: Design): number {
  const mold = c.molds.find((m) => m.id === d.moldId);
  const plate = d.plateId ? c.plates.find((p) => p.id === d.plateId) : undefined;
  return (mold?.prices[d.type] ?? 0) + (plate?.price ?? 0);
}

export const money = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
