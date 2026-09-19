import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config.js';

describe('Tema e Cores do Sistema (REG-FRONT-01)', () => {
  it('a cor secundária brand.green deve ser estritamente #1F4D36 e não o valor legado #BFE7D2', () => {
    const brandColors = (tailwindConfig.theme?.extend?.colors as any)?.brand;
    expect(brandColors).toBeDefined();
    expect(brandColors.green.toUpperCase()).toBe('#1F4D36');
    expect(brandColors.green.toUpperCase()).not.toBe('#BFE7D2');
  });
});
