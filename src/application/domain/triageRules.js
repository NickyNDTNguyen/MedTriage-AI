// ============================================================================
// APPLICATION LOGIC LAYER - the triage rules engine.
//
// Pure functions over plain data. No database, no HTTP, no DOM. This is the
// piece a clinical reviewer would read, and the piece that is unit-testable
// without starting a server.
//
// It produces an URGENCY LEVEL, never a diagnosis.
// ============================================================================
import { CATEGORY_TO_SPECIALTY } from './symptomLexicon.js';

/** The structured questionnaire. Index order is part of the stored answer format. */
export const QUESTIONNAIRE = [
  {
    id: 'duration',
    prompt: 'How long have you felt this way?',
    help: 'Choose the closest match.',
    options: [
      { label: 'Less than a day', score: 0 },
      { label: '1-3 days', score: 1 },
      { label: 'Several days', score: 2 },
      { label: 'More than a week', score: 2 }
    ]
  },
  {
    id: 'main_symptom',
    prompt: 'What is your main symptom?',
    help: 'Pick the one that bothers you most.',
    options: [
      { label: 'Dizziness or lightheadedness', score: 2, category: 'neuro' },
      { label: 'Chest or breathing problem',   score: 3, category: 'cardiac' },
      { label: 'Fever or pain',                score: 1, category: 'infection' },
      { label: 'Something else',               score: 1, category: 'general' }
    ]
  },
  {
    id: 'pattern',
    prompt: 'Does it get worse when you stand or move?',
    help: 'This helps us understand the pattern.',
    options: [
      { label: 'Yes, it does',          score: 2 },
      { label: 'No, it stays the same', score: 1 },
      { label: "I'm not sure",          score: 1 }
    ]
  },
  {
    id: 'red_flags',
    prompt: 'Do you have any emergency warning signs?',
    help: 'Such as chest pain, trouble breathing, fainting or stroke signs.',
    options: [
      { label: 'None of these',                                 score: 0 },
      { label: 'Chest pain or trouble breathing',               score: 9, category: 'cardiac' },
      { label: 'Fainting, weakness on one side, or confusion',  score: 9, category: 'neuro' }
    ]
  }
];

const LEVELS = {
  emergency: {
    level: 'emergency',
    headline: 'Call 911 now',
    summary: 'Your answers include an emergency warning sign. Emergency services can assess you fastest.'
  },
  same_day: {
    level: 'same_day',
    headline: 'Contact a clinician today',
    summary: 'Your symptoms have lasted or may need prompt review. Ask for a same-day appointment or call a nurse line.'
  },
  routine: {
    level: 'routine',
    headline: 'Monitor and use self-care',
    summary: 'No warning signs were reported. Rest, keep hydrated, and seek care if anything changes or worsens.'
  }
};

/**
 * Validate a submitted answer set against the questionnaire shape.
 * @returns {string[]} problems; empty array means valid.
 */
export function validateAnswers(answers) {
  const problems = [];
  if (!Array.isArray(answers) || answers.length !== QUESTIONNAIRE.length) {
    problems.push(`Expected ${QUESTIONNAIRE.length} answers.`);
    return problems;
  }
  QUESTIONNAIRE.forEach((question, i) => {
    const choice = answers[i];
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
      problems.push(`Answer ${i + 1} ("${question.prompt}") is missing or out of range.`);
    }
  });
  return problems;
}

/**
 * Score a completed check.
 *
 * @param {number[]} answers       selected option index per question
 * @param {object}   aiSignals     optional output of AiGateway#complete().signals
 * @returns {{level, headline, summary, score, rationale, category, suggestedSpecialty, questions}}
 */
export function assess(answers, aiSignals = null) {
  const rationale = [];
  let score = 0;
  let category = 'general';
  let emergencyByRule = false;

  QUESTIONNAIRE.forEach((question, i) => {
    const option = question.options[answers[i]];
    score += option.score;
    if (option.category && option.score >= 2) category = option.category;
    if (option.score >= 9) emergencyByRule = true;
    rationale.push(`${question.prompt} - you answered "${option.label}".`);
  });

  // Free-text signals from the assistant can only ever RAISE urgency.
  if (aiSignals?.redFlag) {
    emergencyByRule = true;
    rationale.push(`You described "${aiSignals.redFlag}" to the assistant, which is an emergency warning sign.`);
  }
  if (aiSignals?.symptoms?.length) {
    const top = [...aiSignals.symptoms].sort((a, b) => b.weight - a.weight)[0];
    score += top.weight;
    if (top.weight >= 2) category = top.category;
    rationale.push(`You also mentioned ${aiSignals.symptoms.map(s => s.label).join(', ')}.`);
  }

  const level = emergencyByRule ? 'emergency' : score >= 5 ? 'same_day' : 'routine';

  return {
    ...LEVELS[level],
    score,
    rationale,
    category,
    suggestedSpecialty: CATEGORY_TO_SPECIALTY[category] ?? 'Internal Medicine',
    questionsForClinician: questionsFor(category)
  };
}

/** Preparation prompts the patient can take into a visit. */
function questionsFor(category) {
  const shared = [
    'What could be causing this, and what else are you ruling out?',
    'Could any of my current medicines be contributing?',
    'What warning signs mean I should come back or call 911?'
  ];
  const specific = {
    cardiac: ['Should I have an ECG or blood pressure check today?'],
    neuro: ['Has my blood pressure been checked sitting and standing?'],
    respiratory: ['Should my oxygen level be measured?'],
    infection: ['Do I need any tests or cultures before treatment?'],
    gi: ['Should I change what I eat or drink while we wait?'],
    general: ['Am I drinking enough fluids for my situation?']
  };
  return [...(specific[category] ?? specific.general), ...shared];
}

/** The option labels the UI renders. Keeps scoring weights server-side. */
export function publicQuestionnaire() {
  return QUESTIONNAIRE.map(q => ({
    id: q.id,
    prompt: q.prompt,
    help: q.help,
    options: q.options.map(o => o.label)
  }));
}
