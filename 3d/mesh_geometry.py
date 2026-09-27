"""NumPy-only shared terrain geometry helpers for GIS export and Blender."""

import numpy as np


def shore_skirts(vertices, faces):
    """Close low open edges below every configured tide; these walls are not bathymetry."""
    edges = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    _, unique, counts = np.unique(
        np.sort(edges, axis=1), axis=0, return_index=True, return_counts=True
    )
    edge = edges[unique[counts == 1]]
    edge = edge[(vertices[edge, 2].max(axis=1) < 30) & (vertices[edge, 2].min(axis=1) > -20)]
    if not len(edge):
        return vertices, faces
    lower = vertices[edge].copy()
    lower[:, :, 2] = -20
    start = len(vertices) + np.arange(len(edge)) * 2
    walls = np.concatenate(
        [
            np.column_stack((edge[:, 1], edge[:, 0], start)),
            np.column_stack((edge[:, 1], start, start + 1)),
        ]
    )
    return np.concatenate([vertices, lower.reshape(-1, 3)]), np.concatenate([faces, walls])
