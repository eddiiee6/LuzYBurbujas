/**
 * Prepara una foto sin fondo antes de guardarla:
 * - recorta el margen transparente para que el producto ocupe toda la imagen
 *   (si no, se vería chiquito en el escenario);
 * - la reduce a un tamaño razonable y la guarda en WebP con transparencia.
 * Devuelve también la proporción alto/ancho para colocarla bien.
 */
export async function prepareCutout(file: Blob, max = 900): Promise<{ blob: Blob; aspect: number }> {
  const bmp = await createImageBitmap(file);
  const src = document.createElement('canvas');
  src.width = bmp.width;
  src.height = bmp.height;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(bmp, 0, 0);

  // Caja que contiene los píxeles visibles.
  const { data, width, height } = sctx.getImageData(0, 0, src.width, src.height);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) {
    // Imagen sin transparencia o vacía: se usa completa.
    x0 = 0;
    y0 = 0;
    x1 = width - 1;
    y1 = height - 1;
  }
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const scale = Math.min(1, max / Math.max(cw, ch));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(cw * scale));
  out.height = Math.max(1, Math.round(ch * scale));
  out.getContext('2d')!.drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height);

  const blob = await new Promise<Blob>((res, rej) =>
    out.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen'))), 'image/webp', 0.88),
  );
  return { blob, aspect: ch / cw };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('No se pudo leer la imagen'));
    r.readAsDataURL(blob);
  });
}
