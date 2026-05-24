# 🌒 @openvesper/plugin-smarthome

Home Assistant smart home control — lights, climate, sensors, services

## Install

```bash
pnpm add @openvesper/plugin-smarthome
```

## Usage

```typescript
import { createVesper } from "@openvesper/core";
import smarthomePlugin from "@openvesper/plugin-smarthome";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(smarthomePlugin);

await vesper.run({ agent: "auto", prompt: "..." });
```

## License

MIT © OpenVesper
