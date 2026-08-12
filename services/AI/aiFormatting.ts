// Generic AI formatting service using Groq, Gemini, or Local LLM (Ollama)
// Usage: set your API key in the environment (e.g., process.env.GROQ_API_KEY or process.env.GEMINI_API_KEY)
// For local LLM (Ollama): set LOCAL_LLM_ENDPOINT (default: http://localhost:11434) and optionally LOCAL_LLM_MODEL (default: llama3.2:latest)
// provider: 'groq' | 'gemini' | 'local'
 
export type AIProvider = 'groq' | 'gemini' | 'local';

export function getDefaultAIProvider(): AIProvider {
  if (process.env.AI_PROVIDER) return process.env.AI_PROVIDER as AIProvider;
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.GROQ_API_KEY) return 'groq';
  return 'local';
}

interface AIFormattingOptions {
  provider?: AIProvider;
  systemPrompt: string;
  userPrompt: string;
  // Optionally allow model selection
  model?: string;
}
 
/**
 * Formats the user prompt based on the system prompt using the selected AI provider.
 * No business logic is hardcoded; all instructions come from the prompts.
 */
export async function aiFormat({ provider, systemPrompt, userPrompt, model }: AIFormattingOptions): Promise<string> {
  const activeProvider = provider || getDefaultAIProvider();
  if (activeProvider === 'groq') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Missing GROQ_API_KEY in environment');
    // Default model for Groq (can be overridden)
    const groqModel = model || 'llama3-8b-8192';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } else if (activeProvider === 'gemini') {
    let apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) apiKey = apiKey.slice(1, -1);
    if (apiKey.startsWith("'") && apiKey.endsWith("'")) apiKey = apiKey.slice(1, -1);

    if (!apiKey) throw new Error('Missing GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in environment');

    // Live models: gemini-2.5-flash, gemini-3.6-flash, gemini-2.5-pro
    const primaryModel = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const candidateModels = [primaryModel, 'gemini-3.6-flash', 'gemini-2.5-pro'].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let lastError: Error | null = null;

    for (const currentModel of candidateModels) {
      let retries = 2;
      while (retries >= 0) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                { role: 'user', parts: [{ text: userPrompt }] },
              ],
              generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();

            // If rate limited (429), wait and retry once
            if (response.status === 429 && retries > 0) {
              console.warn(`Gemini rate limited (429) on ${currentModel}. Retrying in 4 seconds...`);
              await new Promise((resolve) => setTimeout(resolve, 4000));
              retries--;
              continue;
            }

            // If 404 (model retired) or 429 after retries, try next candidate model
            if ((response.status === 404 || response.status === 429) && currentModel !== candidateModels[candidateModels.length - 1]) {
              console.info(`Model ${currentModel} returned ${response.status}. Trying next model...`);
              break;
            }

            throw new Error(`Gemini API error (${response.status}): ${errorText}`);
          }

          const data = await response.json();
          const candidate = data.candidates?.[0];
          if (!candidate) {
            const blockReason = data.promptFeedback?.blockReason;
            if (blockReason) {
              throw new Error(`Gemini blocked the request: ${blockReason}`);
            }
            throw new Error('Gemini returned no candidates in response');
          }

          // Extract text from parts, filtering out thought-only parts if present
          const parts = candidate.content?.parts || [];
          const textParts = parts
            .filter((p: any) => p.text && !p.thought)
            .map((p: any) => p.text);

          const finalResult = textParts.length > 0
            ? textParts.join('\n\n')
            : parts.map((p: any) => p.text || '').filter(Boolean).join('\n\n');

          return finalResult.trim();
        } catch (err: any) {
          lastError = err;
          if (retries > 0 && err.message?.includes('429')) {
            await new Promise((resolve) => setTimeout(resolve, 4000));
            retries--;
            continue;
          }
          break;
        }
      }
    }

    throw lastError || new Error('Failed to generate response from Gemini');
  } else if (activeProvider === 'local') {
    // Local LLM using Ollama native API format
    const endpoint = process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434';
    if (!endpoint) throw new Error('Missing LOCAL_LLM_ENDPOINT in environment');
    // Default model for local LLM (can be overridden)
    const localModel = model || process.env.LOCAL_LLM_MODEL || 'llama3.2:latest';
    const url = endpoint.endsWith('/api/generate')
      ? endpoint
      : `${endpoint}/api/generate`;
   
    // Combine system and user prompts for Ollama format
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
   
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: localModel,
        prompt: combinedPrompt,
        stream: false,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local LLM API error: ${error}`);
    }
    const data = await response.json();
    return data.response?.trim() || '';
  } else {
    throw new Error('Unsupported AI provider');
  }
}
 
// Example usage (uncomment to test in a Node.js environment):
// (async () => {
//   const formatted = await aiFormat({
//     provider: 'groq',
//     systemPrompt: 'Format the following text as a professional email.',
//     userPrompt: 'hey, can you send me the report?',
//   });
//   console.log(formatted);
// })();
 