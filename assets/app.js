// Highlight the current page in the sidebar nav
(function () {
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
  });
})();

// Glossary live filter (only runs on the glossary page)
(function () {
  var input = document.getElementById('glossary-search');
  if (!input) return;
  var items = Array.prototype.slice.call(document.querySelectorAll('.gitem'));
  var count = document.getElementById('gcount');
  function update() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    items.forEach(function (it) {
      var hit = it.textContent.toLowerCase().indexOf(q) !== -1;
      it.classList.toggle('hidden', !hit);
      if (hit) shown++;
    });
    if (count) count.textContent = shown + ' of ' + items.length + ' terms';
  }
  input.addEventListener('input', update);
  update();
})();

// ============================================================
//  Answer-and-check: voice/typed answer → AI tutor feedback
//  Works in two environments:
//   - Claude.ai artifact preview: calls the Anthropic API directly
//   - Deployed (Vercel): calls the /api/check serverless relay
// ============================================================
(function () {
  var questions = document.querySelectorAll('details.q');
  if (!questions.length) return;

  // Decide which backend to use. On the live site we hit our own relay.
  // In the artifact preview there's no /api, so we call Anthropic directly.
  var isPreview = !(location.hostname.endsWith('vercel.app') || location.protocol === 'https:' && location.hostname && location.hostname !== 'localhost' && !location.hostname.includes('anthropic'));
  // Simpler, robust rule: try the relay first; if it 404s, fall back to direct.

  async function gradeViaRelay(payload) {
    var r = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.status === 404) throw { fallback: true };
    var data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data.feedback;
  }

  async function gradeDirect(payload) {
    // Used only inside the Claude.ai artifact preview.
    var system =
      "You are a warm, sharp tutor in the downstream petroleum / fuel distribution industry, " +
      "coaching a new hire. A student answered a question in their own words (often via voice dictation, " +
      "so ignore transcription quirks and filler). Compare to the model answer. Open with what they got right, " +
      "then sharpen or correct anything partial or wrong, explaining the why with a concrete example. If they " +
      "nailed it, say so and add one deepening insight. No numeric grade, never harsh, 2-4 short paragraphs, address them as 'you'. " +
      "React to what THEY said; don't just restate the model answer.";
    var userMsg = "QUESTION:\n" + payload.question + "\n\nMODEL ANSWER (reference only):\n" +
      payload.modelAnswer + "\n\nSTUDENT'S ANSWER:\n" + payload.studentAnswer;
    var r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system,
        messages: [{ role: 'user', content: userMsg }]
      })
    });
    var data = await r.json();
    if (!r.ok) throw new Error((data.error && data.error.message) || 'API error');
    return (data.content || []).filter(function (b) { return b.type === 'text'; })
      .map(function (b) { return b.text; }).join('\n').trim();
  }

  async function grade(payload) {
    try {
      return await gradeViaRelay(payload);
    } catch (e) {
      if (e && e.fallback) return await gradeDirect(payload);
      throw e;
    }
  }

  function fmt(text) {
    // turn blank-line-separated text into paragraphs
    return text.split(/\n{2,}/).map(function (p) {
      return '<p>' + p.replace(/\n/g, '<br>').replace(/</g, '&lt;') + '</p>';
    }).join('');
  }

  questions.forEach(function (q) {
    var summary = q.querySelector('summary');
    var ans = q.querySelector('.ans');           // existing model answer block
    if (!summary || !ans) return;

    var questionText = summary.querySelector('span:nth-child(2)').textContent.trim();
    var modelText = ans.textContent.trim();

    // Hide the model answer; we'll reveal it only after submit.
    ans.style.display = 'none';
    // Repurpose the summary's right-side tag.
    var tag = summary.querySelector('.reveal');
    if (tag) tag.textContent = 'answer & check';

    // Build the answer zone.
    var zone = document.createElement('div');
    zone.className = 'answer-zone';
    zone.innerHTML =
      '<div class="prompt">Your answer</div>' +
      '<textarea class="answer-box" placeholder="Type your answer — or click here and dictate it with Wispr Flow…"></textarea>' +
      '<div class="answer-actions">' +
        '<button class="btn-check">Check my answer</button>' +
        '<span class="dictation-hint">Tip: click the box, then use <b>Wispr Flow</b> to speak your answer.</span>' +
      '</div>' +
      '<div class="feedback"><div class="fh">Tutor feedback</div><div class="fbody"></div></div>' +
      '<div class="model-answer"><div class="mh">Model answer</div><div class="mbody"></div></div>';

    // Insert the zone, move model text into the hidden model-answer block.
    ans.parentNode.insertBefore(zone, ans);
    zone.querySelector('.model-answer .mbody').innerHTML = ans.innerHTML;

    var box = zone.querySelector('.answer-box');
    var btn = zone.querySelector('.btn-check');
    var fb = zone.querySelector('.feedback');
    var fbody = zone.querySelector('.fbody');
    var model = zone.querySelector('.model-answer');

    btn.addEventListener('click', async function () {
      var studentAnswer = box.value.trim();
      if (!studentAnswer) { box.focus(); return; }
      btn.disabled = true;
      fb.className = 'feedback show';
      fbody.innerHTML = '<span class="thinking"><span></span><span></span><span></span></span>';
      try {
        var feedback = await grade({
          question: questionText,
          modelAnswer: modelText,
          studentAnswer: studentAnswer
        });
        fb.className = 'feedback show';
        fbody.innerHTML = fmt(feedback);
        model.className = 'model-answer show';   // reveal model answer after submit
      } catch (err) {
        fb.className = 'feedback show error';
        fbody.innerHTML = '<p>Couldn\'t reach the tutor: ' + String(err.message || err) +
          '</p><p>If this is the live site, make sure ANTHROPIC_API_KEY is set in your Vercel project settings.</p>';
        model.className = 'model-answer show';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Check again';
      }
    });
  });
})();
