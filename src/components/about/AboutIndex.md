# About vertumnus

[vertumnus](/) is a tool to create customized printable posters of what's in season at local farmers' markets.

Named for the [Roman god of seasons, change and plant growth](https://en.wikipedia.org/wiki/Vertumnus).

## Sections

Parts of vertumnus deserve to be broken out into their own sections, which are listed here and in the navbar:

<Sections />

## Motivation

Static versions of vertumnus exist already.

The best I've seen is this New York State Department of Agriculture [harvest chart](http://agriculture.ny.gov/harvest-chart) (PDF), which I discovered halfway through the project and shamelessly stole as a data source for the New York region. To my relief and validation, it provides produce data for both "harvest" and "availability" periods, with sub-month granularity, and although there's no data attribution, it's reasonable to assume that this data is localized to the New York agricultural region.

Compared to the New York harvest chart, the San Francisco Foodwise [seasonality chart](https://foodwise.org/eat-seasonally/seasonality-charts/seasonality-chart-fruit-and-nuts) also features "In season" and "In the market" availabilities, but its granularity is per month.

In both charts, there is no affordance for produce customization, nor is there an attempt to make the chart aesthetically pleasing. Which is fine for the chart's goals: They're designed as reference material to be handed out as leaflets, not wall art. I don't know if vertumnus is quite good enough to be wall art, but it's as close as I can get in 40 days.

## Target audience

If you think about it for only a moment, a static poster is really a poor solution for looking up seasonal produce. Due to annual variation, no static artifact can accurately capture the seasonality of the crop right now; you'd need something dynamic, like an eInk portrait that updates periodically. With a static image, I have to account for uncertainty and introduce a shaded "peak only for certain years" level.

Really, a weekly email from the farmers' market, one that tells you what's there this week, is probably the right solution. If I signed up for those things. (I don't want to receive 20 emails over the summer, only one of which I'll action upon.)

Regular farmers' market attendees won't need vertumnus either; they've already developed an intuition for what they want and when it appears.

As such, the target audience for this project is vanishingly small: Casual poseurs like myself who only occasionally go to the farmers' market and who refuse to sign up for email newsletters.

But that's the point of a side project. It's refreshing to work on something that you know is a bit silly to begin with, and not have to scope everything through the lens of providing business value.

## Prior art

Here's the thing: I've an irrational fondness for informational wall art. I have the [xkcd money poster](https://xkcd.com/980) on my bathroom wall, and I'd like to think that I gained some osmosis intuition from looking at it occasionally while brushing my teeth.

As a child, I spent multiple hours looking through Dorling Kindersley [cross section books](https://www.goodreads.com/book/show/1120818) and a giant cardboard atlas [It's a Big, Big World](https://www.goodreads.com/book/show/474500). It's where I learned that Argentina has cowboys.

Maybe I'm not looking in the right places, but I don't see a lot of informational art nowadays. Back in the heyday of internet enabled art (when orignal artists could still make a living by designing [Woot](https://www.woot.com/about) t-shirts) there was a PopChart poster called [The Various Varieties of Vegetables](https://www.google.com/search?q=popchart+The+Various+Varieties+of+Vegetables&udm=2) that has since disappeared. Maybe they haven't disappeared, but rather the creative energy has simply moved on to other mediums: [Bartosz Ciechanowski's diagrams](https://ciechanow.ski) seem to be the closest spiritual successor to those 90s era children's books.

## Left undone

There's incentive for farmers' markets to show produce as being available as long as possible. For any given week, you want the most produce variety available. In my experience, for certain crops, there's a narrow window of peak ripeness. White peaches seem to be the most tempermental: in the summer there seems to be a single week where they're starting to get good, the next week is truly peak, and the following week after there is already a marked decline. With modern farming techniques, the availablity of white peaches still lingers on for a good few weeks afterwards, but they never again hit quite the same.

Ideally this poster would show this narrow ~3 week white peach band to the best of its ability, but I haven't found the appropriate data source that contains per varietal seasonality. The bands on the poster are appropriately wide, because they combine many varietals together, and hides a series of peaks from one varietal to the next. I don't particularly care about tomatoes in general. I care about those dry farmed early girl tomatoes that were delicious with nothing more than salt and olive oil.

The USDA Market News data also seems to be suspiciously light with vegetable data.

## A snapshot in time

I fully expect this project to be obsolete in a few years' time, if not already. At some point, AI should be good enough to make a customized poster with exactly the data you want, in exactly the art style you want, without hallucinating data. Consider this project a bit of a time capsule, capturing a moment in between, before everything changed yet again.
