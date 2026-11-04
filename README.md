# Interactive Group Theory

Interactive lessons on molecular symmetry and group theory, published with GitHub Pages:

**https://sunitathyagarajan.github.io/interactive-group-theory/**

## Lessons

- [Water's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/water-vibrations.html): use the C₂ᵥ point group to find the symmetries of H₂O's three vibrations.
- [Ammonia's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/ammonia-vibrations.html): use the C₃ᵥ point group, with its classes and degenerate E pairs, to find the symmetries of NH₃'s six vibrations.
- [Carbon dioxide's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/co2-vibrations.html): handle a linear molecule and the infinite group D∞h by working in D₂h and correlating back.
- [Benzene's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/benzene-vibrations.html): D₆h, with 24 operations, 30 vibrations and 20 distinct fundamentals.
- [Allene's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/allene-vibrations.html): D₂d and the improper rotation S₄.
- [Biphenyl's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/biphenyl-vibrations.html): rings twisted 44° apart, so D₂ (chiral, no mirror planes), with 60 vibrations; compared with flat D₂h and perpendicular D₂d.
- [1,2-Bromochloroethene's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/bromochloroethene-vibrations.html): Cₛ, with a cis/trans switch; compare 1,2-dichloroethene (C₂ᵥ / C₂h).
- [Ferrocene's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/ferrocene-vibrations.html): eclipsed D₅h, with fivefold characters such as 2 cos 72°.

Every lesson ends with two steps on selection rules, one for IR and one for Raman: which vibrations change the dipole moment or the polarizability, how to read that off the character table, and the predicted spectra.

## Tools

- [Find the point group](https://sunitathyagarajan.github.io/interactive-group-theory/point-groups.html): the point-group flowchart with 3D practice molecules.
- [Glossary](https://sunitathyagarajan.github.io/interactive-group-theory/glossary.html): terms, and an annotated anatomy of a character table.

Every page has a light/dark switch (remembered per browser) and a phone layout.

## How the files fit together

- The first four lessons are self-contained HTML files.
- The four newer lessons are short HTML pages with a `window.LESSON` config (geometry, operations, character table, text). They use `assets/lesson.js` and `assets/lesson.css`. The engine computes the symmetry bookkeeping. It also computes normal modes from a simple valence force field, solved one symmetry block at a time.
  - Allene uses measured gas-phase wavenumbers (the `wn` table in its config).
  - The other three show force-field estimates, labelled "est." on the page. You can replace them with literature values: add a `wn: {species: [highest, …]}` table to the config.
- `assets/site.css` and `assets/site.js` are loaded by every page. They provide the theme toggle and the phone layout.

## Running locally

Open a page in a browser, or serve the folder (the newer lessons load files from `assets/`, so serving is more reliable):

```bash
python3 -m http.server
```

Then visit http://localhost:8000.
