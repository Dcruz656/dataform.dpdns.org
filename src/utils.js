export function shouldShowQuestion(question, answers) {
  if (question.type === 'section') return true; // sections always show, handled separately
  if (!question.conditions || question.conditions.length === 0) return true;
  const match = question.conditions.every(cond => {
    const answer = answers[cond.sourceId];
    if (answer === undefined || answer === null || answer === '') return false;
    const str = String(answer);
    switch (cond.operator) {
      case 'equals': return str === cond.value;
      case 'not_equals': return str !== cond.value;
      case 'contains': return str.toLowerCase().includes(cond.value.toLowerCase());
      default: return true;
    }
  });
  return question.conditionMode === 'hide' ? !match : match;
}

export function exportCSV(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Descarga filas crudas (sin encabezado separado — úsalo cuando el encabezado ya va dentro de rows)
export function downloadRawCSV(filename, rows) {
  const csv = rows
    .map(row =>
      (Array.isArray(row) ? row : [row])
        .map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getWordFrequency(texts) {
  const stop = new Set([
    'el','la','los','las','un','una','es','en','de','que','y','a','con','su',
    'por','para','lo','al','del','se','no','le','me','nos','te','si','más',
    'pero','como','esta','esto','sus','son','fue','ser','muy','han','hay',
  ]);
  const freq = {};
  texts.forEach(text => {
    text.toLowerCase().replace(/[.,!?¿¡]/g, '').split(/\s+/).forEach(word => {
      if (word.length > 2 && !stop.has(word)) {
        freq[word] = (freq[word] || 0) + 1;
      }
    });
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 28);
}

export function downloadJSON(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let _nextId = 100;
export const nextId = () => ++_nextId;
