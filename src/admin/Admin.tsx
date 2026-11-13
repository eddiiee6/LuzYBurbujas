import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../data/CatalogContext';
import { friendlyError, parseBackup, repo, uploadEmbeddedPhotos } from '../data/repo';
import { seedCatalog } from '../data/seed';
import type { Catalog, EntityKind, Settings } from '../types';
import { CollectionEditor, ColorEditor, EssenceEditor, MoldEditor, PlateEditor, ArrangementEditor } from './editors';
import { Field, Text } from './fields';

type Tab = EntityKind | 'settings' | 'backup';

const TABS: { id: Tab; label: string }[] = [
  { id: 'molds', label: 'Moldes' },
  { id: 'arrangements', label: 'Arreglos' },
  { id: 'plates', label: 'Placas' },
  { id: 'colors', label: 'Colores' },
  { id: 'essences', label: 'Esencias' },
  { id: 'collections', label: 'Colecciones' },
  { id: 'settings', label: 'Ajustes' },
  { id: 'backup', label: 'Respaldo' },
];

const uid = () => Math.random().toString(36).slice(2, 8);

/** Plantillas para "+ Nuevo". */
function blank(kind: EntityKind, c: Catalog): Catalog[EntityKind][number] {
  const order = (c[kind] as { order?: number }[]).reduce((m, x) => Math.max(m, x.order ?? 0), 0) + 1;
  switch (kind) {
    case 'arrangements':
      return {
        id: `arreglo-${uid()}`,
        slug: '',
        name: 'Nuevo arreglo',
        description: '',
        includes: [],
        price: 0,
        photos: [],
        customColors: true,
        active: false,
        order,
      };
    case 'molds':
      return {
        id: `molde-${uid()}`,
        slug: '',
        name: 'Nuevo molde',
        description: '',
        collectionId: c.collections[0]?.id ?? '',
        art: 'margarita',
        baseWidthCm: 5,
        heightCm: 2,
        prices: { jabon: 10, vela: 20 },
        defaultColorId: c.colors[0]?.id ?? '',
        active: false,
        order,
      };
    case 'plates':
      return {
        id: `placa-${uid()}`,
        name: 'Nueva placa',
        description: '',
        shape: 'ovalada',
        kind: 'plana',
        size: 'grande',
        lengthCm: 9,
        widthCm: 6,
        heightCm: 0.7,
        price: 10,
        veinColors: ['#f29bb8'],
        blockedMoldIds: [],
        active: false,
        order,
      };
    case 'colors':
      return { id: `color-${uid()}`, name: 'Nuevo color', hex: '#f5a3c0', active: true, order };
    case 'essences':
      return { id: `esencia-${uid()}`, name: 'Nueva esencia', description: '', color: '#c3a4e6', active: true, order };
    case 'collections':
      return {
        id: `coleccion-${uid()}`,
        name: 'Nueva colección',
        description: '',
        theme: { bg: '#fde8f0', bg2: '#f3e3fb', accent: '#e5487f' },
        order,
      };
  }
}

export default function Admin() {
  const [user, setUser] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    repo.getUser().then(setUser);
  }, []);

  if (user === undefined) return <main className="section container">Cargando…</main>;
  if (!user) return <Login onDone={setUser} />;
  return <Panel user={user} onSignOut={() => repo.signOut().then(() => setUser(null))} />;
}

function Login({ onDone }: { onDone: (u: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <main className="section container">
      <form
        className="card login"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try {
            await repo.signIn(email, password);
            onDone((await repo.getUser()) ?? email);
          } catch (x) {
            setErr(x instanceof Error ? x.message : 'No se pudo entrar');
          }
        }}
      >
        <h1 className="title-script">Administrar</h1>
        <Field label="Correo">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </Field>
        <Field label="Contraseña">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        {err && <p className="warn">{err}</p>}
        <button className="btn primary wide">Entrar</button>
      </form>
    </main>
  );
}

function Panel({ user, onSignOut }: { user: string; onSignOut: () => void }) {
  const { catalog, reload } = useCatalog();
  const [tab, setTab] = useState<Tab>('molds');

  return (
    <main className="section container admin">
      <div className="admin-head">
        <h1 className="title-script">Administrar</h1>
        <div className="admin-user">
          {repo.mode === 'local' ? (
            <span className="pill warn">Modo local: los cambios se guardan solo en este navegador</span>
          ) : (
            <>
              <span className="pill ok">✓ Conectado a la base de datos · {user}</span>
              <button type="button" className="link-btn" onClick={onSignOut}>
                Salir
              </button>
            </>
          )}
          <Link to="/personaliza" className="btn ghost small">
            Ver personalizador
          </Link>
        </div>
      </div>
      <nav className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'settings' ? (
        <SettingsForm settings={catalog.settings} onSaved={reload} />
      ) : tab === 'backup' ? (
        <Backup catalog={catalog} onDone={reload} />
      ) : (
        <ListEditor key={tab} kind={tab} catalog={catalog} onSaved={reload} />
      )}
    </main>
  );
}

