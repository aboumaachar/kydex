# KYDEX Lebanon National List Mapping Report

## Source Registration

- Source code: `LEBANON_NATIONAL_LIST`
- Arabic label: `اللائحة الوطنية`
- Source-library registry table: `KydexDataSource`
- Screening registry table: `DataSource`
- Download URL source: `LEBANON_NATIONAL_LIST_XLS_URL`

## Workbook Detection

The importer reads the first worksheet from the downloaded XLS/XLSX file and scans the first 10 rows to detect the real header row.

Detection rule:
- Normalize each candidate header cell to lowercase text with punctuation removed.
- Accept the first row containing a recognizable primary-name column.

## Flexible Header Mapping

The importer supports flexible header discovery instead of fixed positional mapping.

Canonical fields and accepted aliases:

- `externalEntityId`
  - `id`
  - `ref`
  - `reference`
  - `code`
  - `الرقم`
  - `مرجع`
- `primaryName`
  - `name`
  - `full name`
  - `entity name`
  - `الاسم`
  - `الاسم الكامل`
- `aliases`
  - `aliases`
  - `alias`
  - `known as`
  - `aka`
  - `اسم بديل`
  - `الاسماء البديلة`
- `entityType`
  - `type`
  - `entity type`
  - `category`
  - `النوع`
  - `التصنيف`
- `listName`
  - `list`
  - `list name`
  - `القائمة`
  - `اسم القائمة`
- `programs`
  - `program`
  - `programs`
  - `reason`
  - `سبب الادراج`
  - `category`
- `countries`
  - `country`
  - `countries`
  - `nationality`
  - `الجنسية`
  - `الدولة`

## Default Fallback Mapping

If a column is missing, the importer uses these defaults:

- `externalEntityId`: generated as `LEBANON_NATIONAL_LIST-<rowIndex>`
- `entityType`: `Entity`
- `listName`: `Lebanon National List`
- `countries`: `LB`
- `aliases`: empty array
- `programs`: empty array

## Row Parsing Rules

- Empty primary-name rows are skipped.
- Multi-value cells are split on `,`, `;`, `|`, `/`, and newline.
- Raw row content is retained in `SourceEntity.rawRecord` and mirrored into `WatchlistRecord.rawPayload`.
- Deduplication is applied per entity name string during alias/name expansion.

## Name Normalization Mapping

For each imported name, KYDEX stores:

- original value
- normalized Latin form
- normalized Arabic form
- generated bilingual variants
- token variants
- phonetic variant
- alias vs primary classification

Target tables:

- `SourceEntity`
- `SourceName`
- `SourceNameVariant`
- `WatchlistRecord`

## First-Run Mapping Capture

On the first successful import when no prior local Lebanon entities exist:

- the importer logs the detected worksheet name,
- header row index,
- resolved canonical field to column mapping,
- and marks the sync run with publication hint `FIRST_RUN_MAPPING_CAPTURED`.

## Safety Guarantees

- Existing Lebanon local data is not deleted until the new file has been downloaded, hashed, parsed, and validated.
- If download or parsing fails, the previous local copy remains intact.
- If the downloaded file hash matches the latest imported hash, the importer skips destructive work and records `NO_CHANGES`.
