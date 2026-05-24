// ============================================================
// 🌒 @openvesper/plugin-browser
// Browser automation via Playwright (web scraping, screenshots)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// Lazy load Playwright (optional dep)
let playwright: any = null;
async function getPlaywright() {
  if (playwright) return playwright;
  try {
    playwright = await import("playwright" as any);
    return playwright;
  } catch {
    throw new Error("playwright not installed. Run: npm install playwright && npx playwright install chromium");
  }
}

// Browser pool (reuse instances)
let browserInstance: any = null;
async function getBrowser() {
  if (browserInstance) return browserInstance;
  const pw = await getPlaywright();
  browserInstance = await pw.chromium.launch({ headless: true });
  return browserInstance;
}

async function withPage<T>(fn: (page: any) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (OpenVesper Bot)",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

// ── Tools ─────────────────────────────────────────────────────────────

async function scrapePage(url: string, selector?: string): Promise<ToolResult> {
  try {
    return await withPage(async (page) => {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const title = await page.title();
      let content: string;
      if (selector) {
        const elements = await page.$$(selector);
        content = await Promise.all(elements.map((el: any) => el.textContent()))
          .then((arr: string[]) => arr.join("\n").slice(0, 8000));
      } else {
        content = (await page.evaluate(() => {
          // Strip scripts/styles and get text
          document.querySelectorAll("script, style, nav, footer").forEach((e: Element) => e.remove());
          return (document.body as HTMLElement).innerText;
        })).slice(0, 8000);
      }
      return {
        success: true,
        data: { url, title, content, contentLength: content.length, selector: selector || "body" },
      };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function screenshot(url: string, fullPage: boolean): Promise<ToolResult> {
  try {
    return await withPage(async (page) => {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const buffer = await page.screenshot({ fullPage, type: "png" });
      const base64 = Buffer.from(buffer).toString("base64");
      return {
        success: true,
        data: {
          url,
          fullPage,
          base64DataUrl: `data:image/png;base64,${base64}`,
          sizeKB: Math.round(base64.length / 1024),
        },
      };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function extractLinks(url: string): Promise<ToolResult> {
  try {
    return await withPage(async (page) => {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll("a"));
        return anchors.map((a: any) => ({ text: a.textContent?.trim().slice(0, 80), href: a.href }))
          .filter((l: any) => l.href && l.text)
          .slice(0, 100);
      });
      return { success: true, data: { url, count: links.length, links } };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function clickAndExtract(url: string, clickSelector: string, extractSelector: string): Promise<ToolResult> {
  try {
    return await withPage(async (page) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.click(clickSelector);
      await page.waitForTimeout(1500);
      const content = await page.$eval(extractSelector, (el: any) => el.textContent || "");
      return { success: true, data: { url, clickSelector, extractSelector, content: content.slice(0, 4000) } };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function fillForm(url: string, fields: Record<string, string>, submitSelector?: string): Promise<ToolResult> {
  try {
    return await withPage(async (page) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      for (const [selector, value] of Object.entries(fields)) {
        await page.fill(selector, value);
      }
      if (submitSelector) {
        await page.click(submitSelector);
        await page.waitForTimeout(2000);
      }
      const finalUrl = page.url();
      const content = await page.evaluate(() => (document.body as HTMLElement).innerText.slice(0, 4000));
      return { success: true, data: { startedAt: url, finalUrl, content } };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function evaluateJS(url: string, jsExpression: string): Promise<ToolResult> {
  try {
    return await withPage(async (page) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(jsExpression);
      return { success: true, data: { url, jsExpression, result: JSON.stringify(result).slice(0, 4000) } };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-browser",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Browser automation — Playwright headless scraping, screenshots, form filling",
  license: "MIT",
  tools: [
    defineTool({
      name: "browser_scrape",
      description: "Scrape text content from a URL. Optionally use a CSS selector.",
      inputSchema: inputSchema({
        url: { type: "string", description: "URL to scrape" },
        selector: { type: "string", description: "Optional CSS selector" },
      }, ["url"]),
      handler: async (i) => scrapePage(i.url as string, i.selector as string),
      category: "browser",
      permission: "external",
    }),
    defineTool({
      name: "browser_screenshot",
      description: "Take a screenshot of a webpage (returns base64 PNG).",
      inputSchema: inputSchema({
        url: { type: "string", description: "URL" },
        full_page: { type: "boolean", description: "Capture entire page (not just viewport)" },
      }, ["url"]),
      handler: async (i) => screenshot(i.url as string, Boolean(i.full_page)),
      category: "browser",
      permission: "external",
    }),
    defineTool({
      name: "browser_extract_links",
      description: "Extract all links from a webpage.",
      inputSchema: inputSchema({ url: { type: "string", description: "URL" } }, ["url"]),
      handler: async (i) => extractLinks(i.url as string),
      category: "browser",
      permission: "external",
    }),
    defineTool({
      name: "browser_click_extract",
      description: "Click an element, wait, then extract content from another element.",
      inputSchema: inputSchema({
        url: { type: "string", description: "URL" },
        click_selector: { type: "string", description: "CSS to click" },
        extract_selector: { type: "string", description: "CSS to read after click" },
      }, ["url", "click_selector", "extract_selector"]),
      handler: async (i) => clickAndExtract(i.url as string, i.click_selector as string, i.extract_selector as string),
      category: "browser",
      permission: "external",
    }),
    defineTool({
      name: "browser_fill_form",
      description: "Fill form fields and optionally submit. Fields = { 'css_selector': 'value', ... }",
      inputSchema: inputSchema({
        url: { type: "string", description: "Page URL" },
        fields: { type: "string", description: "JSON: { '#email': 'a@b.com', '#name': 'John' }" },
        submit_selector: { type: "string", description: "Optional submit button CSS" },
      }, ["url", "fields"]),
      handler: async (i) => {
        let f = {};
        try { f = JSON.parse(i.fields as string); } catch { return { success: false, error: "Invalid fields JSON" }; }
        return fillForm(i.url as string, f as any, i.submit_selector as string);
      },
      category: "browser",
      permission: "external",
    }),
    defineTool({
      name: "browser_eval_js",
      description: "Execute JS expression in page context (advanced).",
      inputSchema: inputSchema({
        url: { type: "string", description: "URL" },
        js_expression: { type: "string", description: "JS expression to evaluate" },
      }, ["url", "js_expression"]),
      handler: async (i) => evaluateJS(i.url as string, i.js_expression as string),
      category: "browser",
      permission: "external",
    }),
  ]

});
