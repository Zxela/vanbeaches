PYTHON ?= python

.PHONY: 3d-data 3d-process 3d-blender 3d-overview 3d-world 3d-preview test
3d-data:
	$(PYTHON) pipeline.py data
3d-process:
	$(PYTHON) pipeline.py process
3d-blender:
	$(PYTHON) pipeline.py blender
3d-overview:
	$(PYTHON) pipeline.py blender --lod overview
3d-world:
	$(PYTHON) pipeline.py world
3d-preview:
	$(PYTHON) pipeline.py preview
test:
	$(PYTHON) -m pytest

.PHONY: 3d-export
3d-export:
	$(PYTHON) pipeline.py export
