# KYDEX Verifier CLI

Use this verifier to prove that exported KYDEX compliance timelines were not altered.

## Demo secret

For this proof pack only:

```bash
export KYDEX_EXPORT_SECRET='demo-secret-change-me'
```

## Verify one case

```bash
node verifier/kydex-verify.js Case_A_FALSE_POSITIVE_CLEAR/timeline-export.json
```

Expected result:

```txt
✔ Hash valid
✔ Signature valid
STATUS: VERIFIED
```

## Verify all cases

```bash
for f in Case_*/timeline-export.json; do node verifier/kydex-verify.js "$f"; echo; done
```