function ListEditor({ kind, catalog, onSaved }: { kind: EntityKind; catalog: Catalog; onSaved: () => Promise<void> }) {
  const list = catalog[kind] as unknown as ({ id: string; name: string; active?: boolean } & Record<string, unknown>)[];
  const [draft, setDraft] = useState<Record<string, unknown> | null>(() => (list[0] ? structuredClone(list[0]) : null));
  const [msg, setMsg] = useState<string | null>(null);
  const isNew = draft ? !list.some((x) => x.id === draft.id) : false;

  const save = async () => {
    if (!draft) return;
    try {
      await repo.saveItem(kind, draft as never);
      await onSaved();
      setMsg('✓ Guardado');
    } catch (e) {
      setMsg('⚠️ ' + friendlyError(e));
    }
  };
  const remove = async () => {
    if (!draft || !confirm(`¿Eliminar "${draft.name as string}"?`)) return;
    try {
      await repo.deleteItem(kind, draft.id as string);
      await onSaved();
      setDraft(null);
      setMsg('Eliminado');
    } catch (e) {
      setMsg('⚠️ ' + friendlyError(e));
    }
  };

  const set = (patch: Record<string, unknown>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setMsg(null);
  };

  let editor: ReactNode = null;
  if (draft) {
    const props = { item: draft as never, set: set as never, catalog };
    editor =
      kind === 'molds' ? (
        <MoldEditor {...props} />
      ) : kind === 'plates' ? (
        <PlateEditor {...props} />
      ) : kind === 'colors' ? (
        <ColorEditor {...props} />
      ) : kind === 'essences' ? (
        <EssenceEditor {...props} />
      ) : kind === 'arrangements' ? (
        <ArrangementEditor {...props} />
      ) : (
        <CollectionEditor {...props} />
      );
  }

  return (
    <div className="admin-body">
      <aside className="admin-list">
        <button
          type="button"
          className="btn primary small wide"
          onClick={() => {
            setDraft(structuredClone(blank(kind, catalog)) as never);
            setMsg(null);
          }}
        >
          + Nuevo
        </button>
        <ul>
          {list.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                aria-pressed={draft?.id === x.id}
                onClick={() => {
                  setDraft(structuredClone(x));
                  setMsg(null);
                }}
              >
                {'hex' in x && <i className="dot" style={{ background: x.hex as string }} />}
                {x.name}
                {x.active === false && <small> · oculto</small>}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="admin-editor card">
        {draft ? (
          <>
            {editor}
            <div className="admin-actions">
              <button type="button" className="btn primary" onClick={save}>
                {isNew ? 'Crear' : 'Guardar cambios'}
              </button>
              {!isNew && (
                <button type="button" className="btn ghost danger" onClick={remove}>
                  Eliminar
                </button>
              )}
              {msg && <span className="admin-msg">{msg}</span>}
            </div>
          </>
        ) : (
          <p className="muted">Elige un elemento de la lista o crea uno nuevo.</p>
        )}
      </section>
    </div>
  );
}

function SettingsForm({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className="card admin-editor">
      <div className="editor-fields">
        <Field label="Nombre del negocio">
          <Text value={s.businessName} onChange={(businessName) => setS({ ...s, businessName })} />
        </Field>
        <Field label="Frase">
          <Text value={s.tagline} onChange={(tagline) => setS({ ...s, tagline })} />
        </Field>
        <Field label="WhatsApp" hint="Con lada de país, solo números. México = 52 + 10 dígitos. Ej. 525513555143">
          <Text value={s.whatsapp} onChange={(v) => setS({ ...s, whatsapp: v.replace(/\D/g, '') })} />
        </Field>
        <Field label="Instagram (enlace)">
          <Text value={s.instagram ?? ''} onChange={(instagram) => setS({ ...s, instagram })} placeholder="https://instagram.com/…" />
        </Field>
        <Field label="Facebook (enlace)">
          <Text value={s.facebook ?? ''} onChange={(facebook) => setS({ ...s, facebook })} placeholder="https://facebook.com/…" />
        </Field>
      </div>
      <div className="admin-actions">
        <button
          type="button"
          className="btn primary"
          onClick={async () => {
            try {
              await repo.saveSettings(s);
              await onSaved();
              setMsg('✓ Guardado');
            } catch (e) {
              setMsg('⚠️ ' + friendlyError(e));
            }
          }}
        >
          Guardar
        </button>
        {msg && <span className="admin-msg">{msg}</span>}
      </div>
    </section>
  );
}

function Backup({ catalog, onDone }: { catalog: Catalog; onDone: () => Promise<void> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      await onDone();
      setMsg(ok);
    } catch (e) {
      setMsg('⚠️ ' + friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card admin-editor backup">
      <h2>Respaldo del catálogo</h2>
      <p className="muted">Descarga una copia de todo el catálogo o restaura una copia anterior.</p>
      <div className="admin-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' }));
            a.download = `catalogo-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
          }}
        >
          ⬇︎ Descargar respaldo
        </button>
        <label className="btn ghost">
          ⬆︎ Restaurar respaldo
          <input
            type="file"
            accept=".json,application/json"
            hidden
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f || !confirm('Esto reemplaza TODO el catálogo actual. ¿Continuar?')) return;
              await run(async () => {
                const c = parseBackup(await f.text());
                await uploadEmbeddedPhotos(c, (done, total) => total && setMsg(`Subiendo fotos… ${done} de ${total}`));
                setMsg('Guardando catálogo…');
                await repo.replaceAll(c);
              }, '✓ Catálogo restaurado');
            }}
          />
        </label>
        <button
          type="button"
          className="btn ghost danger"
          disabled={busy}
          onClick={() =>
            confirm('¿Volver al catálogo inicial? Se pierden los cambios.') &&
            run(() => repo.replaceAll(structuredClone(seedCatalog)), '✓ Catálogo inicial cargado')
          }
        >
          {repo.mode === 'supabase' ? 'Cargar catálogo inicial en la base de datos' : 'Volver al catálogo inicial'}
        </button>
      </div>
      {msg && <p className="admin-msg">{msg}</p>}
    </section>
  );
}
