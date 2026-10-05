import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

test.describe('Fluxo Mestre Integrado — Fase 5 Dia 13 (E2E-INTEG-01)', () => {

  test('E2E-INTEG-01 — deve percorrer jornada completa do ecossistema MIST', async ({ page }) => {
    await setupAuthenticatedSession(page, { wallet_balance: 500.0, points_balance: 1000 });

    // 1. Mock de jogos e checkout
    await page.route('**/api/games*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: 'Cyberpunk Odyssey 2088',
            price: 100.0,
            original_price: 100.0,
            discount_percentage: 0,
            tags: ['RPG'],
            banner_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
          },
        ]),
      });
    });

    await page.route('**/api/store/checkout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          game_id: 1,
          amount_paid: 100.0,
          new_wallet_balance: 400.0,
          points_earned: 10000,
          new_points_balance: 11000,
        }),
      });
    });

    // 2. Mock de Biblioteca
    await page.route('**/api/library/my-games', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 101,
            game_id: 1,
            playtime_minutes: 60,
            installed: true,
            game: { id: 1, title: 'Cyberpunk Odyssey 2088' },
          },
        ]),
      });
    });

    // 3. Mock de Mercado
    await page.route('**/api/market/**/listings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              seller_username: 'sarah_connor',
              item_name: 'Carta Épica Cyberpunk',
              price: 15.0,
              status: 'ativo',
              item_type: 'card',
            },
          ],
          total: 1,
        }),
      });
    });

    // 4. Mock de Workshop
    await page.route('**/api/ugc/workshop/items*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Mod de Armas Futuristas',
              description: 'Adiciona armamentos de laser avançados.',
              downloads_count: 500,
              subscriptions_count: 320,
              game_title: 'Cyberpunk Odyssey 2088',
              category: 'Mod',
              version: '1.0',
              tags: ['Armas', 'Futurista'],
              is_subscribed: false,
            },
          ],
          total: 1,
          page: 1,
          pages: 1,
        }),
      });
    });

    // Executa a jornada na SPA:
    // Passo 1: Acesso à Loja
    await page.goto('/');
    await expect(page.locator('text=Cyberpunk Odyssey 2088').first()).toBeVisible();

    // Passo 2: Navega para Biblioteca e valida posse
    const libBtn = page.locator('button[title="Biblioteca"]');
    await libBtn.click();
    await expect(page.locator('text=Cyberpunk Odyssey 2088').first()).toBeVisible();

    // Passo 3: Navega para o Mercado da Comunidade
    const marketBtn = page.locator('button[title="Mercado"]');
    await marketBtn.click();
    await expect(page.locator('text=Carta Épica Cyberpunk').first()).toBeVisible();

    // Passo 4: Navega para a Oficina (Workshop)
    const workshopBtn = page.locator('button[title="Oficina"]');
    if (await workshopBtn.isVisible()) {
      await workshopBtn.click();
      await expect(page.locator('text=Mod de Armas Futuristas').first()).toBeVisible();
    }
  });

});
