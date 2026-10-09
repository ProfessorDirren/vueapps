// Shared, dependency-free calculations for VUE planning tools.
export const TOOL_IDS = Object.freeze(['homevue','plantvue','armvue','foodvue']);
export function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('invalid_date');
  const date = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) throw new Error('invalid_date');
  return date;
}
export function addDays(value, days) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('invalid_interval');
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0,10);
}
export function dueState(due, today) {
  calendarDate(due); calendarDate(today);
  return due < today ? 'overdue' : due === today ? 'today' : 'upcoming';
}
export function scaleIngredients(items, original, target) {
  if (!Number.isFinite(original) || !Number.isFinite(target) || original <= 0 || target <= 0 || original > 1000 || target > 1000) throw new Error('invalid_portions');
  if (!Array.isArray(items) || items.length < 1 || items.length > 100) throw new Error('invalid_ingredients');
  return items.map(item => {
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100 || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1000000 || !['g','kg','ml','l','pcs','tsp','tbsp'].includes(item.unit)) throw new Error('invalid_ingredient');
    return {...item, name:item.name.trim(), quantity:item.quantity * target / original};
  });
}
export function validateRecords(records, typeCount) {
  if (!Array.isArray(records) || records.length > 200) throw new Error('invalid_records');
  const ids = new Set();
  return records.map(item => {
    if (!item || typeof item.id !== 'string' || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100 || !Number.isInteger(item.type) || item.type < 0 || item.type >= typeCount || typeof item.notes !== 'string' || item.notes.length > 1000 || !Number.isInteger(item.interval) || item.interval < 1 || item.interval > 3650) throw new Error('invalid_record');
    ids.add(item.id); calendarDate(item.due);
    return {id:item.id,name:item.name.trim(),type:item.type,notes:item.notes,interval:item.interval,due:item.due};
  });
}
