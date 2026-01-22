"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-[320px] h-[60vh] max-h-[520px] rounded-lg border bg-white shadow-sm" />
  ),
});

export default function RestaurantMap() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="mb-3 text-lg font-semibold">Kartta</h2>
        <div className="h-[400px] rounded-lg overflow-hidden">
          <LeafletMap />
        </div>
      </div>
    </section>
  );
}
