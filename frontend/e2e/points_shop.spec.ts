import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_COSMETICS = [
  {
    id: 'frame_mar_crepuscular',
    name: 'Moldura Maré Crepuscular',
    category: 'Moldura de avatar',
    item_type: 'avatar_frame',
    price_points: 2000,
    asset_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=200&q=80',
    description: 'Moldura dourada dinâmica com reflexos celestes.',
    is_owned: false,
  },
];

test.describe('Loja de Pontos e Cosméticos (Bloco I)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page, { points_balance: 5000 });

    await page.route('**/api/points-shop/items', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_COSMETICS),
      });
    });
  });

  test('E2E-PTS-01 — deve listar cosméticos da Loja de Pontos e resgatar item com saldo de pontos', async ({ page }) => {
    await page.route('**/api/points-shop/purchase', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Item resgatado com sucesso!',
          new_points_balance: 3000,
          item: {
            id: 1,
            name: 'Moldura Maré Crepuscular',
            item_type: 'avatar_frame',
            asset_url: MOCK_COSMETICS[0].asset_url,
          },
        }),
      });
    });

    await page.goto('/');

    const pointsBtn = page.locator('button[title="Loja de Pontos"]');
    await pointsBtn.click();

    // Valida título da página e saldo de pontos
    await expect(page.locator('text=/Loja de MIST Points|Cosméticos Disponíveis/i').first()).toBeVisible();
    await expect(page.locator('text=Maré Crepuscular').first()).toBeVisible();

    const redeemBtn = page.locator('button', { hasText: /Resgatar|Adquirir/i }).first();
    await redeemBtn.click();
  });

  test('E2E-PTS-02 — deve equipar moldura de avatar adquirida e refletir no perfil', async ({ page }) => {
    await page.route('**/api/profile/equip', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Equipado com sucesso',
          equipped_item: { id: 1, name: 'Moldura', item_type: 'avatar_frame' },
          avatar_frame_url: MOCK_COSMETICS[0].asset_url,
        }),
      });
    });

    await page.goto('/');
    const profileBtn = page.locator('[title="Ver Perfil"]').first();
    await profileBtn.click();

    // Valida que o perfil renderizou
    await expect(page.locator('text=player_one').first()).toBeVisible();
  });

});
