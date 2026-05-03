# DATA_SOURCES_CONTROL_SURFACE_PROOF.md

## Screenshots
- [x] Sources page
	Path: `C:\kydex\.snapshots\data-sources-control-surface\admin-data-sources.png`
- [x] Versions page
	Path: `C:\kydex\.snapshots\data-sources-control-surface\data-source-versions.png`
- [x] Records browser page
	Path: `C:\kydex\.snapshots\data-sources-control-surface\data-source-records.png`
- [x] Filtered records browser page
	Path: `C:\kydex\.snapshots\data-sources-control-surface\data-source-records-filtered.png`
- [x] Record detail / raw payload page
	Path: `C:\kydex\.snapshots\data-sources-control-surface\data-source-record-detail.png`
- [x] Report page
	Path: `C:\kydex\.snapshots\data-sources-control-surface\data-source-report.png`

## API Responses
- [x] Sync API response

```json
{
	"synchronized": 1,
	"results": [
		{
			"source": "OFAC_SDN",
			"sourceUrl": "https://www.treasury.gov/ofac/downloads/sdn.csv",
			"fetchTimestamp": "2026-04-26T05:49:58.695Z",
			"ingestionResult": {
				"versionId": "cmofcmtpp000oo02t5uzonbp0",
				"insertedRecords": 18863,
				"rejectedRows": 0,
				"duplicateRows": 0
			}
		}
	]
}
```

- [x] Activation proof

```json
{
	"status": "ACTIVE",
	"sourceCode": "OFAC_SDN",
	"versionId": "cmofcswj80elso02t814t71ba"
}
```

- [x] Archive proof

```json
{
	"status": "ARCHIVED",
	"sourceCode": "OFAC_SDN",
	"versionId": "cmoevc0gy29j0xgpndqgpowh8",
	"replacementVersionId": "cmoevb7m429hyxgpnwhufyk7g"
}
```

- [x] Screening using active version

`npm run source:verify` currently proves screening is using the explicit active OFAC version:

```json
{
	"mode": "OFAC-only",
	"searchedSources": ["OFAC_SDN"],
	"usedLocalVersions": [
		{
			"sourceCode": "OFAC_SDN",
			"versionId": "cmofcswj80elso02t814t71ba",
			"versionLabel": "OFAC-SDN-2026-04-26"
		}
	]
}
```

## Evidence
### Authenticated Sources Snapshot

Canonical-only list proof: legacy alias rows `OFAC`, `UNSEC`, and `UN` are no longer returned by `GET /api/v1/data-sources`.

```json
[
	{
		"code": "UNSEC_CONSOLIDATED",
		"status": "ACTIVE",
		"activeVersion": "UNSEC-CONSOLIDATED-2026-04-26",
		"activeRecordCount": 1712
	},
	{
		"code": "OFAC_SDN",
		"status": "ACTIVE",
		"activeVersion": "OFAC-SDN-2026-04-26",
		"activeRecordCount": 18863
	},
	{
		"code": "OFAC_CONSOLIDATED",
		"status": "ACTIVE",
		"activeVersion": "OFAC-CONSOLIDATED-2026-04-26",
		"activeRecordCount": 446
	}
]
```

### Authenticated Records Snapshot

```json
{
	"sourceCode": "OFAC_SDN",
	"versionId": null,
	"total": 188636,
	"page": 1,
	"limit": 5,
	"records": [
		{
			"id": "cmofd687z1b81o02tsv5annry",
			"primaryName": "CUBAEXPORT",
			"source": "OFAC_SDN",
			"entityType": "PERSON",
			"nationality": "CUBA",
			"externalReference": "591",
			"versionId": "cmofd66nj1b7io02tid20p1jk",
			"createdAt": "2026-04-26T06:05:03.918Z"
		}
	]
}
```

### Authenticated Filtered Records Snapshot

```json
{
	"sourceCode": "OFAC_SDN",
	"versionId": null,
	"total": 10,
	"page": 1,
	"limit": 5,
	"records": [
		{
			"id": "cmofcsxop0embo02t789567no",
			"primaryName": "CUBAEXPORT",
			"activeVersion": "OFAC-SDN-2026-04-26",
			"versionId": "cmofcswj80elso02t814t71ba"
		}
	]
}
```

### Authenticated Record Detail Snapshot

```json
{
	"id": "cmofd687z1b81o02tsv5annry",
	"primaryName": "CUBAEXPORT",
	"sourceCode": "OFAC_SDN",
	"sourceName": "OFAC SDN List",
	"versionId": "cmofd66nj1b7io02tid20p1jk",
	"versionLabel": "OFAC-SDN-2026-04-26",
	"versionStatus": "IMPORTED",
	"versionFileHash": "263e08e7e2edd4e2b8db661903061d631515068c18652b8193601e08091bc869",
	"externalReference": "591",
	"entityType": "PERSON",
	"rawPayload": {
		"name": "CUBAEXPORT",
		"aliases": "",
		"nationality": "CUBA",
		"externalReference": "591"
	}
}
```

### Authenticated Version Snapshot

```json
[
	{
		"id": "cmofcswj80elso02t814t71ba",
		"versionLabel": "OFAC-SDN-2026-04-26",
		"recordCount": 18863,
		"status": "ACTIVE"
	},
	{
		"id": "cmofcmtpp000oo02t5uzonbp0",
		"versionLabel": "OFAC-SDN-2026-04-26",
		"recordCount": 18863,
		"status": "ARCHIVED"
	}
]
```

### Authenticated Report Snapshot

```json
{
	"source": {
		"code": "OFAC_SDN",
		"name": "OFAC SDN"
	},
	"version": {
		"id": "cmofcswj80elso02t814t71ba",
		"versionLabel": "OFAC-SDN-2026-04-26",
		"fileHash": "263e08e7e2edd4e2b8db661903061d631515068c18652b8193601e08091bc869",
		"recordCount": 18863,
		"status": "ACTIVE"
	},
	"ingestionRun": {
		"sourceCode": "OFAC_SDN",
		"totalRows": 18863,
		"insertedRecords": 18863,
		"rejectedRows": 0,
		"duplicateRows": 0,
		"createdAt": "2026-04-26T05:54:47.241Z"
	}
}
```
