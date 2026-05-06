# KYDEX National List Full Row Display Report

## Objective
Return and display full original national-list row columns for each Lebanon national-list match in Sandra UI, without raw JSON blocks.

## Backend Payload Enrichment
Updated:
- C:/Users/User/Desktop/sandra/api/kydex-search.php

Added extraction and normalization for original-row structures from multiple possible upstream shapes, including:
- sourceRow
- sourceRows.ar / sourceRows.en
- rawArabicRow / rawEnglishRow
- rawSourceRecord / rawRecord

Each match now includes:
- sourceRow (single normalized row when available)
- sourceRows.ar (normalized Arabic row when available)
- sourceRows.en (normalized English row when available)

Normalized row shape:
- language
- rowNumber
- columns (all original key/value fields preserved when present)

## Frontend Full-Row Rendering
Updated:
- C:/Users/User/Desktop/sandra/index.html

Added expandable full-row section:
- button label: عرض تفاصيل السجل الكامل
- panel title: تفاصيل السجل من اللائحة الوطنية

Rendering behavior:
- table-based key/value display only
- section 1: السجل العربي (if ar row exists)
- section 2: السجل الإنجليزي (if en row exists)
- falls back to single sourceRow when sourceRows are absent
- does not render raw JSON or preformatted debug block

## Single-Word Search Review Metadata
For single-token queries on LEBANON_NATIONAL_LIST matches, payload now carries:
- classification = POSSIBLE_MATCH
- matchType = SINGLE_TOKEN_MATCH
- requiresReview = true
- singleNameWarningAr
- simplifiedArabicReason

## Validation
- php lint passed for proxy endpoint
- API TypeScript build passed

## Deployment/Commit Constraints Observed
- C:/kydex repository is clean after report creation
- Sandra edits are in C:/Users/User/Desktop/sandra, which resolves to a different git root (C:/Users/User)
- This prevents safely performing the requested single-repo commit from C:/kydex for Sandra file changes
