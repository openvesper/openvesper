// ============================================================
// 🌒 @openvesper/plugin-imagegen
// Image generation: DALL-E 3, Stable Diffusion, Replicate, Together
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

// ── OpenAI DALL-E 3 ─────────────────────────────────────────────────

async function generateDallE(prompt: string, size: string, quality: string): Promise<ToolResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { success: false, error: "OPENAI_API_KEY required for DALL-E" };

  try {
    const r = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "dall-e-3",
        prompt,
        size: size || "1024x1024",
        quality: quality || "standard",
        n: 1,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60000,
      }
    );
    return {
      success: true,
      data: {
        provider: "DALL-E 3",
        prompt,
        size,
        url: r.data?.data?.[0]?.url,
        revisedPrompt: r.data?.data?.[0]?.revised_prompt,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.response?.data?.error?.message || e.message };
  }
}

// ── Stability AI (Stable Diffusion) ──────────────────────────────────

async function generateStableDiffusion(prompt: string, negativePrompt: string): Promise<ToolResult> {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) return { success: false, error: "STABILITY_API_KEY required" };

  try {
    const formData = new FormData();
    formData.append("prompt", prompt);
    if (negativePrompt) formData.append("negative_prompt", negativePrompt);
    formData.append("output_format", "png");

    const r = await axios.post(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      formData,
      {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
        responseType: "arraybuffer",
        timeout: 120000,
      }
    );

    const base64 = Buffer.from(r.data).toString("base64");
    return {
      success: true,
      data: {
        provider: "Stable Diffusion 3.5",
        prompt,
        negativePrompt,
        format: "png",
        base64DataUrl: `data:image/png;base64,${base64}`,
        sizeKB: Math.round(base64.length / 1024),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.response?.data?.toString?.() || e.message };
  }
}

// ── Replicate (various open source models) ───────────────────────────

async function generateReplicate(prompt: string, model: string): Promise<ToolResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) return { success: false, error: "REPLICATE_API_TOKEN required" };

  const modelMap: Record<string, string> = {
    flux: "black-forest-labs/flux-schnell",
    "flux-pro": "black-forest-labs/flux-pro",
    "flux-dev": "black-forest-labs/flux-dev",
    sd3: "stability-ai/stable-diffusion-3",
    sdxl: "stability-ai/sdxl",
  };

  const modelKey = modelMap[model.toLowerCase()] || model;

  try {
    // Start prediction
    const startR = await axios.post(
      "https://api.replicate.com/v1/models/" + modelKey + "/predictions",
      { input: { prompt } },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        timeout: 60000,
      }
    );

    const prediction = startR.data;
    let output = prediction.output;

    // If still processing, poll
    if (prediction.status === "starting" || prediction.status === "processing") {
      const getUrl = prediction.urls?.get;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollR = await axios.get(getUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (pollR.data.status === "succeeded") {
          output = pollR.data.output;
          break;
        }
        if (pollR.data.status === "failed") {
          return { success: false, error: `Replicate failed: ${pollR.data.error}` };
        }
      }
    }

    return {
      success: true,
      data: {
        provider: "Replicate",
        model: modelKey,
        prompt,
        url: Array.isArray(output) ? output[0] : output,
        id: prediction.id,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.response?.data?.detail || e.message };
  }
}

// ── Together AI (free tier) ──────────────────────────────────────────

async function generateTogether(prompt: string, model: string): Promise<ToolResult> {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return { success: false, error: "TOGETHER_API_KEY required" };

  try {
    const r = await axios.post(
      "https://api.together.xyz/v1/images/generations",
      {
        model: model || "black-forest-labs/FLUX.1-schnell-Free",
        prompt,
        n: 1,
        steps: 4,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );
    return {
      success: true,
      data: {
        provider: "Together AI",
        model,
        prompt,
        url: r.data?.data?.[0]?.url,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.response?.data?.error?.message || e.message };
  }
}

// ── OpenAI Vision (analyze images) ───────────────────────────────────

async function analyzeImage(imageUrl: string, question: string): Promise<ToolResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { success: false, error: "OPENAI_API_KEY required for vision" };

  try {
    const r = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: question || "Describe this image in detail." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1000,
      },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 }
    );
    return {
      success: true,
      data: {
        provider: "GPT-4o Vision",
        imageUrl,
        question,
        answer: r.data?.choices?.[0]?.message?.content,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.response?.data?.error?.message || e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-imagegen",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Image generation (DALL-E, Stable Diffusion, Replicate, Together) + Vision analysis",
  license: "MIT",
  tools: [
    defineTool({
      name: "generate_image_dalle",
      description: "Generate an image using OpenAI DALL-E 3. Returns URL.",
      inputSchema: inputSchema({
        prompt: { type: "string", description: "Image description" },
        size: { type: "string", description: "1024x1024 | 1792x1024 | 1024x1792" },
        quality: { type: "string", description: "standard | hd" },
      }, ["prompt"]),
      handler: async (i) => generateDallE(i.prompt as string, i.size as string, i.quality as string),
      category: "imagegen",
      permission: "external",
    }),
    defineTool({
      name: "generate_image_sd",
      description: "Generate via Stability AI Stable Diffusion. Returns base64 data URL.",
      inputSchema: inputSchema({
        prompt: { type: "string", description: "Image description" },
        negative_prompt: { type: "string", description: "What to avoid" },
      }, ["prompt"]),
      handler: async (i) => generateStableDiffusion(i.prompt as string, i.negative_prompt as string || ""),
      category: "imagegen",
      permission: "external",
    }),
    defineTool({
      name: "generate_image_replicate",
      description: "Generate via Replicate. Models: flux, flux-pro, flux-dev, sd3, sdxl.",
      inputSchema: inputSchema({
        prompt: { type: "string", description: "Description" },
        model: { type: "string", description: "Model: flux | flux-pro | sd3 | sdxl" },
      }, ["prompt"]),
      handler: async (i) => generateReplicate(i.prompt as string, (i.model as string) || "flux"),
      category: "imagegen",
      permission: "external",
    }),
    defineTool({
      name: "generate_image_together",
      description: "Generate via Together AI (free tier with FLUX.1-schnell-Free).",
      inputSchema: inputSchema({
        prompt: { type: "string", description: "Description" },
        model: { type: "string", description: "Model name (optional)" },
      }, ["prompt"]),
      handler: async (i) => generateTogether(i.prompt as string, i.model as string || ""),
      category: "imagegen",
      permission: "external",
    }),
    defineTool({
      name: "analyze_image",
      description: "Analyze an image using GPT-4o Vision. Pass URL + question.",
      inputSchema: inputSchema({
        image_url: { type: "string", description: "Image URL" },
        question: { type: "string", description: "What to ask about it" },
      }, ["image_url"]),
      handler: async (i) => analyzeImage(i.image_url as string, i.question as string || ""),
      category: "imagegen",
      permission: "external",
    }),
  ]

});
