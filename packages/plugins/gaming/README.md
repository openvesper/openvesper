# 🌒 @openvesper/plugin-gaming

Steam profile/library/playtime + Twitch streams + streamer info

## Install

```bash
pnpm add @openvesper/plugin-gaming
```

## Usage

```typescript
import { createVesper } from "@openvesper/core";
import gamingPlugin from "@openvesper/plugin-gaming";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(gamingPlugin);

await vesper.run({ agent: "auto", prompt: "..." });
```

## License

MIT © OpenVesper
