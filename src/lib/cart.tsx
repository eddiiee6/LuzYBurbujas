import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Arrangement, ArrangementItem, ArrangementPiece, CartItem, Catalog, Design, DesignItem } from '../types';
import { designPrice, money, typeLabel } from './rules';
import { photosFor } from './gallery';

const LS_KEY = 'lyb.cart.v1';

interface CartState {
  items: CartItem[];
  add: (d: Design, qty?: number) => void;
  addArrangement: (a: Omit<ArrangementItem, 'id' | 'kind' | 'qty'>, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
}

const Ctx = createContext<CartState | null>(null);

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      /* sin almacenamiento: el pedido vive solo en esta pestaña */
    }
  }, [items]);

  const add = useCallback((d: Design, qty = 1) => {
    setItems((prev) => {
      const same = prev.find(
        (i): i is DesignItem =>
          isDesign(i) &&
          i.moldId === d.moldId &&
          i.type === d.type &&
          i.colorId === d.colorId &&
          i.plateId === d.plateId &&
          i.essenceId === d.essenceId,
      );
      if (same) return prev.map((i) => (i === same ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { ...d, id: crypto.randomUUID(), qty }];
    });
  }, []);

  const addArrangement = useCallback((a: Omit<ArrangementItem, 'id' | 'kind' | 'qty'>, qty = 1) => {
    setItems((prev) => {
      const same = prev.find(
        (i): i is ArrangementItem =>
          !isDesign(i) &&
          i.arrangementId === a.arrangementId &&
          i.colors === a.colors &&
          i.essenceId === a.essenceId &&
          JSON.stringify(i.pieces ?? []) === JSON.stringify(a.pieces ?? []),
      );
      if (same) return prev.map((i) => (i === same ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { ...a, kind: 'arreglo', id: crypto.randomUUID(), qty }];
    });
  }, []);

  const setQty = useCallback(
    (id: string, qty: number) =>
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(999, qty)) } : i))),
    [],
  );
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, add, addArrangement, setQty, remove, clear, count: items.reduce((s, i) => s + i.qty, 0) }),
    [items, add, addArrangement, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCart fuera de CartProvider');
  return v;
}

/** Texto legible de un diseño, para el pedido y WhatsApp. */
export function describeDesign(c: Catalog, d: Design): string[] {
  const mold = c.molds.find((m) => m.id === d.moldId);
  const color = c.colors.find((x) => x.id === d.colorId);
  const plate = d.plateId ? c.plates.find((p) => p.id === d.plateId) : undefined;
  const essence = d.essenceId ? c.essences.find((e) => e.id === d.essenceId) : undefined;
  const lines = [`${typeLabel[d.type]} ${mold?.name ?? '¿?'} · color ${color?.name.toLowerCase() ?? '¿?'}`];
  lines.push(plate ? plate.name : 'Sin placa');
  // Combinación sin foto real: se puede pedir, pero conviene confirmar cómo queda.
  if (mold && !photosFor(mold, d.plateId, d.type).length) lines.push('(sin foto, confirmar por WhatsApp)');
  lines.push(`Esencia: ${essence?.name ?? 'sin aroma'}`);
  return lines;
}

/** Los pedidos guardados antes de existir los arreglos no tienen "kind": son diseños. */
export function isDesign(i: CartItem): i is DesignItem {
  return i.kind !== 'arreglo';
}

/** ¿El artículo sigue existiendo en el catálogo? */
export function itemExists(c: Catalog, i: CartItem): boolean {
  return isDesign(i) ? c.molds.some((m) => m.id === i.moldId) : c.arrangements.some((a) => a.id === i.arrangementId);
}

/** Precio por pieza de un arreglo, con mayoreo (p. ej. −$10 c/u desde 5). */
export function arrangementUnitPrice(c: Catalog, a: Arrangement | undefined, qty: number): number {
  if (!a) return 0;
  const min = c.settings.wholesaleMinQty ?? 0;
  const off = c.settings.wholesaleDiscount ?? 0;
  return min > 0 && off > 0 && qty >= min ? Math.max(0, a.price - off) : a.price;
}

export function itemPrice(c: Catalog, i: CartItem): number {
  return isDesign(i) ? designPrice(c, i) : arrangementUnitPrice(c, c.arrangements.find((a) => a.id === i.arrangementId), i.qty);
}

/** "2 × Jabón Rosa, 1 × Vela Pino, 1 a elección" */
export function describePieces(c: Catalog, pieces: ArrangementPiece[]): string {
  const counts = new Map<string, number>();
  for (const p of pieces) {
    const mold = p.moldId ? c.molds.find((m) => m.id === p.moldId) : undefined;
    const label = mold ? `${p.type ? typeLabel[p.type] : 'Jabón o vela'} ${mold.name}` : 'a elección de Lulú';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([label, n]) => `${n} × ${label}`).join(', ');
}

/** Texto legible de cualquier artículo del pedido. */
export function describeItem(c: Catalog, i: CartItem): string[] {
  if (isDesign(i)) return describeDesign(c, i);
  const a = c.arrangements.find((x) => x.id === i.arrangementId);
  const essence = i.essenceId ? c.essences.find((e) => e.id === i.essenceId) : undefined;
  const lines = [`Arreglo ${a?.name ?? '¿?'}`];
  if (i.pieces?.length) lines.push(`Piezas: ${describePieces(c, i.pieces)}`);
  lines.push(i.colors.trim() ? `Colores: ${i.colors.trim()}` : 'Colores como en la foto');
  lines.push(`Esencia: ${essence?.name ?? 'sin aroma'}`);
  return lines;
}

export interface Customer {
  name: string;
  date: string;
  notes: string;
}

export function whatsappLink(c: Catalog, items: CartItem[], customer: Customer): string {
  const total = items.reduce((s, i) => s + itemPrice(c, i) * i.qty, 0);
  const parts: string[] = [`¡Hola ${c.settings.businessName}! 🌸 Quiero hacer este pedido:`, ''];
  items.forEach((it, n) => {
    const [first, ...rest] = describeItem(c, it);
    parts.push(`${n + 1}. ${it.qty} × ${first}`);
    rest.forEach((l) => parts.push(`   ${l}`));
    const wholesale = !isDesign(it) && (c.settings.wholesaleMinQty ?? 0) > 0 && it.qty >= (c.settings.wholesaleMinQty ?? 0);
    parts.push(`   ${money(itemPrice(c, it))} c/u${wholesale ? ' (precio de mayoreo)' : ''}`);
  });
  parts.push('', `Total aproximado: ${money(total)}`);
  if (customer.name.trim()) parts.push(`Nombre: ${customer.name.trim()}`);
  if (customer.date) parts.push(`Lo necesito para: ${customer.date}`);
  if (customer.notes.trim()) parts.push(`Notas: ${customer.notes.trim()}`);
  return `https://wa.me/${c.settings.whatsapp}?text=${encodeURIComponent(parts.join('\n'))}`;
}

export function whatsappHello(c: Catalog, text = '¡Hola! Me interesan sus velas y jabones 🌸') {
  return `https://wa.me/${c.settings.whatsapp}?text=${encodeURIComponent(text)}`;
}
