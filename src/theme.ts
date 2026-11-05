/** The site palette: three Istanbul colours plus neutrals. Use these instead of ad-hoc hex values. */
export const C = {
  blue: '#0d1f8a',      // Bosphorus / Blue Mosque
  blue2: '#2a46d6',
  blueDeep: '#071355',
  blueNight: '#040b38',
  turq: '#1cc4bf',      // Iznik tiles
  turqDeep: '#0b7f7b',
  red: '#e11d3c',       // Tulip — the emblem of Istanbul
  redDeep: '#9c0f27',
  white: '#ffffff',
} as const;

export const G = {
  blue: `linear-gradient(135deg, ${C.blue2}, ${C.blueDeep})`,
  turq: `linear-gradient(135deg, ${C.turqDeep}, ${C.blueDeep})`,
  red: `linear-gradient(135deg, ${C.red}, ${C.redDeep})`,
  night: `linear-gradient(135deg, ${C.blue}, ${C.blueNight})`,
};

/** Colours a club may use — kept inside the palette so every crest matches the site. */
export const CLUB_SWATCHES = [C.blue2, C.blueDeep, C.turq, C.turqDeep, C.red, C.redDeep, C.white];
