import { Ribbons } from '@/components/Ribbons';
import type { Region } from '@/data/types';

/** The printable poster: a faded sage farmers-market frame titled at the top, wrapping the ribbons chart. */
export function Poster({ region }: { region: Region }) {
  return (
    <article className="mx-auto max-w-5xl bg-[#cbd7be] p-8 shadow-lg">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-green-900">{region.name}</h1>
      </header>

      <div className="mt-6 rounded-xl bg-white p-3">
        <Ribbons region={region} />
      </div>

      {/* TODO: footer — source citations as fine print + a link back to vertumnus */}
    </article>
  );
}
