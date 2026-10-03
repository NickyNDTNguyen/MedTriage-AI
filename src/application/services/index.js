// ============================================================================
// APPLICATION LOGIC LAYER - composition root.
//
// Services are instantiated with their default dependencies and wired together
// here. This is the single place that knows the full object graph, which keeps
// every individual service constructor injectable (and therefore testable).
// ============================================================================
import { authService } from './AuthService.js';
import { notificationService } from './NotificationService.js';
import { triageService } from './TriageService.js';
import { appointmentService } from './AppointmentService.js';
import { escalationService } from './EscalationService.js';
import { chatbotService } from './ChatbotService.js';
import { patientService } from './PatientService.js';

// Broken out of the constructor to avoid an import cycle between
// AuthService (sends a welcome message) and NotificationService.
authService.notifications = notificationService;

export const services = {
  auth: authService,
  notifications: notificationService,
  triage: triageService,
  appointments: appointmentService,
  escalations: escalationService,
  chatbot: chatbotService,
  patients: patientService
};

export default services;
