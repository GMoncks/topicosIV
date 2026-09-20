import { test, expect } from '@playwright/test';

test.describe('Navegação e Ciclo de Vida (E2E-NAV-01)', () => {
  test('deve alternar entre Loja, Biblioteca e Loja de Pontos com preservação do contexto', async ({ page }) => {
    // 1. Acessa a aplicação
    await page.goto('/');

    // Confirma que inicia na Loja
    await expect(page.locator('h1, h2, span').filter({ hasText: /MIST|Destaques|Loja/i }).first()).toBeVisible();

    // 2. Navega para a Biblioteca
    const libraryButton = page.locator('button[title="Biblioteca"]');
    await libraryButton.click();
    await expect(page.locator('text=Minha Biblioteca')).toBeVisible();

    // 3. Navega para a Loja de Pontos
    const pointsButton = page.locator('button[title="Loja de Pontos"]');
    await pointsButton.click();

    // Valida que a Loja de Pontos carregou seu catálogo e saldo de pontos (iniciando em 0 para visitantes)
    await expect(page.getByRole('heading', { name: 'A LOJA DE PONTOS' })).toBeVisible();
    await expect(page.locator('text=Saldo de Pontos')).toBeVisible();
    await expect(page.locator('text=MARÉ CREPUSCULAR')).toBeVisible();

    // 4. Retorna para a Loja
    const storeButton = page.locator('button[title="Loja"]');
    await storeButton.click();

    // Valida que a Loja de Pontos foi desmontada e a Loja principal está ativa
    await expect(page.getByRole('heading', { name: 'A LOJA DE PONTOS' })).not.toBeVisible();
  });
});
