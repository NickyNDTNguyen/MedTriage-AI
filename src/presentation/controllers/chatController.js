// ============================================================================
// PRESENTATION LAYER (API) - the symptom-description assistant.
// Open to guests; ChatbotService decides whether a transcript is kept.
// ============================================================================
import services from '../../application/services/index.js';

export const chatController = {
  async send(req, res) {
    const { text, history = [] } = req.body ?? {};
    res.json(await services.chatbot.send(text, req.user, history));
  },

  history(req, res) {
    res.json({ messages: services.chatbot.history(req.user) });
  },

  clear(req, res) {
    res.json({ cleared: services.chatbot.clear(req.user) });
  }
};
