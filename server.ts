import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
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

const SYSTEM_INSTRUCTION = `Sən Azərbaycan Respublikasının "Yol Hərəkəti Haqqında" Qanunu, Baş Dövlət Yol Polisi İdarəsinin (dyp.gov.az) rəsmi normaları və Təhsil Nazirliyinin təsdiq etdiyi "Sürücülük" (2019) dərs vəsaiti üzrə ekspert yol hərəkəti təlimatçısısan.

Vəzifən:
1. İstifadəçinin soruşduğu mürəkkəb yol situasiyalarını, yol ayrıcılarının keçilmə ardıcıllığını, nizamlayıcı və işıqfor siqnallarını, yaxud simulyator imtahanındakı qayda pozuntularını Azərbaycan dilində dəqiq hüquqi əsaslarla izah etmək.
2. Hər izahda rəsmi mənbəni (məsələn, "Yol Hərəkəti Haqqında" Qanun, müvafiq nişan nömrəsi və ya "Sürücülük" dərs vəsaiti bölməsi) göstərmək.
3. Heç bir qayda, cərimə məbləği və ya imtahan balını uydurmamaq; əmin olmadığın məqamlarda rəsmi Qanunun ümumi prinsipini qeyd etmək.
4. Cavabı strukturlaşdırılmış, aydın və sürücünün real sükan arxasında tətbiq edə biləcəyi formada vermək:
   - Situasiyanın qısa hüquqi qiyməti
   - Qüvvədə olan qayda və mənbə
   - Düzgün sürücü davranışı (addım-addım)`;

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/analyze-law', async (req, res) => {
    try {
      const body = req.body as {
        question?: unknown;
        context?: unknown;
      };

      const question = typeof body?.question === 'string' ? body.question.trim() : '';
      const context = typeof body?.context === 'string' ? body.context.trim() : '';

      if (!question || question.length > 2500) {
        res.status(400).json({
          error: 'Sual mətni boş olmamalı və 2500 simvoldan uzun olmamalıdır.',
        });
        return;
      }

      if (context.length > 3500) {
        res.status(400).json({
          error: 'Kontekst məlumatı həddindən artıq uzundur.',
        });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Hüquqi təhlil xidməti üçün GEMINI_API_KEY tələb olunur. Zəhmət olmasa Settings > Secrets bölməsindən API açarını təyin edin.',
        });
        return;
      }

      const fullPrompt = context
        ? `Simulyator / İmtahan konteksti:\n${context}\n\nİstifadəçinin sualı:\n${question}`
        : question;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      const answer = response.text?.trim();
      if (!answer) {
        res.status(502).json({
          error: 'Model cavab qaytara bilmədi. Zəhmət olmasa yenidən cəhd edin.',
        });
        return;
      }

      res.json({
        analysis: answer,
        model: 'gemini-4-hydrogen',
        thinkingLevel: 'HIGH',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Serverdə gözlənilməz xəta baş verdi.';
      res.status(500).json({
        error: `Hüquqi təhlil zamanı xəta: ${message}`,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AvtoTəlim AZ server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
