# P3E-C1 Isolated D1 Certification

Status: **PASS**
Environment: Wrangler local D1 persistence directory with isolated file-backed D1-compatible SQL adapter
D1 persist dir: C:\Users\LEMNAR~1\AppData\Local\Temp\lacurent-p3e-c1-isolated-d1
D1 sqlite file: C:\Users\LEMNAR~1\AppData\Local\Temp\lacurent-p3e-c1-isolated-d1\v3\d1\miniflare-D1DatabaseObject\c2c963dd411b38efb45f14a95cad15c0b7b1132f9efa2743734bfe961c649cde.sqlite

## Schema
Applied baseline: schema.sql plus migrations 010-012 via wrangler d1 execute --local --persist-to
Migration notes: schema.sql is the repository's consolidated empty-database baseline; legacy incremental migrations 001-009 are not empty-database safe because they alter tables created by the baseline. Canonical P3E versioned migrations 010-012 are applied idempotently after the baseline and verified by direct table inspection.

## Commands
- `wrangler d1 execute lacurent-dev-db --local --persist-to C:\Users\LEMNAR~1\AppData\Local\Temp\lacurent-p3e-c1-isolated-d1 --file C:\Users\Lemnaru Karol\OneDrive\Documents\Master\An II\PIGMC\lacurent-p2d-production-calculator\schema.sql --json`
- `wrangler d1 execute lacurent-dev-db --local --persist-to C:\Users\LEMNAR~1\AppData\Local\Temp\lacurent-p3e-c1-isolated-d1 --file C:\Users\Lemnaru Karol\OneDrive\Documents\Master\An II\PIGMC\lacurent-p2d-production-calculator\migrations\010_building_platform_versioned_backend.sql --json`
- `wrangler d1 execute lacurent-dev-db --local --persist-to C:\Users\LEMNAR~1\AppData\Local\Temp\lacurent-p3e-c1-isolated-d1 --file C:\Users\Lemnaru Karol\OneDrive\Documents\Master\An II\PIGMC\lacurent-p2d-production-calculator\migrations\011_building_platform_local_first_flow.sql --json`
- `wrangler d1 execute lacurent-dev-db --local --persist-to C:\Users\LEMNAR~1\AppData\Local\Temp\lacurent-p3e-c1-isolated-d1 --file C:\Users\Lemnaru Karol\OneDrive\Documents\Master\An II\PIGMC\lacurent-p2d-production-calculator\migrations\012_building_platform_reprocessing_exports.sql --json`

## Operation Counts
Worker read statements: 81
Worker write statements: 78
Batch transactions: 18
Direct inspection queries: 267
Canonical open endpoint calls: 4

## Row Evidence
```json
{
  "afterDraft": {
    "projects": 1,
    "activeDrafts": 1,
    "committedDrafts": 0,
    "buildingDnaVersions": 0,
    "analysisVersions": 0,
    "reportVersions": 0,
    "idempotencyRows": 1,
    "auditEvents": 2
  },
  "afterPermanentV1": {
    "projects": 1,
    "activeDrafts": 0,
    "committedDrafts": 1,
    "buildingDnaVersions": 1,
    "analysisVersions": 1,
    "reportVersions": 1,
    "idempotencyRows": 2,
    "auditEvents": 4
  },
  "afterPermanentV2": {
    "projects": 1,
    "activeDrafts": 0,
    "committedDrafts": 1,
    "buildingDnaVersions": 2,
    "analysisVersions": 2,
    "reportVersions": 2,
    "idempotencyRows": 3,
    "auditEvents": 5
  }
}
```

## Reopen Parity
Exact reopen parity: PASS

## Idempotency
```json
{
  "replayReturnedOriginalAnalysisVersion": true,
  "duplicateVersionRowsCreated": false,
  "modifiedRequestConflictStatus": 409,
  "modifiedRequestConflictCode": "idempotency_key_reused_for_different_request"
}
```

## Concurrency
```json
{
  "firstSessionStatus": 200,
  "secondSessionStatus": 409,
  "secondSessionCode": "stale_project_version_conflict",
  "rowCountsAfterRejectedStaleSave": {
    "projects": 5,
    "activeDrafts": 0,
    "committedDrafts": 1,
    "buildingDnaVersions": 3,
    "analysisVersions": 3,
    "reportVersions": 3,
    "idempotencyRows": 12,
    "auditEvents": 6
  }
}
```

## Rollback
```json
[
  {
    "stage": "after_dna_insert",
    "failureStatus": 500,
    "retryStatus": 200,
    "versionCountsAfterFailure": {
      "projects": 2,
      "activeDrafts": 0,
      "committedDrafts": 0,
      "buildingDnaVersions": 0,
      "analysisVersions": 0,
      "reportVersions": 0,
      "idempotencyRows": 5,
      "auditEvents": 1
    },
    "versionCountsAfterRetry": {
      "projects": 2,
      "activeDrafts": 0,
      "committedDrafts": 0,
      "buildingDnaVersions": 1,
      "analysisVersions": 1,
      "reportVersions": 1,
      "idempotencyRows": 6,
      "auditEvents": 2
    }
  },
  {
    "stage": "after_analysis_insert",
    "failureStatus": 500,
    "retryStatus": 200,
    "versionCountsAfterFailure": {
      "projects": 3,
      "activeDrafts": 0,
      "committedDrafts": 0,
      "buildingDnaVersions": 0,
      "analysisVersions": 0,
      "reportVersions": 0,
      "idempotencyRows": 7,
      "auditEvents": 1
    },
    "versionCountsAfterRetry": {
      "projects": 3,
      "activeDrafts": 0,
      "committedDrafts": 0,
      "buildingDnaVersions": 1,
      "analysisVersions": 1,
      "reportVersions": 1,
      "idempotencyRows": 8,
      "auditEvents": 2
    }
  },
  {
    "stage": "after_report_insert",
    "failureStatus": 500,
    "retryStatus": 200,
    "versionCountsAfterFailure": {
      "projects": 4,
      "activeDrafts": 0,
      "committedDrafts": 0,
      "buildingDnaVersions": 0,
      "analysisVersions": 0,
      "reportVersions": 0,
      "idempotencyRows": 9,
      "auditEvents": 1
    },
    "versionCountsAfterRetry": {
      "projects": 4,
      "activeDrafts": 0,
      "committedDrafts": 0,
      "buildingDnaVersions": 1,
      "analysisVersions": 1,
      "reportVersions": 1,
      "idempotencyRows": 10,
      "auditEvents": 2
    }
  },
  {
    "stage": "after_project_pointer_update",
    "failureStatus": 500,
    "retryStatus": 200,
    "versionCountsAfterFailure": {
      "projects": 5,
      "activeDrafts": 0,
      "committedDrafts": 0,
      "buildingDnaVersions": 0,
      "analysisVersions": 0,
      "reportVersions": 0,
      "idempotencyRows": 11,
      "auditEvents": 1
    },
    "versionCountsAfterRetry": {
      "projects": 5,
      "activeDrafts": 0,
      "committedDrafts": 0,
      "buildingDnaVersions": 1,
      "analysisVersions": 1,
      "reportVersions": 1,
      "idempotencyRows": 12,
      "auditEvents": 2
    }
  }
]
```

## Defects
No defects found.

