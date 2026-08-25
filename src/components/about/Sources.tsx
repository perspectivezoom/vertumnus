import { Link } from 'react-router';

import {
  ExternalLink,
  Heading,
  Subheading,
  LINK_CLASS,
  Notice,
  repoDir,
  repoFile,
  Article,
  Body,
  SectionTitle,
} from '@/src/components/about/Prose';

export function Sources() {
  return (
    <Article>
      <Notice label="AI usage">
        <p>
          Claude wrote the first pass of the copy on this page, and I rewrote the entire first
          section, with progressively less rewriting further down.
        </p>
        <p>
          See the{' '}
          <Link to="/about/ai" className={LINK_CLASS}>
            AI section
          </Link>{' '}
          for AI usage in general.
        </p>
      </Notice>

      <SectionTitle>Sources</SectionTitle>
      <Body>
        <p>
          Vertumnus attempts to accurately capture local seasonality of produce. I (and Claude) have
          discovered that this is not only inherently fuzzy to represent, but also difficult to get
          data for.
        </p>
        <p>
          Due to the locality, each region has different data sources. In SF, we are relying on
          specific USDA shipping data, whereas in NY we are relying on a published NY agriculture
          harvest chart. Both of them have shortcomings in terms of fidelity, in addition to the
          inherent gaps of the subject matter.
        </p>
        <p>
          Really, this entire project is somewhat questionable in terms of intended audience:
          Regular farmers&rsquo; market attendees will simply build up this instinct over time. This
          is only useful for the intermittent attendees and newcomers. But, y&rsquo;know, I happen
          to be one of those.
        </p>

        <Heading>San Francisco Bay Area</Heading>
        <p>
          While the initial vision was to have bespoke sources for each crop (and the project is
          still set up to accommodate sources per crop), as a first approximation, the first attempt
          to chart SF produce looks at{' '}
          <ExternalLink href="https://www.ams.usda.gov/market-news/fruits-vegetables">
            USDA Market News
          </ExternalLink>{' '}
          crop movement reports from local regions. This data source has its flaws both in terms of
          granularity and as an accurate proxy, but it&rsquo;s the best approximation that
          I&rsquo;ve encountered so far.
        </p>
        <p>
          USDA Market News raw crop movement data is gathered for multiple years and massaged with
          simple heuristics to come up with the derived data in the poster. This is an inherently
          fuzzy process, with different years starting early or late due to weather or other
          factors. I&rsquo;ve tried to encode this uncertainty with the half opacity regions, where
          they were at peak availability for some years and not others.
        </p>

        <Subheading>USDA Market News Data</Subheading>
        <p>
          <ExternalLink href="https://www.ams.usda.gov/market-news/fruits-vegetables">
            USDA Market News
          </ExternalLink>{' '}
          <em>movement</em> reports, which state how much of a commodity shipped from a growing
          district in a given week. Two reports carry the Bay Area&rsquo;s crops between them:
          Fresno (FR_FV170) for berries, stone fruit and grapes, and El Centro (EL_FV170) for
          vegetables and melons. The names are somewhat misleading in that both locations cover
          produce for the whole state, and each is simply the office that publishes those
          commodities. You have to additionally filter their movement data by region to get local
          movements.
        </p>
        <p>
          Market News also publishes <em>price</em> reports, which cover far more crops and are
          tempting for that reason. They are not used here. Empirically, they seem to overstate the
          availability of the crop: on strawberries it generates peak availability of roughly weeks
          18&ndash;48, most of the year.
        </p>
        <p>
          Data is collected for the years 2019&ndash;2024. Every response is cached verbatim in{' '}
          <ExternalLink href={repoDir('data/raw/mars/ca')}>data/raw</ExternalLink>, so the
          derivation can be rerun and checked without an API key, and so an auth-walled source stays
          reproducible.
        </p>

        <p>
          As the goal is to capture regional seasonality, we have to filter down statewide data down
          to what you would see in a farmers&rsquo; market. California&rsquo;s strawberries peak
          statewide about seven weeks before Salinas-Watsonville&rsquo;s own crop does, because the
          southern districts out-ship it and harvest earlier.
        </p>
        <p>
          So each region counts only the districts a vendor could drive in from. For the SF Bay
          Area, Claude has chosen the Salinas-Watsonville, San Joaquin Valley and Central District
          regions. There is undoubtedly error on both sides in picking these regions. The list is
          declared in{' '}
          <ExternalLink href={repoDir('data/regions/crops')}>
            the region&rsquo;s crop list
          </ExternalLink>
          .
        </p>

        <Subheading>How a season is derived</Subheading>
        <p>
          Each crop&rsquo;s shipments are bucketed into weeks, and split into annual seasons bounded
          by the lowest volume weeks. Then each season is judged on its own, by how much of its
          harvest each week carried.
        </p>
        <p>
          After experimenting with different thresholds, it seemed reasonable for &ldquo;peak&rdquo;
          to be defined as the weeks that together ship half the year&rsquo;s crop, and the
          available season as the weeks that ship ninety percent. After this initial determination,
          the six seasons are combined, by vote. For peak weeks that only get partial voting, an
          uncertain peak concept is displayed.
        </p>
        <p>
          A gap of a few weeks within a single season is bridged, since seasons rarely align exactly
          and a brief disagreement is noise rather than a break. On the other hand breaks across
          different seasons are deliberately <em>not</em> smoothed over, and are captured by
          uncertain regions. The whole derivation can be found at{' '}
          <ExternalLink href={repoFile('data/regions/sources/mars.ts')}>
            sources/mars.ts
          </ExternalLink>
          .
        </p>

        <Subheading>Caveats</Subheading>
        <ul className="flex flex-col gap-3">
          <li>
            <strong className="font-medium text-neutral-900">Shipment volume is a proxy.</strong> It
            measures wholesale movement of produce out of a district, which is not exactly what will
            show up at a farmers&rsquo; market.
          </li>
          <li>
            <strong className="font-medium text-neutral-900">
              Seasons drift, so a definite range is unattainable.
            </strong>{' '}
            Depending on annual weather, global warming, etc, each year will start and stop
            differently. Uncertainty bands try to encode this information, but a static poster
            can&rsquo;t know if this year happens to be an outlier.
          </li>
          <li>
            <strong className="font-medium text-neutral-900">Citrus is missing.</strong> The winter
            months are conspicuously empty. Citrus ships in enormous volume — oranges alone out-ship
            everything else on the poster — but every citrus commodity is reported on the same four
            or so dates a year, so there is no weekly signal to derive a season from. Those rows are
            periodic aggregates, not shipments. It needs a different source.
          </li>
        </ul>

        <Heading>New York</Heading>
        <p>
          New York produce does not seem to be derivable from USDA market shipping reports. Luckily,
          the New York State Department of Agriculture published a PDF{' '}
          <ExternalLink href="http://agriculture.ny.gov/harvest-chart">
            From A(pples) to Z(ucchini)
          </ExternalLink>{' '}
          in 2016, which, unlike SF publications that I've looked at, is usable as a data source
          directly, with no number crunching whatsoever.
        </p>

        <Subheading>
          The New York State Department of Agriculture and Markets harvest chart
        </Subheading>
        <p>
          <ExternalLink href="http://agriculture.ny.gov/harvest-chart">
            From A(pples) to Z(ucchini)
          </ExternalLink>
          , published by the New York State Department of Agriculture and Markets in 2016, contains
          exactly the information that we want for our customizable poster. It reports both the peak
          and available bands, and at week level granularity, rather than month level granularity.
          Good job, New York. The poster alone contains all the data that I wanted for San Franciso
          in the first place, and as such, you can think of the vertumnus NY poster as an
          unashamedly thinly customizable shell of the data contained in this PDF.
        </p>

        <Subheading>Caveats</Subheading>
        <ul className="flex flex-col gap-3">
          <li>
            <strong className="font-medium text-neutral-900">It rests on a single source.</strong>{' '}
            GrowNYC publishes a Greenmarket harvest calendar that looks like corroboration and is
            not &mdash; it is the same Pride of New York chart, redistributed.{' '}
            <ExternalLink href="https://www.nass.usda.gov/Quick_Stats/Ag_Overview/stateOverview.php?state=NEW+YORK">
              USDA NASS
            </ExternalLink>{' '}
            confirms that apples, grapes, sweet corn and a handful of others are grown at scale, but
            it publishes only sixteen commodities for the state and says nothing about most of this
            list.
          </li>
          <li>
            <strong className="font-medium text-neutral-900">No uncertainty data.</strong> The SF
            Bay Area&rsquo;s half opacity bands come from six years of shipments disagreeing with
            each other. The NY PDF is compiled data with no uncertainty information encoded, so
            there is no spread to draw and every New York ribbon has a hard edge.
          </li>
        </ul>

        <Subheading>Why there is no shipment data</Subheading>
        <p>
          Of the twenty-three Market News movement reports, not one carries produce grown in New
          York. The eastern offices look promising by name and are not: Philadelphia and Washington
          are import terminals, reporting fruit arriving at a port rather than leaving a farm.
          Philadelphia lists 1,567 apple rows across 2019&ndash;2024 and every one of them is from
          Chile, New Zealand, China or Argentina.
        </p>
        <p>
          The only New York fruit and vegetable reports Market News publishes are terminal market{' '}
          <em>prices</em>, which are rejected here for the same reason they are rejected for
          California: counting price quotes measures how long a crop is offered, not how much of it
          arrives.
        </p>

        <Heading>The USDA Pomological Watercolor Collection</Heading>
        <p>
          The produce pictures are plates from the{' '}
          <ExternalLink href="https://search.nal.usda.gov/discovery/collectionDiscovery?vid=01NAL_INST:MAIN&collectionId=81279629860007426">
            USDA Pomological Watercolor Collection
          </ExternalLink>
          , around 7,500 paintings made between 1886 and 1942 to record fruit varieties before
          colour photography could do the job. They are held by the National Agricultural Library
          &mdash; the same department that publishes the shipment data the seasons come from.
        </p>
        <p>
          Each plate is chosen for locality. For example, every plate on the SF Bay Area poster was
          painted from fruit grown in or near the districts its data comes from &mdash; a Napa
          grape, a Vacaville plum, a Santa Clara cherry &mdash; and the sheets carry the town and
          date in the artist&rsquo;s own hand.
        </p>
        <p>
          Finding local plates was only possible due to a third party site,{' '}
          <ExternalLink href="https://pomological.art/">pomological.art</ExternalLink>, making its
          collection browsable by where each specimen was grown. The original source archive is
          indexed by accession number and little else, so there is no way to ask it for fruit grown
          near a particular place.
        </p>
        <p>
          The scans are cream paper with a black scan border, so each is cropped in past that
          border, scaled down and re-encoded, then faded at its edges where it meets the page.
          Nothing is retouched. The originals are public domain; terms are on the{' '}
          <Link to="/about/licenses" className={LINK_CLASS}>
            licenses page
          </Link>
          .
        </p>
        <p>
          Where they sit on the poster is deterministically chosen. The chart is measured for
          whatever space the crops leave empty, and plates are heuristically fitted into the largest
          gaps available.
        </p>
      </Body>
    </Article>
  );
}
