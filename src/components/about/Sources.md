# Sources

Vertumnus attempts to accurately capture local seasonality of produce. I (and Claude) have discovered that this is not only inherently fuzzy to represent, but also difficult to get data for.

Due to the locality, each region has different data sources. In SF, we are relying on specific USDA shipping data, whereas in NY we are relying on a published NY agriculture harvest chart. Both of them have shortcomings in terms of fidelity, in addition to the inherent gaps of the subject matter.

Really, this entire project is somewhat questionable in terms of intended audience: Regular farmers’ market attendees will simply build up this instinct over time. This is only useful for the intermittent attendees and newcomers. But, y’know, I happen to be one of those.

## San Francisco Bay Area

While the initial vision was to have bespoke sources for each crop (and the project is still set up to accommodate sources per crop), as a first approximation, the first attempt to chart SF produce looks at [USDA Market News](https://www.ams.usda.gov/market-news/fruits-vegetables) crop movement reports from local regions. This data source has its flaws both in terms of granularity and as an accurate proxy, but it’s the best approximation that I’ve encountered so far.

USDA Market News raw crop movement data is gathered for multiple years and massaged with simple heuristics to come up with the derived data in the poster. This is an inherently fuzzy process, with different years starting early or late due to weather or other factors. I’ve tried to encode this uncertainty with the half opacity regions, where they were at peak availability for some years and not others.

### USDA Market News Data

[USDA Market News](https://www.ams.usda.gov/market-news/fruits-vegetables) _movement_ reports, which state how much of a commodity shipped from a growing district in a given week. Two reports carry the Bay Area’s crops between them: Fresno (FR_FV170) for berries, stone fruit and grapes, and El Centro (EL_FV170) for vegetables and melons. The names are somewhat misleading in that both locations cover produce for the whole state, and each is simply the office that publishes those commodities. You have to additionally filter their movement data by region to get local movements.

Market News also publishes _price_ reports, which cover far more crops and are tempting for that reason. They are not used here. Empirically, they seem to overstate the availability of the crop: on strawberries it generates peak availability of roughly weeks 18–48, most of the year.

Data is collected for the years 2019–2024. Every response is cached verbatim in [data/raw](repo:data/raw/mars/ca/), so the derivation can be rerun and checked without an API key, and so an auth-walled source stays reproducible.

As the goal is to capture regional seasonality, we have to filter down statewide data down to what you would see in a farmers’ market. California’s strawberries peak statewide about seven weeks before Salinas-Watsonville’s own crop does, because the southern districts out-ship it and harvest earlier.

So each region counts only the districts a vendor could drive in from. For the SF Bay Area, Claude has chosen the Salinas-Watsonville, San Joaquin Valley and Central District regions. There is undoubtedly error on both sides in picking these regions. The list is declared in [the region’s crop list](repo:data/regions/crops/).

### How a season is derived

Each crop’s shipments are bucketed into weeks, and split into annual seasons bounded by the lowest volume weeks. Then each season is judged on its own, by how much of its harvest each week carried.

After experimenting with different thresholds, it seemed reasonable for “peak” to be defined as the weeks that together ship half the year’s crop, and the available season as the weeks that ship ninety percent. After this initial determination, the six seasons are combined, by vote. For peak weeks that only get partial voting, an uncertain peak concept is displayed.

A gap of a few weeks within a single season is bridged, since seasons rarely align exactly and a brief disagreement is noise rather than a break. On the other hand breaks across different seasons are deliberately _not_ smoothed over, and are captured by uncertain regions. The whole derivation can be found at [sources/mars.ts](repo:data/regions/sources/mars.ts).

### Caveats

- **Shipment volume is a proxy.** It measures wholesale movement of produce out of a district, which is not exactly what will show up at a farmers’ market.
- **Seasons drift, so a definite range is unattainable.** Depending on annual weather, global warming, etc, each year will start and stop differently. Uncertainty bands try to encode this information, but a static poster can’t know if this year happens to be an outlier.
- **Citrus is missing.** The winter months are conspicuously empty. Citrus ships in enormous volume — oranges alone out-ship everything else on the poster — but every citrus commodity is reported on the same four or so dates a year, so there is no weekly signal to derive a season from. Those rows are periodic aggregates, not shipments. It needs a different source.

## New York

New York produce does not seem to be derivable from USDA market shipping reports. Luckily, the New York State Department of Agriculture published a PDF [From A(pples) to Z(ucchini)](http://agriculture.ny.gov/harvest-chart) in 2016, which, unlike SF publications that I've looked at, is usable as a data source directly, with no number crunching whatsoever.

### The New York State Department of Agriculture and Markets harvest chart

[From A(pples) to Z(ucchini)](http://agriculture.ny.gov/harvest-chart), published by the New York State Department of Agriculture and Markets in 2016, contains exactly the information that we want for our customizable poster. It reports both the peak and available bands, and at week level granularity, rather than month level granularity. Good job, New York. The poster alone contains all the data that I wanted for San Franciso in the first place, and as such, you can think of the vertumnus NY poster as an unashamedly thinly customizable shell of the data contained in this PDF.

### Caveats

- **It rests on a single source.** GrowNYC publishes a Greenmarket harvest calendar that looks like corroboration and is not — it is the same Pride of New York chart, redistributed. [USDA NASS](https://www.nass.usda.gov/Quick_Stats/Ag_Overview/stateOverview.php?state=NEW+YORK) confirms that apples, grapes, sweet corn and a handful of others are grown at scale, but it publishes only sixteen commodities for the state and says nothing about most of this list.
- **No uncertainty data.** The SF Bay Area’s half opacity bands come from six years of shipments disagreeing with each other. The NY PDF is compiled data with no uncertainty information encoded, so there is no spread to draw and every New York ribbon has a hard edge.

### Why there is no shipment data

Of the twenty-three Market News movement reports, not one carries produce grown in New York. The eastern offices look promising by name and are not: Philadelphia and Washington are import terminals, reporting fruit arriving at a port rather than leaving a farm. Philadelphia lists 1,567 apple rows across 2019–2024 and every one of them is from Chile, New Zealand, China or Argentina.

The only New York fruit and vegetable reports Market News publishes are terminal market _prices_, which are rejected here for the same reason they are rejected for California: counting price quotes measures how long a crop is offered, not how much of it arrives.

## The USDA Pomological Watercolor Collection

The produce pictures are plates from the [USDA Pomological Watercolor Collection](https://search.nal.usda.gov/discovery/collectionDiscovery?vid=01NAL_INST:MAIN&collectionId=81279629860007426), around 7,500 paintings made between 1886 and 1942 to record fruit varieties before colour photography could do the job. They are held by the National Agricultural Library — the same department that publishes the shipment data the seasons come from.

Each plate is chosen for locality. For example, every plate on the SF Bay Area poster was painted from fruit grown in or near the districts its data comes from — a Napa grape, a Vacaville plum, a Santa Clara cherry — and the sheets carry the town and date in the artist’s own hand.

Finding local plates was only possible due to a third party site, [pomological.art](https://pomological.art/), making its collection browsable by where each specimen was grown. The original source archive is indexed by accession number and little else, so there is no way to ask it for fruit grown near a particular place.

The scans are cream paper with a black scan border, so each is cropped in past that border, scaled down and re-encoded, then faded at its edges where it meets the page. Nothing is retouched. The originals are public domain; terms are on the [licenses page](/about/licenses).

Where they sit on the poster is deterministically chosen. The chart is measured for whatever space the crops leave empty, and plates are heuristically fitted into the largest gaps available.
