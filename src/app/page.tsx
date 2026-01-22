import HomeClient from "./components/HomeClient";

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="p-4">
        <h1 className="text-3xl font-bold mb-4">Lounas Tänään</h1>
        <p className="mb-2">
          Tervetuloa Lounas Tänään -sivulle Tämä sovellus auttaa sinua löytämään
          päivän lounastarjoukset eri ravintoloista kartalta.
        </p>
        <p>
          Käytä karttaa nähdäksesi lähelläsi olevat ravintolat ja niiden
          lounastarjoukset. Napsauta ravintolaa saadaksesi lisätietoja
          tarjouksista ja aukioloajoista.
        </p>
      </div>
      <HomeClient />
    </div>
  );
}
