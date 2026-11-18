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

/** ¿El molde ya tiene alguna foto real? Mientras no tenga, se ofrece todo con "Foto en preparación". */
export function hasPhotos(mold: Mold): boolean {
  return (mold.gallery?.length ?? 0) > 0;
}

/** ¿Se ofrece esta combinación? Con fotos, solo las que tienen foto real. */
export function comboOffered(mold: Mold, plateId: string | null, type: ProductType): boolean {
  return !hasPhotos(mold) || photosFor(mold, plateId, type).length > 0;
}
