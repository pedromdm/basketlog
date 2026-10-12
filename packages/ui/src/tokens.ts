export const colors = {
  green: '#1E7A46',
  greenDark: '#145532',
  greenLight: '#4FBF7A',
  greenTint: '#E2EFE6',
  ink: '#111311',
  ink2: '#242624',
  ink3: '#3A3C3A',
  paper: '#F3EEE5',
  card: '#FFFFFF',
  line: '#E4DCCF',
  line2: '#EFE9DF',
  line3: '#CFC5B5',
  muted: '#6B6862',
  mutedOnDark: '#B9B4AA',
  wood: '#D9A66B',
  woodShadow: '#B98A52',
  woodText: '#3B2610',
  loserScoreOnWood: '#5A3A1C',
} as const;

export const fonts = {
  display: 'Barlow Condensed',
  body: 'Barlow',
} as const;

export const radius = { badge: 6, small: 10, button: 12, card: 14, panel: 16, frame: 24, pill: 999 } as const;

export const spacing = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48] as const;

export const court = {
  width: 500,
  height: 470,
  basket: { x: 250, y: 52.5 },
  threePointRadius: 237.5,
  cornerX: { left: 30, right: 470 },
  cornerMaxY: 140,
  paint: { x: 170, y: 0, width: 160, height: 190 },
  lineWidth: 2.5,
} as const;
