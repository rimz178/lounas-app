import MenuRestaurantCards from "../components/MenuRestaurantCards";
import {
  getLatestMenusByRestaurant,
  getRestaurants,
} from "../service/restaurants";

export default async function MenuPage() {
  const restaurants = await getRestaurants();
  const sortedRestaurants = [...restaurants].sort((a, b) =>
    a.name.localeCompare(b.name, "fi"),
  );

  const menusByRestaurant = await getLatestMenusByRestaurant(
    sortedRestaurants.map((restaurant) => restaurant.id),
  );

  const restaurantMenus = sortedRestaurants.map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    url: restaurant.url ?? null,
    menuText: menusByRestaurant[restaurant.id] ?? null,
  }));

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Ruokalistat
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Jokaisen ravintolan lounaslista omassa kortissaan.
        </p>

        <MenuRestaurantCards restaurants={restaurantMenus} />
      </div>
    </main>
  );
}
