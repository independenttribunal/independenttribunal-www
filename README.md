# Independent Tribunal — WWW

The public landing page for Independent Tribunal: rapid, independent peer resolution for everyday disputes.

This repository contains the informational WWW experience. The interactive application and its backend will live in a separate repository.

Independent Tribunal is currently a work-in-progress demo. There is no active juror network or live dispute service yet.

## Community

- Telegram (most current): [t.me/IndependentTribunal](https://t.me/IndependentTribunal)
- X / Twitter: [@independentTrib](https://x.com/independentTrib)
- WWW source: [independenttribunal/independenttribunal-www](https://github.com/independenttribunal/independenttribunal-www)

## Data first, for humans and AI agents

The Legal affairs hub (timelines, references, policies) lives in [`/data`](data/README.md) as JSON and Markdown. Each push to `main` validates it and rebuilds the pages, plus machine-readable outputs:

- [`/llms.txt`](https://independenttribunal.org/llms.txt): start here if you are an AI agent
- [`/data/index.json`](https://independenttribunal.org/data/index.json): every dataset, with coverage
- [`/legal/`](https://independenttribunal.org/legal/): editorial, terrorism, moderation and privacy policies
- [`/research/`](https://independenttribunal.org/research/): Barclays5, Filton6, the terrorist-connection add-on and Hansard debates, proscription litigation, hunger strikes and Prairieland
- [`Roger Hallam`](https://independenttribunal.org/research/roger-hallam/): selected court record and public background, with judgments separated from reporting and self-description
- [`Mental health in the UK`](https://independenttribunal.org/research/mental-health-uk/): labelled satire and commentary, first-principles questions, dated official figures and benefits-law context
- Open justice: [`Super-injunctions`](https://independenttribunal.org/research/super-injunctions/), [`Anonymity orders`](https://independenttribunal.org/research/anonymity-orders/) (PPT, with the Guardian report), and [`Jigsaw identification`](https://independenttribunal.org/research/jigsaw-identification/) (Craig Murray, including the 2022 appeal)

All six research dossiers, source annotations, Hansard material and the historical brochure commentary are maintained here under Independent Tribunal. Nothing depends on the former Barclays5 repository or subdomain. July 2026 narratives are clearly dated, with subsequent updates presented first. See [`data/README.md`](data/README.md) before updating a dossier.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Run `npm test` to build and verify the rendered pages and generated data. `npm run data` rebuilds just the data outputs.

## Publishing

GitHub Actions publishes `main` to [independenttribunal.org](https://independenttribunal.org/).
`npm run build:pages` exports the homepage and About page, together with the generated research, legal and data pages, into `dist/client` for GitHub Pages.
The root `CNAME` preserves the custom domain. The default build remains compatible with Sites hosting.
