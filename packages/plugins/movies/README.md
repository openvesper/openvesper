# 🌒 @openvesper/plugin-movies

Movies & TV shows via TMDB — search, details, trending, recommendations

## Install

```bash
pnpm add @openvesper/plugin-movies
```

## Usage

```typescript
import { createVesper } from "@openvesper/core";
import moviesPlugin from "@openvesper/plugin-movies";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(moviesPlugin);

await vesper.run({ agent: "auto", prompt: "..." });
```

## License

MIT © OpenVesper
