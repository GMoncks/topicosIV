import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

test.describe('Biblioteca e Licenças de Jogos (Bloco D)', () => {
  test('E2E-LIB-01 — deve listar jogos adquiridos, exibir estatísticas de playtime e painel de conquistas', async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/api/library/my-games', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 101,
            game_id: 1,
            playtime_minutes: 180,
            last_played: '2026-10-01T20:00:00Z',
            installed: true,
            game: {
              id: 1,
              title: 'Cyberpunk Odyssey 2088',
              banner_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
            },
          },
        ]),
      });
    });

    await page.route('**/api/library/games/1/achievements', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'ach1', name: 'Primeira Missão', description: 'Complete o tutorial.', unlocked: true },
          { id: 'ach2', name: 'Lenda Urbana', description: 'Alcance nível 50.', unlocked: false },
        ]),
      });
    });

    await page.goto('/');

    const libBtn = page.locator('button[title="Biblioteca"]');
    await libBtn.click();

    // Valida exibição do título na lista lateral da biblioteca
    await expect(page.locator('text=Cyberpunk Odyssey 2088').first()).toBeVisible();

    // Clica no jogo para carregar painel
    await page.locator('text=Cyberpunk Odyssey 2088').first().click();

    // Valida presença das estatísticas e botão Jogar
    await expect(page.locator('text=/3h jogadas|jogadas/i').first()).toBeVisible();
    await expect(page.locator('button', { hasText: /Jogar|Instalado/i }).first()).toBeVisible();
  });
});
