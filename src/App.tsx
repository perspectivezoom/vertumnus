import { Banner } from '@/components/Banner';
import { Poster } from '@/components/Poster';
import { testRegion } from '@/data/testRegion';
import { RegionSchema } from '@/data/types';

// Renders the synthetic test region while the layout is being dialed in; swap to
// a real region (regions[0]) once the seasonality data is filled out.
const region = RegionSchema.parse(testRegion);

export function App() {
  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <Poster region={region} />
      <Banner />
    </main>
  );
}
