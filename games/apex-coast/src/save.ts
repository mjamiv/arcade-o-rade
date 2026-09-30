export interface SaveData {
  version: 1;
  vehicle: number;
  color: number;
  assists: boolean;
  quality: 'auto' | 'high' | 'low';
  units: 'mph' | 'kmh';
  volume: number;
  touch: boolean;
  bests: Record<string, number>;
}
export const SAVE_KEY = 'arcade-o-rade:apex-coast:save:v1';
export const defaults: SaveData = {
  version: 1,
  vehicle: 0,
  color: 0,
  assists: true,
  quality: 'auto',
  units: 'mph',
  volume: 45,
  touch: false,
  bests: {},
};
export function parseSave(text: string | null): SaveData {
  const out: SaveData = { ...defaults, bests: {} };
  try {
    const v = JSON.parse(text ?? 'null');
    if (!v || v.version !== 1) return out;
    if (Number.isInteger(v.vehicle) && v.vehicle >= 0 && v.vehicle < 3)
      out.vehicle = v.vehicle;
    if (Number.isInteger(v.color) && v.color >= 0 && v.color < 5)
      out.color = v.color;
    if (typeof v.assists === 'boolean') out.assists = v.assists;
    if (['auto', 'high', 'low'].includes(v.quality)) out.quality = v.quality;
    if (['mph', 'kmh'].includes(v.units)) out.units = v.units;
    if (Number.isFinite(v.volume))
      out.volume = Math.max(0, Math.min(100, v.volume));
    if (typeof v.touch === 'boolean') out.touch = v.touch;
    if (v.bests && typeof v.bests === 'object')
      for (const [key, value] of Object.entries(v.bests)) {
        if (
          /^(club-v1:)?(vantage|rally|summit)-(assisted|unassisted)$/.test(
            key,
          ) &&
          typeof value === 'number' &&
          Number.isFinite(value) &&
          value > 10
        )
          out.bests[key] = value;
      }
  } catch {
    /* Corrupt or unavailable saves never prevent playing. */
  }
  return out;
}
