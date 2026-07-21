import { Poster } from '@/components/Poster';
import { regions } from '@/data/regions';
import { RegionSchema } from '@/data/types';

const region = RegionSchema.parse(regions[0]);

export function App() {
  return (
    <main>
      <Poster region={region} />
    </main>
  );
}
