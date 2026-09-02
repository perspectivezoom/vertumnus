# Reflections on AI usage for vertumnus

[vertumnus](/) was created in a single 700 prompt Claude Opus 5 session over a 40 day period. A complete transcript of the session, including search, chronological chapters, and notable cross-chapter topics, can be found at [/about/transcript](/about/transcript). This page is a handwritten account describing and reflecting the usage of AI in 2026.

In general, while I found AI indispensible for the scoping and execution of the project, its default code quality is still suspect. I remain uncomfortable with relinquishing commit-by-commit review, for as long as I am feasibly able to, whilst acknowledging that surrender is inevitable.

## Project details

For those coming to this page directly, [vertumnus](/) is a static site tool to create customized printable posters of what's in season at local farmers' markets. You can read more about the project itself on the [/about](/about) page, but for the purposes of this discussion, you can black box it as: "a simple webapp with sufficiently nontrivial data and presentation problems". Or [visit the page](/) and try it out; it'll take you, like, 30 seconds tops to understand what it's all about.

From a technical perspective, the project is written in Bun, the poster React svg, with a small set of typescript scripts to reproducibly fetch and process produce seasonality data.

The rough order of the project was:

1. Prototyping with faked data
2. Finding good San Francisco data
3. Designing with the USDA Pomological Watercolor Collection
4. Generalizing the poster with New York data
5. Building out the AI session [/about/transcript](/about/transcript) page
6. Polish and publishing

## Unambiguous Claude wins

To be very clear: This project would never have gotten started without knowing Claude's capabilities beforehand, nor would I have completed this project without Claude's help (for some definitions of complete). The lowered friction of execution was instrumental in getting this to the finish line, especially dealing with historically persnickity bugbears like image placement and data processing. Some notable wins that I would like to highlight, in order of importance descending:

### Switching from streamgraph to ridgeline charting

My original concept was a little more ambitious than the current version. I wanted to fill in all available vertical space in what Claude identified as a streamgraph chart. The streamgraph looked fine with fake data, but after populating the graph with real, spikier data, the streamgraph was far too wiggly to make any sense of the proportions. Claude proposed a pivot to ridgeline instead, and after prototyping it out, I have to admit, it's the right tool for the job. Claude also took care of all the D3 setup fiddliness that I remember not enjoying in the past.

### Suggesting and placing the USDA Pomological Watercolor Collection

After getting the ridgeline charts looking mostly correct, the poster still felt pretty sterile. I suggested some half baked ideas, and it somehow suggested the USDA Pomological Watercolor Collection, which was the vibe that I didn't know I wanted. While switching to ridgeline was the most important original insight, making use of the watercolor collection definitely feels the most inspired; it defines the look and feel of the poster as a whole.

### Finding and heuristically interpeting the USDA Market News Data

For San Francisco, I was searching for sub-month granularity produce seasonality. After a couple of dead ends, Claude discovered the USDA Market News shipping data. As a data source, it doesn't provide what I wanted out of the box. There are both outbound and inbound shipments, and it turned out that the inbound shipments were less accurate; San Francisco imports lots of produce from lots of different areas. Outbound shipments from regions surrounding San Francisco seemed to be the most accurate, and even then, Claude had to perform a fair amount of data massaging to eliminate one week gaps and smooth out spikes. I think, technically speaking, I could've discovered the data source and performed this step myself, but the amount of continuous iteration on the data would've taken me five times as long to execute, and I probably would have given up halfway through the process.

## Gameplay loop

This project mimics the level of AI coding that I've been comfortable with professionally: having AI write the code, but leaving the code unstaged for me to review. There is some preliminary training that you have to do at the beginning of the session, to push for planning for small commits, to work on those commits serially, and to not ever `git add` or `git commit` and wait for review, but once it gets the hang of the process, Claude seems to retain this workflow with only the occasional reminder.

I have colleagues that have an AI agent spin off and write the code, commit, and even submit the PR (complete with AI playwright screenshots and video), but in my experience its code quality is not quite there yet for me to trust Claude Opus 5 to submit code unsupervised. Some concrete examples of code quality misses, in order of prominence desc, but importance _asc_:

### Overly verbose comments

I hope this this is an affliction specific to Claude Opus 5, but boy does it write lots of comments. Way too many comments, and it doesn't seem to learn to write less. About 50% of the comments that it writes has a kernel of truth that is worth preserving, except that it writes it in 3 lines instead of 1.

The other 50%, it seems to want to preserve Chesterton's Fence knowledge about some code decision that we made, except the decision is so obscure that it's irrelevant. In reaction to an unimportant header id edge case, I had Claude toy around with different ways to render markdown, whereupon it discovered that the most obvious solution worked, and comment that the edge case was the reason. I mean, it was the orgination trigger, but the edge case is not the reason to go with the most standard way to render markdown. At best, this is something you write in a PR / commit message, for when you perform `git blame` code archeology.

