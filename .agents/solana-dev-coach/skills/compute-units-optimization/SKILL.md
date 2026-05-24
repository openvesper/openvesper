---
name: compute-units-optimization
description: Reduce CU consumption in Solana programs
trigger_keywords: [compute units, cu, priority fee, optimize, gas]
tools: [solana_compute_units, read_file]
---

# Compute Units Optimization

Reduce CU consumption in Solana programs:

## Audit current usage

```bash
solana logs <PROGRAM_ID>
# Look for: "consumed XYZ of 200000 compute units"
```

## High-impact optimizations

### 1. Avoid copying large data
```rust
// ❌ Expensive
let data = account.data.borrow().to_vec();

// ✅ Cheap
let data = account.data.borrow();
```

### 2. Pack accounts efficiently
- Use `#[repr(packed)]` for fixed structs
- Bool → bit flags (1 byte = 8 flags)
- Use `Pubkey` only where needed (32 bytes!)

### 3. Avoid recursive CPI
Each CPI level adds overhead. Flatten where possible.

### 4. Use lookup tables for >5 unique pubkeys
```typescript
const lookupTable = await client.getAddressLookupTable(LUT_ADDRESS);
const tx = new VersionedTransaction(
  message.compileToV0Message([lookupTable.value])
);
```

### 5. Borsh deserialization is expensive
Pre-validate before deserializing in instruction.

## Priority fees

```typescript
import { ComputeBudgetProgram } from "@solana/web3.js";

const ix = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 100_000, // adjust based on network state
});
```

Guidance:
- Normal tx: median * 1.5
- Time-sensitive: median * 3-5
- Sniping: median * 10+

## Verification

Use `solana_compute_units` tool to estimate before deploying.
