---
name: contract-red-flag-scan
description: Scan a contract or terms of service for clauses that pose disproportionate risk. Use when the user shares an NDA, SaaS terms, employment contract, lease, license agreement, or any legal document and wants to know what to push back on. Identifies unlimited indemnification, auto-renewal traps, broad IP assignment, one-sided termination, mandatory arbitration in unfavorable venues, and other red flags — with plain English translations.
---

# Contract Red Flag Scan

⚠️ This is NOT legal advice. For real decisions, consult a lawyer.

## The 12 Red Flags to Scan For

### 1. Unlimited indemnification
**Plain English:** "You pay all legal costs for any lawsuit anyone brings about anything related to your use of our service."
**Push back:** Cap to fees paid; exclude indirect/consequential damages.

### 2. Auto-renewal without notice
**Plain English:** "Your subscription renews forever unless you cancel 60 days before."
**Push back:** 30-day notice max; or require affirmative renewal.

### 3. Broad IP assignment
**Plain English (employment):** "Everything you create — even on personal time — belongs to us."
**Push back:** Limit to work product on company time/resources; California Labor Code §2870 protects.

### 4. Mandatory arbitration in unfavorable jurisdiction
**Plain English:** "If we disagree, you can't sue — you arbitrate in Delaware/Cayman/etc., on their lawyer's home turf."
**Push back:** Allow small claims court; or arbitrate in your home state.

### 5. Class action waiver
**Plain English:** "You can't join a class action lawsuit, even if 1000 other people had the same problem."
**Push back:** Keep this option for systemic issues.

### 6. Liquidated damages > actual damages
**Plain English:** "If you breach, you owe us $50,000 even if our actual damages are $500."
**Push back:** Liquidated damages must be reasonable estimate of actual loss.

### 7. One-sided termination
**Plain English:** "We can terminate anytime for any reason. You can only terminate for cause with 90 days notice."
**Push back:** Symmetric termination rights.

### 8. Change-of-control acceleration
**Plain English:** "If your company is acquired, all your obligations accelerate immediately."
**Push back:** Allow assignment to acquirer if creditworthy.

### 9. Most-favored nation (MFN)
**Plain English:** "If you ever give anyone better pricing, we automatically get it too."
**Push back:** Limit to similar customers/use cases.

### 10. Right of first refusal (ROFR)
**Plain English:** "If anyone wants to acquire/license your tech, we get to match the offer first."
**Push back:** Limit duration; carve out IPO scenarios.

### 11. Unilateral modification rights
**Plain English (SaaS terms):** "We can change the terms anytime by updating this page."
**Push back:** 30-day notice for material changes; opt-out rights.

### 12. Forum selection in offshore jurisdiction
**Plain English:** "All disputes resolved under laws of Cayman Islands / BVI / etc."
**Push back:** Use a jurisdiction with strong, accessible legal system.

## Output Format

```
⚠️ NOT LEGAL ADVICE. For decisions, consult a lawyer.

📋 CONTRACT TYPE: [NDA / SaaS / Employment / Lease / etc.]

🚨 RED FLAGS FOUND:
─────────────────
[Red flag name]
Section: [§X.Y of contract]
Quote: "[exact language]"
Plain English: [what this actually means]
Risk: [HIGH/MED/LOW + why]
Suggested edit: [specific language to propose]

[Repeat for each red flag]

✅ STANDARD CLAUSES (boilerplate, usually OK):
• [list]

💬 NEGOTIATION PRIORITIES (rank order):
1. [Most important to fix]
2. ...

📞 ASK A LAWYER ABOUT:
• [Specific concerns requiring real legal expertise]
```
