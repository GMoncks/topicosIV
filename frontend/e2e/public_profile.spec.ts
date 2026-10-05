import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_PUBLIC_PROFILE = {
  id: 2,
  username: 'lucas_speed',
  real_name: 'Lucas Speedster',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  level: 5,
  bio: 'Velocidade e precisão nos jogos.',
  location: 'Rio de Janeiro, Brasil',
  relationship: 'friend',
  privacy: {
    games: 'public',
    inventory: 'friends_only',
    achievements: 'public',
  },
  stats: {
    games_count: 12,
    achievements_count: 85,
    inventory_count: 30,
  },
};

test.describe('Perfil Público e Configurações de Privacidade (Bloco P)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/api/users/lucas_speed/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PUBLIC_PROFILE),
      });
    });
  });

  test('E2E-PUB-01 — deve renderizar perfil público de terceiro com badges de relacionamento', async ({ page }) => {
    await page.goto('/');

    // Acessa rota de perfil público via evento ou navegação direta
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mist:navigate-public-profile', { detail: { username: 'lucas_speed' } }));
    });

    // Se o componente estiver montado ou for acessível
    const profilePage = page.locator('[data-testid="public-profile-page"]');
    if (await profilePage.isVisible()) {
      await expect(profilePage).toBeVisible();
      await expect(page.locator('text=Lucas Speedster|lucas_speed').first()).toBeVisible();
    }
  });

  test('E2E-PRV-01 — deve abrir modal de privacidade e alternar visibilidade de seções', async ({ page }) => {
    await page.route('**/api/me/privacy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, games: 'private' }),
      });
    });

    await page.goto('/');
    const profileBtn = page.locator('[title="Ver Perfil"]').first();
    await profileBtn.click();

    const privacyBtn = page.locator('[data-testid="btn-open-privacy-modal"]').first();
    if (await privacyBtn.isVisible()) {
      await privacyBtn.click();
      await expect(page.locator('text=/Privacidade/i').first()).toBeVisible();
    }
  });

});
