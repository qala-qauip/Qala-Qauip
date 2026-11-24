import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '16mb' }));

// Simple per-IP rate limiter for AI endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimitAI(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (bucket.count >= 40) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute before sending more AI requests.' });
    return;
  }
  bucket.count += 1;
  next();
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function langName(lang: string): string {
  if (lang === 'ru') return 'Russian (Русский)';
  if (lang === 'en') return 'English';
  return 'Kazakh (Қазақ тілі)';
}

// Public non-secret runtime config (Maps JS key is browser-scoped)
app.get('/api/config/public', (_req: Request, res: Response) => {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
  res.json({
    mapsApiKey,
    mapsConfigured: Boolean(mapsApiKey),
    serverTime: new Date().toISOString(),
  });
});

// Real-time Open-Meteo Weather proxy
app.get('/api/weather', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat ?? 42.3417);
  const lng = Number(req.query.lng ?? 69.5901);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'Invalid coordinates.' });
    return;
  }
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m` +
      `&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code` +
      `&forecast_days=2&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo returned HTTP ${response.status}`);
    }
    const data = await response.json();
    res.json({
      source: 'Open-Meteo',
      fetchedAt: new Date().toISOString(),
      latitude: lat,
      longitude: lng,
      current: data.current ?? null,
      hourly: data.hourly ?? null,
      units: data.current_units ?? null,
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to fetch Open-Meteo weather data',
      source: 'Open-Meteo',
    });
  }
});

// Real-time Open-Meteo Air Quality proxy
app.get('/api/eco', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat ?? 42.3417);
  const lng = Number(req.query.lng ?? 69.5901);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'Invalid coordinates.' });
    return;
  }
  try {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}` +
      `&current=european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
      `&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo Air Quality returned HTTP ${response.status}`);
    }
    const data = await response.json();
    res.json({
      source: 'Open-Meteo Air Quality',
      fetchedAt: new Date().toISOString(),
      latitude: lat,
      longitude: lng,
      current: data.current ?? null,
      units: data.current_units ?? null,
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to fetch Open-Meteo air quality data',
      source: 'Open-Meteo Air Quality',
    });
  }
});

// Qala Brain: Grounded Smart City AI reasoning
app.post('/api/ai/brain', rateLimitAI, async (req: Request, res: Response) => {
  try {
    const { prompt, language = 'kk', cityContext = {}, history = [] } = req.body ?? {};
    if (typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > 2000) {
      res.status(400).json({ error: 'Prompt must be a non-empty string up to 2000 characters.' });
      return;
    }

    const ai = getGenAIClient();
    const targetLang = langName(String(language));
    const systemInstruction = [
      `You are Qala Brain, the central urban intelligence AI for the QalaQauip Smart City Operating System (pilot city: Shymkent, Kazakhstan).`,
      `Respond strictly in ${targetLang}.`,
      `CRITICAL GROUNDING RULE: Base every statistic, incident reference, street, district, weather figure, and agency status ONLY on the verified JSON cityContext provided below.`,
      `Never fabricate incidents, fake metrics, unverified emergency dispatches, or nonexistent statistics. If something is missing in the database context, explicitly say so.`,
      `Be concise, operational, and actionable for city operators and citizens.`,
    ].join('\n');

    const contextSummary = JSON.stringify(cityContext).slice(0, 18000);
    const historyBlock = Array.isArray(history)
      ? history
          .slice(-6)
          .map((m: { role?: string; text?: string }) => `${m.role === 'user' ? 'User' : 'Qala Brain'}: ${String(m.text ?? '')}`)
          .join('\n')
      : '';

    const fullPrompt = [
      `VERIFIED CITY DATABASE CONTEXT:\n${contextSummary}`,
      historyBlock ? `RECENT CONVERSATION:\n${historyBlock}` : '',
      `USER QUERY:\n${prompt}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: fullPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING, description: 'Direct grounded answer in requested language.' },
            riskLevel: { type: Type.STRING, description: 'One of: low, medium, high, critical' },
            recommendedDepartment: { type: Type.STRING, description: 'Suggested responsible municipal agency or department.' },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-4 concrete preventive or response steps.',
            },
            referencedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Tracking numbers or asset IDs from cityContext referenced in the answer.',
            },
          },
          required: ['answer', 'riskLevel', 'recommendedDepartment', 'actionPlan', 'referencedIds'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    console.error('Qala Brain API error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Qala Brain request failed.',
    });
  }
});