### Component composition

My taste in React component architecture seems to be one level too strict, and I'm consistently telling Claude to break up a component into child components, and to convert the existing large component to an "orchestration" component, whose only job is to layout and render the child components. My poor brain can only load up so much context at once, and I'm constantly trying to "push complexity leafward" so that, from a readability perspective, I continually abstract away details that I don't need to think about at that component level. Claude seem to optimize for prototyping, where everything is in one gigantic component and it's easier to modify because concepts are more ephemeral.

Conversely, Claude is one notch too promiscuious with creating new files. Ask Claude to extract out a constant, and sometimes it will make a new `.ts` file with the constant as its sole line. If we were trying to DRY up the constant across two files, sure that makes sense, but there's usually a preexisting file to append, not necessarily making a new file. There's a real readability cost to having the code split up into an ocean of small one line files, and I think Claude undervalues the human discoverability of a long file with many related sibling components and helper functions.

### Data model and naming haste

The most important concern for me, though, is that Claude seems to make naming and data model assumptions at the drop of a hat, when they're the most important details to discuss and confirm before execution.

When making the [/about/transcript](/about/transcript) interface, Claude glommed together all prompt responses into a single string blob, instead of an array separating out responses and tool calls. This decision affected not just the interface, but also the data pipeline transforming the raw session response, and in a more complex project would be harder to change. It also assumed the model name (Exchange), which was a reasonable choice, but the nuances of getting the model name right tend to have outsized downstream effects. Ideally, before starting out, Claude would have some discussion on the underlying data model that we're projecting.

## Bog standard

To be fair, the experiences that I've had are the standard Claude Opus 5 defaults. I know that others have deeply customized their AI coding experience, with CLAUDE.md and skills and hooks, and I have no doubt that my code quality concerns would be mitigated with a little bit of tinkering. But as I get older, I am more and more appreciative on how the choice of defaults is part of the product. There was a time that I heavily optimized my dotfiles and aliases, and would, for example, shorthand `gco` for `git checkout`. Multiple years and laptops later, I stopped bothering to migrate them, and am pretty okay with typing out `git checkout` each time. Defaults are part of the product.

## Inexorable progress

My suspicion is that better code quality with Claude by default is already technically possible, but too expensive to be turned on for everyone. At my former place of employment, we evaluated multiple AI PR review solutions, and the one that did best (by far) ended up going out of business due to token economics. Assuming that's true, the AI version of Moore's Law suggests it's just a matter of time before my code quality concerns are resolved, and I become comfortable with AI to let loose without closer supervision.

For all my concerns, I am also very cognizant that my development workflow was completely different just three years ago, where everything was coded by hand. I am at least twice as productive as I was back then, at a basal level, with huge spikes in productivity for certain usually-migration-related sloggy work that was just slightly too complicated for a jscodeshift rule.

As such, I consider my current workflow an intermediary shim solution, an in-between time when AI was good but not good enough, and I fully expect to, within a year or two, "embrace the agent". As such, I view this project as a snapshot in time, a time capsule of sorts, within the transition state of AI adoption.

## Historical parallels

As scary as it is to have your domain knowledge threatened to be obsolete, the way I see it is that the industry as a whole is moving up one layer of abstraction.

I'm reminded of early video game consoles, circa the Super Nintendo era, where deep knowledge of circuitry and tv hardware was required to optimize animation and efficiently render graphics to the tv. This is the era where [Greg Walsh](https://www.beyond3d.com/content/articles/15/) (not John Carmack) had to "invent" the fast inverse square root for Quake, and where fog of war was invented as a story element to mask draw distance limitations. Some of those limitations have disappeared entirely, while others have diminished to the point where they're tertiary concerns.

I have never professionally coded in assembly, nor in C++. There are developers before me who have spent their entire lifetime building up domain knowledge that nobody uses anymore. In the vertumnus webapp, there's every chance that someone versed in assembly could take a look at the internals and discover some clever efficient bitshift refactor, except that it doesn't matter at all: computers are fast enough that the refactor is not worth it, except as an optimization that can be statically analyzed and applied everywhere. Assembly expertise has been commodified into either automated scalability or not at all. The world has moved on.

Really, it would be hypocritical of me to assume that typescript, like assembly before it, would not get commodified. And, just how assembly programmers of old must have felt when looking at compiler outputted assembly, I will find criticism with AI generated typescript. But, the funny thing is, I don't know how valid these criticisms are, because my underlying assumption is that typescript code should be _human readable_. And considering how often humans look at assembly, I don't think that assumption will stay true in the long term. In the long run, it's reasonable to think that typescript's primary audience will become other AI agents, not humans.

What that looks like exactly, I don't know, but also, I hope I won't care, because (hopefully) I'll have moved up one layer of abstraction.
