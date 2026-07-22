import { Ribbons } from '@/components/Ribbons';
import { testRegion } from '@/data/testRegion';
import { RegionSchema } from '@/data/types';

// Renders the synthetic test region while the layout is being dialed in; swap to
// a real region (regions[0]) once the seasonality data is filled out.
const region = RegionSchema.parse(testRegion);

export function App() {
  return (
    <main>
      <Ribbons region={region} />
    </main>
  );
}
