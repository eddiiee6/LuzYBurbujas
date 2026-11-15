import { useEffect, useRef, useState, type PointerEvent } from 'react';

type Tool = 'pincel' | 'borrador' | 'mover';

export interface WaxPaintResult {
  blob: Blob;
  /** Caja de lo pintado en fracciones (0..1) de la foto. */
  box: { x: number; y: number; w: number; h: number };
}

const PAINT = '#ff4f93';
const MAX_UNDO = 25;

/**
 * Editor para pintar con el dedo (o el mouse) la zona donde va la cera.
 * Lo pintado se guarda como una máscara del mismo encuadre que la foto.
 */
export function WaxPainter({
  photo,
  mask,
  oval,
  title = 'Pinta dónde va la cera',
  hint = 'Lo rosa es la cera.',
  onDone,
  onCancel,
}: {
  photo: string;
  /** Máscara guardada antes, para seguir editándola. */
  mask?: string;
  /** Óvalo de inicio en fracciones de la foto (centro y radios). Sin él no se ofrece. */
  oval?: { cx: number; cy: number; rx: number; ry: number };
  /** Título y nota del editor (por defecto: cera). */
  title?: string;
  hint?: string;
  onDone: (r: WaxPaintResult) => void | Promise<void>;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [tool, setTool] = useState<Tool>('pincel');
  const [brush, setBrush] = useState(8); // % del ancho
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const undo = useRef<ImageData[]>([]);
  // Área visible: la foto se ajusta para caber completa (zoom 1) y el zoom acerca desde ahí.
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth - 32, h: el.clientHeight - 32 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fitWidth = size && area ? Math.max(120, Math.min(area.w, (area.h * size.w) / size.h)) : null;
  const last = useRef<{ x: number; y: number } | null>(null);

  // Tamaño del lienzo según la foto (máx. 800 px de ancho).
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(800, img.naturalWidth || 800);
      setSize({ w, h: Math.round((w * (img.naturalHeight || 1)) / (img.naturalWidth || 1)) });
    };
    img.src = photo;
  }, [photo]);

  // Cargar lo que ya estaba pintado.
  useEffect(() => {
    if (!size || !mask) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size.w, size.h);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = PAINT;
      ctx.fillRect(0, 0, size.w, size.h);
      ctx.globalCompositeOperation = 'source-over';
    };
    img.src = mask;
  }, [size, mask]);

  const ctx = () => canvasRef.current?.getContext('2d', { willReadFrequently: true }) ?? null;

  const snapshot = () => {
    const c = ctx();
    if (!c || !size) return;
    undo.current.push(c.getImageData(0, 0, size.w, size.h));
    if (undo.current.length > MAX_UNDO) undo.current.shift();
  };

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * size!.w) / r.width, y: ((e.clientY - r.top) * size!.h) / r.height };
  };

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = ctx();
    if (!c || !size) return;
    c.globalCompositeOperation = tool === 'borrador' ? 'destination-out' : 'source-over';
    c.strokeStyle = PAINT;
    c.fillStyle = PAINT;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = (brush / 100) * size.w;
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
    c.globalCompositeOperation = 'source-over';
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'mover' || !size) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    snapshot();
    const p = point(e);
    last.current = p;
    stroke(p, { x: p.x + 0.01, y: p.y });
    setMsg(null);
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!last.current || tool === 'mover') return;
    const p = point(e);
    stroke(last.current, p);
    last.current = p;
  };
  const onUp = () => {
    last.current = null;
  };

  const startOval = () => {
    const c = ctx();
    if (!c || !size || !oval) return;
    snapshot();
    c.fillStyle = PAINT;
    c.beginPath();
    c.ellipse(oval.cx * size.w, oval.cy * size.h, oval.rx * size.w, oval.ry * size.h, 0, 0, Math.PI * 2);
    c.fill();
  };

  const clear = () => {
    const c = ctx();
    if (!c || !size) return;
    snapshot();
    c.clearRect(0, 0, size.w, size.h);
  };

  const doUndo = () => {
    const c = ctx();
    const prev = undo.current.pop();
    if (c && prev) c.putImageData(prev, 0, 0);
  };

  const finish = async () => {
    const src = canvasRef.current;
    if (!src || !size) return;
    // Caja de lo pintado.
    const data = ctx()!.getImageData(0, 0, size.w, size.h).data;
    let x0 = size.w;
    let y0 = size.h;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < size.h; y++)
      for (let x = 0; x < size.w; x++)
        if (data[(y * size.w + x) * 4 + 3] > 20) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) {
      setMsg('Pinta primero la zona.');
      return;
    }
    // Máscara final: blanco donde se pintó, transparente en lo demás.
    const out = document.createElement('canvas');
    out.width = size.w;
    out.height = size.h;
    const o = out.getContext('2d')!;
    o.drawImage(src, 0, 0);
    o.globalCompositeOperation = 'source-in';
    o.fillStyle = '#ffffff';
    o.fillRect(0, 0, size.w, size.h);
    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'));
    if (!blob) {
      setMsg('No se pudo guardar lo pintado.');
      return;
    }
    setBusy(true);
    try {
      await onDone({
        blob,
        box: { x: x0 / size.w, y: y0 / size.h, w: (x1 - x0 + 1) / size.w, h: (y1 - y0 + 1) / size.h },
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="painter" role="dialog" aria-modal="true" aria-label={title}>
      <div className="painter-bar">
        <strong>{title}</strong>
        <div className="painter-actions">
          <button type="button" className="btn ghost small" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn primary small" onClick={finish} disabled={busy}>
            {busy ? 'Guardando…' : 'Usar esta zona'}
          </button>
        </div>
      </div>

      <div className="painter-tools">
        <div className="chips" role="radiogroup" aria-label="Herramienta">
          {(
            [
              ['pincel', '🖌️ Pincel'],
              ['borrador', '🧽 Borrador'],
              ['mover', '✋ Mover'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className="chip" role="radio" aria-checked={tool === id} onClick={() => setTool(id)}>
              {label}
            </button>
          ))}
        </div>
        <label className="painter-range">
          Pincel <input type="range" min={1} max={25} step={0.5} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
        </label>
        <label className="painter-range">
          Zoom <input type="range" min={1} max={4} step={0.25} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        <div className="painter-actions">
          {oval && (
            <button type="button" className="btn ghost small" onClick={startOval}>
              ⬭ Empezar con óvalo
            </button>
          )}
          <button type="button" className="btn ghost small" onClick={doUndo}>
            ↶ Deshacer
          </button>
          <button type="button" className="btn ghost small" onClick={clear}>
            Limpiar
          </button>
        </div>
        {msg && <p className="warn">{msg}</p>}
        <small className="muted">Con ✋ Mover puedes desplazarte cuando hay zoom. {hint}</small>
      </div>

      <div className="painter-area" ref={areaRef}>
        {size && fitWidth && (
          <div className="painter-sheet" style={{ width: `${fitWidth * zoom}px`, aspectRatio: `${size.w} / ${size.h}` }}>
            <img src={photo} alt="" draggable={false} />
            <canvas
              ref={canvasRef}
              width={size.w}
              height={size.h}
              style={{ touchAction: tool === 'mover' ? 'auto' : 'none', cursor: tool === 'mover' ? 'grab' : 'crosshair' }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            />
          </div>
        )}
      </div>
    </div>
  );
}
