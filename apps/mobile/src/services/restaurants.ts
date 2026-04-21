import { supabase } from '../lib/supabase';

export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  url: string | null;
}

export async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('ravintolat')
    .select('id, name, lat, lng, url');

  if (error) {
    console.error('Virhe haettaessa ravintoloita:', error.message);
    return [];
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
    console.error('Virhe haettaessa menua:', error.message);
    return null;
  }

  return data?.menu_text ?? null;
}
