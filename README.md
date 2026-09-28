# lrod.dev

Professional portfolio — built with Astro. Zero client JavaScript, ~10KB HTML with CSS inlined.

**Live:** [lrod.dev](https://lrod.dev)

## Stack

- **Astro 5** — static site generator, zero JS output
- **Vanilla CSS** — small token-based design system, inlined
- **GitHub Pages** — hosting via Actions workflow

## Design

- Monospace throughout (system `ui-monospace` stack, no web fonts), content capped at 72ch
- The page sits in a bordered window with a flat offset shadow, on a dotted "desk" backdrop
- Dark-first palette with one accent (jade `#5fbf9b`) used only for links, focus, and markers
- Dashed rules between sections; no motion beyond hover underlines

Tokens live at the top of `src/styles/global.css`.

## Build output

```
dist/index.html    ~10KB (entire page, CSS inlined, zero JS)
```

## Project structure

```
src/
├── components/
│   ├── Hero.astro            # Name, role, links
│   ├── Experience.astro      # What I work on
│   ├── FeaturedWork.astro    # Featured projects
│   ├── ProjectCard.astro     # Individual project card
│   ├── About.astro           # Short bio
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