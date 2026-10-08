"""
Work out where each printed part sits in the assembly.

The seven part STLs are each exported in their print orientation, zeroed at
their own origin, so none of them carries its position in the finished robot.
The assembled preview does — but it is one welded mesh, so it cannot be
rigged, and a rigged model is the whole point: the head has to tilt and the
neck has to pan.

Guessing the offsets from the drawings is how you get a robot with its head
floating two millimetres off its neck. So this solves them instead: voxelise
the preview, voxelise each part under every axis-aligned rotation, and find
the translation that makes the part's surface coincide with the preview's by
cross-correlation. The best (rotation, translation) is the one that puts the
most of the part's skin exactly on the preview's skin.

Cross-correlation through the FFT rather than a search: a 1 mm grid over this
robot is about 800k cells and the translation space is the same size again, so
a direct search is ~10^11 operations and an FFT is three transforms.

    python3 tools/assets/solve_assembly.py
"""
import json
import struct
from itertools import product
from pathlib import Path

import numpy as np

SRC = Path(__file__).resolve().parents[2] / "assets-src" / "stl"
PREVIEW = "assembled_v3.stl"
PARTS = [
    "01_head.stl", "02_neck.stl", "03_neck_cover.stl", "04_horn_plate.stl",
    "05_pivot_plate.stl", "06_base.stl", "07_bottom_cover.stl",
]

VOXEL = 1.0      # mm. Fine enough to pin a part, coarse enough to stay fast.
PAD = 6          # mm of slack around the preview's bounds.


def load_triangles(path: Path) -> np.ndarray:
    """Every triangle of a binary STL, as (n, 3, 3)."""
    data = path.read_bytes()
    count = struct.unpack("<I", data[80:84])[0]
    body = np.frombuffer(data, dtype=np.uint8, count=count * 50, offset=84)
    tris = body.reshape(count, 50)
    # 12 floats per triangle: a normal, then three vertices. Skip the normal.
    floats = tris[:, :48].copy().view("<f4").reshape(count, 12)[:, 3:]
    return floats.reshape(count, 3, 3).astype(np.float64)


def surface_points(path: Path, per_mm2: float = 2.5, seed: int = 7) -> np.ndarray:
    """
    Points spread over the mesh's surface, not its vertices.

    The preview is a welded mesh: its triangulation has nothing to do with the
    parts', so their vertices never coincide and correlating them scores near
    zero however well the part is placed. Their *surfaces* do coincide, so the
    surfaces are what gets sampled — each triangle seeded in proportion to its
    area, which keeps the density even across parts of very different size.
    """
    tris = load_triangles(path)
    a, b, c = tris[:, 0], tris[:, 1], tris[:, 2]
    areas = 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)
    counts = np.maximum(1, np.round(areas * per_mm2)).astype(int)

    rng = np.random.default_rng(seed)
    idx = np.repeat(np.arange(len(tris)), counts)
    u = rng.random(len(idx))
    v = rng.random(len(idx))
    # Fold the unit square onto the triangle so the sampling stays uniform.
    over = u + v > 1
    u[over], v[over] = 1 - u[over], 1 - v[over]
    pts = a[idx] + u[:, None] * (b - a)[idx] + v[:, None] * (c - a)[idx]
    return np.vstack([pts, tris.reshape(-1, 3)])


def rotations():
    """The 24 orientations of a cube, as integer matrices."""
    out = []
    for axes in product(range(3), repeat=3):
        if len(set(axes)) != 3:
            continue
        for signs in product((1, -1), repeat=3):
            m = np.zeros((3, 3))
            for row, (axis, sign) in enumerate(zip(axes, signs)):
                m[row, axis] = sign
            if round(np.linalg.det(m)) == 1:      # proper rotations only
                out.append(m)
    return out


def voxelise(points: np.ndarray, origin: np.ndarray, shape: tuple) -> np.ndarray:
    idx = np.floor((points - origin) / VOXEL).astype(int)
    keep = np.all((idx >= 0) & (idx < np.array(shape)), axis=1)
    idx = idx[keep]
    grid = np.zeros(shape, dtype=np.float32)
    grid[idx[:, 0], idx[:, 1], idx[:, 2]] = 1.0
    return grid


def main() -> None:
    preview = surface_points(SRC / PREVIEW)
    lo = preview.min(axis=0) - PAD
    hi = preview.max(axis=0) + PAD
    shape = tuple(int(np.ceil((hi[a] - lo[a]) / VOXEL)) for a in range(3))
    print(f"preview {len(preview):,} surface points, grid {shape}")

    target = voxelise(preview, lo, shape)
    target_f = np.fft.rfftn(target, axes=(0, 1, 2))

    result = {}
    for name in PARTS:
        part = surface_points(SRC / name)
        best = None
        for ri, rot in enumerate(rotations()):
            spun = part @ rot.T
            # Put the rotated part at the grid origin, then let the
            # correlation find how far it must move.
            spun = spun - spun.min(axis=0)
            grid = voxelise(spun, np.zeros(3), shape)
            # Correlation of target with the part: peak = best shift.
            corr = np.fft.irfftn(target_f * np.conj(np.fft.rfftn(grid, axes=(0, 1, 2))),
                                 s=shape, axes=(0, 1, 2))
            peak = int(np.argmax(corr))
            shift = np.unravel_index(peak, shape)
            score = float(corr[shift]) / max(1.0, float(grid.sum()))
            if best is None or score > best["score"]:
                best = {
                    "score": score,
                    "rotation": rot.astype(int).tolist(),
                    "rotation_index": ri,
                    # Where the part's own minimum corner lands, in STL space.
                    "translation": [
                        float(lo[a] + shift[a] * VOXEL) for a in range(3)
                    ],
                    "local_min": spun.min(axis=0).tolist(),
                }
        assert best is not None
        result[name] = best
        flag = "ok " if best["score"] > 0.55 else "LOW"
        print(f"  {flag} {name:22s} fit {best['score']:.2f}  "
              f"rot#{best['rotation_index']:2d}  t={[round(v, 1) for v in best['translation']]}")

    out = Path(__file__).with_name("assembly.json")
    out.write_text(json.dumps(result, indent=2) + "\n")
    print(f"\nwrote {out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out}")


if __name__ == "__main__":
    main()
