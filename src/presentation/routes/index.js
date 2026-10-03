// ============================================================================
// PRESENTATION LAYER (API) - the REST surface.
//
// The access policy for the whole product is readable in one screen here:
//   open to guests  -> /api/triage/*, /api/chat/send
//   patients only   -> /api/appointments/*, /api/patient/*
//   clinicians only -> /api/cases, /api/escalations/*
// ============================================================================
import { Router } from 'express';
import { requireAuth, requirePatient, requireClinician } from '../middleware/guards.js';
import { asyncRoute as a } from '../middleware/errorHandler.js';
import { authController } from '../controllers/authController.js';
import { triageController } from '../controllers/triageController.js';
import { appointmentController } from '../controllers/appointmentController.js';
import { escalationController } from '../controllers/escalationController.js';
import { patientController } from '../controllers/patientController.js';
import { chatController } from '../controllers/chatController.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, service: 'MedTriage AI' }));

// ---- authentication -------------------------------------------------------
router.post('/auth/register', a(authController.register));
router.post('/auth/signin',   a(authController.signIn));
router.post('/auth/signout',  a(authController.signOut));
router.get ('/auth/me',       a(authController.me));

// ---- symptom check: OPEN TO GUESTS ---------------------------------------
router.get ('/triage/questionnaire', a(triageController.questionnaire));
router.post('/triage/submit',        a(triageController.submit));
router.get ('/triage/history', requirePatient, a(triageController.history));

// ---- assistant: OPEN TO GUESTS -------------------------------------------
router.post  ('/chat/send',    a(chatController.send));
router.get   ('/chat/history', requireAuth, a(chatController.history));
router.delete('/chat/history', requireAuth, a(chatController.clear));

// ---- appointments: REGISTERED PATIENTS ONLY ------------------------------
router.get   ('/appointments/clinicians', a(appointmentController.clinicians));
router.get   ('/appointments',            requirePatient, a(appointmentController.list));
router.post  ('/appointments',            requirePatient, a(appointmentController.book));
router.delete('/appointments/:id',        requirePatient, a(appointmentController.cancel));
router.post  ('/appointments/:id/remind', requirePatient, a(appointmentController.remind));

// ---- patient chart and profile: REGISTERED PATIENTS ONLY -----------------
router.get   ('/patient/dashboard',     requirePatient, a(patientController.dashboard));
router.get   ('/patient/profile',       requirePatient, a(patientController.profile));
router.put   ('/patient/profile',       requirePatient, a(patientController.updateProfile));
router.put   ('/patient/reminders',     requirePatient, a(patientController.updateReminders));
router.get   ('/patient/records',       requirePatient, a(patientController.records));
router.post  ('/patient/records',       requirePatient, a(patientController.addRecord));
router.delete('/patient/records/:id',   requirePatient, a(patientController.deleteRecord));
router.get   ('/patient/notifications', requirePatient, a(patientController.notifications));
router.get   ('/patient/escalations',   requirePatient, a(escalationController.mine));

// ---- clinical review and escalation: DOCTORS AND ADMINS ONLY -------------
router.get ('/cases',               requireClinician, a(triageController.openCases));
router.get ('/escalations',         requireClinician, a(escalationController.list));
router.post('/escalations',         requireClinician, a(escalationController.escalate));
router.put ('/escalations/:id',     requireClinician, a(escalationController.updateStatus));
router.get ('/specialists',         requireClinician, a(escalationController.specialists));

export default router;
