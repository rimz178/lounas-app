import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="flex gap-4 p-4 bg-black-100 border-b">
      <Link href="/">Etusivu</Link>
      <Link href="/hallinta">Hallinta</Link>
      {/* Lisää muita linkkejä tarvittaessa */}
    </nav>
  );
}
