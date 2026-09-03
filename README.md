# vertumnus

[vertumnus](https://vertumnus.fyi) is a tool to create customized printable posters of what's in season at local farmers' markets. It lives at [vertumnus.fyi](https://vertumnus.fyi), at least, as long as the domain name and Github Pages remain affordable.

![cropped vertumnus poster for the San Francisco Bay Area](https://github.com/perspectivezoom/vertumnus/blob/main/src/images/og-sfbay.png?raw=true)

## Why

I've written [a whole page](https://vertumnus.fyi/about) about it. But the short version is: I wanted to do a silly side project, and I mistakenly thought that dry farmed early girl tomatoes were in season way earlier than I thought they actually were, so why not spend a disproportionate amount of time making a poster to tell me that?

## How it works

The poster itself is React SVG elements written with d3, with the watercolor pictures (`plates` in the codebase) doing some simple gap finding heuristic for placement. Data is pre generated via a set of scripts.

## Running it

From a clean `git clone`, it should be as simple as `bun install` + `bun run dev`.

## License

vertumnus itself is [ISC](https://en.wikipedia.org/wiki/ISC_license) licensed, with any original data findings [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) licensed. The licenses of its dependencies can be found at the vertumnus [/about/licenses](https://vertumnus.fyi/about/licenses) page.
