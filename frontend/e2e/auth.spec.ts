import { test, expect } from '@playwright/test';

test.describe('Autenticação e Gestão de Sessão (E2E-AUTH-01)', () => {
  test('deve abrir modal, cadastrar novo usuário, exibir saldo de R$ 200,00 na UI e permitir logout', async ({ page }) => {
    // Mock dos endpoints de autenticação no Gateway
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake_jwt_token_e2e_123',
          token_type: 'bearer',
          user: {
            id: 99,
            username: 'gamer_e2e',
            email: 'gamer@mist.com',
            wallet_balance: 200.0,
            points_balance: 500,
            level: 1,
            avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&q=80',
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    // 1. Acessa a aplicação
    await page.goto('/');

    // 2. Abre o modal de autenticação clicando em "Entrar na Conta" na barra lateral
    const openAuthButton = page.locator('button', { hasText: /Entrar na Conta|Iniciar Sessão/i }).first();
    await openAuthButton.click();

    // Valida que o modal de autenticação foi renderizado
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('MIST');

    // 3. Alterna para a aba "Criar Conta"
    const registerTab = modal.locator('button', { hasText: 'Criar Conta' });
    await registerTab.click();

    // Valida a presença da mensagem promocional de R$ 200,00
    await expect(modal.locator('text=200,00').first()).toBeVisible();


    // 4. Preenche o formulário de cadastro
    await modal.locator('input[placeholder="Ex: player_one"]').fill('gamer_e2e');
    await modal.locator('input[placeholder="seuemail@exemplo.com"]').fill('gamer@mist.com');
    await modal.locator('input[placeholder="••••••••"]').first().fill('Senha@Segura123!');
    await modal.locator('input[placeholder="••••••••"]').nth(1).fill('Senha@Segura123!');

    // 5. Submete o cadastro
    const submitBtn = modal.locator('button[type="submit"]');
    await submitBtn.click();

    // 6. Valida que o modal fechou e a UI refletiu os novos dados do usuário
    await expect(modal).not.toBeVisible();
    await expect(page.locator('text=gamer_e2e').first()).toBeVisible();

    // Valida que o saldo da carteira de R$ 200,00 está visível no Header
    await expect(page.locator('text=R$ 200,00').first()).toBeVisible();

    // 7. Realiza logout
    const logoutBtn = page.locator('button[title="Encerrar Sessão"]');
    await logoutBtn.click();

    // Valida que o botão de "Entrar na Conta" voltou a aparecer
    await expect(page.locator('button', { hasText: /Entrar na Conta/i })).toBeVisible();
  });
});
