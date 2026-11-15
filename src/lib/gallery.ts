import type { GalleryPhoto, Mold, ProductType } from '../types';

/**
 * Fotos reales de un molde para una presentación y tipo. Las del mismo color
 * van primero. Si no hay ninguna, el sitio usa el montaje como respaldo.
 */
export function photosFor(mold: Mold, plateId: string | null, type: ProductType, colorId?: string): GalleryPhoto[] {
  return (mold.gallery ?? [])
    .filter((g) => (g.plateId ?? null) === plateId && (!g.type || g.type === type))
    .sort((a, b) => Number(b.colorId === colorId) - Number(a.colorId === colorId));
}

/** Foto de portada del molde: la primera de su galería. */
export function coverPhoto(mold: Mold): GalleryPhoto | undefined {
  return mold.gallery?.[0];
}
