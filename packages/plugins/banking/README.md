# 🌒 @openvesper/plugin-banking

Stock prices (FREE Yahoo Finance), currency conversion (FREE), loan calculators

## Install

```bash
pnpm add @openvesper/plugin-banking
```

## Usage

```typescript
import { createVesper } from "@openvesper/core";
import bankingPlugin from "@openvesper/plugin-banking";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(bankingPlugin);

await vesper.run({ agent: "auto", prompt: "..." });
```

## License

MIT © OpenVesper
