/** Tipo de producto que se puede hacer con un mismo molde. */
export type ProductType = 'jabon' | 'vela';

/** Ilustraciones disponibles mientras no haya foto del molde. */
export type MoldArt = 'margarita' | 'cempasuchil' | 'rosa' | 'copo' | 'pino';

export interface Collection {
  id: string;
  name: string;
  description: string;
  order?: number;
  /** Colores de la temática: fondo del escenario y acento. */
  theme: { bg: string; bg2: string; accent: string };
}

export interface Mold {
  id: string;
  /** Se usa en la URL: /personaliza?molde=margarita */
  slug: string;
  name: string;
  description: string;
  collectionId: string;
  /** Ilustración de respaldo cuando no hay foto. */
  art: MoldArt;
  /** Ancho que ocupa apoyado (cm). Sirve para saber en qué placas cabe. */
  baseWidthCm: number;
  /** Alto aproximado (cm). Solo para escalar el dibujo. */
  heightCm: number;
  /** Precio por tipo. Si un tipo no tiene precio, no se ofrece. */
  prices: Partial<Record<ProductType, number>>;
  /** Color con el que aparece por defecto (id de Color). */
  defaultColorId: string;
  /** Foto sin fondo (PNG/WebP transparente), idealmente del molde en blanco. */
  photo?: string;
  /** Proporción alto/ancho de la foto (se calcula al subirla). */
  photoAspect?: number;
  /** Ajuste fino de la foto: tamaño (1 = ancho real) y desplazamiento vertical. */
  photoFit?: MoldPhotoFit;
  /** Permite recolorear la foto a los otros colores (conserva luces y sombras). */
  photoTintable?: boolean;
  /** Color real del producto en la foto: con ese color se muestra sin cambios. */
  photoColorId?: string;
  /** Brillo promedio de la foto (0..1), se calcula al subirla. Sirve para recolorear. */
  photoLuma?: number;
  /** Colores que se ofrecen para este molde. Vacío o sin definir = todos. */
  allowedColorIds?: string[];
  /** Fotos reales por presentación. Si hay una para la combinación elegida, se muestra en lugar del montaje. */
  gallery?: GalleryPhoto[];
  active: boolean;
  featured?: boolean;
  order: number;
}

/** Foto real del producto (p. ej. la misma del carrusel de Instagram), etiquetada. */
export interface GalleryPhoto {
  id: string;
  url: string;
  /** Presentación en la foto (id de placa/cesta/cajita). null = el producto solo. */
  plateId: string | null;
  /** Si es vela o jabón. null = sirve para los dos. */
  type?: ProductType | null;
  /** Color del producto en la foto (id de Color). Solo informativo. */
  colorId?: string | null;
}

export interface MoldPhotoFit {
  /** 1 = la foto mide el ancho real del molde. */
  scale: number;
  /** Unidades hacia abajo (+) o hacia arriba (-). */
  offsetY: number;
}

export interface PlatePhotoFit {
  /** 1 = la foto mide el largo real de la placa. */
  scale: number;
  /** Dónde se apoya el producto respecto al centro de la foto (+ abajo). */
  seatY: number;
  /** Giro en grados para enderezar la placa. */
  rotate: number;
  /** Aplastar (<1) o estirar (>1) en vertical para igualar la inclinación. */
  squash: number;
  /** Contenedores: dibujar la cera dentro (por defecto sí en contenedores). */
  waxOn?: boolean;
  /** Ancho de la cera respecto al ancho de la foto (0..1). */
  waxWidth?: number;
  /** Inclinación de la superficie de cera: alto/ancho (0..1). */
  waxTilt?: number;
  /** Subir (-) o bajar (+) la superficie de cera respecto al punto de apoyo. */
  waxY?: number;
  /** Color de la cera: "vela" (igual que la vela, por defecto) o un color fijo (hex). */
  waxColor?: string;
  /** "ovalo": la cera es un óvalo con los controles. "pintado": la zona que se pintó. */
  waxMode?: 'ovalo' | 'pintado';
  /** Máscara pintada (PNG blanco sobre transparente, mismo encuadre que la foto). */
  waxMask?: string;
  /** Cajitas: máscara pintada de lo que va DELANTE del producto (acetato, moño, relleno). */
  frontMask?: string;
  /** Caja de lo pintado, en fracciones de la foto (0..1), para el brillo de la cera. */
  waxBox?: { x: number; y: number; w: number; h: number };
}

