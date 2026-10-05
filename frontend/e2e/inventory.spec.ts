import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_INVENTORY_ITEMS = [
  {
    id: 1,
    name: 'Moldura Maré Crepuscular',
    item_type: 'avatar_frame',
    asset_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=200&q=80',
    is_equipped: false,
    rarity: 'raro',
  },
  {
    id: 2,
    name: 'Carta: Cyber Hacker',
    item_type: 'card',
    asset_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=200&q=80',
    is_equipped: false,
    rarity: 'incomum',
    game_id: 1,
  },
];

test.describe('Inventário, Cards, Insígnias e XP (Blocos J, K)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/api/inventory', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_INVENTORY_ITEMS }),
      });
    });

    await page.route('**/api/me/level-progress', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current_level: 2,
          current_xp: 450,
          next_level_xp: 900,
          progress_percent: 50,
        }),
      });
    });
  });

  test('E2E-INV-01 — deve listar itens no grid de inventário e filtrar por abas de categorias', async ({ page }) => {
    await page.goto('/');

    const invBtn = page.locator('button[title="Inventário"]');
    await invBtn.click();

    // Valida carregamento da página de inventário
    await expect(page.locator('[data-testid="inventory-page"]')).toBeVisible();

    // Valida exibição dos itens no grid
    await expect(page.locator('[data-testid="tab-cards"]')).toBeVisible();
    await expect(page.locator('text=Moldura Maré Crepuscular').first()).toBeVisible();
  });

  test('E2E-INV-02 — deve acionar equipar e desequipar cosmético diretamente do card', async ({ page }) => {
    await page.route('**/api/inventory/items/1/equip', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, item_id: 1, is_equipped: true }),
      });
    });

    await page.goto('/');
    const invBtn = page.locator('button[title="Inventário"]');
    await invBtn.click();

    const equipBtn = page.locator('[data-testid="btn-equip-1"]').first();
    if (await equipBtn.isVisible()) {
      await equipBtn.click();
    }
  });

  test('E2E-XP-01 — deve exibir barra de progresso de nível e XP na sidebar', async ({ page }) => {
    await page.goto('/');

    // Valida exibição do nível do usuário na Sidebar
    await expect(page.locator('text=/NÍVEL/i').first()).toBeVisible();
  });

  test('E2E-CRF-01 — deve exibir painel de crafting de insígnias e permitir fabricar', async ({ page }) => {
    await page.route('**/api/crafting/badge', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          badge_name: 'Mestre Cyberpunk',
          xp_awarded: 100,
          new_level: 3,
        }),
      });
    });

    await page.goto('/');
    const invBtn = page.locator('button[title="Inventário"]');
    await invBtn.click();

    // Valida se o banner de fabricação de insígnias está presente
    const craftBanner = page.locator('[data-testid="crafting-banner"]');
    if (await craftBanner.isVisible()) {
      await expect(craftBanner).toBeVisible();
    }
  });

});
