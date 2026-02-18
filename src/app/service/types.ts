export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  url: string;
  menu_text?: string;
  averageRating?: number;
  reviewCount?: number;
  myRating?: number;
  myComment?: string | null;
}

export type RestaurantBrief = {
  id: string;
  name: string;
  url: string | null;
};
