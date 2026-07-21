const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.REACT_APP_GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function isGeminiConfigured() {
  return Boolean(GEMINI_API_KEY);
}

function heuristicEstimate({ category, severity }) {
  const sev = String(severity || '').toLowerCase();
  const cat = String(category || '').toLowerCase();
  let minutes = 120;
  if (/pothole|road|pavement/.test(cat)) minutes = 240;
  else if (/light|sign|signage/.test(cat)) minutes = 90;
  else if (/sewer|drain|flood/.test(cat)) minutes = 360;
  else if (/garbage|trash|debris/.test(cat)) minutes = 60;
  else if (/electric|wire|power/.test(cat)) minutes = 180;
  else if (/tree|landslide|hazard/.test(cat)) minutes = 300;

  if (/critical|high/.test(sev)) minutes = Math.round(minutes * 0.85);
  else if (/low/.test(sev)) minutes = Math.round(minutes * 1.15);

  return {
    minutes,
    notes: 'Local heuristic estimate (Gemini key not configured).',
    source: 'heuristic',
  };
}

function extractJsonFromText(text) {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorText(value) {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    return String(parsed?.error?.message || parsed?.message || value);
  } catch {
    return String(value);
  }
}

function classifyFallbackNote(status, message) {
  const text = String(message || '').toLowerCase();
  const isQuota = status === 429 || /quota|billing|rate limit|resource exhausted/.test(text);
  const isAuth = status === 401 || status === 403 || /api key|permission|unauthorized|forbidden/.test(text);
  const isRetryable =
    GEMINI_RETRYABLE_STATUSES.has(status) ||
    /temporar|timeout|unavailable|overload|try again/.test(text);

  if (isQuota) {
    return {
      notes: 'Local heuristic estimate (AI quota reached).',
      reestimateRecommended: true,
    };
  }
  if (isAuth) {
    return {
      notes: 'Local heuristic estimate (AI key or permissions issue).',
      reestimateRecommended: false,
    };
  }
  if (isRetryable) {
    return {
      notes: 'Local heuristic estimate (AI service temporarily unavailable).',
      reestimateRecommended: true,
    };
  }
  return {
    notes: 'Local heuristic estimate (AI response unavailable).',
    reestimateRecommended: true,
  };
}

export async function estimateRepairTime(report) {
  const payload = {
    title: report.title || '',
    description: report.description || '',
    category: report.category || '',
    severity: report.severity || '',
    location: report.location || '',
  };

  if (!GEMINI_API_KEY) {
    return {
      ...heuristicEstimate(payload),
      source: 'heuristic-no-key',
      reestimate_recommended: false,
      provider_status: null,
    };
  }

  const prompt = `You are an operations planner for a city public-works dispatch team.
Estimate how many minutes a typical small repair crew (2-4 workers) needs to
resolve the issue below, from arrival on site to clean-up. Be realistic for
Philippine LGU operations. Return STRICT JSON only, no prose, no markdown.

Report:
- Title: ${payload.title || 'N/A'}
- Category: ${payload.category || 'N/A'}
- Severity: ${payload.severity || 'N/A'}
- Location: ${payload.location || 'N/A'}
- Description: ${payload.description || 'N/A'}

JSON shape:
{
  "minutes": <integer 15-960>,
  "notes": "<one short sentence, max 140 chars, on what drives this estimate>"
}`;

  try {
    let lastError = null;

    for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errRaw = await response.text().catch(() => '');
        const errText = toErrorText(errRaw).slice(0, 220);
        const error = new Error(`Gemini ${response.status}: ${errText}`);
        error.status = response.status;
        lastError = error;

        if (GEMINI_RETRYABLE_STATUSES.has(response.status) && attempt < GEMINI_MAX_ATTEMPTS) {
          await sleep(400 * attempt);
          continue;
        }
        throw error;
      }

      const body = await response.json();
      const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '';
      const parsed = extractJsonFromText(text);
      if (!parsed || typeof parsed.minutes !== 'number') {
        const parseError = new Error('Gemini returned no usable JSON.');
        parseError.status = 422;
        lastError = parseError;
        if (attempt < GEMINI_MAX_ATTEMPTS) {
          await sleep(250 * attempt);
          continue;
        }
        throw parseError;
      }

      const minutes = Math.max(15, Math.min(960, Math.round(parsed.minutes)));
      const notes = String(parsed.notes || '').slice(0, 200);
      return {
        minutes,
        notes,
        source: 'gemini',
        reestimate_recommended: false,
        provider_status: 200,
      };
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error('Gemini estimate failed.');
  } catch (error) {
    const fallback = heuristicEstimate(payload);
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Gemini estimate failed, using local heuristic fallback.', error);
    }
    const status = Number(error?.status || 0) || null;
    const classification = classifyFallbackNote(status, error?.message);
    return {
      ...fallback,
      notes: classification.notes,
      source: 'heuristic-fallback',
      reestimate_recommended: classification.reestimateRecommended,
      provider_status: status,
    };
  }
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) {
    return '-';
  }
  const m = Math.max(0, Math.round(Number(minutes)));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
