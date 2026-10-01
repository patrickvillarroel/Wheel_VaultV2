/**
 * Tokens visuales, extraidos del diseño en Figma.
 *
 * La app es solo en modo oscuro: el diseño lo es, y un modo claro a medias se
 * ve peor que no tenerlo. Si algun día hace falta, estos tokens son el único
 * sitio que habria que tocar.
 *
 * Los hex son una lectura de las capturas del diseño. Cuando tengamos acceso al
 * archivo de Figma hay que contrastarlos; es el único archivo que cambiaria.
 */

export const colors = {
  /** Fondo de la app. */
  background: '#0A0A0A',
  /** Tarjetas, inputs, barra de pestañas. */
  surface: '#141414',
  /** Botones secundarios, chips, estados pulsados. */
  surfaceAlt: '#1E1E1E',

  border: '#2A2A2A',
  borderStrong: '#3A3A3A',

  /** Acento de la marca: CTA, pestaña activa, barra de seccion. */
  red: '#E01F26',
  redDark: '#8E0F14',
  redSoft: 'rgba(224, 31, 38, 0.12)',

  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9A',
  textMuted: '#6B6B6B',
  /** Texto sobre el rojo de marca. */
  textOnBrand: '#FFFFFF',

  danger: '#FF4D4F',
  dangerSoft: 'rgba(255, 77, 79, 0.12)',
  success: '#2BBF6A',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

/** Gradientes del diseño: el hero y el boton principal. */
export const gradients = {
  brand: [colors.red, colors.redDark] as const,
  /**
   * Fondo de las pantallas de autenticacion: rojo muy oscuro arriba que cae a
   * negro enseguida. En el diseno el rojo es un resplandor, no un fondo; un
   * degradado saturado se come el contraste del texto blanco.
   */
  hero: ['#3B0A0F', '#140406', colors.background] as const,
  /** Donde cae cada parada del degradado hero. */
  heroLocations: [0, 0.35, 1] as const,
} as const;

/** Escala de 4. Usar siempre estos valores, nunca numeros sueltos. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  /** Titulos de pantalla. */
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  /** Cabeceras de seccion: "Marcas", "Agregados recientes". */
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  button: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
} as const;

/**
 * Altura minima de cualquier elemento pulsable.
 *
 * 44 px es el mínimo recomendado por las guias de accesibilidad de iOS y
 * Android. Es un suelo, no una sugerencia.
 */
export const TOUCH_TARGET = 44;

export const theme = {
  colors,
  gradients,
  spacing,
  radii,
  typography,
  TOUCH_TARGET,
} as const;
