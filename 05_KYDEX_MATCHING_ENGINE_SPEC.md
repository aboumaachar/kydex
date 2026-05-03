# KYDEX Matching Engine Specification

## 1. Purpose

The matching engine is the core KYDEX differentiator.

It must answer:

> Is the screened person/entity likely to be the same as a listed person/entity?

The system must explain the answer.

KYDEX must not be positioned as simple translation.

KYDEX is a locale-aware identity resolution engine.

Core principle:

```txt
Names alone produce probability.
Identifiers produce confidence.
```

## 2. Core Rule

KYDEX must not rely on direct literal name translation.

It must resolve identity probability across languages using:

- original source name
- Arabic normalized name
- Latin normalized name
- transliteration variants
- aliases
- token overlap
- fuzzy similarity
- supporting identifiers

The regulator-facing rule is:

```txt
KYDEX does not translate names and assume identity.
KYDEX resolves identity probability across languages, then requires supporting identifiers before escalating confidence.
```

## 3. Matching Inputs

```txt
fullName
dateOfBirth
nationality
documentNumber
aliases
entityType
country
```

## 4. Import And Indexing Logic

```txt
1. Import list
2. Preserve original name exactly
3. Generate Arabic-normalized searchable form
4. Generate Latin-normalized searchable form
5. Generate transliteration variants
6. Store aliases and variants
7. User searches in Arabic
8. Engine compares Arabic input against all generated variants
9. Engine scores possible matches
10. Engine requires supporting fields for stronger classification
```

## 5. Required Data Fields

For each imported record, store:

- originalName
- originalLanguage
- sourceLanguage
- arabicNormalizedName
- latinNormalizedName
- transliterationVariants
- aliases
- arabicNormalizedAliases
- latinNormalizedAliases
- dateOfBirth
- nationality
- documentNumbers
- sourceCode
- versionId
- rawPayload

## 6. Normalization Pipeline

### Step 1 — Basic cleanup

- Trim spaces.
- Lowercase Latin text.
- Remove punctuation.
- Normalize repeated whitespace.

### Step 2 — Arabic normalization

- Remove diacritics.
- Normalize alef variants: أ إ آ ا → ا
- Normalize ya/maqsurah: ي ى → ي
- Normalize ta marbuta: ة → ه or preserve as variant.
- Remove tatweel.
- Standardize common prefixes:
  - ال
  - بن
  - ابن
  - أبو
  - ابو

### Step 3 — Transliteration variants

Generate variants for:

```txt
Mohammad / Mohammed / Mohamed / Mohamad / Muhammad
Ali / Aly
Hussein / Hussain / Husein
Youssef / Yousef / Yusuf
```

### Step 4 — Tokenization

Break name into tokens:

```txt
[first, father, grandfather, family]
```

The engine must preserve Arabic spacing variations, Arabic definite article variations, father-name patterns, family-name patterns, and Arabic to English or French transliteration variants.

Examples:

```txt
محمد / Mohammad / Mohamed / Muhammed
علي / Ali / Aly
حسين / Hussein / Husain / Husein
عبدالله / Abdallah / Abdullah / Abd Allah
```

## 7. Search Flow

When a user searches in Arabic:

1. normalize the Arabic query
2. generate a Latin approximation
3. compare against:
   - Arabic normalized names
   - Latin normalized names
   - aliases
   - transliteration variants
4. rank candidates by score
5. apply identifier boosts and penalties
6. return the closest possible matches
7. classify uncertainty

## 8. Matching Techniques

Use layered scoring:

1. Exact normalized match.
2. Transliteration match.
3. Alias match.
4. Token overlap.
5. Fuzzy similarity.
6. Soundex / phonetic similarity.
7. DOB match.
8. Nationality match.
9. Document number match.

## 9. Scoring Logic

Name score must consider:

- exact normalized match
- transliteration match
- alias match
- token overlap
- fuzzy similarity

Supporting fields must change confidence, not just the score:

- DOB exact match = strong boost
- DOB conflict = strong penalty
- document number exact match = decisive boost
- nationality match = moderate boost
- nationality conflict = moderate penalty

Decision rule:

```txt
Name similarity alone → POSSIBLE_MATCH
Name + DOB support → stronger POSSIBLE_MATCH or TRUE_MATCH
Name + document number → TRUE_MATCH
Name + conflicting DOB/document → FALSE_MATCH or lowered confidence
No supporting fields → never claim certainty
```

## 10. Match Classification

- TRUE_MATCH:
  requires strong identifier support, preferably document number or DOB plus strong name match
- POSSIBLE_MATCH:
  name or transliteration similarity without enough supporting identifiers
- FALSE_MATCH:
  name similarity but strong identifier conflict
- NO_MATCH:
  no meaningful candidate
- INSUFFICIENT_DATA:
  query is too weak or too common

## 11. Explanation Requirements

Every match explanation must show:

- which name variant matched
- whether the match came from Arabic normalization, transliteration, alias overlap, or token similarity
- which supporting identifiers aligned
- which identifiers conflicted or were missing
- what source returned the result
- which list version was used
- why the confidence stayed possible, high-confidence, or confirmed

Example:

```txt
Possible match because:
- Arabic query normalized to a comparable form
- Closest record matched through transliteration and token overlap
- Date of birth missing
- Document number missing
- Source: OFAC
- Version: OFAC-SDN-2026-04-24
```

## 12. Escalation And Compliance Rule

Operational risk may still drive escalation, but name-only similarity must never be presented as confirmed identity.

KYDEX should never say:

```txt
100% match based on translated name alone.
```

KYDEX should say:

```txt
POSSIBLE_MATCH
HIGH_CONFIDENCE_MATCH
CONFIRMED_MATCH
FALSE_MATCH
NO_MATCH
INSUFFICIENT_DATA
```

Always display:

```txt
score + reason + matched variant + supporting identifiers + source + version + required action
```
