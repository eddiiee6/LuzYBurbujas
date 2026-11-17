import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../data/CatalogContext';
import { availableTypes, money, typeLabel } from '../lib/rules';
import type { GalleryPhoto, Mold, Plate, ProductType } from '../types';
import { FitPhoto } from './FitPhoto';
import { PhotoPending } from './PhotoPending';

interface Slide {
  mold: Mold;
  type: ProductType;
  plate: Plate | null;
  /** Foto real (la primera de la galería del molde). */
  photo?: GalleryPhoto;
}

const EVERY_MS = 4500;

/**
 * Portada: muestra los productos que ya tienen foto real, uno tras otro (los
 * destacados primero). Si todavía ningún molde tiene foto, muestra el primero
 * con el recuadro "Foto en preparación".
 */
export function HeroShowcase() {
  const { catalog } = useCatalog();

  const slides = useMemo<Slide[]>(() => {
    const molds = catalog.molds.filter((m) => m.active);
    const withPhoto: Slide[] = molds
      .filter((m) => m.gallery?.length)
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
      .map((mold) => {
        const photo = mold.gallery![0];
        const types = availableTypes(mold);
        const type: ProductType = photo.type ?? (types.includes('vela') ? 'vela' : (types[0] ?? 'jabon'));
        const plate = photo.plateId ? (catalog.plates.find((p) => p.id === photo.plateId) ?? null) : null;
        return { mold, type, plate, photo };
      });
    if (withPhoto.length) return withPhoto;
    const first = molds[0];
    if (!first) return [];
    const types = availableTypes(first);
    return [{ mold: first, type: types.includes('vela') ? 'vela' : (types[0] ?? 'jabon'), plate: null }];
  }, [catalog]);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const index = slides.length ? i % slides.length : 0;

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => n + 1), EVERY_MS);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  const slide = slides[index];
  if (!slide) return null;
  const { mold, type, plate } = slide;
  const params = new URLSearchParams({ molde: mold.slug, tipo: type, ...(plate ? { placa: plate.id } : {}) });

  return (
    <div className="hero-showcase" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Link to={`/personaliza?${params}`} className="hero-art" aria-label={`Personalizar ${mold.name}`}>
        {slide.photo ? (
          <FitPhoto key={slide.photo.url} className="anim-fade" src={slide.photo.url} alt={mold.name} />
        ) : (
          <PhotoPending note="Muy pronto verás aquí nuestros productos." />
        )}
      </Link>
      <Link to={`/personaliza?${params}`} className="hero-caption">
        <b>{mold.name}</b>
        <span>
          {typeLabel[type]} {money(mold.prices[type] ?? 0)}
          {plate ? ` · ${plate.name.toLowerCase()}` : ''}
        </span>
        <em>Personalizar →</em>
      </Link>
      {slides.length > 1 && (
        <div className="hero-dots" role="tablist" aria-label="Productos">
          {slides.map((s, n) => (
            <button
              key={s.mold.id}
              type="button"
              role="tab"
              aria-selected={n === index}
              aria-label={s.mold.name}
              onClick={() => {
                setI(n);
                setPaused(true);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
