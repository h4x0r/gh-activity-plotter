"""Property-based fuzzing of the renderer — the Python equivalent of a
cargo-fuzz target. Invariant: render_inkblot NEVER raises an unhandled
exception on an arbitrary payload. It either returns a PNG or fails loud with a
ValueError (the contract the HTTP handler turns into a 400). A TypeError, OOM,
or hang would be a gatekeeper failure.

Run: python3 -m pytest api/test_fuzz_inkblot.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _inkblot import render_inkblot
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

PNG_SIG = b"\x89PNG\r\n\x1a\n"

# Small, bounded series so each generated render stays fast.
counts = st.lists(st.integers(min_value=0, max_value=50), min_size=1, max_size=24)
series = st.dictionaries(
    keys=st.text(alphabet="abcdefg-", min_size=0, max_size=8),
    values=counts,
    min_size=1,
    max_size=6,
)

payloads = st.fixed_dictionaries(
    {
        "start": st.integers(min_value=0, max_value=2_000_000_000_000),
        "series": series,
    },
    optional={
        "step_hours": st.sampled_from([1, 2, 0, 24]),
        "format": st.sampled_from(["png", "svg", "PNG", "bogus"]),
        "sigma_hours": st.floats(min_value=0, max_value=48, allow_nan=False),
        "selected": st.lists(st.text(alphabet="abcdefg-", max_size=8), max_size=8),
        "window": st.lists(
            st.integers(min_value=0, max_value=3_000_000_000_000),
            min_size=2,
            max_size=2,
        ),
        "title": st.text(max_size=40),
    },
)


@settings(max_examples=120, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(payloads)
def test_render_never_crashes(payload):
    try:
        out = render_inkblot(payload)
    except ValueError:
        return  # fail-loud is the accepted outcome
    assert (
        out.startswith(PNG_SIG)
        or out[:200].lstrip().startswith(b"<?xml")
        or b"<svg" in out[:400]
    )


@settings(max_examples=80, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    series=series,
    start=st.integers(min_value=0, max_value=2_000_000_000_000),
)
def test_unequal_series_lengths_fail_loud(series, start):
    # Need two repos to force a guaranteed mismatch (the strategy already emits
    # varied lengths, so make keys[0] strictly longer than keys[1]).
    keys = list(series.keys())
    if len(keys) < 2:
        return
    series[keys[0]] = list(series[keys[1]]) + [1]  # always longer than keys[1]
    try:
        render_inkblot({"start": start, "series": series})
    except ValueError:
        return
    raise AssertionError("expected ValueError on unequal series lengths")
