// ============================================================================
// APPLICATION LOGIC LAYER - the symptom-description assistant.
//
// Its job is to help someone put a symptom into words when the questionnaire's
// fixed options do not fit. It returns both a human reply AND structured
// signals that TriageService can fold into the scoring.
//
// PRIVACY: transcripts are persisted for signed-in users only. A guest
// conversation is held in the browser and never reaches ChatRepository.
// ============================================================================
import { aiGateway } from '../../dataaccess/gateways/AiGateway.js';
import { chatRepository } from '../../dataaccess/repositories/NotificationRepository.js';
import { medicalRecordRepository } from '../../dataaccess/repositories/MedicalRecordRepository.js';
import { ValidationError } from '../errors.js';

const MAX_LENGTH = 1000;

export class ChatbotService {
  constructor({ ai = aiGateway, chats = chatRepository, records = medicalRecordRepository } = {}) {
    this.ai = ai;
    this.chats = chats;
    this.records = records;
  }

  /**
   * @param {string}      text     what the person typed
   * @param {object|null} user     null for a guest
   * @param {Array}       guestHistory  client-held transcript for guests
   */
  async send(text, user = null, guestHistory = []) {
    const message = String(text ?? '').trim();
    if (!message) throw ValidationError('Type a message first.', ['The message was empty.']);
    if (message.length > MAX_LENGTH) {
      throw ValidationError('That message is too long.', [`Keep it under ${MAX_LENGTH} characters.`]);
    }

    const history = user ? this.chats.history(user.id) : guestHistory;
    const patientContext = user ? this.#contextFor(user) : null;

    const { reply, signals, usedContext } = await this.ai.complete({
      text: message, history, patientContext
    });

    if (user) {
      this.chats.append({ userId: user.id, author: 'user', text: message });
      this.chats.append({ userId: user.id, author: 'assistant', text: reply });
    }

    return {
      reply,
      signals,
      usedContext,
      stored: Boolean(user),
      privacyNote: user
        ? 'This conversation is saved to your account.'
        : 'Guest session - this conversation is not saved anywhere.'
    };
  }

  history(user) {
    return user ? this.chats.history(user.id) : [];
  }

  clear(user) {
    return user ? this.chats.clear(user.id) : 0;
  }

  /** Only the few fields the assistant is allowed to reason over. */
  #contextFor(user) {
    return {
      first_name: user.first_name,
      role: user.role,
      recentRecords: this.records.listForPatient(user.id).slice(0, 5)
        .map(r => ({ category: r.category, title: r.title }))
    };
  }
}

export const chatbotService = new ChatbotService();
