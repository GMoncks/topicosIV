import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

test.describe('Histórico de Transações da Carteira (Bloco T)', () => {
  test('E2E-WAL-02 — deve abrir extrato detalhado da carteira e listar lançamentos contábeis', async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.route('**/wallet/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 2,
          skip: 0,
          limit: 10,
          items: [
            {
              id: 1,
              user_id: 1,
              type: 'recarga',
              amount: 50.00,
              direction: 'credit',
              description: 'Recarga instantânea simulada',
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              user_id: 1,
              type: 'compra',
              amount: 149.90,
              direction: 'debit',
              description: 'Compra: Cyberpunk Odyssey 2088',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('/');

    // Clica no botão de extrato de saldo no Header
    const walletBalanceBtn = page.locator('button[title="Ver extrato da carteira"]');
    await walletBalanceBtn.click();

    // Valida abertura da modal de extrato financeiro
    await expect(page.locator('[data-testid="wallet-history-modal"]')).toBeVisible();
    await expect(page.locator('text=Recarga instantânea simulada').first()).toBeVisible();
    await expect(page.locator('text=Cyberpunk Odyssey 2088').first()).toBeVisible();
  });
});
