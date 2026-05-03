# System Controls

## Audit Chain Explanation
Every critical action emits an audit event with actor, action type, entity linkage, and timestamp. Document extraction and screening events include explicit entity IDs and action names to preserve end-to-end traceability.

## Evidence Immutability
Timeline exports are treated as immutable artifacts. Verification uses deterministic hash/signature checks and stores evidence snapshots for replay and regulator review.

## Signed Exports
Export verification validates computed hash and signature against exported values, producing a VERIFIED status when both checks match.

## SLA Tracking
Operational readiness and SLA-oriented health signals are captured through preflight checks, worker status, smoke test outcomes, and run timestamps.

## Role-Based Access
Role-scoped access controls separate admin, reviewer, and operational responsibilities across case handling, audit review, and data-source operations.
