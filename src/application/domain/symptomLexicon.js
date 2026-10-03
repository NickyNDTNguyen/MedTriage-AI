// ============================================================================
// APPLICATION LOGIC LAYER - clinical vocabulary used by the assistant and the
// triage engine. Pure data: no I/O, no framework, trivially unit-testable.
// weight: 3 = emergency signal, 2 = prompt review, 1 = routine.
// ============================================================================
export const SYMPTOM_LEXICON = {
  chest_pain:   { label: 'chest pain',                 category: 'cardiac',     weight: 3, terms: ['chest pain', 'chest pressure', 'chest tight', 'crushing chest'] },
  breathing:    { label: 'trouble breathing',          category: 'respiratory', weight: 3, terms: ['cant breathe', "can't breathe", 'trouble breathing', 'short of breath', 'shortness of breath', 'gasping'] },
  stroke:       { label: 'possible stroke signs',      category: 'neuro',       weight: 3, terms: ['face droop', 'slurred speech', 'weakness on one side', 'numb on one side', 'cannot speak'] },
  fainting:     { label: 'fainting or passing out',    category: 'neuro',       weight: 3, terms: ['fainted', 'passed out', 'blacked out', 'lost consciousness'] },
  bleeding:     { label: 'heavy bleeding',             category: 'trauma',      weight: 3, terms: ['heavy bleeding', 'bleeding a lot', 'wont stop bleeding', "won't stop bleeding"] },
  allergic:     { label: 'severe allergic reaction',   category: 'allergy',     weight: 3, terms: ['throat closing', 'anaphylaxis', 'face swelling', 'lips swelling'] },
  selfharm:     { label: 'thoughts of self-harm',      category: 'behavioral',  weight: 3, terms: ['hurt myself', 'kill myself', 'end my life', 'suicidal'] },

  dizziness:    { label: 'dizziness or lightheadedness', category: 'neuro',     weight: 2, terms: ['dizzy', 'dizziness', 'lightheaded', 'light headed', 'light-headed', 'room spinning', 'vertigo'] },
  palpitations: { label: 'heart racing or skipping',   category: 'cardiac',     weight: 2, terms: ['heart racing', 'heart is racing', 'racing heart', 'palpitation', 'heart skipping', 'fluttering'] },
  high_fever:   { label: 'high fever',                 category: 'infection',   weight: 2, terms: ['high fever', '103', '104', 'burning up'] },
  abdominal:    { label: 'severe abdominal pain',      category: 'gi',          weight: 2, terms: ['stomach pain', 'abdominal pain', 'belly pain', 'severe cramp'] },
  vision:       { label: 'vision changes',             category: 'neuro',       weight: 2, terms: ['blurry vision', 'double vision', 'vision change', 'cant see', "can't see"] },
  dehydration:  { label: 'possible dehydration',       category: 'general',     weight: 2, terms: ['not drinking', 'dehydrated', 'very thirsty', 'no urine'] },

  headache:     { label: 'headache',                   category: 'neuro',       weight: 1, terms: ['headache', 'migraine', 'head hurts'] },
  fever:        { label: 'fever',                      category: 'infection',   weight: 1, terms: ['fever', 'temperature', 'chills'] },
  cough:        { label: 'cough',                      category: 'respiratory', weight: 1, terms: ['cough', 'coughing'] },
  fatigue:      { label: 'fatigue',                    category: 'general',     weight: 1, terms: ['tired', 'exhausted', 'fatigue', 'no energy'] },
  nausea:       { label: 'nausea',                     category: 'gi',          weight: 1, terms: ['nausea', 'nauseous', 'throwing up', 'vomit'] },
  rash:         { label: 'rash',                       category: 'derm',        weight: 1, terms: ['rash', 'hives', 'itchy skin'] },
  sore_throat:  { label: 'sore throat',                category: 'ent',         weight: 1, terms: ['sore throat', 'throat hurts'] },
  back_pain:    { label: 'back pain',                  category: 'msk',         weight: 1, terms: ['back pain', 'back hurts'] }
};

/** Phrases that short-circuit straight to an emergency recommendation. */
export const EMERGENCY_PHRASES = [
  'chest pain', 'crushing chest', "can't breathe", 'cant breathe', 'trouble breathing',
  'face droop', 'slurred speech', 'weakness on one side', 'passed out', 'lost consciousness',
  'heavy bleeding', 'throat closing', 'anaphylaxis', 'kill myself', 'hurt myself', 'suicidal'
];

/** Which specialty a case category routes to when escalated. */
export const CATEGORY_TO_SPECIALTY = {
  cardiac: 'Cardiology',
  respiratory: 'Pulmonology',
  neuro: 'Neurology',
  gi: 'Gastroenterology',
  infection: 'Internal Medicine',
  allergy: 'Allergy & Immunology',
  behavioral: 'Behavioral Health',
  trauma: 'Emergency Medicine',
  derm: 'Internal Medicine',
  ent: 'Internal Medicine',
  msk: 'Internal Medicine',
  general: 'Internal Medicine'
};

export const EMERGENCY_TEXT =
  'Severe chest pain - major trouble breathing - signs of stroke - fainting with injury - '
  + 'heavy bleeding - severe allergic reaction - thoughts of harming yourself or others';
