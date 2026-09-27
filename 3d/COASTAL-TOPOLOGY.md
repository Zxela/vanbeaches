# Tide-dependent coastal topology

The coastal meshes retain genuine gaps in the input surveys. A global transparent ocean
surface cannot rely on depth alone at those gaps: no land fragment exists to occlude it.
The previous water shader also coloured every intersected low area as ocean without
checking its marine connection. Opaque land continues to write depth; water depth-tests
against the same logarithmic-depth and curved-world transforms used by regional terrain.

`python 3d/pipeline.py marine` generates `marine-connectivity.tif` from cached measured
coastal elevations. A four-neighbour minimax flood records the minimum sea elevation
needed to reach each cell from NONNA measurements below −5 m in the world datum.
At a basin the threshold is its connecting sill, rather than its bottom. Missing survey
cells are barriers. The ocean remains an independent moving surface: its fragments test
the current tide against that threshold. There is no fixed present-day shoreline clip.

The threshold atlas uses RG uint16 centimetres above −512 m and alpha for coverage.
It is sampled without mipmaps, in linear numeric colour space. `marineTexture` carries
its SHA-256, size and projected bounds. Blender packs the same atlas and gates both its
surface and absorption volume using the evaluated ocean elevation. Native tide drivers
remain editable. No underlying measured elevation is raised, filled or reclassified.

CPU vessel navigation additionally checks surveyed seabed depth, vessel draft and the
full route corridor. Unknown areas prohibit vessels. A missing mask disables navigation
and the browser ocean rather than showing unverified flooding. Terrain and beach data
remain available. The mask does not certify navigation or solve missing survey coverage.

Run `python -m pytest -c 3d/pyproject.toml 3d/tests/test_marine.py` for basin/sill,
unknown-gap and monotonic-tide tests. `latest-marine.json` records real-world counts for
0.5, 1.5, 3.0, 4.5 and 5.0 m CD. The production browser suite captures those tides at
Wreck, Spanish Banks, Jericho, Kitsilano, English Bay, Third Beach and regional overview.
Pixel comparison requires approved reference images; captures alone do not establish
perceptual similarity. See [PRODUCTION.md](PRODUCTION.md) for that workflow.

The current atlas is 10 m and covers the coastal survey AOI. Fine triangles still provide
the primary depth occlusion. Conservative cell coverage can reveal actual survey gaps
and cannot provide sub-metre breaking surf. Outside the coastal atlas, regional terrain
provides ordinary depth occlusion of the distant ocean. Quantitative connectivity and
route guarantees apply within the surveyed coastal atlas only.
