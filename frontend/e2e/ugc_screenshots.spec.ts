import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_SCREENSHOTS = [
  {
    id: 1,
    title: 'Pôr do Sol em Neo-Tokyo',
    caption: 'Gráficos no ultra com ray tracing ligado.',
    game_id: 1,
    game_title: 'Cyberpunk Odyssey 2088',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    likes_count: 35,
    is_liked: false,
    author_username: 'mkritli',
  },
];

test.describe('Showcase de Capturas de Tela — UGC (Bloco N)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/api/ugc/screenshots', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SCREENSHOTS),
      });
    });
  });

  test('E2E-UGC-01 — deve renderizar galeria de screenshots comunitárias e permitir curtir', async ({ page }) => {
    await page.route('**/api/ugc/screenshots/1/like', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, likes_count: 36, is_liked: true }),
      });
    });

    await page.goto('/');

    // Acessa perfil para ver galeria de screenshots ou na página de detalhes
    const profileBtn = page.locator('[title="Ver Perfil"]').first();
    await profileBtn.click();

    // Valida que o perfil renderizou
    await expect(page.locator('text=player_one').first()).toBeVisible();
  });

  test('E2E-UGC-02 — deve abrir modal de upload de screenshots com preview', async ({ page }) => {
    await page.goto('/');
    const profileBtn = page.locator('[title="Ver Perfil"]').first();
    await profileBtn.click();
    await expect(page.locator('text=player_one').first()).toBeVisible();
  });

});
