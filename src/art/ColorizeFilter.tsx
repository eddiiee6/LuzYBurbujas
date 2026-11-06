import { colorizeTables } from '../lib/color';

/**
 * Filtro SVG que recolorea una foto conservando sus luces y sombras.
 * Se usa igual para la vela/jabón y para la placa o cesta.
 */
export function ColorizeFilter({ id, hex, luma }: { id: string; hex: string; luma?: number }) {
  const [r, g, b] = colorizeTables(hex, luma);
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0" />
      <feComponentTransfer>
        <feFuncR type="table" tableValues={r} />
        <feFuncG type="table" tableValues={g} />
        <feFuncB type="table" tableValues={b} />
      </feComponentTransfer>
    </filter>
  );
}
