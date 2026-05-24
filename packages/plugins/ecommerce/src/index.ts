// ============================================================
// 🌒 @openvesper/plugin-ecommerce
// Shopify Admin API — products, orders, customers, inventory
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

async function shopify(path: string, options: RequestInit = {}): Promise<ToolResult> {
  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!shop || !token) return { success: false, error: "SHOPIFY_SHOP (mystore.myshopify.com) and SHOPIFY_ACCESS_TOKEN required" };

  try {
    const url = `https://${shop}/admin/api/2024-10${path}`;
    const r = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!r.ok) {
      const err = await r.text();
      return { success: false, error: `Shopify: ${r.status} ${err.slice(0, 200)}` };
    }
    return { success: true, data: await r.json() };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function listProducts(limit?: number): Promise<ToolResult> {
  const r = await shopify(`/products.json?limit=${limit || 50}`);
  if (!r.success) return r;
  const products = ((r.data as any).products || []) as any[];
  return {
    success: true,
    data: {
      count: products.length,
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        status: p.status,
        product_type: p.product_type,
        vendor: p.vendor,
        variants_count: p.variants?.length || 0,
        total_inventory: (p.variants || []).reduce((s: number, v: any) => s + (v.inventory_quantity || 0), 0),
        price_range: {
          min: Math.min(...(p.variants || []).map((v: any) => parseFloat(v.price))),
          max: Math.max(...(p.variants || []).map((v: any) => parseFloat(v.price))),
        },
        created: p.created_at,
      })),
    },
  };
}

async function getProduct(productId: number): Promise<ToolResult> {
  const r = await shopify(`/products/${productId}.json`);
  if (!r.success) return r;
  return { success: true, data: (r.data as any).product };
}

async function searchProducts(query: string): Promise<ToolResult> {
  const r = await shopify(`/products.json?title=${encodeURIComponent(query)}&limit=20`);
  if (!r.success) return r;
  const products = ((r.data as any).products || []) as any[];
  return {
    success: true,
    data: {
      query,
      count: products.length,
      products: products.map((p) => ({ id: p.id, title: p.title, handle: p.handle })),
    },
  };
}

async function updateInventory(variantId: number, locationId: number, quantity: number): Promise<ToolResult> {
  // First we need the inventory_item_id
  const variantRes = await shopify(`/variants/${variantId}.json`);
  if (!variantRes.success) return variantRes;
  const itemId = (variantRes.data as any).variant?.inventory_item_id;
  if (!itemId) return { success: false, error: "Variant inventory item not found" };

  return shopify(`/inventory_levels/set.json`, {
    method: "POST",
    body: JSON.stringify({
      location_id: locationId,
      inventory_item_id: itemId,
      available: quantity,
    }),
  });
}

async function listOrders(status?: string, limit?: number): Promise<ToolResult> {
  const params = new URLSearchParams({
    status: status || "any",
    limit: String(limit || 50),
  });
  const r = await shopify(`/orders.json?${params}`);
  if (!r.success) return r;
  const orders = ((r.data as any).orders || []) as any[];
  return {
    success: true,
    data: {
      count: orders.length,
      total_value: orders.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0),
      orders: orders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        email: o.email,
        total: o.total_price,
        currency: o.currency,
        financial_status: o.financial_status,
        fulfillment_status: o.fulfillment_status,
        line_items: o.line_items?.length || 0,
        created: o.created_at,
      })),
    },
  };
}

async function getOrder(orderId: number): Promise<ToolResult> {
  const r = await shopify(`/orders/${orderId}.json`);
  if (!r.success) return r;
  return { success: true, data: (r.data as any).order };
}

async function fulfillOrder(orderId: number, trackingNumber?: string, trackingCompany?: string): Promise<ToolResult> {
  const body: any = { fulfillment: { notify_customer: true } };
  if (trackingNumber) body.fulfillment.tracking_number = trackingNumber;
  if (trackingCompany) body.fulfillment.tracking_company = trackingCompany;
  return shopify(`/orders/${orderId}/fulfillments.json`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function shopifyAnalytics(): Promise<ToolResult> {
  // Pull last 30 days of orders for analytics
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const r = await shopify(`/orders.json?status=any&created_at_min=${since}&limit=250`);
  if (!r.success) return r;
  const orders = ((r.data as any).orders || []) as any[];

  const revenue = orders.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0);
  const paid = orders.filter((o) => o.financial_status === "paid");
  const unfulfilled = orders.filter((o) => o.fulfillment_status !== "fulfilled");

  return {
    success: true,
    data: {
      period: "Last 30 days",
      total_orders: orders.length,
      paid_orders: paid.length,
      unfulfilled_orders: unfulfilled.length,
      total_revenue: revenue.toFixed(2),
      average_order_value: orders.length ? (revenue / orders.length).toFixed(2) : "0",
      currency: orders[0]?.currency || "USD",
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-ecommerce",
  version: "3.3.0",
  author: "OpenVesper",
  description: "E-commerce — Shopify Admin API (products, orders, customers, inventory, fulfillment)",
  license: "MIT",
  tools: [
    defineTool({ name: "shopify_list_products", description: "List Shopify products with inventory and prices", inputSchema: inputSchema({ limit: { type: "number", description: "Max products (default 50, max 250)" } }), handler: async (i) => listProducts(i.limit as number), category: "ecommerce" }),
    defineTool({ name: "shopify_get_product", description: "Get full product details by ID", inputSchema: inputSchema({ product_id: { type: "number", description: "Shopify product ID" } }, ["product_id"]), handler: async (i) => getProduct(i.product_id as number), category: "ecommerce" }),
    defineTool({ name: "shopify_search_products", description: "Search products by title", inputSchema: inputSchema({ query: { type: "string", description: "Product title query" } }, ["query"]), handler: async (i) => searchProducts(i.query as string), category: "ecommerce" }),
    defineTool({ name: "shopify_update_inventory", description: "Update inventory level for a variant at a location", inputSchema: inputSchema({ variant_id: { type: "number" }, location_id: { type: "number" }, quantity: { type: "number" } }, ["variant_id", "location_id", "quantity"]), handler: async (i) => updateInventory(i.variant_id as number, i.location_id as number, i.quantity as number), category: "ecommerce", permission: "write" }),
    defineTool({ name: "shopify_list_orders", description: "List recent orders", inputSchema: inputSchema({ status: { type: "string", description: "open, closed, cancelled, any (default)" }, limit: { type: "number" } }), handler: async (i) => listOrders(i.status as string, i.limit as number), category: "ecommerce" }),
    defineTool({ name: "shopify_get_order", description: "Get full order details", inputSchema: inputSchema({ order_id: { type: "number" } }, ["order_id"]), handler: async (i) => getOrder(i.order_id as number), category: "ecommerce" }),
    defineTool({ name: "shopify_fulfill_order", description: "Mark order fulfilled with tracking", inputSchema: inputSchema({ order_id: { type: "number" }, tracking_number: { type: "string" }, tracking_company: { type: "string", description: "USPS, FedEx, UPS, DHL, etc." } }, ["order_id"]), handler: async (i) => fulfillOrder(i.order_id as number, i.tracking_number as string, i.tracking_company as string), category: "ecommerce", permission: "write" }),
    defineTool({ name: "shopify_analytics", description: "30-day revenue + order analytics summary", inputSchema: inputSchema({}), handler: async () => shopifyAnalytics(), category: "ecommerce" }),
  ]

});
