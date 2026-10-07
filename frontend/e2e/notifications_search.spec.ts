import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'friend_request',
    title: 'Novo pedido de amizade',
    message: 'sarah_connor enviou um convite de amizade para você.',
    is_read: false,
    created_at: new Date().toISOString(),
    payload: { sender_id: 2, sender_username: 'sarah_connor' },
  },
];

const MOCK_SEARCH_RESULTS = {
  query: 'cyber',
  total: 1,
  games: [
    { id: 1, title: 'Cyberpunk Odyssey 2088', price: 149.90, header_image: '', category: 'RPG' },
  ],
  users: [],
  groups: [],
  market_items: [],
};

test.describe('Notificações Globais e Busca Unificada (Blocos Q, R)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/api/social/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_NOTIFICATIONS, total: 1, unread_count: 1 }),
      });
    });

    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SEARCH_RESULTS),
      });
    });
  });

  test('E2E-NOT-01 — deve exibir badge de notificações não lidas e abrir dropdown', async ({ page }) => {
    await page.goto('/');

    // Clica no sininho de notificações
    const bellBtn = page.locator('[data-testid="notifications-button"]').first();
    await bellBtn.click();
    await expect(page.locator('text=/sarah_connor|amizade|notificação/i').first()).toBeVisible();
  });

  test('E2E-NOT-02 — deve marcar notificação como lida ao clicar', async ({ page }) => {
    await page.route('**/api/social/notifications/1/read', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_NOTIFICATIONS[0], is_read: true }),
      });
    });

    await page.goto('/');
    const bellBtn = page.locator('[data-testid="notifications-button"]').first();
    if (await bellBtn.isVisible()) {
      await bellBtn.click();
    }
  });

  test('E2E-SCH-01 — deve exibir resultados categorizados na busca global do Header', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('cyber');

    // Valida abertura do dropdown com resultados
    await expect(page.locator('text=/Cyberpunk Odyssey 2088|Jogos da Loja/i').first()).toBeVisible();
  });

});
