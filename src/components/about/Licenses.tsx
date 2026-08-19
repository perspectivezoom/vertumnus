import { Section } from "@/src/components/about/AboutShell";
import { DEPENDENCIES, TYPEFACES } from "@/src/lib/licenses";

/** What the site is built on, and the notices that have to travel with it. */
export function Licenses() {
  return (
    <Section title="Licenses">
      <p>
        Vertumnus is open source; the source is on{" "}
        <Ext href="https://github.com/perspectivezoom/vertumnus">GitHub</Ext>.
      </p>

      <hr className="border-neutral-300" />

      <p>
        Vertumnus builds off of other people&rsquo;s work, all of it either
        public domain or openly licensed. What follows are the notices that
        travel with that work.
      </p>

      <Heading>Data and artwork</Heading>
      <p>
        Crop seasonality data is derived from{" "}
        <Ext href="https://www.ams.usda.gov/market-news/fruits-vegetables">
          USDA Agricultural Marketing Service
        </Ext>{" "}
        Market News shipment reports.
      </p>
      <p>
        The watercolours are from the{" "}
        <Ext href="https://usdawatercolors.nal.usda.gov/">
          USDA Pomological Watercolor Collection
        </Ext>
        , painted between 1886 and 1942 and held by the National Agricultural
        Library.
      </p>
      <p>
        Both are works of the United States government and in the public domain
        — no permission is needed to use them, and none is claimed here. They
        are credited because the project cites what it is built from, not
        because any licence demands it.
      </p>
      <p>
        The plates on each poster were painted from fruit grown in the region,
        which was only findable because{" "}
        <Ext href="https://pomological.art/">pomological.art</Ext> made its
        collection browsable by map.
      </p>

      <Heading>Typefaces</Heading>
      <p>
        Fonts are served from this site as WOFF2 files, so a copy of their
        licensing is included here.
      </p>
      {TYPEFACES.map((face) => (
        <div key={face.name} className="flex flex-col gap-1">
          <p>
            <Ext href={face.url}>
              <strong className="font-medium">{face.name}</strong>
            </Ext>{" "}
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
        Although not necessary to disclose, the following libraries were used in
        the creation of this site.
      </p>
      <ul className="flex flex-col gap-2">
        {DEPENDENCIES.map((dep) => (
          <li key={dep.name} className="flex flex-wrap items-baseline gap-x-2">
            <Ext href={`https://www.npmjs.com/package/${dep.name}`}>
              <span className="font-medium">{dep.name}</span>
            </Ext>
            <span className="text-xs text-neutral-400 tabular-nums">
              {dep.version}
            </span>
            <span className="text-xs text-neutral-400">{dep.license}</span>
            {dep.what && <span className="text-neutral-600">— {dep.what}</span>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-4 text-lg font-semibold text-neutral-900">{children}</h2>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-green-700 underline underline-offset-2 hover:text-green-900"
    >
      {children}
    </a>
  );
}
