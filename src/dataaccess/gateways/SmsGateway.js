// ============================================================================
// DATA ACCESS LAYER - outbound SMS adapter.
//
// SIMULATED: see EmailGateway. A real provider (Twilio, Vonage) would
// implement the same `send()` contract.
// ============================================================================
import config from '../../config/index.js';

export class SmsGateway {
  constructor({ mode = config.notifications.mode, from = config.notifications.fromSms } = {}) {
    this.mode = mode;
    this.from = from;
  }

  async send({ to, body }) {
    if (!to) return { status: 'failed', providerId: null, channel: 'sms' };

    if (this.mode === 'live') {
      throw new Error('SmsGateway: live mode requires a configured provider adapter.');
    }

    console.log(`[sms:simulated] ${this.from} -> ${to} | ${body.slice(0, 60)}`);
    return { status: 'sent', providerId: `sim-sms-${Date.now()}`, channel: 'sms' };
  }
}

export const smsGateway = new SmsGateway();
