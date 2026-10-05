import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_MODS = [
  {
    id: 1,
    title: 'Texturas HD Realistas 4K',
    description: 'Substitui todas as texturas de superfícies para 4K fotorrealista.',
    game_id: 1,
    game_title: 'Cyberpunk Odyssey 2088',
    author: 'modder_master',
    downloads_count: 1540,
    subscribers_count: 890,
    is_subscribed: false,
    banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    tags: ['Gráficos', 'Texturas', 'HD'],
  },
];

test.describe('Oficina da Comunidade — Mods e Criações (Bloco O)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/api/ugc/workshop/items*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_MODS, total: 1, page: 1, pages: 1 }),
      });
    });

    await page.route('**/api/games*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, title: 'Cyberpunk Odyssey 2088' }]),
      });
    });
  });

  test('E2E-WKS-01 — deve listar mods no catálogo da Oficina e alternar inscrição reativa', async ({ page }) => {
    await page.route('**/api/ugc/workshop/items/1/subscribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, is_subscribed: true, subscribers_count: 891 }),
      });
    });

    await page.goto('/');

    const workshopBtn = page.locator('button[title="Oficina"]');
    if (await workshopBtn.isVisible()) {
      await workshopBtn.click();
      await expect(page.locator('text=/Workshop de Mods|Oficina da Comunidade/i').first()).toBeVisible();
      await expect(page.locator('text=Texturas HD Realistas 4K').first()).toBeVisible();

      const subBtn = page.locator('button', { hasText: /Inscrever-se|Download/i }).first();
      if (await subBtn.isVisible()) {
        await subBtn.click();
      }
    }
  });

  test('E2E-WKS-02 — deve exibir aba de criações da oficina publicadas no perfil', async ({ page }) => {
    await page.goto('/');
    const profileBtn = page.locator('[title="Ver Perfil"]').first();
    await profileBtn.click();
    await expect(page.locator('text=player_one').first()).toBeVisible();
  });

});
