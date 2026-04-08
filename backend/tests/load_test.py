"""
Performance Benchmark / Load Testing Script.
Uses httpx to run basic load tests against key API endpoints.
Verifies p95 response time < 2000ms (BRD §5.1 requirement).

Usage:
    python tests/load_test.py [--base-url http://localhost:8000] [--token YOUR_JWT]
"""
import time
import statistics
import argparse
import sys

try:
    import httpx
except ImportError:
    print("ERROR: httpx is required. Install with: pip install httpx")
    sys.exit(1)


SCENARIOS = [
    ("List Tasks", "GET", "/api/tasks?limit=50"),
    ("List Projects", "GET", "/api/projects?limit=50"),
    ("Search", "GET", "/api/search?q=test&limit=20"),
    ("Task Aging Report", "GET", "/api/reports/task-aging"),
    ("Completion Trends", "GET", "/api/reports/completion-trends"),
    ("Team Velocity", "GET", "/api/reports/team-velocity"),
    ("Dashboard Personal", "GET", "/api/dashboard/personal"),
    ("List Teams", "GET", "/api/teams?limit=20"),
    ("List Users", "GET", "/api/users?limit=50"),
    ("Notifications", "GET", "/api/notifications?limit=20"),
]

ITERATIONS = 20  # requests per scenario


def run_benchmark(base_url: str, token: str):
    headers = {"Authorization": f"Bearer {token}"}
    results = {}

    print(f"\n{'='*70}")
    print(f"  LightIDEA Performance Benchmark")
    print(f"  Target: {base_url}")
    print(f"  Iterations per scenario: {ITERATIONS}")
    print(f"{'='*70}\n")

    with httpx.Client(base_url=base_url, headers=headers, timeout=10.0) as client:
        for name, method, path in SCENARIOS:
            times = []
            errors = 0

            for _ in range(ITERATIONS):
                start = time.perf_counter()
                try:
                    if method == "GET":
                        resp = client.get(path)
                    else:
                        resp = client.post(path, json={})
                    elapsed = (time.perf_counter() - start) * 1000  # ms
                    if resp.status_code < 500:
                        times.append(elapsed)
                    else:
                        errors += 1
                except Exception:
                    errors += 1

            if times:
                sorted_times = sorted(times)
                p50 = sorted_times[len(sorted_times) // 2]
                p95_idx = int(len(sorted_times) * 0.95) - 1
                p95 = sorted_times[max(p95_idx, 0)]
                avg = statistics.mean(times)
                status = "✅ PASS" if p95 < 2000 else "❌ FAIL"

                results[name] = {
                    "avg_ms": round(avg, 1),
                    "p50_ms": round(p50, 1),
                    "p95_ms": round(p95, 1),
                    "errors": errors,
                    "pass": p95 < 2000,
                }

                print(f"  {status}  {name:30s}  avg={avg:7.1f}ms  p50={p50:7.1f}ms  p95={p95:7.1f}ms  errors={errors}")
            else:
                results[name] = {"avg_ms": 0, "p50_ms": 0, "p95_ms": 0, "errors": errors, "pass": False}
                print(f"  ❌ FAIL  {name:30s}  ALL REQUESTS FAILED ({errors} errors)")

    # Summary
    total = len(results)
    passed = sum(1 for r in results.values() if r["pass"])
    print(f"\n{'='*70}")
    print(f"  Results: {passed}/{total} scenarios passed (p95 < 2000ms)")
    print(f"{'='*70}\n")

    return passed == total


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LightIDEA Load Test")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--token", default="test-token", help="JWT auth token")
    args = parser.parse_args()

    success = run_benchmark(args.base_url, args.token)
    sys.exit(0 if success else 1)
