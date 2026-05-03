# KYDEX Proof Pack — Demo Cases + Verifiable Exports

This package demonstrates five complete KYDEX compliance lifecycles. All names and references are fictional demo data.

## Demo Secret

```bash
export KYDEX_EXPORT_SECRET='demo-secret-change-me'
```

## Verify all exports

```bash
for f in Case_*/timeline-export.json; do node verifier/kydex-verify.js "$f"; echo; done
```

## Cases

1. Case A — False Positive Cleared
2. Case B — Request More Information
3. Case C — Escalate as SIC-ready package
4. Case D — Reject / Block
5. Case E — SLA Breach Detected and Resolved
