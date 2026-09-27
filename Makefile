PYTHON ?= python

.PHONY: 3d-export
3d-export:
	$(PYTHON) 3d/pipeline.py export
