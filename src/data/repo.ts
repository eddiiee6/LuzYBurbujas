import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Catalog, EntityKind, Settings } from '../types';
import { seedCatalog } from './seed';
import { blobToDataUrl } from '../lib/image';

/**
 * Capa de datos. El resto del sitio solo habla con esta interfaz, así que da
 * igual si el catálogo vive en el navegador (modo local) o en Supabase.
 */
export interface Repo {
  mode: 'local' | 'supabase';
  load(): Promise<Catalog>;
  saveItem<K extends EntityKind>(kind: K, item: Catalog[K][number]): Promise<void>;
  deleteItem(kind: EntityKind, id: string): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  /** Reemplaza todo el catálogo (importar respaldo o cargar datos iniciales). */
  replaceAll(catalog: Catalog): Promise<void>;
  uploadImage(file: Blob, name: string): Promise<string>;
  // Sesión del panel de administración
  getUser(): Promise<string | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const KINDS: EntityKind[] = ['collections', 'molds', 'plates', 'essences', 'colors'];

function sortByOrder<T>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => ((a as { order?: number }).order ?? 0) - ((b as { order?: number }).order ?? 0),
  );
}

/* ------------------------------------------------------------------ */
/* Modo local: datos iniciales + cambios guardados en localStorage     */
/* ------------------------------------------------------------------ */

const LS_KEY = 'lyb.catalog.v1';

function readLocal(): Catalog {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...structuredClone(seedCatalog), ...JSON.parse(raw) } as Catalog;
  } catch {
    /* almacenamiento bloqueado o dañado: usamos los datos iniciales */
  }
  return structuredClone(seedCatalog);
}

function writeLocal(catalog: Catalog) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(catalog));
  } catch (e) {
    throw new Error(
      'No se pudo guardar en este navegador (¿imágenes muy pesadas?). Conecta Supabase para guardar fotos.',
      { cause: e },
    );
  }
}

const localRepo: Repo = {
  mode: 'local',
  async load() {
    return readLocal();
  },
  async saveItem(kind, item) {
    const c = readLocal();
    const list = c[kind] as { id: string }[];
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item;
    else list.push(item);
    writeLocal(c);
  },
  async deleteItem(kind, id) {
    const c = readLocal();
    (c[kind] as { id: string }[]) = (c[kind] as { id: string }[]).filter((x) => x.id !== id);
    writeLocal(c);
  },
  async saveSettings(settings) {
    const c = readLocal();
    c.settings = settings;
    writeLocal(c);
  },
  async replaceAll(catalog) {
    writeLocal(catalog);
  },
  async uploadImage(file) {
    return blobToDataUrl(file);
  },
  async getUser() {
    return 'modo-local';
  },
  async signIn() {},
  async signOut() {},
};

/* ------------------------------------------------------------------ */
/* Supabase: tabla catalog_items (kind, id, data, sort)                */
/* ------------------------------------------------------------------ */

function supabaseRepo(sb: SupabaseClient): Repo {
  const BUCKET = 'catalogo';
  return {
    mode: 'supabase',
    async load() {
      const { data, error } = await sb.from('catalog_items').select('kind,id,data');
      if (error) throw error;
      if (!data || data.length === 0) return structuredClone(seedCatalog);
      const c: Catalog = {
        collections: [],
        molds: [],
        plates: [],
        essences: [],
        colors: [],
        settings: structuredClone(seedCatalog.settings),
      };
      for (const row of data) {
        if (row.kind === 'settings') c.settings = { ...c.settings, ...row.data };
        else if ((KINDS as string[]).includes(row.kind))
          (c[row.kind as EntityKind] as unknown[]).push(row.data);
      }
      return c;
    },
    async saveItem(kind, item) {
      const { error } = await sb.from('catalog_items').upsert({
        kind,
        id: item.id,
        data: item,
        sort: (item as { order?: number }).order ?? 0,
      });
      if (error) throw error;
    },
    async deleteItem(kind, id) {
      const { error } = await sb.from('catalog_items').delete().match({ kind, id });
      if (error) throw error;
    },
    async saveSettings(settings) {
      const { error } = await sb
        .from('catalog_items')
        .upsert({ kind: 'settings', id: 'main', data: settings, sort: 0 });
      if (error) throw error;
    },
    async replaceAll(catalog) {
      const rows: { kind: string; id: string; data: unknown; sort: number }[] = KINDS.flatMap((kind) =>
        (catalog[kind] as { id: string; order?: number }[]).map((item) => ({
          kind,
          id: item.id,
          data: item,
          sort: item.order ?? 0,
        })),
      );
      rows.push({ kind: 'settings', id: 'main', data: catalog.settings, sort: 0 });
      const del = await sb.from('catalog_items').delete().neq('kind', '__none__');
      if (del.error) throw del.error;
      const { error } = await sb.from('catalog_items').insert(rows);
      if (error) throw error;
    },
    async uploadImage(file, name) {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const safe = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
      const path = `${safe}-${Date.now()}.${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
    async getUser() {
      const { data } = await sb.auth.getUser();
      return data.user?.email ?? null;
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Correo o contraseña incorrectos');
    },
    async signOut() {
      await sb.auth.signOut();
    },
  };
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const repo: Repo = url && key ? supabaseRepo(createClient(url, key)) : localRepo;

export function normalize(c: Catalog): Catalog {
  return {
    ...c,
    collections: sortByOrder(c.collections),
    molds: sortByOrder(c.molds),
    plates: sortByOrder(c.plates),
    essences: sortByOrder(c.essences),
    colors: sortByOrder(c.colors),
  };
}

/** Traduce errores técnicos (Supabase, red) a mensajes claros. */
export function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);
  const m = raw.toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied') || m.includes('unauthorized'))
    return 'Tu usuario no tiene permiso para editar. Revisa que tu correo esté en la tabla "admins" de Supabase.';
  if (m.includes('jwt') || m.includes('session')) return 'Tu sesión expiró. Sal y vuelve a entrar.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión con la base de datos. Revisa tu internet e intenta de nuevo.';
  if (m.includes('bucket not found')) return 'Falta el espacio de fotos "catalogo" en Supabase. Vuelve a ejecutar schema.sql.';
  if (m.includes('payload too large') || m.includes('exceeded')) return 'La foto es demasiado pesada.';
  return raw || 'Algo salió mal';
}

/** Lee un respaldo .json y revisa que de verdad sea un catálogo. */
export function parseBackup(text: string): Catalog {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un respaldo válido.');
  }
  const c = data as Partial<Catalog>;
  if (!c || !Array.isArray(c.molds) || !Array.isArray(c.plates) || !c.settings)
    throw new Error('El archivo no parece un respaldo del catálogo.');
  return normalize({ ...structuredClone(seedCatalog), ...c } as Catalog);
}

/**
 * Los respaldos hechos en modo local traen las fotos dentro del archivo
 * (data:...). Antes de guardarlos en Supabase, cada foto se sube al
 * almacenamiento y se reemplaza por su enlace.
 */
export async function uploadEmbeddedPhotos(c: Catalog, onProgress?: (done: number, total: number) => void): Promise<Catalog> {
  if (repo.mode !== 'supabase') return c;
  const items = [...c.molds, ...c.plates].filter((x) => x.photo?.startsWith('data:'));
  let done = 0;
  onProgress?.(done, items.length);
  for (const item of items) {
    const blob = await (await fetch(item.photo!)).blob();
    item.photo = await repo.uploadImage(blob, item.id);
    onProgress?.(++done, items.length);
  }
  return c;
}
