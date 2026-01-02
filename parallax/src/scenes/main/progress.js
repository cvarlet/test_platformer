// src/scenes/main/progress.js
const STORAGE_KEY = "miniPlatformerProgress_v1";

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
