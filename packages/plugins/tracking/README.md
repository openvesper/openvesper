# 🌒 @openvesper/plugin-tracking

Multi-carrier package tracking (USPS, UPS, FedEx, DHL)

## Install

```bash
pnpm add @openvesper/plugin-tracking
```

## Usage

```typescript
import { createVesper } from "@openvesper/core";
import trackingPlugin from "@openvesper/plugin-tracking";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(trackingPlugin);

await vesper.run({ agent: "auto", prompt: "..." });
```

## License

MIT © OpenVesper
