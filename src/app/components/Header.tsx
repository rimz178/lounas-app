export default function Header() {
  return (
    <header className="w-full bg-neutral-900 py-8 sm:py-16 flex flex-col items-center justify-center">
      <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-center mb-2 text-white">
        Lounas Tänään
      </h1>
      <p className="text-lg sm:text-2xl lg:text-3xl text-center text-white">
        Lounastänään.fi – löydä päivän lounas!
      </p>
    </header>
  );
}
