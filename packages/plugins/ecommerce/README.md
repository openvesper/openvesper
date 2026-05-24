# 🌒 @openvesper/plugin-ecommerce

Shopify Admin API — products, orders, customers, inventory, fulfillment

## Install

```bash
pnpm add @openvesper/plugin-ecommerce
```

## Usage

```typescript
import { createVesper } from "@openvesper/core";
import ecommercePlugin from "@openvesper/plugin-ecommerce";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(ecommercePlugin);

await vesper.run({ agent: "auto", prompt: "..." });
```

## License

MIT © OpenVesper
