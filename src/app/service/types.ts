export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  url: string;
  menu_text?: string;
  averageRating?: number;
  reviewCount?: number;
}

export type RestaurantBrief = {
  id: string;
  name: string;
  url: string | null;
};
