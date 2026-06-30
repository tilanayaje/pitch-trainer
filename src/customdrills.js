const KEY = "pt_custom_drills";
const MAX = 30;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(drills) {
  try {
    localStorage.setItem(KEY, JSON.stringify(drills));
  } catch {}
}

export function loadCustomDrills() {
  return load();
}

export function saveCustomDrill(drill) {
  const drills = load();
  drills.push(drill);
  if (drills.length > MAX) drills.splice(0, drills.length - MAX);
  persist(drills);
  return drills;
}

export function deleteCustomDrill(id) {
  const drills = load().filter((d) => d.id !== id);
  persist(drills);
  return drills;
}
