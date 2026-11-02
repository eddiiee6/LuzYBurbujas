import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Catalog, EntityKind, Settings } from '../types';
import { seedCatalog } from './seed';

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

/** Reduce la imagen y la convierte a WebP para que no pese tanto. */
async function blobToCompressedDataUrl(file: Blob, max = 700): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.85);
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
    return blobToCompressedDataUrl(file);
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
