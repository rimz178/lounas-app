type Props = {
  lat: number;
  lng: number;
  name: string;
};

export default function DirectionsButton({ lat, lng, name }: Props) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Reittiohjeet: ${name}`}
      className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
    >
      Reittiohjeet
    </a>
  );
}
