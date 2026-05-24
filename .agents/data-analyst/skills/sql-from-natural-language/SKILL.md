---
name: sql-from-natural-language
description: Translate plain-English data questions into precise SQL queries with validation. Use when the user asks a data question that requires a SELECT/aggregation query against a database. Walks through schema discovery, query drafting, validation runs, and result interpretation. Handles JOINs, window functions, CTEs, and explains the WHY behind each clause.
---

# SQL from Natural Language

When the user asks a data question:

## 1. Schema first
Before writing SQL, know what tables exist.
- If you have access to plugin-database, run `db_list_tables` first
- If not, ask the user for schema OR sample rows

## 2. Restate the question
Confirm interpretation before querying.
"You're asking about X for time period Y, grouped by Z?"

## 3. Draft the query
- Start simple. Add complexity only as needed.
- Prefer CTEs over deeply nested subqueries
- Window functions for ranking/running totals
- Explicit JOINs (INNER, LEFT) — never ambiguous

## 4. Validate before believing
- Run `SELECT COUNT(*)` first if scope unclear
- Check for NULLs in grouping columns
- Spot-check 5 sample rows

## 5. Interpret with caution
- Report row counts alongside aggregates
- Flag outliers
- Note time zone assumptions

## Example

User: "How much did each region earn last quarter?"

```sql
WITH q3_orders AS (
  SELECT region, total_cents
  FROM orders
  WHERE created_at >= '2026-04-01'
    AND created_at < '2026-07-01'
    AND status = 'paid'
)
SELECT
  region,
  COUNT(*) AS order_count,
  SUM(total_cents) / 100.0 AS revenue
FROM q3_orders
GROUP BY region
ORDER BY revenue DESC;
```

Notes:
- Assumed UTC timestamps
- Excluded refunds/cancellations
- 'paid' filter — confirm this matches your status enum
