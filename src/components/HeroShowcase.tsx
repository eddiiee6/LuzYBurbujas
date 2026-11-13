import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog, useLookup } from '../data/CatalogContext';
import { availableTypes, displayColorId, money, plateFits, typeLabel } from '../lib/rules';
import type { GalleryPhoto, Mold, Plate, ProductType } from '../types';
import { Stage } from './Stage';

interface Slide {
  mold: Mold;
  type: ProductType;
  plate: Plate | null;
  /** Foto real (galería del molde); si no hay, se arma con el escenario. */
  photo?: GalleryPhoto;
}

const EVERY_MS = 4500;

/**
 * Portada: muestra los productos que ya tienen foto real, uno tras otro, cada
 * uno sobre la placa donde cabe (de preferencia una con foto). Si todavía no
 * hay fotos, muestra el primer molde ilustrado como antes.
 */
export function HeroShowcase() {
  const { catalog } = useCatalog();
  const look = useLookup();

  const slides = useMemo<Slide[]>(() => {
    const molds = catalog.molds.filter((m) => m.active);
    // 1º: moldes con fotos reales en su galería (se usa la primera foto tal cual).
    const gallerySlides: Slide[] = molds
      .filter((m) => m.gallery?.length)
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
      .map((mold) => {
        const photo = mold.gallery![0];
        const types = availableTypes(mold);
        const type: ProductType = photo.type ?? (types.includes('vela') ? 'vela' : (types[0] ?? 'jabon'));
        const plate = photo.plateId ? (catalog.plates.find((p) => p.id === photo.plateId) ?? null) : null;
        return { mold, type, plate, photo };
      });
    if (gallerySlides.length) return gallerySlides;
    const withPhoto = molds.filter((m) => m.photo);
    const pool = (withPhoto.length ? withPhoto : molds.slice(0, 1)).sort(
      (a, b) => Number(!!b.featured) - Number(!!a.featured),
    );
    const plates = catalog.plates.filter((p) => p.active);
    return pool.map((mold) => {
      const types = availableTypes(mold);
      const type: ProductType = types.includes('vela') ? 'vela' : (types[0] ?? 'jabon');
      const fits = plates.filter((p) => plateFits(mold, p, type).ok);
      const plate = fits.find((p) => p.photo) ?? fits[0] ?? null;
      return { mold, type, plate };
    });
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
  const colorId = displayColorId(mold);
  const params = new URLSearchParams({ molde: mold.slug, tipo: type, placa: plate?.id ?? 'ninguna' });

  return (
    <div className="hero-showcase" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Link to={`/personaliza?${params}`} className="hero-art" aria-label={`Personalizar ${mold.name}`}>
        {slide.photo ? (
          <img key={slide.photo.url} className="hero-photo anim-fade" src={slide.photo.url} alt={mold.name} />
        ) : (
          <Stage
            mold={mold}
            type={type}
            color={look.color.get(colorId)?.hex ?? '#f5a3c0'}
            colorId={colorId}
            plate={plate}
            veinColor={plate?.veinColors[0] ?? null}
            theme={look.collection.get(mold.collectionId)?.theme}
            moldAnim={`h${index}`}
            plateAnim={`h${index}`}
            lit
          />
        )}
        <span className="hero-caption">
          <b>{mold.name}</b>
          <span>
            {typeLabel[type]} {money(mold.prices[type] ?? 0)}
            {plate ? ` · ${plate.name.toLowerCase()}` : ''}
          </span>
          <em>Personalizar →</em>
        </span>
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
