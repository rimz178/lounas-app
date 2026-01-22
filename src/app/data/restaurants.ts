export type Restaurant = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  url: string;
};

export const restaurants: Restaurant[] = [
  {
    id: "1",
    name: "King Kebab",
    lat: 60.1699,
    lng: 24.9384,
    url: "https://example.com",
  },
  {
    id: "2",
    name: "Lounas Cafe",
    lat: 60.1715,
    lng: 24.941,
    url: "https://example.com",
  },
];