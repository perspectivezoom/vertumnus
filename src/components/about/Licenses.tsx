import { Link } from 'react-router';

import {
  ExternalLink,
  Heading,
  LINK_CLASS,
  Notice,
  REPO,
  Article,
  Body,
  SectionTitle,
} from '@/src/components/about/Prose';
import { DEPENDENCIES, TYPEFACES } from '@/src/lib/licenses';

export function Licenses() {
  return (
    <Article>
      <Notice label="AI usage">
        <p>
          Claude wrote the first pass of the copy on this page. I subsequently rewrote most of it,
          but probably 25% of the original wording remains.
        </p>
        <p>
          See the{' '}
          <Link to="/about/ai" className={LINK_CLASS}>
            AI section
          </Link>{' '}
          for AI usage in general.
        </p>
      </Notice>

      <SectionTitle>Licenses</SectionTitle>
      <Body>
        <p>
          Vertumnus is open source, on <ExternalLink href={REPO}>GitHub</ExternalLink>.
        </p>
        <p>
          Vertumnus code is under the{' '}
          <ExternalLink href="https://opensource.org/license/isc-license-txt">
            ISC licence
          </ExternalLink>
          .
        </p>
        <p>
          Vertumnus derived data (which crops each poster shows, which growing districts count as
          near enough to supply it, and the derived seasons themselves) is dedicated to the public
          domain under{' '}
          <ExternalLink href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</ExternalLink>
          , allowing for arbitrary reuse without asking and without attribution.
        </p>

        <hr className="border-neutral-300" />

        <p>
          Vertumnus builds off of other people&rsquo;s work, a mixture of either public domain,
          openly licensed, or of unclear license. Acknowledgements of that work and their license
          disclosures are as follows:
        </p>

        <Heading>Data and artwork</Heading>
        <p>
          SF Bay Area crop seasonality is derived from{' '}
          <ExternalLink href="https://www.ams.usda.gov/market-news/fruits-vegetables">
            USDA Agricultural Marketing Service
          </ExternalLink>{' '}
          Market News shipment reports.
        </p>
        <p>
          The watercolours are from the{' '}
          <ExternalLink href="https://search.nal.usda.gov/discovery/collectionDiscovery?vid=01NAL_INST:MAIN&collectionId=81279629860007426">
            USDA Pomological Watercolor Collection
          </ExternalLink>
          , held by the National Agricultural Library. They are cropped, scaled and re-encoded here,
          but not retouched. More detail on their usage can be found in the{' '}
          <Link to="/about/sources" className={LINK_CLASS}>
            sources page
          </Link>
          .
        </p>
        <p>
          Both of those are works of the United States federal government and in the public domain
          &mdash; no permission is needed to use them, and none is claimed here. They are credited
          because the project cites what it is built from, not because any licence demands it.
        </p>
        <p>
          New York seasonality is a different situation. It comes from{' '}
          <ExternalLink href="http://agriculture.ny.gov/harvest-chart">
            a chart published by the New York State Department of Agriculture and Markets
          </ExternalLink>
          , and the rule that puts federal works in the public domain covers federal works only. New
          York&rsquo;s agencies differ from each other on the question, and this Department
          publishes no copyright terms in either direction.
        </p>
        <p>
          This project takes from the chart a set of factual information. Facts are not subject to
          copyright in the United States, so the seasons drawn from them are published here without
          asking permission.
        </p>
        <p>
          The repository additionally keeps a cached copy of the chart PDF as an original truth to
          rederive those facts. That PDF copy is their document and subject to copyright, and it is
          kept on the understanding that we will take it down if the Department preferred that a
          github repo not redistribute said document.
        </p>

        <Heading>Typefaces</Heading>
        <p>
          Fonts are served from this site as WOFF2 files, so a copy of their licensing is included
          here.
        </p>
        {TYPEFACES.map((face) => (
          <div key={face.name} className="flex flex-col gap-1">
            <p>
              <ExternalLink href={face.url}>
                <strong className="font-medium">{face.name}</strong>
              </ExternalLink>{' '}
              — {face.role}.
              <br />
              {face.designer}. {face.license}.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-green-700 hover:text-green-900">
                Read the licence
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded bg-neutral-50 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-neutral-600">
                {face.text}
              </pre>
            </details>
          </div>
        ))}

        <Heading>Software</Heading>
        <p>
          Although not necessary to disclose, the following libraries were used in the creation of
          this site.
        </p>
        <ul className="flex flex-col gap-2">
          {DEPENDENCIES.map((dep) => (
            <li key={dep.name} className="flex flex-wrap items-baseline gap-x-2">
              <ExternalLink href={`https://www.npmjs.com/package/${dep.name}`}>
                <span className="font-medium">{dep.name}</span>
              </ExternalLink>
              <span className="text-xs text-neutral-400 tabular-nums">{dep.version}</span>
              <span className="text-xs text-neutral-400">{dep.license}</span>
              {dep.what && <span className="text-neutral-600">— {dep.what}</span>}
            </li>
          ))}
        </ul>
      </Body>
    </Article>
  );
}
