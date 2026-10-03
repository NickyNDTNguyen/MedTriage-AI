// ============================================================================
// DATA ACCESS LAYER - outbound email adapter.
//
// SIMULATED: nothing leaves this machine. Delivery is recorded in the
// notifications table so the UI can show a realistic outbox, and echoed to the
// server console. A real provider (SendGrid, SES, Postmark) would implement
// the same `send()` contract and be selected by config.notifications.mode.
// ============================================================================
import config from '../../config/index.js';

export class EmailGateway {
  constructor({ mode = config.notifications.mode, from = config.notifications.fromEmail } = {}) {
    this.mode = mode;
    this.from = from;
  }

  /**
   * @returns {{status:'sent'|'failed', providerId:string, channel:'email'}}
   */
  async send({ to, subject, body }) {
    if (!to) return { status: 'failed', providerId: null, channel: 'email' };

    if (this.mode === 'live') {
      // Intentionally unimplemented - see README "Going live" section.
      throw new Error('EmailGateway: live mode requires a configured provider adapter.');
    }

    console.log(`[email:simulated] ${this.from} -> ${to} | ${subject}`);
    return { status: 'sent', providerId: `sim-email-${Date.now()}`, channel: 'email' };
  }
}

export const emailGateway = new EmailGateway();
