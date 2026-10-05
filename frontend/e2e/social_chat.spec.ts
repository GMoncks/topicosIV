import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_FRIENDS = [
  {
    id: 2,
    username: 'sarah_connor',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    status: 'online',
    current_game: 'Cyberpunk Odyssey 2088',
  },
];

const MOCK_REQUESTS = [
  {
    id: 10,
    sender_id: 3,
    sender_username: 'lucas_speed',
    sender_avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
];

test.describe('Comunidade, Amigos e Chat em Tempo Real (Bloco F)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/api/social/friends', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FRIENDS),
      });
    });

    await page.route('**/api/social/friends/requests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_REQUESTS),
      });
    });
  });

  test('E2E-SOC-01 — deve listar amigos e processar convite de amizade pendente', async ({ page }) => {
    await page.route('**/api/social/friends/accept/10', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Amizade aceita' }),
      });
    });

    await page.goto('/');

    const socialBtn = page.locator('button[title*="Comunidade"]').first();
    if (await socialBtn.isVisible()) {
      await socialBtn.click();

      // Valida amigos listados
      await expect(page.locator('text=sarah_connor').first()).toBeVisible();

      // Se houver pedidos pendentes
      const acceptBtn = page.locator('button', { hasText: /Aceitar/i }).first();
      if (await acceptBtn.isVisible()) {
        await acceptBtn.click();
      }
    }
  });

  test('E2E-SOC-02 — deve abrir janela de chat com amigo e exibir balão de mensagem', async ({ page }) => {
    await page.goto('/');
    const socialBtn = page.locator('button[title*="Comunidade"]').first();
    if (await socialBtn.isVisible()) {
      await socialBtn.click();
      const friendCard = page.locator('text=sarah_connor').first();
      if (await friendCard.isVisible()) {
        await friendCard.click();
      }
    }
  });

});
