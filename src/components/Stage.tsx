import { forwardRef, useId } from 'react';
import { DEFAULT_MOLD_FIT, type Collection, type Mold, type Plate, type ProductType } from '../types';
import { moldArt } from '../art/molds';
import { PX_PER_CM, renderPlate } from '../art/plates';
import { colorizeTables, mix } from '../lib/color';

export interface StageProps {
  mold: Mold;
  type: ProductType;
  color: string;
  /** Id del color elegido: si es el color de la foto, la foto se muestra tal cual. */
  colorId?: string;
  plate: Plate | null;
  veinColor: string | null;
  theme?: Collection['theme'];
  lit?: boolean;
  /** Cambia cuando cambia el molde / la placa, para animar la entrada. */
  moldAnim?: string;
  plateAnim?: string;
  /** Desplazamiento mientras se arrastra con el dedo. */
  dragMold?: number;
  dragPlate?: number;
  /** Sin fondo ni mesa (para tarjetas pequeñas). */
  bare?: boolean;
  className?: string;
}

const CX = 200;
const SEAT = 268;

/** Escenario en capas: fondo → placa (atrás) → producto → placa (frente). */
export const Stage = forwardRef<SVGSVGElement, StageProps>(function Stage(
  { mold, type, color, colorId, plate, veinColor, theme, lit, moldAnim, plateAnim, dragMold = 0, dragPlate = 0, bare, className },
  ref,
) {
  const uid = useId().replace(/:/g, '');
  const art = moldArt[mold.art];
  // Con foto: el ancho de la foto es el ancho real del molde y el alto sale de su proporción.
  const fit = { ...DEFAULT_MOLD_FIT, ...mold.photoFit };
  const photoW = 100 * fit.scale;
  const photoH = photoW * (mold.photoAspect ?? 1);
  const spec = mold.photo ? { ...art, height: photoH - fit.offsetY, footY: 18 } : art;
  const scale = (mold.baseWidthCm * PX_PER_CM) / 100;
  const pr = plate ? renderPlate(plate, veinColor ?? plate.veinColors[0] ?? '#f29bb8', color, `${uid}p`) : null;
  const pScale = scale * (pr?.productScale ?? 1);
  const productY = SEAT + (pr?.seatY ?? 0) + spec.footY * pScale;
  const bg = theme ?? { bg: '#fde8f0', bg2: '#f3e3fb', accent: '#e5487f' };

  // Encuadre vertical: los moldes altos (pino) suben la cámara un poco.
  const topY = productY - spec.height * pScale - (type === 'vela' ? 30 : 0);
  const shift = bare ? 0 : Math.min(0, topY - 85);
  const viewBox = bare
    ? `${CX - 150} ${productY - Math.max(spec.height * pScale, 100) - 40} 300 ${Math.max(spec.height * pScale, 100) + 90}`
    : `40 ${shift + 55} 320 320`;

  const recolor = !!mold.photo && !!mold.photoTintable && colorId !== mold.photoColorId;
  const tables = recolor ? colorizeTables(color, mold.photoLuma) : null;
  const product = mold.photo ? (
    <g>
      {tables && (
        <filter id={`${uid}-tint`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={tables[0]} />
            <feFuncG type="table" tableValues={tables[1]} />
            <feFuncB type="table" tableValues={tables[2]} />
          </feComponentTransfer>
        </filter>
      )}
      <image
        href={mold.photo}
        x={-photoW / 2}
        y={-photoH + fit.offsetY}
        width={photoW}
        height={photoH}
        preserveAspectRatio="none"
        filter={tables ? `url(#${uid}-tint)` : undefined}
      />
    </g>
  ) : (
    spec.render({ color, uid: `${uid}m` })
  );

  return (
    <svg
      ref={ref}
      className={className}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${type === 'vela' ? 'Vela' : 'Jabón'} ${mold.name}${plate ? ` sobre ${plate.name}` : ''}`}
    >
      <defs>
        <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="shadow-blur" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <radialGradient id={`${uid}-bg`} cx="0.5" cy="0.35" r="0.85">
          <stop offset="0" stopColor="#fffaf6" />
          <stop offset="0.6" stopColor={bg.bg} />
          <stop offset="1" stopColor={bg.bg2} />
        </radialGradient>
        <radialGradient id={`${uid}-table`} cx="0.5" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#fffdfb" />
          <stop offset="1" stopColor={mix(bg.bg, '#e8d6c7', 0.5)} />
        </radialGradient>
        <radialGradient id={`${uid}-flame`} cx="0.5" cy="0.7" r="0.6">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.45" stopColor="#ffd25e" />
          <stop offset="1" stopColor="#ff8a2a" />
        </radialGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {!bare && (
        <g>
          <rect x={-20} y={shift - 20} width={440} height={460} fill={`url(#${uid}-bg)`} />
          {/* burbujas y luces de fondo */}
          {[
            [60, 70, 26],
            [340, 90, 18],
            [300, 40, 9],
            [90, 170, 10],
            [355, 190, 12],
            [30, 230, 7],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y + shift * 0.3} r={r} fill="#ffffff" opacity={0.45} stroke={bg.accent} strokeOpacity={0.18} />
          ))}
          {/* mesa */}
          <ellipse cx={CX} cy={SEAT + 85} rx={260} ry={110} fill={`url(#${uid}-table)`} />
          <g opacity={0.2} fill={bg.accent}>
            {Array.from({ length: 22 }, (_, i) => {
              const a = (i / 22) * Math.PI;
              return <circle key={i} cx={CX + Math.cos(a) * 240} cy={SEAT + 85 - Math.sin(a) * 100} r={3} />;
            })}
          </g>
        </g>
      )}

      {lit && type === 'vela' && !mold.photo && <circle cx={CX} cy={productY - spec.height * pScale} r={120} fill={`url(#${uid}-glow)`} />}

      <g transform={`translate(${CX + dragPlate} ${SEAT})`}>
        <g key={plateAnim} className={plateAnim ? 'anim-pop' : undefined}>
          {pr?.back}
        </g>
      </g>

      <g transform={`translate(${CX + dragMold} ${productY})`}>
        <g key={moldAnim} className={moldAnim ? 'anim-drop' : undefined}>
          {!plate && !bare && <ellipse cx={4} cy={-10 * pScale} rx={54 * pScale} ry={13 * pScale} fill="#5b3a2e" opacity={0.2} filter="url(#shadow-blur)" />}
          <g transform={`scale(${pScale})`}>
            {product}
            {/* La foto real ya trae su mecha; solo se dibuja en las ilustraciones. */}
            {type === 'vela' && !mold.photo && (
              <g transform={`translate(0 ${spec.wickY})`}>
                <path d="M0,0 q-1.5,-6 1,-12" stroke="#3b2a24" strokeWidth={2.4 / Math.max(pScale, 0.5)} fill="none" strokeLinecap="round" />
                {lit && (
                  <g className="flame" transform="translate(1 -12)">
                    <path d="M0,4 C-9,-4 -6,-18 0,-30 C6,-18 9,-4 0,4z" fill={`url(#${uid}-flame)`} transform={`scale(${1 / Math.max(pScale, 0.6)})`} />
                  </g>
                )}
              </g>
            )}
          </g>
        </g>
      </g>

      <g transform={`translate(${CX + dragPlate} ${SEAT})`}>
        <g key={plateAnim} className={plateAnim ? 'anim-pop' : undefined}>
          {pr?.front}
        </g>
      </g>
    </svg>
  );
});

/** Convierte el escenario a PNG para descargar o compartir. */
export async function stageToPng(svg: SVGSVGElement, size = 1080): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('No se pudo generar la imagen'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d')!.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Sin imagen'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
