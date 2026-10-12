// Asks Groq Cloud (fast Llama inference, OpenAI-compatible) to suggest which
// of the 4 real Banjara clans an unassigned Gotra most likely belongs to.
// This NEVER writes to the DB itself — it only returns suggestions for an
// admin to review and apply via the community-data.html "AI Suggest Clans"
// flow. Mirrors the project's existing rule: don't algorithmically guess
// clan assignments without a human in the loop (see enrichGotraClanAssignments.js).

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const CHUNK_SIZE = 30;

const SYSTEM_PROMPT = `You are an expert on Banjara/Lambadi/Gormati/Lambani community genealogy (clans/Gor Samuh and gotras/Jaaths), based on documented sources such as banjaracommunity.blogspot.com.

There are EXACTLY 4 real Banjara clans: Rathod (Bhukya), Pawar (Pamhar), Chavan (Chauhan), Jadhav (Vaditya). Every gotra belongs to exactly one of these 4 clans (some, like Banoth and Turi, are documented sub-divisions of Rathod).

For each gotra name given, decide which of the 4 clans it most likely belongs to, based on documented Banjara genealogy. If you are not reasonably confident, set "clan" to null and "confidence" to "low" — do NOT guess randomly.

Return ONLY a JSON object: { "results": [ { "name": "<exact gotra name as given>", "clan": "Rathod" | "Pawar" | "Chavan" | "Jadhav" | null, "confidence": "high" | "medium" | "low", "reasoning": "<one short sentence>" } ] }
One result per input gotra, in any order, matching "name" exactly to the input.`;

async function callGroq(apiKey, model, gotraNames) {
  const userPrompt = `Classify these Banjara gotras: ${JSON.stringify(gotraNames)}`;
  const response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '{"results":[]}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { results: [] };
  }
  return Array.isArray(parsed) ? parsed : (parsed.results || []);
}

/**
 * @param {{id:string,name:string}[]} gotras
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{id:string,name:string,clan:string|null,confidence:string,reasoning:string}[]>}
 */
async function suggestClansForGotras(gotras, apiKey, model) {
  const byName = {};
  gotras.forEach((g) => { byName[g.name] = g; });

  const results = [];
  for (let i = 0; i < gotras.length; i += CHUNK_SIZE) {
    const chunk = gotras.slice(i, i + CHUNK_SIZE);
    const names = chunk.map((g) => g.name);
    const chunkResults = await callGroq(apiKey, model, names);
    for (const r of chunkResults) {
      const match = byName[r.name];
      if (!match) continue;
      results.push({
        id: match.id,
        name: match.name,
        clan: r.clan || null,
        confidence: r.confidence || 'low',
        reasoning: r.reasoning || '',
      });
    }
  }
  return results;
}

module.exports = { suggestClansForGotras };
