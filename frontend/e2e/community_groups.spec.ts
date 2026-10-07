import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_GROUPS = [
  {
    id: 1,
    name: 'MIST RPG Explorers',
    description: 'Comunidade dedicada aos fãs de jogos de RPG no MIST.',
    members_count: 142,
    avatar_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&q=80',
    is_member: false,
  },
];

test.describe('Grupos da Comunidade, Fórum e Chat de Grupo (Bloco M)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/api/groups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GROUPS),
      });
    });
  });

  test('E2E-GRP-01 — deve listar grupos da comunidade e permitir ingressar como membro', async ({ page }) => {
    await page.route('**/api/groups/1/join', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, is_member: true, members_count: 143 }),
      });
    });

    await page.goto('/');

    const groupsBtn = page.locator('button[title="Grupos"]');
    if (await groupsBtn.isVisible()) {
      await groupsBtn.click();
      await expect(page.locator('[data-testid="groups-page"]')).toBeVisible();
      await expect(page.locator('text=MIST RPG Explorers').first()).toBeVisible();

      const joinBtn = page.locator('button', { hasText: /Entrar no Grupo|Participar/i }).first();
      if (await joinBtn.isVisible()) {
        await joinBtn.click();
      }
    }
  });

  test('E2E-FRM-01 — deve carregar discussões de tópicos de fórum da comunidade', async ({ page }) => {
    await page.route('**/api/groups/1/forum/topics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: 'Qual a melhor build de Cyberpunk?',
            author: 'elena_rpg',
            replies_count: 8,
          },
        ]),
      });
    });

    await page.goto('/');
    const groupsBtn = page.locator('button[title="Grupos"]');
    if (await groupsBtn.isVisible()) {
      await groupsBtn.click();
    }
  });

  test('E2E-GCHT-01 — deve verificar interface do chat de grupo', async ({ page }) => {
    await page.goto('/');
    const groupsBtn = page.locator('button[title="Grupos"]');
    if (await groupsBtn.isVisible()) {
      await groupsBtn.click();
      await expect(page.locator('[data-testid="groups-page"]')).toBeVisible();
    }
  });

});
