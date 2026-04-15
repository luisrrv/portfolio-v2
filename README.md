# rodluis.com

Personal portfolio — built with Astro. Zero client JavaScript, 17KB total page weight.

**Live:** [rodluis.com](https://rodluis.com)

## Stack

- **Astro 5** — static site generator, zero JS output
- **Vanilla CSS** — HIG+LiquidGlass-aligned design system, ~5KB inlined
- **GitHub Pages** — hosting via Actions workflow

## Design

CSS-only design system aligned with [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/):

- Dark mode layered elevation (no borders, background differentiation)
- Apple's opacity-based text hierarchy
- Spring-curve transitions (`cubic-bezier(0.2, 0.8, 0.2, 1)`)
- 44px minimum tap targets
- Pill-shaped tags, 0.5px hairline separators
- Scroll-driven hero parallax and section marker rotation (CSS `animation-timeline`)
- `prefers-reduced-motion` respected throughout

## Build output

```
dist/index.html    17KB (entire page, CSS inlined, zero external requests)
```

## Project structure

```
src/
├── components/
│   ├── Hero.astro            # Branded L. → Luis Rodriguez reveal
│   ├── FeaturedWork.astro    # Project card grid
│   ├── ProjectCard.astro     # Individual project card
│   ├── About.astro           # Bio + hoverable tech keywords
│   ├── OtherProjects.astro   # Compact project list
│   └── Footer.astro
├── content/
│   └── projects.json         # All project data
├── layouts/
│   └── Base.astro            # HTML shell, meta, SEO, structured data
├── pages/
│   └── index.astro           # Page assembly
└── styles/
    └── global.css            # Design system + enhancements
```

## Running locally

```bash
npm install
npm run dev       # localhost:4321
npm run build     # outputs to dist/
```

## Deploy

Push to `main` triggers GitHub Actions → builds → deploys to GitHub Pages.

## Author

[luisrrv](https://github.com/luisrrv)