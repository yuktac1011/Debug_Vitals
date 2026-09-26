"""Quick smoke test — runs against the live server at localhost:8000."""
import urllib.request, json, sys

SID = "cccccccc-0000-0000-0000-000000000099"
BASE = "http://localhost:8000"

def post(url, body):
    req = urllib.request.Request(
        BASE + url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get(url):
    try:
        with urllib.request.urlopen(BASE + url, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

errors = []

# ── Health ────────────────────────────────────────────────────────────────────
s, d = get("/api/v1/health")
ok = d.get("status") == "healthy"
print(f"[{'OK' if ok else 'FAIL'}] Health  HTTP {s}  status={d.get('status')}")
if not ok: errors.append("health")

# ── Ingest 5-event chain ──────────────────────────────────────────────────────
events = [
    {"session_id": SID, "event_type": "env_snapshot",  "occurred_at": "2024-06-01T09:00:00Z", "severity": "info",    "source": "env_scanner",    "summary": "Baseline env",            "payload": {"runtime": {"language": "python", "version": "3.11.6"}, "packages": [{"name": "requests", "version": "2.28.0"}]}},
    {"session_id": SID, "event_type": "dependency",    "occurred_at": "2024-06-01T09:05:00Z", "severity": "warning", "source": "pip",            "summary": "Upgraded requests",       "payload": {"action": "upgrade", "packages": [{"name": "requests", "version": "2.31.0"}]}},
    {"session_id": SID, "event_type": "agent_action",  "occurred_at": "2024-06-01T09:10:00Z", "severity": "error",   "source": "bash_tool",      "summary": "pytest failed",           "payload": {"command": "pytest tests/", "exit_code": 1, "error_message": "ImportError: PreparedRequest"}},
    {"session_id": SID, "event_type": "test_result",   "occurred_at": "2024-06-01T09:10:30Z", "severity": "error",   "source": "pytest",         "summary": "5 tests failed",          "payload": {"outcome": "failure", "failed": 5}},
    {"session_id": SID, "event_type": "ci_result",     "occurred_at": "2024-06-01T09:15:00Z", "severity": "error",   "source": "github_actions", "summary": "CI failed",               "payload": {"conclusion": "failure", "workflow": "ci.yml"}},
]
s, d = post("/api/v1/events", {"events": events})
ok = s == 202 and d.get("total_accepted") == 5
print(f"[{'OK' if ok else 'FAIL'}] Ingest  HTTP {s}  accepted={d.get('total_accepted')}  deduped={d.get('total_received',0)-d.get('total_accepted',0)}")
if not ok: errors.append(f"ingest (body={str(d)[:200]})")

# ── Timeline all ──────────────────────────────────────────────────────────────
s, d = get(f"/api/v1/session/{SID}/timeline?limit=10")
ok = s == 200 and d.get("total_count") == 5
print(f"[{'OK' if ok else 'FAIL'}] Timeline all  HTTP {s}  total={d.get('total_count')}  has_more={d.get('has_more')}")
if not ok: errors.append("timeline-all")

# ── Timeline filtered ─────────────────────────────────────────────────────────
s, d = get(f"/api/v1/session/{SID}/timeline?event_type=dependency")
ok = s == 200 and d.get("total_count") == 1
print(f"[{'OK' if ok else 'FAIL'}] Timeline filter=dependency  HTTP {s}  count={d.get('total_count')}")
if not ok: errors.append("timeline-filter")

# ── Timeline with payload ─────────────────────────────────────────────────────
s, d = get(f"/api/v1/session/{SID}/timeline?include_payload=true&limit=2")
ok = s == 200 and d["events"] and d["events"][0].get("payload") is not None
print(f"[{'OK' if ok else 'FAIL'}] Timeline include_payload  HTTP {s}  first_has_payload={bool(d['events'][0].get('payload')) if d.get('events') else False}")
if not ok: errors.append("timeline-payload")

# ── Diagnose ──────────────────────────────────────────────────────────────────
s, d = post(f"/api/v1/session/{SID}/diagnose", {"top_n": 5, "include_graph": True})
diag_id = d.get("id")
ok = s == 200 and d.get("status") == "completed"
causes = d.get("root_causes", [])
print(f"[{'OK' if ok else 'FAIL'}] Diagnose  HTTP {s}  status={d.get('status')}  causes={len(causes)}  events_analysed={d.get('events_analysed')}  has_graph={d.get('graph_snapshot') is not None}")
if causes:
    top = causes[0]
    print(f"           Top cause: rank={top['rank']} score={round(top['score']*100)}%  reason={top['reason'][:80]}")
if not ok: errors.append(f"diagnose (body={str(d)[:200]})")

# ── Deduplication ─────────────────────────────────────────────────────────────
dedup_event = [{"session_id": SID, "event_type": "custom", "occurred_at": "2024-06-01T20:00:00Z", "external_id": "smoke-dedup-001", "summary": "dedup test", "severity": "info"}]
post(f"/api/v1/events", {"events": dedup_event})  # first send
s, d = post(f"/api/v1/events", {"events": dedup_event})  # second send — should dedup
ok = s == 202 and d.get("total_accepted") == 0 and len(d.get("deduplicated", [])) == 1
print(f"[{'OK' if ok else 'FAIL'}] Dedup  HTTP {s}  accepted={d.get('total_accepted')}  deduplicated={d.get('deduplicated')}")
if not ok: errors.append("dedup")

# ── Validation error (bad event_type) ─────────────────────────────────────────
s, d = post("/api/v1/events", {"events": [{"session_id": SID, "event_type": "bad_type", "occurred_at": "2024-06-01T10:00:00Z"}]})
ok = s == 422
print(f"[{'OK' if ok else 'FAIL'}] Validation 422  HTTP {s}  code={d.get('error', {}).get('code')}")
if not ok: errors.append("validation-422")

# ── Summary ───────────────────────────────────────────────────────────────────
print()
if errors:
    print(f"FAILED: {errors}")
    sys.exit(1)
else:
    print("All smoke tests passed.")
