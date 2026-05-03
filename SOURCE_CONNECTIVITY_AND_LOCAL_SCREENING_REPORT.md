# SOURCE CONNECTIVITY AND LOCAL SCREENING REPORT

Date: 2026-04-27T03:42:11.895Z
API: http://localhost:4000/api/v1

## Official Source Sync Results
- OFAC_SDN: inserted=18863, rejected=0, duplicates=0, versionId=cmognfkbk001yfy29p63sc03u
- OFAC_CONSOLIDATED: inserted=446, rejected=0, duplicates=0, versionId=cmognftq90em8fy2964ztnfbc
- UNSEC_CONSOLIDATED: inserted=1712, rejected=36, duplicates=36, versionId=cmognfzxf0eyxfy29l5vvazno

## Local Screening Proof
- OFAC-only: searchedSources=["OFAC_SDN"] usedLocalVersions=[{"sourceCode":"OFAC_SDN","versionId":"cmofcswj80elso02t814t71ba","versionLabel":"OFAC-SDN-2026-04-26"}] riskLevel=HIGH matchCount=2
- UNSEC-only: searchedSources=["UNSEC_CONSOLIDATED"] usedLocalVersions=[{"sourceCode":"UNSEC_CONSOLIDATED","versionId":"cmofctbjh0tiro02to68kgscx","versionLabel":"UNSEC-CONSOLIDATED-2026-04-26"}] riskLevel=LOW matchCount=0
- selected-sources: searchedSources=["OFAC_SDN","UNSEC_CONSOLIDATED"] usedLocalVersions=[{"sourceCode":"OFAC_SDN","versionId":"cmofcswj80elso02t814t71ba","versionLabel":"OFAC-SDN-2026-04-26"},{"sourceCode":"UNSEC_CONSOLIDATED","versionId":"cmofctbjh0tiro02to68kgscx","versionLabel":"UNSEC-CONSOLIDATED-2026-04-26"}] riskLevel=HIGH matchCount=2
- ALL-sources: searchedSources=["OFAC_CONSOLIDATED","OFAC_SDN","UNSEC_CONSOLIDATED"] usedLocalVersions=[{"sourceCode":"OFAC_CONSOLIDATED","versionId":"cmofct3vf0t62o02tlhj7y2e7","versionLabel":"OFAC-CONSOLIDATED-2026-04-26"},{"sourceCode":"OFAC_SDN","versionId":"cmofcswj80elso02t814t71ba","versionLabel":"OFAC-SDN-2026-04-26"},{"sourceCode":"UNSEC_CONSOLIDATED","versionId":"cmofctbjh0tiro02to68kgscx","versionLabel":"UNSEC-CONSOLIDATED-2026-04-26"}] riskLevel=HIGH matchCount=2
- omitted-sources: searchedSources=["OFAC_CONSOLIDATED","OFAC_SDN","UNSEC_CONSOLIDATED"] usedLocalVersions=[{"sourceCode":"OFAC_CONSOLIDATED","versionId":"cmofct3vf0t62o02tlhj7y2e7","versionLabel":"OFAC-CONSOLIDATED-2026-04-26"},{"sourceCode":"OFAC_SDN","versionId":"cmofcswj80elso02t814t71ba","versionLabel":"OFAC-SDN-2026-04-26"},{"sourceCode":"UNSEC_CONSOLIDATED","versionId":"cmofctbjh0tiro02to68kgscx","versionLabel":"UNSEC-CONSOLIDATED-2026-04-26"}] riskLevel=HIGH matchCount=2

## Verdict
- PASS: official source sync and local-only screening verification complete.
