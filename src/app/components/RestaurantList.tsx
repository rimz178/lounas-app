import { restaurants } from "../data/restaurants";

type Props = {
  selectedRestaurantId?: string;
  onSelectRestaurantId?: (id: string) => void;
};

export default function RestaurantList({
  selectedRestaurantId,
  onSelectRestaurantId,
}: Props) {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-5xl px-4 pb-10 text-slate-900">
        <h2 className="mb-3 text-lg font-semibold">Ravintolat</h2>

        <ul className="grid gap-3 sm:grid-cols-2">
          {restaurants.map((r) => (
            <li
              key={r.id}
              className={
                "rounded-lg border bg-white p-4 shadow-sm " +
                (selectedRestaurantId === r.id ? "ring-2 ring-black/20" : "")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{r.name}</div>
                  <div className="text-sm text-gray-800"></div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-sm font-medium underline"
                    onClick={() => onSelectRestaurantId?.(r.id)}
                  >
                    Näytä kartalla
                  </button>

                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium underline"
                  >
                    Avaa
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
