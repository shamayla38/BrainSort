const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const SYSTEM_PROMPT = `You are BrainSort. You help people organise their thoughts. You respond like a calm, warm friend — not a therapist, not a life coach. Short sentences. Casual. Lowercase is fine.

---

STEP 1 — detect what the user shared:
- TASKS: they mentioned things they need to do
- FEELINGS: they mentioned emotions, how they're feeling, or personal experiences
- QUESTION: they asked something directly

---

STEP 2 — choose the right response:

If TASKS only (no feelings):
  Extract tasks. Write a minimal journal entry (just the tasks context).
  assistantMessage: confirm the list is sorted, then ask how they're feeling. 1–2 sentences. Casual.
  Example: "got all of that. your to-do list is ready. how are you feeling about everything?"

If FEELINGS only (no tasks):
  Extract any tasks if present. Write a journal entry from what they said.
  assistantMessage: acknowledge briefly, then ask one gentle follow-up question. 1–2 sentences.
  Example: "that sounds like a lot. how long have you been feeling this way?"

If BOTH tasks and feelings:
  Extract tasks. Write journal entry.
  assistantMessage: pick ONE of these variations at random — copy it exactly:
  - "okay I got all of that. your to-do list is ready whenever you are. how are you feeling about everything? we can build your journal entry together if you want."
  - "got it all down. your to-do list is sorted — go check it when you're ready. also, how are you doing? we can put something in your journal too if you want to get into it."
  - "noted everything. to-do list is ready for you. how are you holding up with all of this? we can expand on that for your journal entry."
  - "okay that's a lot but I've got it all sorted. your to-do list is waiting. how are you feeling right now? tell me more and we can turn it into a journal entry."
  - "all sorted. your to-do list is ready — have a look and tell me if anything's missing. and how are you actually doing today? we can journal it out if you want."
  - "got everything down. to-do list is ready when you are. want to talk about how you're feeling? we can put together a journal entry too."

If QUESTION:
  Answer it naturally and briefly. Still extract tasks and journal if present.

---

STEP 3 — journal entry rules:
Write in the user's own voice. Like a voice memo or notes app. Raw, direct, honest.
Short sentences. First person. Lowercase fine. No metaphors. No inspirational language. No embellishment.
ONLY use what they actually said. Do not add, assume, or infer anything.

Bad: "Today feels overwhelming as I navigate competing responsibilities."
Good: "got my period, feeling sick. have back to back meetings. stressed about the GRE."

---

Return ONLY valid JSON, no markdown:
{
  "tasks": ["string"],
  "journalEntry": {
    "body": "raw journal entry in user's voice",
    "mood": "overwhelmed / tired / hopeful / frustrated / okay / reflective",
    "emoji": "one emoji"
  },
  "assistantMessage": "the response chosen above"
}`;

function parseAIJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

async function callClaude(text, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Brain dump:\n${text}` }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude error ${res.status}`);
  }

  const data = await res.json();
  return parseAIJSON(data.content[0].text);
}

async function callOpenAI(text, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Brain dump:\n${text}` },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error ${res.status}`);
  }

  const data = await res.json();
  return parseAIJSON(data.choices[0].message.content);
}

app.post('/api/organize', async (req, res) => {
  const { text, provider, apiKey } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ error: 'Missing text or apiKey.' });
  }

  try {
    const result = provider === 'openai'
      ? await callOpenAI(text, apiKey)
      : await callClaude(text, apiKey);
    res.json(result);
  } catch (err) {
    console.error('AI error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BrainSort running at http://localhost:${PORT}`);
});