export const DEFAULT_WAX = { waxWidth: 0.8, waxTilt: 0.32, waxY: 0 };

export const DEFAULT_MOLD_FIT: MoldPhotoFit = { scale: 1, offsetY: 0 };
export const DEFAULT_PLATE_FIT: PlatePhotoFit = { scale: 1, seatY: 0, rotate: 0, squash: 1 };

export type PlateShape = 'ovalada' | 'redonda' | 'rectangular' | 'cesta';
/** plana: el producto se apoya encima. contenedor: la cera va dentro. caja: cajita de presentación. */
export type PlateKind = 'plana' | 'contenedor' | 'caja';

export interface Plate {
  id: string;
  name: string;
  description: string;
  shape: PlateShape;
  kind: PlateKind;
  size: 'chica' | 'grande';
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  price: number;
  /** Colores de veta que el cliente puede elegir (hex). */
  veinColors: string[];
  /** Foto sin fondo de la placa (opcional). */
  photo?: string;
  photoAspect?: number;
  /** Ajuste fino de la foto para que coincida con el ángulo de los moldes. */
  photoFit?: PlatePhotoFit;
  /** Permite recolorear la foto de la placa (independiente del color de la vela). */
  photoTintable?: boolean;
  /** Brillo promedio de la foto (0..1), se calcula al subirla. */
  photoLuma?: number;
  /** Colores que se ofrecen para la placa con foto. Vacío o sin definir = todos. */
  photoColorIds?: string[];
  /**
   * Para qué tipo de producto se ofrece. Sin definir: los contenedores solo
   * para velas y las placas planas solo para jabones.
   */
  forTypes?: ProductType[];
  /** Moldes que no caben aunque las medidas digan que sí. */
  blockedMoldIds: string[];
  active: boolean;
  order: number;
}

export interface Essence {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
  order: number;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  active: boolean;
  order: number;
}

export interface Settings {
  businessName: string;
  tagline: string;
  /** Número con lada de país, solo dígitos. Ej. 525513555143 */
  whatsapp: string;
  instagram?: string;
  facebook?: string;
}

/** Arreglo ya armado (cesta con varias piezas, flores secas, musgo…). */
export interface Arrangement {
  id: string;
  /** Se usa en la URL: /arreglos/cesta-primavera */
  slug: string;
  name: string;
  description: string;
  /** Qué incluye, una pieza por renglón. */
  includes: string[];
  price: number;
  /** Fotos reales (con fondo), la primera es la principal. */
  photos: string[];
  /** El cliente puede pedir otros colores (se le pide escribirlos). */
  customColors: boolean;
  active: boolean;
  featured?: boolean;
  order: number;
}

export interface Catalog {
  arrangements: Arrangement[];
  collections: Collection[];
  molds: Mold[];
  plates: Plate[];
  essences: Essence[];
  colors: ColorOption[];
  settings: Settings;
}

/** Entidades que se editan como listas en el panel. */
export type EntityKind = 'collections' | 'molds' | 'plates' | 'essences' | 'colors' | 'arrangements';

/** Lo que el cliente arma en el personalizador. */
export interface Design {
  moldId: string;
  type: ProductType;
  colorId: string;
  plateId: string | null;
  veinColor: string | null;
  /** Color de la placa con foto (id de Color). Sin definir = color original de la foto. */
  plateColorId?: string | null;
  essenceId: string | null;
}

/** Vela o jabón armado en el personalizador. */
export interface DesignItem extends Design {
  kind?: 'diseño';
  id: string;
  qty: number;
}

/** Arreglo del catálogo de arreglos. */
export interface ArrangementItem {
  kind: 'arreglo';
  id: string;
  qty: number;
  arrangementId: string;
  /** Colores que pidió el cliente (texto libre). Vacío = como en la foto. */
  colors: string;
  essenceId: string | null;
}

export type CartItem = DesignItem | ArrangementItem;
