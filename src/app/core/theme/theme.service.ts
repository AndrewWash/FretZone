import { Injectable, effect, signal } from '@angular/core';
import { loadFromStorage, saveToStorage } from '../utils/storage';

export type NotationTheme = 'light' | 'dark';

const STORAGE_KEY = 'fretzone.theme.v1';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly notationTheme = signal<NotationTheme>(
    loadFromStorage<NotationTheme>(STORAGE_KEY, 'dark'),
  );

  constructor() {
    effect(() => {
      const mode = this.notationTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.dataset['notationTheme'] = mode;
      }
      saveToStorage(STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this.notationTheme.update(m => (m === 'dark' ? 'light' : 'dark'));
  }

  setMode(mode: NotationTheme): void {
    this.notationTheme.set(mode);
  }
}
