import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Catalog } from '../types';
import { friendlyError, normalize, repo } from './repo';
import { seedCatalog } from './seed';

interface CatalogState {
  catalog: Catalog;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const Ctx = createContext<CatalogState | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(() => normalize(seedCatalog));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setCatalog(normalize(await repo.load()));
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ catalog, loading, error, reload }), [catalog, loading, error, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCatalog fuera de CatalogProvider');
  return v;
}

/** Atajos para buscar por id en el catálogo actual. */
export function useLookup() {
  const { catalog } = useCatalog();
  return useMemo(() => {
    const by = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
    return {
      mold: by(catalog.molds),
      plate: by(catalog.plates),
      essence: by(catalog.essences),
      color: by(catalog.colors),
      collection: by(catalog.collections),
    };
  }, [catalog]);
}
