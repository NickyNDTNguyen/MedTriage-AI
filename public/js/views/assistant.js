// ============================================================================
// PRESENTATION LAYER (browser) - the symptom-description assistant.
//
// Available to guests AND signed-in users. For a guest the transcript lives in
// `guest.messages` (memory only) and is posted back with each turn so the
// assistant has context without the server storing anything.
// ============================================================================
import {
  appShell, publicHeader, footer, esc, alertBox
} from '../ui/components.js';
import { session, guest, view } from '../state/store.js';

export const assistant = {
  async load() {
    if (session.user) {
      const { api } = await import('../api/client.js');
      const { messages } = await api.chat.history();
      view.messages = messages.map(m => ({ author: m.author, text: m.text }));
    } else {
      view.messages = guest.messages;
    }
  },

  render() {
    const body = panel();
    return session.user
      ? appShell('assistant', body)
      : `${publicHeader()}<div class="sec guest-assistant">${body}</div>${footer()}`;
  }
};

function panel() {
  const messages = view.messages ?? [];
  const chips = session.isClinician
    ? ['Summarize this case', 'What should I ask the patient?', 'What did you use?']
    : ['I feel dizzy when I stand up', 'It is hard to describe', 'Questions for my doctor', 'What did you use?'];

  return `
    <span class="badge">✨ AI health assistant</span>
    <h1 style="margin-top:12px">Describe it in your own words</h1>
    <p>If none of the symptom-check options fit how you feel, tell the assistant here. It will help
       you put it into words, and carry what you said into your symptom check.</p>

    <div class="note w"><b>Guidance, not diagnosis</b>Replies are informational and rule-based.
      Call 911 in an emergency.</div>
    ${session.user
      ? '<div class="note g"><b>📄 Saved</b>This conversation is kept in your account. You can clear it below.</div>'
      : '<div class="note w"><b>🗑 Guest session</b>This conversation lives in your browser only. It is never sent to our database and disappears when you leave.</div>'}
    ${alertBox(view.error)}

    <div class="card">
      <div class="chat" id="chat" role="log" aria-live="polite" aria-label="Conversation">
        ${messages.length ? messages.map(m => `<div class="msg ${m.author === 'user' ? 'u' : ''}">
            ${esc(m.text)}</div>`).join('')
          : `<div class="msg">Hello${session.user ? `, ${esc(session.user.first_name)}` : ''}!
              Tell me what you're feeling — where it is, how bad it is, and when it started.
              I can't diagnose conditions, but I can help you describe them and tell you how urgent
              they may be.</div>`}
        ${view.busy ? '<div class="msg typing"><span></span><span></span><span></span></div>' : ''}
      </div>

      <div class="chips">${chips.map(c =>
        `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>

      <form class="send" data-form="chat">
        <label class="sr-only" for="chat-input">Your message</label>
        <input id="chat-input" name="text" placeholder="Describe how you feel…" autocomplete="off"
          ${view.busy ? 'disabled' : ''}>
        <button class="btn" type="submit" ${view.busy ? 'disabled' : ''}>Send</button>
      </form>
    </div>

    <div class="row">
      ${guest.aiSignals || view.lastSignals
        ? '<a class="btn" href="#/check" data-action="carry-to-check">Carry this into a symptom check →</a>'
        : '<a class="btn o" href="#/check">Go to the symptom check →</a>'}
      ${session.user ? '<button class="btn o danger" data-action="clear-chat">Clear conversation</button>' : ''}
    </div>

    ${view.usedContext ? `<div class="card" style="margin-top:20px">
      <h3>ℹ️ What the assistant used</h3>
      <ul class="reasons">${view.usedContext.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}`;
}
