"use client";

import dynamic from "next/dynamic";
import type { Restaurant } from "../service/types";

/**
 * RestaraunMap Komponentti, joka näyttää ravintolat kartalla. Käyttää dynaamista importtia
 * Leaflet-kartta-komponentille, jotta kartta latautuu vain client-side renderingissä.
 * Näyttää myös käyttäjän sijainnin, jos se on saatavilla.
 *
 * @param {Props} props - Komponentin propsit
 * @param {string} [props.selectedRestaurantId] - Tämä ravintola on valittuna kartalla (vapaehtoinen)
 * @param {(id: string) => void} [props.onSelectRestaurantId] - Funktio, joka kutsutaan, kun ravintola valitaan kartalla (vapaaehtoinen)
 * @param {Array<{id: string, name: string, lat: number, lng: number, url: string}>} props.restaurants - Lista ravintoloista, jotka näytetään kartalla
 * @param {{lat: number, lng: number}=} props.userLocation - Käyttäjän sijainti, joka näytetään kartalla (vapaaehtoinen)
 * @returns {JSX.Element} Palauttaa JSX-elementin, joka sisältää kartan ja siihen liittyvät elementit
 */

type Props = {
  selectedRestaurantId?: string;
  onSelectRestaurantId?: (id: string) => void;
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
};

const LeafletMap = dynamic<Props>(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-lg border bg-white shadow-sm" />
  ),
});

export default function RestaurantMap(props: Props) {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="mb-3 text-lg font-semibold">Kartta</h2>
        <div className="w-full h-[250px] sm:h-[400px] lg:h-[70vh] rounded-lg overflow-hidden mx-auto mt-2 mb-4">
          <LeafletMap {...props} />
        </div>
      </div>
    </section>
  );
}
