import { Ribbons } from '@/src/components/Ribbons';
import type { Region } from '@/src/data/types';
import { useQueryParams } from '@/src/lib/params';

/** The printable poster: a faded sage frame at the paper's aspect ratio, titled, wrapping the chart. */
export function Poster({ region }: { region: Region }) {
  const { w, h } = useQueryParams();

  return (
    <article
      className="mx-auto flex max-w-5xl flex-col bg-[#cbd7be] p-8 shadow-lg"
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-green-900">{region.name}</h1>
      </header>

      <div className="mt-6 min-h-0 flex-1 rounded-xl bg-white p-3">
        <Ribbons region={region} />
      </div>

      {/* TODO: footer — source citations as fine print + a link back to vertumnus */}
    </article>
  );
}
