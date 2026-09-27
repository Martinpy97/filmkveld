# Pokédex artwork asset collection

Prepared 2026-09-27. Asset acquisition and ordinary web compression only; no image generation, recoloring, cropping, or visual redesign.

## Sources and scope

- Artwork repository: https://github.com/PokeAPI/sprites
- Pinned artwork revision: `1723ebbbdb6137b0555248229521e90aeafbf96d`
- Directory: `sprites/pokemon/other/official-artwork/`
- Species data repository revision: `168b1e89467054cda2e7df43ccebbb69b459497a`
- Species CSV: https://raw.githubusercontent.com/PokeAPI/pokeapi/168b1e89467054cda2e7df43ccebbb69b459497a/data/v2/csv/pokemon_species.csv
- Verified scope: 1,025 species with contiguous IDs 1–1,025, ending with Pecharunt. Each file represents the default official-artwork entry for its national species number; alternate forms are outside this asset collection.
- Primary documentation identifies this directory as official-artwork PNGs: https://pokeapi.co/docs/v2 and https://github.com/PokeAPI/sprites

## Asset preparation files (original staging)

- `originals/<id>.png`: untouched downloaded PNG originals.
- `pokemon/<id>.webp`: display copies at a maximum 384×384 pixels, quality 82, method 6. The complete canvas, aspect ratio and alpha transparency are preserved.
- `manifest.json`: ordered entries with source image and source page URLs, local paths, original/optimized dimensions, byte sizes and SHA-256 hashes.
- `SUMMARY.json`: scope, totals, missing IDs and failures without individual records.
- `contact-sheet.jpg`: representative visual QA across all nine source generations and the latest species.
- `download_artwork.py`: reproducible acquisition and conversion script with eight concurrent workers.

The optimized files are intended for local website paths `/pokemon/<id>.webp`. The original PNGs should remain outside the Site source checkout; copy only the optimized `pokemon` directory into its public assets directory.

## Attribution and reuse

The repository license states: “All image contents within are Copyright The Pokémon Company.” It separately distributes the repository under CC0 1.0 Universal. Preserve this distinction: repository availability does not grant separate rights to Pokémon characters or artwork, which remain with their original rights holders.

License source: https://github.com/PokeAPI/sprites/blob/1723ebbbdb6137b0555248229521e90aeafbf96d/LICENCE.txt

Suggested visible credit: **Pokémon illustrations via PokéAPI. Pokémon and its artwork © The Pokémon Company and respective rights holders.**

## Verification notes

Every original must parse and verify as PNG; every derivative must decode as WebP with the expected dimensions. Source IDs must remain in the verified contiguous national order. SHA-256 values allow later copy verification. Refer to `SUMMARY.json` for actual final counts and totals.

Web image searches were performed for Bulbasaur and Pecharunt imagery. Broad search results included third-party images and screenshots; those were not used as assets. The downloaded assets come solely from the pinned primary PokéAPI sprites repository. Pokémon.com species pages exposed only an iframe through the available web reader, so artwork provenance is grounded in PokéAPI's source directory and documentation.

This directory is temporary local staging. It is not itself an external backup or a website deployment.

## Delivered Site copy

The Site contains `public/pokemon/<id>.webp` and `ASSET-SOURCES.json`. Original PNGs and temporary staging files are not in the Site. Original hashes and pinned download URLs remain in the manifest for retrieval.
