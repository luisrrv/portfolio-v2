# rodluis.com

Personal portfolio — built with Astro. Zero client JavaScript, sub-500ms load.

**Live:** [rodluis.com](https://rodluis.com)

## Stack

- **Astro 5** — static site generator, zero JS output
- **Vanilla CSS** — custom properties, no preprocessor, ~4KB inlined
- **GitHub Pages** — hosting via Actions workflow

## Project structure

```
src/
├── components/
│   ├── Hero.astro            # Name reveal animation + social links
│   ├── FeaturedWork.astro    # Project card grid
│   ├── ProjectCard.astro     # Individual project card
│   ├── About.astro           # Bio + tech keywords
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