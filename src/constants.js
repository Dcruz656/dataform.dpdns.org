export const PRESET_SCALES = {
  csat:        { name: 'Satisfacción — CSAT (5 pts)',   options: ['Muy insatisfecho', 'Insatisfecho', 'Neutral', 'Satisfecho', 'Muy satisfecho'] },
  likert5:     { name: 'Acuerdo — Likert (5 pts)',      options: ['Totalmente en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Totalmente de acuerdo'] },
  likert7:     { name: 'Acuerdo — Likert (7 pts)',      options: ['Totalmente en desacuerdo', 'En desacuerdo', 'Algo en desacuerdo', 'Neutral', 'Algo de acuerdo', 'De acuerdo', 'Totalmente de acuerdo'] },
  frecuencia:  { name: 'Frecuencia (5 pts)',            options: ['Nunca', 'Raramente', 'A veces', 'Frecuentemente', 'Siempre'] },
  importancia: { name: 'Importancia (5 pts)',           options: ['Sin importancia', 'Poco importante', 'Moderadamente importante', 'Importante', 'Muy importante'] },
  calidad:     { name: 'Calidad (5 pts)',               options: ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'] },
  probabilidad:{ name: 'Probabilidad (5 pts)',          options: ['Muy improbable', 'Improbable', 'Neutral', 'Probable', 'Muy probable'] },
  esfuerzo:    { name: 'Esfuerzo — CES (5 pts)',        options: ['Muy difícil', 'Difícil', 'Neutral', 'Fácil', 'Muy fácil'] },
  sino:        { name: 'Sí / No',                      options: ['Sí', 'No'] },
  sinoNs:      { name: 'Sí / No / No sé',              options: ['Sí', 'No', 'No sé'] },
  custom:      { name: 'Personalizada (Manual)',        options: [] },
};

export const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Opción Múltiple' },
  { value: 'text', label: 'Texto Abierto' },
  { value: 'rating', label: 'Estrellas' },
  { value: 'nps', label: 'NPS (0–10)' },
  { value: 'matrix', label: 'Matriz / Grid' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'slider', label: 'Slider Numérico' },
  { value: 'file', label: 'Carga de Archivo' },
];

export const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export const LOGIC_OPERATORS = [
  { value: 'equals', label: 'es igual a' },
  { value: 'not_equals', label: 'es diferente a' },
  { value: 'contains', label: 'contiene' },
];

export const createNewQuestion = (type, id) => {
  const base = { id, type, text: '', required: false, conditions: [], conditionMode: 'show' };
  const defaults = {
    multiple_choice: { scale: 'csat', options: ['Muy insatisfecho', 'Insatisfecho', 'Neutral', 'Satisfecho', 'Muy satisfecho'] },
    text: {},
    rating: { maxStars: 5 },
    nps: {},
    matrix: { rows: ['Criterio 1', 'Criterio 2'], columns: ['Malo', 'Regular', 'Bueno', 'Excelente'] },
    ranking: { options: ['Opción 1', 'Opción 2', 'Opción 3'] },
    slider: { min: 0, max: 10, step: 1, minLabel: '', maxLabel: '' },
    file: { acceptedTypes: 'image/*,.pdf', maxSizeMB: 10 },
  };
  return { ...base, ...(defaults[type] || {}) };
};

export const DEFAULT_QUESTIONS = [
  {
    id: 1,
    type: 'multiple_choice',
    text: '¿Cómo calificarías tu satisfacción general con nuestro servicio?',
    scale: 'csat',
    options: ['Muy insatisfecho', 'Insatisfecho', 'Neutral', 'Satisfecho', 'Muy satisfecho'],
    required: true,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 2,
    type: 'multiple_choice',
    text: '¿Con qué frecuencia utilizas nuestro producto o servicio?',
    scale: 'frecuencia',
    options: ['Nunca', 'Raramente', 'A veces', 'Frecuentemente', 'Siempre'],
    required: true,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 3,
    type: 'multiple_choice',
    text: '¿Qué tan fácil fue completar tu tarea hoy?',
    scale: 'esfuerzo',
    options: ['Muy difícil', 'Difícil', 'Neutral', 'Fácil', 'Muy fácil'],
    required: true,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 4,
    type: 'rating',
    text: '¿Cuántas estrellas le darías a tu experiencia en general?',
    maxStars: 5,
    required: true,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 5,
    type: 'nps',
    text: '¿Qué tan probable es que nos recomiendes a un amigo o colega?',
    required: true,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 6,
    type: 'slider',
    text: '¿Qué tan satisfecho estás con el precio del servicio?',
    min: 0,
    max: 10,
    step: 1,
    minLabel: 'Nada satisfecho',
    maxLabel: 'Muy satisfecho',
    required: false,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 7,
    type: 'matrix',
    text: 'Evalúa los siguientes aspectos de nuestro servicio:',
    rows: ['Atención al cliente', 'Calidad del producto', 'Tiempo de respuesta', 'Relación calidad-precio'],
    columns: ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'],
    required: false,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 8,
    type: 'ranking',
    text: 'Ordena los siguientes factores de mayor a menor importancia para ti:',
    options: ['Precio', 'Calidad', 'Velocidad de entrega', 'Atención al cliente', 'Variedad de productos'],
    required: false,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 9,
    type: 'multiple_choice',
    text: '¿Volverías a elegirnos en el futuro?',
    scale: 'sino',
    options: ['Sí', 'No'],
    required: true,
    conditions: [],
    conditionMode: 'show',
  },
  {
    id: 10,
    type: 'text',
    text: '¿Tienes algún comentario adicional o sugerencia de mejora?',
    required: false,
    conditions: [],
    conditionMode: 'show',
  },
];

