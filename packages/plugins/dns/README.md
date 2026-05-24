# 🌒 @openvesper/plugin-dns

DNS lookups (FREE Google DoH), WHOIS, Cloudflare DNS management

## Install

```bash
pnpm add @openvesper/plugin-dns
```

## Usage

```typescript
import { createVesper } from "@openvesper/core";
import dnsPlugin from "@openvesper/plugin-dns";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(dnsPlugin);

await vesper.run({ agent: "auto", prompt: "..." });
```

## License

MIT © OpenVesper