// Qala Vision: Multimodal photo/video/audio hazard detection (No facial recognition / tracking)
app.post('/api/ai/vision', rateLimitAI, async (req: Request, res: Response) => {
  try {
    const {
      mediaBase64,
      mimeType = 'image/jpeg',
      language = 'kk',
      locationHint = 'Shymkent',
      sourceType = 'upload',
      userNotes = '',
    } = req.body ?? {};

    if (typeof mediaBase64 !== 'string' || mediaBase64.length < 20) {
      res.status(400).json({ error: 'Valid base64 media payload is required.' });
      return;
    }

    const allowedMime = /^(image\/(jpeg|png|webp)|video\/(mp4|webm)|audio\/(webm|mp3|wav|ogg|m4a))$/i;
    if (!allowedMime.test(String(mimeType))) {
      res.status(400).json({ error: 'Unsupported media MIME type.' });
      return;
    }

    const stripped = mediaBase64.includes(',') ? mediaBase64.split(',')[1] : mediaBase64;
    const ai = getGenAIClient();
    const targetLang = langName(String(language));

    const systemInstruction = [
      `You are Qala Vision, an urban safety and infrastructure hazard detection AI for QalaQauip.`,
      `Respond in ${targetLang}.`,
      `Analyze the submitted visual/audio evidence strictly for urban hazards: traffic_accident, fire_smoke, flooding, road_pothole, congestion, fallen_tree, waste_overflow, infrastructure_damage, road_obstruction, water_pipe, power_outage, or none.`,
      `PRIVACY & SAFETY MANDATE: Never perform facial recognition, never identify or track individuals, and ignore people's personal identities.`,
      `If a hazard is visible in an image and you can estimate its approximate bounding box in normalized [0..1000] coordinates (ymin, xmin, ymax, xmax), provide it; otherwise omit or set nulls.`,
    ].join('\n');

    const promptText = `Location context: ${locationHint}. Source: ${sourceType}. Additional operator/citizen notes: ${userNotes || 'None'}. Identify any urban safety or infrastructure hazard and provide severity, confidence (0..1), explanation, recommended municipal actions, and suggested department.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: String(mimeType),
              data: stripped,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            hazardCategory: {
              type: Type.STRING,
              description:
                'One of: traffic_accident, fire_smoke, flooding, road_pothole, congestion, fallen_tree, waste_overflow, infrastructure_damage, road_obstruction, water_pipe, power_outage, none',
            },
            title: { type: Type.STRING },
            severity: { type: Type.STRING, description: 'One of: low, medium, high, critical' },
            confidence: { type: Type.NUMBER, description: 'Confidence score between 0 and 1' },
            explanation: { type: Type.STRING },
            recommendedDepartment: { type: Type.STRING },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            boundingBox: {
              type: Type.OBJECT,
              properties: {
                ymin: { type: Type.NUMBER },
                xmin: { type: Type.NUMBER },
                ymax: { type: Type.NUMBER },
                xmax: { type: Type.NUMBER },
                label: { type: Type.STRING },
              },
            },
          },
          required: [
            'detected',
            'hazardCategory',
            'title',
            'severity',
            'confidence',
            'explanation',
            'recommendedDepartment',
            'recommendedActions',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      ...parsed,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Qala Vision API error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Qala Vision analysis failed.',
    });
  }
});

// Qala Brain Executive Report generator
app.post('/api/ai/report', rateLimitAI, async (req: Request, res: Response) => {
  try {
    const { period = 'weekly', language = 'kk', statsSummary = {} } = req.body ?? {};
    const ai = getGenAIClient();
    const targetLang = langName(String(language));

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate a concise ${period} municipal safety & infrastructure executive report in ${targetLang} strictly from these database metrics:\n${JSON.stringify(statsSummary)}`,
      config: {
        systemInstruction: `You are Qala Brain executive analyst. Write strictly in ${targetLang}. Never invent metrics not present in the input JSON.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
            preventiveRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['title', 'executiveSummary', 'keyFindings', 'preventiveRecommendations'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      ...parsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Qala Report API error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Report generation failed.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QalaQauip Smart City OS server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
