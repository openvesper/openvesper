# 🌒 @openvesper/plugin-books

Book search & recommendations (Google Books + OpenLibrary, both FREE)

## Install

```bash
pnpm add @openvesper/plugin-books
```

## Usage

```typescript
import { createVesper } from "@openvesper/core";
import booksPlugin from "@openvesper/plugin-books";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(booksPlugin);

await vesper.run({ agent: "auto", prompt: "..." });
```

## License

MIT © OpenVesper
