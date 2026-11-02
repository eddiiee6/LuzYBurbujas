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
  /** Si la foto es clara, el sitio la puede teñir del color elegido. */
  photoTintable?: boolean;
  active: boolean;
  featured?: boolean;
  order: number;
}

export type PlateShape = 'ovalada' | 'redonda' | 'rectangular' | 'cesta';
/** plana: el producto se apoya encima. contenedor: la cera va dentro (solo velas). */
export type PlateKind = 'plana' | 'contenedor';

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

export interface Catalog {
  collections: Collection[];
  molds: Mold[];
  plates: Plate[];
  essences: Essence[];
  colors: ColorOption[];
  settings: Settings;
}

/** Entidades que se editan como listas en el panel. */
export type EntityKind = 'collections' | 'molds' | 'plates' | 'essences' | 'colors';

/** Lo que el cliente arma en el personalizador. */
export interface Design {
  moldId: string;
  type: ProductType;
  colorId: string;
  plateId: string | null;
  veinColor: string | null;
  essenceId: string | null;
}

export interface CartItem extends Design {
  id: string;
  qty: number;
}
