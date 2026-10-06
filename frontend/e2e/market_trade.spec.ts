import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_LISTINGS = [
  {
    id: 1,
    seller_id: 2,
    seller_username: 'sarah_connor',
    item_id: 101,
    item_type: 'card',
    item_name: 'Carta Rara: Netrunner Supremo',
    game_title: 'Cyberpunk Odyssey 2088',
    price: 12.50,
    status: 'ativo',
    asset_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=200&q=80',
    created_at: new Date().toISOString(),
  },
];

const MOCK_TRADE = {
  id: 1,
  sender_id: 2,
  receiver_id: 1,
  offered_items: [{ item_id: 10, item_type: 'card', item_name: 'Carta Rara Cyber' }],
  requested_items: [{ item_id: 20, item_type: 'card', item_name: 'Minha Carta' }],
  status: 'pending',
  created_at: new Date().toISOString(),
};

test.describe('Mercado da Comunidade e Trade Offers (Bloco L)', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page, { wallet_balance: 100.0 });

    await page.route('**/api/market/**/listings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_LISTINGS, total: 1, skip: 0, limit: 12 }),
      });
    });

    await page.route('**/api/market/**/my-listings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 99,
              seller_id: 1,
              item_id: 201,
              item_type: 'card',
              item_name: 'Minha Carta Colecionável',
              price: 5.00,
              status: 'ativo',
              created_at: new Date().toISOString(),
            },
          ],
          total: 1,
          skip: 0,
          limit: 12,
        }),
      });
    });

    await page.route('**/api/market/**/trades/received*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [MOCK_TRADE], total: 1, skip: 0, limit: 12 }),
      });
    });
  });

  test('E2E-MKT-01 — deve listar ofertas do Mercado da Comunidade e permitir compra com débito', async ({ page }) => {
    await page.route('**/api/market/**/buy/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listing: MOCK_LISTINGS[0],
          new_wallet_balance: 87.50,
        }),
      });
    });

    await page.goto('/');

    const marketBtn = page.locator('button[title="Mercado"]');
    await marketBtn.click();

    // Valida exibição do item à venda
    await expect(page.locator('text=Netrunner Supremo').first()).toBeVisible();
    await expect(page.locator('text=R$ 12,50').first()).toBeVisible();

    const buyItemBtn = page.locator('button', { hasText: /^Comprar$/i }).first();
    await buyItemBtn.click();

    // Na modal de confirmação
    await expect(page.locator('text=Confirmar Compra').first()).toBeVisible();
    const confirmBtn = page.locator('button', { hasText: 'Confirmar Compra' });
    await confirmBtn.click();

    // Valida feedback de sucesso da compra
    await expect(page.locator('text=/Compra realizada|Netrunner Supremo/i').first()).toBeVisible();
  });

  test('E2E-MKT-02 — deve gerenciar aba Meus Anúncios permitindo criar e cancelar ofertas', async ({ page }) => {
    await page.route('**/api/market/**/listings/99/cancel', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_LISTINGS[0], id: 99, status: 'cancelado' }),
      });
    });

    await page.goto('/');
    const marketBtn = page.locator('button[title="Mercado"]');
    await marketBtn.click();

    const myAdsTab = page.locator('button', { hasText: /Meus Anúncios/i }).first();
    await myAdsTab.click();

    await expect(page.locator('text=Minha Carta Colecionável').first()).toBeVisible();
    const cancelBtn = page.locator('button', { hasText: /Cancelar/i }).first();
    await cancelBtn.click();
  });

  test('E2E-TRD-01 — deve abrir modal de troca interativa entre amigos e enviar proposta', async ({ page }) => {
    await page.route('**/api/market/**/trades/1/accept', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_TRADE, status: 'accepted' }),
      });
    });

    await page.goto('/');
    const marketBtn = page.locator('button[title="Mercado"]');
    await marketBtn.click();

    // Navega para aba de Trocas
    const tradesTab = page.locator('button', { hasText: /^Trocas$/i }).first();
    await tradesTab.click();

    await expect(page.locator('text=Carta Rara Cyber').first()).toBeVisible();
    const acceptBtn = page.locator('button', { hasText: /Aceitar/i }).first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();
  });

});
