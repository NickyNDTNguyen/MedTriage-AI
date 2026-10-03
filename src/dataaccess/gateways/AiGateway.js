// ============================================================================
// DATA ACCESS LAYER - the assistant's language adapter.
//
// SIMULATED: a deterministic, rule-based responder. It never diagnoses; it
// reflects symptoms back, extracts structured signals for the triage engine,
// and always carries the emergency safety line.
//
// A real adapter would POST to an LLM here and return the same shape, so
// ChatbotService above it would not change.
// ============================================================================
import config from '../../config/index.js';
import { SYMPTOM_LEXICON, EMERGENCY_PHRASES } from '../../application/domain/symptomLexicon.js';

export class AiGateway {
  constructor({ mode = config.ai.mode } = {}) {
    this.mode = mode;
  }

  /**
   * @param {{text:string, history:Array, patientContext:object|null}} input
   * @returns {Promise<{reply:string, signals:object, usedContext:string[]}>}
   */
  async complete({ text, history = [], patientContext = null }) {
    if (this.mode === 'live') {
      throw new Error('AiGateway: live mode requires a configured model adapter.');
    }

    const lower = String(text).toLowerCase();
    const signals = this.#extractSignals(lower);
    const usedContext = patientContext
      ? ['your message', 'your saved records in this account']
      : ['your message only (guest session - nothing stored)'];

    return { reply: this.#compose(lower, signals, patientContext, history), signals, usedContext };
  }

  /** Pull structured triage hints out of free text. */
  #extractSignals(lower) {
    const matched = [];
    for (const [key, entry] of Object.entries(SYMPTOM_LEXICON)) {
      if (entry.terms.some(term => lower.includes(term))) {
        matched.push({ key, label: entry.label, category: entry.category, weight: entry.weight });
      }
    }
    const redFlag = EMERGENCY_PHRASES.find(phrase => lower.includes(phrase)) ?? null;
    const duration = /(\d+)\s*(day|week|month|hour)s?/.exec(lower);

    return {
      symptoms: matched,
      redFlag,
      durationText: duration ? duration[0] : null,
      severity: matched.reduce((max, m) => Math.max(max, m.weight), 0)
    };
  }

  #compose(lower, signals, patientContext, history) {
    const name = patientContext?.first_name ? `${patientContext.first_name}, ` : '';

    if (signals.redFlag) {
      return `${name}what you just described ("${signals.redFlag}") is an emergency warning sign. `
        + 'Please call 911 or go to the nearest emergency department now. '
        + 'I am not able to assess this safely and you should not wait.';
    }

    if (lower.includes('what did you use') || lower.includes('what do you use') || lower.includes('source')) {
      return patientContext
        ? 'For this answer I used the symptoms you typed in this conversation plus the records saved '
          + 'in your MedTriage AI account. I did not contact any external medical or insurance system.'
        : 'You are in a guest session, so I used only the words you typed. Nothing is being saved, and '
          + 'I have no profile or records for you.';
    }

    if (lower.includes('question') && (lower.includes('doctor') || lower.includes('clinician'))) {
      return 'Good questions to bring to your clinician: What could be causing this? '
        + 'Could any of my current medicines contribute? What should improve, and by when? '
        + 'What warning signs mean I should come back or call 911?';
    }

    if (lower.includes('appointment') || lower.includes('book')) {
      return patientContext
        ? 'You can book from the Appointments tab. Pick a clinician and a time, and I will set up '
          + 'email and text reminders based on your notification preferences.'
        : 'Booking an appointment needs a free account, because an appointment has to be attached to '
          + 'a patient record. Guest symptom checks stay available either way.';
    }

    if (signals.symptoms.length) {
      const labels = signals.symptoms.map(s => s.label).join(', ');
      const duration = signals.durationText
        ? ` You mentioned this has been going on for ${signals.durationText}, which is useful detail.`
        : ' If you can, tell me how long it has been going on.';
      return `${name}thank you - I have noted: ${labels}.${duration} `
        + 'I will carry this into your symptom check so you do not have to repeat it. '
        + 'Remember this is guidance, not a diagnosis - call 911 if symptoms become severe or sudden.';
    }

    if (history.length <= 2) {
      return `${name}tell me what feels wrong in your own words - where it is, how bad it is, `
        + 'and when it started. There is no wrong way to describe it.';
    }

    return 'Thanks for sharing. Note when it started, what makes it better or worse, and any medicines '
      + 'you take. If it keeps going or gets worse, contact your clinician - and call 911 for severe '
      + 'or sudden symptoms.';
  }
}

export const aiGateway = new AiGateway();
