import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, Catalog, Design } from '../types';
import { designPrice, money, typeLabel, veinName } from './rules';

const LS_KEY = 'lyb.cart.v1';

interface CartState {
  items: CartItem[];
  add: (d: Design, qty?: number) => void;
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
        (i) =>
          i.moldId === d.moldId &&
          i.type === d.type &&
          i.colorId === d.colorId &&
          i.plateId === d.plateId &&
          i.veinColor === d.veinColor &&
          i.essenceId === d.essenceId,
      );
      if (same) return prev.map((i) => (i === same ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { ...d, id: crypto.randomUUID(), qty }];
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
    () => ({ items, add, setQty, remove, clear, count: items.reduce((s, i) => s + i.qty, 0) }),
    [items, add, setQty, remove, clear],
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
  if (plate) lines.push(`${plate.name}${d.veinColor ? ` · vetas ${veinName(d.veinColor)}` : ''}`);
  else lines.push('Sin placa');
  lines.push(`Esencia: ${essence?.name ?? 'sin aroma'}`);
  return lines;
}

export interface Customer {
  name: string;
  date: string;
  notes: string;
}

export function whatsappLink(c: Catalog, items: CartItem[], customer: Customer): string {
  const total = items.reduce((s, i) => s + designPrice(c, i) * i.qty, 0);
  const parts: string[] = [`¡Hola ${c.settings.businessName}! 🌸 Quiero hacer este pedido:`, ''];
  items.forEach((it, n) => {
    const [first, ...rest] = describeDesign(c, it);
    parts.push(`${n + 1}. ${it.qty} × ${first}`);
    rest.forEach((l) => parts.push(`   ${l}`));
    parts.push(`   ${money(designPrice(c, it))} c/u`);
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
