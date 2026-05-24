// ============================================================
// 🌒 @openvesper/plugin-voice
// Text-to-Speech (ElevenLabs, OpenAI) + Speech-to-Text (Whisper)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import * as fs from "fs/promises";
import * as path from "path";

// ── ElevenLabs TTS ──────────────────────────────────────────

async function elevenLabsTTS(text: string, voiceId: string, model: string): Promise<ToolResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { success: false, error: "ELEVENLABS_API_KEY required" };

  try {
    const useVoice = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Bella (default)
    const useModel = model || "eleven_turbo_v2_5";
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${useVoice}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: useModel,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return { success: false, error: `ElevenLabs: ${r.status} ${err.slice(0, 200)}` };
    }
    const buffer = await r.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return {
      success: true,
      data: {
        provider: "ElevenLabs",
        voiceId: useVoice,
        model: useModel,
        text: text.slice(0, 100),
        format: "mp3",
        base64DataUrl: `data:audio/mpeg;base64,${base64}`,
        sizeKB: Math.round(base64.length / 1024),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function elevenLabsListVoices(): Promise<ToolResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { success: false, error: "ELEVENLABS_API_KEY required" };

  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data?.detail?.message || "Error" };
    const voices = (data.voices || []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels,
    }));
    return { success: true, data: { count: voices.length, voices } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── OpenAI TTS ──────────────────────────────────────────────

async function openAITTS(text: string, voice: string, model: string): Promise<ToolResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { success: false, error: "OPENAI_API_KEY required" };

  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "tts-1",
        input: text,
        voice: voice || "alloy",
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return { success: false, error: `OpenAI TTS: ${r.status} ${err.slice(0, 200)}` };
    }
    const buffer = await r.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return {
      success: true,
      data: {
        provider: "OpenAI TTS",
        voice: voice || "alloy",
        model: model || "tts-1",
        format: "mp3",
        base64DataUrl: `data:audio/mpeg;base64,${base64}`,
        sizeKB: Math.round(base64.length / 1024),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── OpenAI Whisper (STT) ────────────────────────────────────

async function whisperSTT(audioPath: string, ctx: any): Promise<ToolResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { success: false, error: "OPENAI_API_KEY required" };

  try {
    const safePath = path.isAbsolute(audioPath)
      ? audioPath
      : path.join(ctx.workspace.path, audioPath);
    const buffer = await fs.readFile(safePath);

    const form = new FormData();
    form.append("file", new Blob([buffer]), path.basename(safePath));
    form.append("model", "whisper-1");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form as any,
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data?.error?.message || "Whisper error" };

    return {
      success: true,
      data: { audioPath, transcription: data.text, language: data.language, duration: data.duration },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Groq Whisper (faster + free tier) ───────────────────────

async function groqWhisper(audioPath: string, ctx: any): Promise<ToolResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { success: false, error: "GROQ_API_KEY required" };

  try {
    const safePath = path.isAbsolute(audioPath) ? audioPath : path.join(ctx.workspace.path, audioPath);
    const buffer = await fs.readFile(safePath);
    const form = new FormData();
    form.append("file", new Blob([buffer]), path.basename(safePath));
    form.append("model", "whisper-large-v3-turbo");

    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form as any,
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data?.error?.message || "Groq Whisper error" };

    return {
      success: true,
      data: { provider: "Groq", audioPath, transcription: data.text },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-voice",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Voice — TTS (ElevenLabs, OpenAI) + STT (Whisper, Groq)",
  license: "MIT",
  tools: [
    defineTool({
      name: "tts_elevenlabs",
      description: "Generate speech using ElevenLabs (high quality, many voices).",
      inputSchema: inputSchema({
        text: { type: "string", description: "Text to speak" },
        voice_id: { type: "string", description: "Voice ID (optional, default: Bella)" },
        model: { type: "string", description: "Model (optional, default: eleven_turbo_v2_5)" },
      }, ["text"]),
      handler: async (i) => elevenLabsTTS(i.text as string, i.voice_id as string || "", i.model as string || ""),
      category: "voice",
      permission: "external",
    }),
    defineTool({
      name: "tts_elevenlabs_voices",
      description: "List available ElevenLabs voices",
      inputSchema: inputSchema({}),
      handler: async () => elevenLabsListVoices(),
      category: "voice",
      permission: "read",
    }),
    defineTool({
      name: "tts_openai",
      description: "Generate speech using OpenAI TTS (voices: alloy, echo, fable, onyx, nova, shimmer)",
      inputSchema: inputSchema({
        text: { type: "string", description: "Text" },
        voice: { type: "string", description: "alloy|echo|fable|onyx|nova|shimmer" },
        model: { type: "string", description: "tts-1 | tts-1-hd" },
      }, ["text"]),
      handler: async (i) => openAITTS(i.text as string, (i.voice as string) || "alloy", (i.model as string) || "tts-1"),
      category: "voice",
      permission: "external",
    }),
    defineTool({
      name: "stt_whisper",
      description: "Transcribe audio file using OpenAI Whisper",
      inputSchema: inputSchema({
        audio_path: { type: "string", description: "Path to audio file (mp3, wav, m4a, ogg)" },
      }, ["audio_path"]),
      handler: async (i, ctx) => whisperSTT(i.audio_path as string, ctx),
      category: "voice",
      permission: "read",
    }),
    defineTool({
      name: "stt_groq_whisper",
      description: "Transcribe audio using Groq Whisper Large v3 Turbo (FREE, very fast)",
      inputSchema: inputSchema({
        audio_path: { type: "string", description: "Audio file" },
      }, ["audio_path"]),
      handler: async (i, ctx) => groqWhisper(i.audio_path as string, ctx),
      category: "voice",
      permission: "read",
    }),
  ]

});
