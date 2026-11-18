/** Tipo de producto que se puede hacer con un mismo molde. */
export type ProductType = 'jabon' | 'vela';

export interface Collection {
  id: string;
  name: string;
  description: string;
  order?: number;
  /** Colores de la temática (fondos de tarjetas y recuadros). */
  theme: { bg: string; bg2: string; accent: string };
}

export interface Mold {
  id: string;
  /** Se usa en la URL: /personaliza?molde=margarita */
  slug: string;
  name: string;
  description: string;
  collectionId: string;
  /** Ancho que ocupa apoyado (cm). Sirve para saber en qué presentaciones cabe. */
  baseWidthCm: number;
  /** Precio por tipo. Si un tipo no tiene precio, no se ofrece. */
  prices: Partial<Record<ProductType, number>>;
  /** Color con el que aparece primero (id de Color). */
  defaultColorId: string;
  /** Colores que se ofrecen para este molde. Vacío o sin definir = todos. */
  allowedColorIds?: string[];
  /** Fotos reales por presentación. Lo que el cliente ve; sin foto: "Foto en preparación". */
  gallery?: GalleryPhoto[];
  active: boolean;
  featured?: boolean;
  order: number;
}

/** Foto real del producto (p. ej. la misma del carrusel de Instagram), etiquetada. */
export interface GalleryPhoto {
  id: string;
  url: string;
  /** Presentación en la foto (id de presentación). null = el producto solo. */
  plateId: string | null;
  /** Si es vela o jabón. null = sirve para los dos. */
  type?: ProductType | null;
  /** Color del producto en la foto (id de Color). Solo informativo. */
  colorId?: string | null;
}

/**
 * plana: placa sobre la que se apoya. contenedor: la cera va dentro (cesta).
 * caja: cajita de regalo. tarjeta: tarjeta impresa con el producto pegado.
 */
export type PlateKind = 'plana' | 'contenedor' | 'caja' | 'tarjeta';

/** Presentación: placa, cesta, cajita o tarjeta en la que se entrega el producto. */
export interface Plate {
  id: string;
  name: string;
  description: string;
  kind: PlateKind;
  size: 'chica' | 'grande';
  lengthCm: number;
  widthCm: number;
  price: number;
  /**
   * Para qué tipo de producto se ofrece. Sin definir: contenedores para velas,
   * placas planas para jabones; cajitas y tarjetas para los dos.
   */
  forTypes?: ProductType[];
  /** Foto de la presentación (vacía o de ejemplo) para la lista del catálogo. */
  photo?: string;
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
  /** Mayoreo en arreglos: a partir de esta cantidad… */
  wholesaleMinQty?: number;
  /** …se descuenta esto a cada pieza (pesos). */
  wholesaleDiscount?: number;
}

/** Una pieza elegida para un arreglo. moldId null = "a elección de Lulú". */
export interface ArrangementPiece {
  moldId: string | null;
  type: ProductType | null;
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
  /** Cuántas piezas elige el cliente (0 = arreglo fijo, no se eligen piezas). */
  pieces?: number;
  /** Piezas sugeridas (arreglos listos); el cliente las puede cambiar. */
  defaultPieces?: ArrangementPiece[];
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
  /** Piezas elegidas (si el arreglo deja elegirlas). */
  pieces?: ArrangementPiece[];
}

export type CartItem = DesignItem | ArrangementItem;
