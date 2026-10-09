import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

test.describe('Sobre o MIST e Reviews da Plataforma (E2E-ABT-01 & E2E-SYSREV-01 / 02)', () => {

  test.beforeEach(async ({ page }) => {
    // Intercepta rotas base da loja para evitar requisições 401 no boot
    await page.route('**/api/games*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/store/recommendations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/store/wishlist/alerts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/library/achievements/recent*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/me/level-progress*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ current_xp: 0, next_level_xp: 100, level: 1 }),
      });
    });
  });

  test('E2E-ABT-01 — deve navegar para a página Sobre pelo rodapé e validar informações do README e link do GitHub', async ({ page }) => {
    await page.goto('/');

    // 1. Clica no link "Sobre o MIST" no rodapé
    const footerAboutLink = page.locator('[data-testid="footer-link-about"]');
    await expect(footerAboutLink).toBeVisible();
    await footerAboutLink.click();

    // 2. Valida o título principal e subtítulo da página Sobre
    await expect(page.locator('h1').filter({ hasText: 'MIST' })).toBeVisible();
    await expect(page.locator('h1 span').filter({ hasText: 'Multiplayer Instance for Steam-like Titles' })).toBeVisible();

    // 3. Valida seções estruturais do README
    await expect(page.locator('text=1. Comparação Funcional: MIST vs Steam')).toBeVisible();
    await expect(page.locator('text=2. Stack Tecnológica & Decisões Arquiteturais')).toBeVisible();
    await expect(page.locator('text=3. Microsserviços e Domínios')).toBeVisible();
    await expect(page.locator('text=4. Execução Local & Deploy em VPS / Home-Server')).toBeVisible();

    // 4. Valida botão de redirecionamento para o repositório público do GitHub
    const githubBtn = page.locator('[data-testid="about-github-button"]');
    await expect(githubBtn).toBeVisible();
    await expect(githubBtn).toHaveAttribute('href', 'https://github.com/GMoncks/topicosIV');
    await expect(githubBtn).toHaveAttribute('target', '_blank');
  });

  test('E2E-SYSREV-01 — deve navegar para Reviews do MIST como visitante e exibir aviso com atalho para login', async ({ page }) => {
    await page.route('**/api/system-reviews*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            user_id: 1,
            username: 'mkritli',
            content: 'Sistema rodando muito fluido no meu setup.',
            is_recommended: true,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');

    // 1. Clica no link "Reviews do MIST" no rodapé
    const footerReviewsLink = page.locator('[data-testid="footer-link-reviews"]');
    await expect(footerReviewsLink).toBeVisible();
    await footerReviewsLink.click();

    // 2. Valida cabeçalho da página de Reviews
    await expect(page.locator('h1', { hasText: 'Reviews e Feedbacks da Plataforma' })).toBeVisible();

    // 3. Valida aviso para visitante não autenticado
    const guestNotice = page.locator('[data-testid="guest-review-notice"]');
    await expect(guestNotice).toBeVisible();
    await expect(guestNotice.locator('text=Gostaria de avaliar o MIST?')).toBeVisible();

    // 4. Clica no botão "Iniciar Sessão" do aviso e verifica abertura da modal de login
    const loginBtn = page.locator('[data-testid="login-to-review-btn"]');
    await expect(loginBtn).toBeVisible();
    await loginBtn.click();

    const authModal = page.locator('[role="dialog"]');
    await expect(authModal).toBeVisible();
    await expect(authModal.locator('button', { hasText: 'Entrar' }).first()).toBeVisible();
  });

  test('E2E-SYSREV-02 — deve autenticar com usuário de teste mkritli, preencher e enviar review do sistema com sucesso', async ({ page }) => {
    // Utiliza o usuário de teste mkritli (Usuário #1 de usuarios.txt)
    const testUser = {
      id: 1,
      username: 'mkritli',
      email: 'mauricio@live.com',
      wallet_balance: 450.0,
      points_balance: 3500,
      level: 12,
    };

    let reviewCreated = false;
    const initialReviews = [
      {
        id: 101,
        user_id: 2,
        username: 'ggtorres2001',
        content: 'Excelente arquitetura de microsserviços!',
        is_recommended: true,
        created_at: '2026-10-08T20:00:00Z',
      },
    ];

    await setupAuthenticatedSession(page, testUser);

    await page.route('**/api/system-reviews*', async (route) => {
      if (route.request().method() === 'GET') {
        const list = reviewCreated
          ? [
              {
                id: 102,
                user_id: testUser.id,
                username: testUser.username,
                content: 'MIST é fantástico! O suporte a jogos locais via daemon e o deploy em home-server ficaram impecáveis.',
                is_recommended: true,
                created_at: new Date().toISOString(),
              },
              ...initialReviews,
            ]
          : initialReviews;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(list),
        });
      } else if (route.request().method() === 'POST') {
        reviewCreated = true;
        const postData = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 102,
            user_id: testUser.id,
            username: testUser.username,
            content: postData.content,
            is_recommended: postData.is_recommended ?? true,
            created_at: new Date().toISOString(),
          }),
        });
      }
    });

    await page.goto('/');

    // 1. Navega até Reviews do MIST através do rodapé
    const footerReviewsLink = page.locator('[data-testid="footer-link-reviews"]');
    await expect(footerReviewsLink).toBeVisible();
    await footerReviewsLink.click();

    // 2. Confirma formulário com usuário autenticado 'mkritli'
    const reviewForm = page.locator('[data-testid="review-form"]');
    await expect(reviewForm).toBeVisible();
    await expect(reviewForm.locator('text=mkritli')).toBeVisible();

    // 3. Digita a avaliação respeitando o limite de até 500 caracteres
    const textarea = page.locator('[data-testid="review-textarea"]');
    await expect(textarea).toBeVisible();
    const reviewText = 'MIST é fantástico! O suporte a jogos locais via daemon e o deploy em home-server ficaram impecáveis.';
    await textarea.fill(reviewText);

    // Valida atualização do contador de caracteres
    await expect(page.locator(`text=${reviewText.length}/500 caracteres`)).toBeVisible();

    // 4. Submete o formulário
    const submitBtn = page.locator('[data-testid="submit-review-btn"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 5. Valida feedback de sucesso e inserção do review no feed
    await expect(page.locator('text=Sua avaliação foi publicada com sucesso!')).toBeVisible();
    await expect(page.locator('text=Recomenda o MIST').first()).toBeVisible();
    await expect(page.locator(`text=${reviewText}`)).toBeVisible();
  });
});