export const MOCK_RESPONSES = [
  { id: 1,  name: 'Ana García',       timestamp: '2026-05-20 09:15', answers: { 1: 'Satisfecho',      2: 4, 3: 8,  4: 'El servicio es muy rápido y el producto tiene buena calidad' } },
  { id: 2,  name: 'Carlos Mendoza',   timestamp: '2026-05-20 10:30', answers: { 1: 'Muy satisfecho',  2: 5, 3: 10, 4: 'Excelente atención al cliente y muy buen precio' } },
  { id: 3,  name: 'Laura Jiménez',    timestamp: '2026-05-20 11:00', answers: { 1: 'Neutral',         2: 3, 3: 6,  4: 'La aplicación móvil necesita mejoras urgentes' } },
  { id: 4,  name: 'Roberto Silva',    timestamp: '2026-05-20 14:20', answers: { 1: 'Insatisfecho',    2: 2, 3: 4,  4: 'El soporte técnico tarda mucho en responder a los clientes' } },
  { id: 5,  name: 'María Torres',     timestamp: '2026-05-21 09:00', answers: { 1: 'Satisfecho',      2: 4, 3: 7,  4: 'Buena relación calidad precio y buen servicio general' } },
  { id: 6,  name: 'Diego Ramírez',    timestamp: '2026-05-21 10:15', answers: { 1: 'Muy satisfecho',  2: 5, 3: 9,  4: 'El producto supera mis expectativas de calidad y velocidad' } },
  { id: 7,  name: 'Sofía Herrera',    timestamp: '2026-05-21 11:30', answers: { 1: 'Neutral',         2: 3, 3: 5,  4: 'La interfaz podría ser más intuitiva y moderna' } },
  { id: 8,  name: 'Andrés Morales',   timestamp: '2026-05-21 14:00', answers: { 1: 'Satisfecho',      2: 4, 3: 8,  4: 'Muy satisfecho con la velocidad de entrega del producto' } },
  { id: 9,  name: 'Valentina Cruz',   timestamp: '2026-05-22 09:30', answers: { 1: 'Insatisfecho',    2: 2, 3: 3,  4: 'El soporte técnico es muy lento y poco útil en respuestas' } },
  { id: 10, name: 'Felipe Vargas',    timestamp: '2026-05-22 10:45', answers: { 1: 'Muy satisfecho',  2: 5, 3: 10, 4: 'Excelente servicio al cliente y producto de buena calidad' } },
  { id: 11, name: 'Camila Rojas',     timestamp: '2026-05-22 11:00', answers: { 1: 'Satisfecho',      2: 4, 3: 7,  4: 'La aplicación móvil necesita más estabilidad y velocidad' } },
  { id: 12, name: 'Javier Castillo',  timestamp: '2026-05-22 15:30', answers: { 1: 'Neutral',         2: 3, 3: 6,  4: 'Precios competitivos pero el soporte podría mejorar bastante' } },
  { id: 13, name: 'Isabella Flores',  timestamp: '2026-05-23 09:00', answers: { 1: 'Muy satisfecho',  2: 5, 3: 9,  4: 'Muy buena experiencia de uso y atención rápida al cliente' } },
  { id: 14, name: 'Martín Gutiérrez', timestamp: '2026-05-23 10:30', answers: { 1: 'Satisfecho',      2: 4, 3: 8,  4: 'El producto tiene buena documentación y es fácil de usar' } },
  { id: 15, name: 'Lucía Navarro',    timestamp: '2026-05-23 11:45', answers: { 1: 'Muy insatisfecho', 2: 1, 3: 2, 4: 'Pésima experiencia con el servicio al cliente y soporte' } },
];
