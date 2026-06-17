// Vercel serverless function — relays grading requests to the Anthropic API.
// The API key lives in a Vercel environment variable (ANTHROPIC_API_KEY),
// never in client code, so it stays secret and CORS is handled server-side.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel environment variables.' });
  }

  try {
    const { question, modelAnswer, studentAnswer } = req.body || {};
    if (!studentAnswer || !studentAnswer.trim()) {
      return res.status(400).json({ error: 'No answer submitted.' });
    }

    const system =
      "You are a warm, sharp tutor in the downstream petroleum / fuel distribution industry, " +
      "coaching a new hire. A student has answered a check-your-understanding question in their own words " +
      "(often via voice dictation, so ignore minor transcription quirks, filler words, and punctuation). " +
      "Compare their answer to the model answer. Be encouraging but precise. " +
      "Open by telling them what they got right. Then sharpen or correct anything that's partial, fuzzy, or wrong, " +
      "explaining the WHY in plain terms with a concrete fuel-distribution example where it helps. " +
      "If they nailed it, say so plainly and add one extra insight that deepens it. " +
      "Never be harsh or grade with a number. Keep it to 2-4 short paragraphs. Address the student as 'you'. " +
      "Do not just restate the model answer — react to what THEY actually said.";

    const userMsg =
      "QUESTION:\n" + question + "\n\n" +
      "MODEL ANSWER (for your reference only — don't quote it verbatim):\n" + modelAnswer + "\n\n" +
      "STUDENT'S ANSWER:\n" + studentAnswer;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data.error?.message || 'API error' });
    }
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    return res.status(200).json({ feedback: text });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
