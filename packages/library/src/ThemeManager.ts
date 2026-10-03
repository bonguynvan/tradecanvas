import type { ShapeConfig, Theme, ThemeName } from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';

export class ThemeManager {
  private theme: Theme;
  /** Shapes set apart from the theme (`setShapes`): they stay through theme switches. */
  private shape: ShapeConfig | null = null;

  constructor(themeOrName?: ThemeName | Theme) {
    if (!themeOrName || themeOrName === 'dark') {
      this.theme = { ...DARK_THEME };
    } else if (themeOrName === 'light') {
      this.theme = { ...LIGHT_THEME };
    } else {
      this.theme = { ...themeOrName };
    }
  }

  getTheme(): Theme {
    return this.theme;
  }

  setTheme(themeOrName: ThemeName | Theme): void {
    if (themeOrName === 'dark') {
      this.theme = { ...DARK_THEME };
    } else if (themeOrName === 'light') {
      this.theme = { ...LIGHT_THEME };
    } else {
      this.theme = { ...themeOrName };
    }
    if (this.shape) this.theme = { ...this.theme, shape: { ...this.theme.shape, ...this.shape } };
  }

  /** Shapes over every theme from now on (null: each theme's own). */
  setShape(shape: ShapeConfig | null): void {
    this.shape = shape ? { ...shape } : null;
    this.theme = { ...this.theme, shape: shape ? { ...this.theme.shape, ...shape } : this.theme.shape };
  }
}
