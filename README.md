# Interactive Group Theory

Interactive lessons on molecular symmetry and group theory, published with GitHub Pages:

**https://sunitathyagarajan.github.io/interactive-group-theory/**

## Lessons

- [Water's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/water-vibrations.html): use the C<sub>2v</sub> point group to find the symmetries of H₂O's three vibrations.
- [Ammonia's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/ammonia-vibrations.html): use the C<sub>3v</sub> point group, with its classes and degenerate E pairs, to find the symmetries of NH₃'s six vibrations.
- [Carbon dioxide's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/co2-vibrations.html): handle a linear molecule and the infinite group D<sub>∞h</sub> by working in D<sub>2h</sub> and correlating back.
- [Benzene's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/benzene-vibrations.html): D<sub>6h</sub>, with 24 operations, 30 vibrations and 20 distinct fundamentals.
- [Allene's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/allene-vibrations.html): D<sub>2d</sub> and the improper rotation S₄.
- [Biphenyl's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/biphenyl-vibrations.html): rings twisted 44° apart, so D<sub>2</sub> (chiral, no mirror planes), with 60 vibrations; compared with flat D<sub>2h</sub> and perpendicular D<sub>2d</sub>.
- [1-Bromo-2-chloroethene's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/bromochloroethene-vibrations.html): C<sub>s</sub>, with a cis/trans switch; compare 1,2-dichloroethene (C<sub>2v</sub> / C<sub>2h</sub>).
- [Ferrocene's vibrational modes](https://sunitathyagarajan.github.io/interactive-group-theory/ferrocene-vibrations.html): eclipsed D<sub>5h</sub>, with fivefold characters such as 2 cos 72°.

Every vibration lesson ends with two steps on selection rules, one for IR and one for Raman: which vibrations change the dipole moment or the polarizability, how to read that off the character table, and the predicted spectra.

## Molecular orbitals

- [Dioxygen's molecular orbitals](https://sunitathyagarajan.github.io/interactive-group-theory/dioxygen-mo.html): symmetry operations and character tables (D<sub>∞h</sub>, worked in D<sub>2h</sub>), SALCs from the projection operator, molecular orbitals built from atomic orbitals, an interactive MO diagram (electron filling, bond order, magnetism, O₂⁺/O₂⁻/O₂²⁻ and N₂), the symmetry label of every MO, and reducible representations. Orbitals are drawn as true isosurfaces of the LCAO wavefunctions. It has its own A, B, g, u glossary panel with a label decoder.

## Tools

- [Find the point group](https://sunitathyagarajan.github.io/interactive-group-theory/point-groups.html): the point-group flowchart with 3D practice molecules.
- [Practice molecules](https://sunitathyagarajan.github.io/interactive-group-theory/practice.html): a random molecule generator. Step 1 asks for the point group (with optional flowchart hints); the other eight steps follow the vibration lessons, with students filling in and checking each answer: Γ<sub>3N</sub>, its reduction, Γ<sub>vib</sub>, and the IR- and Raman-active species. About 140 real molecules and ions across 14 point groups (C<sub>1</sub>, C<sub>s</sub>, C<sub>2</sub>, C<sub>2v</sub>, C<sub>3v</sub>, C<sub>4v</sub>, C<sub>2h</sub>, D<sub>2h</sub>, D<sub>3h</sub>, D<sub>4h</sub>, D<sub>2d</sub>, D<sub>3d</sub>, T<sub>d</sub>, O<sub>h</sub>). A teacher can limit which point groups come up, and the page address names the molecule, so a link shares a specific problem (for example `practice.html?m=sf4`, or `practice.html?g=C2v,C3v` for random C<sub>2v</sub> and C<sub>3v</sub> molecules).
- [Glossary](https://sunitathyagarajan.github.io/interactive-group-theory/glossary.html): terms, and an annotated anatomy of a character table.

Every page has a light/dark switch (remembered per browser) and a phone layout.

## How the files fit together

- The first four lessons are self-contained HTML files.
- The four newer lessons are short HTML pages with a `window.LESSON` config (geometry, operations, character table, text). They use `assets/lesson.js` and `assets/lesson.css`. The engine computes the symmetry bookkeeping. It also computes normal modes from a simple valence force field, solved one symmetry block at a time.
  - Allene uses measured gas-phase wavenumbers (the `wn` table in its config).
  - The other three show force-field estimates, labelled "est." on the page. You can replace them with literature values: add a `wn: {species: [highest, …]}` table to the config.
- `practice.html` loads `assets/practice-molecules.js` before `assets/lesson.js`. That file holds the character tables, the geometry templates (bent AB₂, seesaw, octahedral cis/trans, and so on) and the compound list. It builds a `window.LESSON` with a `practice` block, which switches the engine into practice mode: step 1 asks for the point group and locks the other steps until it is found, and steps 4 and 6 ask for every entry. To add a molecule, add a line to `MOLS` that uses an existing template. The engine also handles triply degenerate (T) species for T<sub>d</sub> and O<sub>h</sub>.
- The dioxygen lesson is `dioxygen-mo.html` with its script in `assets/dioxygen-mo.js`. It reuses `assets/lesson.css` for the page layout. Orbitals are Slater-type 2s/2p functions (ζ = 2.275 from Slater's rules), and the 3D shapes are isosurfaces built by marching tetrahedra.
- `assets/site.css` and `assets/site.js` are loaded by every page. They provide the theme toggle and the phone layout.
- Every page uses Segoe UI for all text. Segoe UI ships with Windows; on other systems the font stack falls back to Calibri, then the system font.

## Running locally

Open a page in a browser, or serve the folder (the newer lessons load files from `assets/`, so serving is more reliable):

```bash
python3 -m http.server
```

Then visit http://localhost:8000.
