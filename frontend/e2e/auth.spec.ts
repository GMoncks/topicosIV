import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

test.describe('Autenticação e Gestão de Sessão (Bloco B)', () => {

  test('E2E-AUTH-01 — deve abrir modal, cadastrar novo usuário, exibir saldo de R$ 200,00 na UI e permitir logout', async ({ page }) => {
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

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 99,
          username: 'gamer_e2e',
          email: 'gamer@mist.com',
          wallet_balance: 200.0,
          points_balance: 500,
          level: 1,
          avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&q=80',
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/api/store/wishlist', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/api/library/my-games', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/');

    const openAuthButton = page.locator('button', { hasText: /Entrar na Conta|Iniciar Sessão/i }).first();
    await openAuthButton.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const registerTab = modal.locator('button', { hasText: 'Criar Conta' });
    await registerTab.click();

    await modal.locator('input[placeholder="Ex: player_one"]').fill('gamer_e2e');
    await modal.locator('input[placeholder="seuemail@exemplo.com"]').fill('gamer@mist.com');
    await modal.locator('input[placeholder="••••••••"]').first().fill('Senha@Segura123!');
    await modal.locator('input[placeholder="••••••••"]').nth(1).fill('Senha@Segura123!');

    const submitBtn = modal.locator('button[type="submit"]');
    await submitBtn.click();

    await expect(modal).not.toBeVisible();
    await expect(page.locator('text=gamer_e2e').first()).toBeVisible();
    await expect(page.locator('text=R$ 200,00').first()).toBeVisible();

    const logoutBtn = page.locator('button[title="Encerrar Sessão"]');
    await logoutBtn.click();
    await expect(page.locator('button', { hasText: /Entrar na Conta/i })).toBeVisible();
  });

  test('E2E-AUTH-02 — deve validar erro ao tentar login com credenciais inválidas', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Credenciais inválidas' }),
      });
    });

    await page.goto('/');

    const openAuthButton = page.locator('button', { hasText: /Entrar na Conta|Iniciar Sessão/i }).first();
    await openAuthButton.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.locator('input[placeholder="Seu usuário ou email"]').fill('usuario_invalido');
    await modal.locator('input[placeholder="••••••••"]').fill('senha_errada');

    const submitBtn = modal.locator('button[type="submit"]');
    await submitBtn.click();

    // Valida feedback de erro exibido na modal
    await expect(modal.locator('text=Credenciais inválidas')).toBeVisible();
  });

  test('E2E-PROF-01 — deve abrir modal de edição de perfil e permitir alterar dados cadastrais', async ({ page }) => {
    await setupAuthenticatedSession(page, { username: 'gamer_pro', wallet_balance: 200 });

    await page.route('**/api/me/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'gamer_pro_edited',
          real_name: 'Gamer Professional',
          location: 'São Paulo, Brasil',
          bio: 'Nova bio atualizada com sucesso!',
        }),
      });
    });

    await page.goto('/');

    // Navega para o Perfil
    const profileBtn = page.locator('[title="Ver Perfil"]').first();
    await profileBtn.click();

    // Aciona botão de editar perfil
    const editBtn = page.locator('[data-testid="btn-edit-profile"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Valida que o formulário de edição abriu
    const bioInput = page.locator('textarea').first();
    await bioInput.fill('Nova bio atualizada com sucesso!');

    // Salva perfil
    const saveBtn = page.locator('button', { hasText: /Salvar/i }).first();
    await saveBtn.click();

    await expect(page.locator('text=Perfil atualizado com sucesso!')).toBeVisible();
  });

  test('E2E-WALLET-01 — deve abrir AddFundsModal, selecionar recarga e creditar saldo instantaneamente', async ({ page }) => {
    await setupAuthenticatedSession(page, { wallet_balance: 200.0 });

    await page.route('**/api/me/wallet/recharge', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          amount: 50.0,
          new_balance: 250.0,
          message: 'Recarga efetuada com sucesso',
        }),
      });
    });

    await page.goto('/');

    // Clica no botão de adicionar fundos no Header
    const addFundsBtn = page.locator('[data-testid="btn-header-add-funds"]');
    await expect(addFundsBtn).toBeVisible();
    await addFundsBtn.click();

    // Valida abertura da modal
    const fundsModal = page.locator('[data-testid="add-funds-modal"]');
    await expect(fundsModal).toBeVisible();

    // Confirma recarga de R$ 50,00
    const confirmBtn = page.locator('[data-testid="btn-confirm-recharge"]');
    await confirmBtn.click();

    // Modal fecha e saldo atualiza no header para R$ 250,00
    await expect(fundsModal).not.toBeVisible();
    await expect(page.locator('text=R$ 250,00').first()).toBeVisible();
  });

});
