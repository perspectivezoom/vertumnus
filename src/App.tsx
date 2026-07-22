import { Poster } from '@/components/Poster';
// TODO: swap back to the real region (regions[0]) once the streamgraph layout is dialed in.
import devRegion from '@/data/dev-region';
import { RegionSchema } from '@/data/types';

const region = RegionSchema.parse(devRegion);

export function App() {
  return (
    <main>
      <Poster region={region} />
    </main>
  );
}
