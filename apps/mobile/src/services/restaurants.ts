import { supabase } from '../lib/supabase';

export interface Restaurant {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  url: string | null;
}

export type ManualArea = 'kaikki' | 'helsinki' | 'espoo' | 'vantaa';

export const AREA_BOUNDS: Record<
  Exclude<ManualArea, 'kaikki'>,
  { minLat: number; maxLat: number; minLng: number; maxLng: number }
> = {
  helsinki: { minLat: 60.1, maxLat: 60.295, minLng: 24.82, maxLng: 25.26 },
  vantaa: { minLat: 60.27, maxLat: 60.43, minLng: 24.82, maxLng: 25.3 },
  espoo: { minLat: 60.09, maxLat: 60.37, minLng: 24.44, maxLng: 24.88 },
};

export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('ravintolat')
    .select('id, name, lat, lng, url');

  if (error) {
    throw new Error(`Virhe haettaessa ravintoloita: ${error.message}`);
  }

  return data ?? [];
}

export async function getMenuForRestaurant(restaurantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('menus')
    .select('menu_text')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Virhe haettaessa menua: ${error.message}`);
  }

  return data?.menu_text ?? null;
}
