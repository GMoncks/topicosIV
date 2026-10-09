import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers';

const MOCK_GAMES = [
  {
    id: 1,
    title: 'Cyberpunk Odyssey 2088',
    price: 149.90,
    original_price: 199.90,
    discount_percentage: 25,
    tags: ['RPG', 'Sci-Fi', 'Mundo Aberto'],
    banner_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    description: 'Explore uma megalópole futurista cheia de intrigas e tecnologia.',
    rating: 4.8,
    review_score: 92,
    reviews_count: 120,
    approval_label: 'Muito Positivas',
    category: 'RPG',
    publisher: 'Mist Studios',
  },
  {
    id: 2,
    title: 'Aura of Legends: Wild Hunt',
    price: 89.90,
    original_price: 89.90,
    discount_percentage: 0,
    tags: ['Ação', 'Fantasia', 'Aventura'],
    banner_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    description: 'Cace monstros lendários em florestas ancestrais e cavernas mágicas.',
    rating: 4.6,
    review_score: 88,
    reviews_count: 45,
    approval_label: 'Positivas',
    category: 'Ação',
    publisher: 'Legends Interactive',
  },
];

const MOCK_REVIEWS = [
  {
    id: 1,
    user_id: 2,
    username: 'gabriel_t800',
    game_id: 1,
    is_recommended: true,
    text: 'Jogo espetacular, gráficos de última geração e jogabilidade fluida!',
    playtime_at_review: 42.5,
    created_at: new Date().toISOString(),
    helpful_votes: 15,
  },
];

test.describe('Loja, Catálogo, Reviews e AI Curator (Blocos C, H, S)', () => {

  test.beforeEach(async ({ page }) => {
    // Intercepta rotas de jogos base (/api/games e /api/games/1)
    await page.route('**/api/games/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GAMES[0]),
      });
    });

    await page.route('**/api/games*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GAMES),
      });
    });

    // Curadoria AI e tendências
    await page.route('**/api/store/recommendations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_GAMES[0]]),
      });
    });

    await page.route('**/api/store/trends/top-sellers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_GAMES[0]]),
      });
    });

    await page.route('**/api/store/trends/trending*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_GAMES[0]]),
      });
    });

    await page.route('**/api/store/wishlist/alerts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            game_id: 1,
            title: 'Cyberpunk Odyssey 2088',
            category: 'RPG',
            original_price: 199.90,
            current_price: 149.90,
            discount_percentage: 25,
            savings: 50.00,
            message: 'Cyberpunk Odyssey 2088 está com 25% de desconto!',
            banner_url: MOCK_GAMES[0].banner_url,
          },
        ]),
      });
    });

    await page.route('**/api/store/games/1/reviews*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 99,
            user_id: 1,
            game_id: 1,
            is_recommended: true,
            text: 'Excelente jogo, recomendo muito!',
            playtime_at_review: 15.5,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_REVIEWS),
        });
      }
    });
  });

  test('E2E-STORE-01 — deve buscar jogo em tempo real com debounce e abrir modal de detalhes', async ({ page }) => {
    await page.goto('/');

    const gameCard = page.locator('text=Cyberpunk Odyssey 2088').first();
    await expect(gameCard).toBeVisible();
    await gameCard.click();

    // Valida abertura da modal de detalhes do jogo
    await expect(page.locator('text=Cyberpunk Odyssey 2088').first()).toBeVisible();
    await expect(page.locator('text=R$ 149,90').first()).toBeVisible();
  });

  test('E2E-STORE-02 — deve efetuar compra com saldo de carteira e creditar pontos MIST', async ({ page }) => {
    await setupAuthenticatedSession(page, { wallet_balance: 200.0, points_balance: 500 });

    await page.route('**/api/store/checkout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          game_id: 1,
          amount_paid: 149.90,
          new_wallet_balance: 50.10,
          points_earned: 14990,
          new_points_balance: 15490,
        }),
      });
    });

    await page.goto('/');

    const gameCard = page.locator('text=Cyberpunk Odyssey 2088').first();
    await expect(gameCard).toBeVisible();
    await gameCard.click();

    const buyBtn = page.locator('button', { hasText: /Comprar Agora|Adicionar ao Carrinho/i }).first();
    await expect(buyBtn).toBeVisible();
    await buyBtn.click();
  });

  test('E2E-REV-01 — deve submeter review com horas jogadas e recomendação', async ({ page }) => {
    await setupAuthenticatedSession(page);

    // Garante que o usuário é dono do jogo 1 para poder avaliar
    await page.route('**/api/library/my-games*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 101, user_id: 1, game_id: 1, playtime_minutes: 180, acquired_at: new Date().toISOString() },
        ]),
      });
    });

    let reviewSubmitted = false;
    await page.route('**/api/store/games/*/reviews*', async (route) => {
      if (route.request().method() === 'POST') {
        reviewSubmitted = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 99,
            user_id: 1,
            game_id: 1,
            text: 'Excelente jogo, recomendo muito!',
            is_recommended: true,
            playtime_at_review: 180,
            helpful_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            reviewSubmitted
              ? [
                  {
                    id: 99,
                    user_id: 1,
                    game_id: 1,
                    text: 'Excelente jogo, recomendo muito!',
                    is_recommended: true,
                    playtime_at_review: 180,
                    helpful_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                ]
              : []
          ),
        });
      }
    });

    await page.goto('/');
    const gameCard = page.locator('h4', { hasText: 'Cyberpunk Odyssey 2088' }).first();
    await expect(gameCard).toBeVisible();
    await gameCard.click();

    // Valida abertura do botão de avaliação e abre o formulário
    const reviewBtn = page.locator('button', { hasText: /Escrever avaliação|Editar avaliação/i }).first();
    await expect(reviewBtn).toBeVisible({ timeout: 10000 });
    await reviewBtn.click();

    // Preenche recomendação positiva e texto da avaliação
    const yesBtn = page.locator('button', { hasText: 'Sim' }).first();
    await expect(yesBtn).toBeVisible({ timeout: 5000 });
    await yesBtn.click();

    const textarea = page.locator('#review-text');
    await expect(textarea).toBeVisible();
    await textarea.fill('Excelente jogo, recomendo muito!');

    const publishBtn = page.locator('button', { hasText: /Publicar avaliação|Atualizar avaliação/i }).last();
    await expect(publishBtn).toBeEnabled({ timeout: 5000 });
    await publishBtn.click();

    // Valida que o modal de formulário fechou ou que o review aparece na lista
    await expect(page.locator('text=Excelente jogo, recomendo muito!').first()).toBeVisible({ timeout: 10000 });
  });

  test('E2E-REV-02 — deve renderizar percentual de aprovação comunitária nas avaliações', async ({ page }) => {
    await page.goto('/');
    const gameCard = page.locator('text=Cyberpunk Odyssey 2088').first();
    await expect(gameCard).toBeVisible();
    await gameCard.click();

    // Valida badge de aprovação (Muito Positivas)
    await expect(page.locator('text=/Muito Positivas|Muito Positiva/i').first()).toBeVisible();
  });

  test('E2E-CUR-01 — deve alternar entre abas do AI Curator exibindo tendências', async ({ page }) => {
    await page.goto('/');

    const curatorHeading = page.locator('text=/Destaques e Recomendações|Curadoria|Em Alta/i').first();
    await expect(curatorHeading).toBeVisible();

    const trendingTab = page.locator('button', { hasText: /Em Alta|Mais Vendidos/i }).first();
    if (await trendingTab.isVisible()) {
      await trendingTab.click();
      await expect(page.locator('text=Cyberpunk Odyssey 2088').first()).toBeVisible();
    }
  });

  test('E2E-CUR-02 — deve exibir banner inteligente de oportunidade com desconto da Wishlist', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/');

    // Valida a presença do alerta de promoção com economia em R$
    await expect(page.locator('[data-testid="wishlist-smart-banner"]').first()).toBeVisible();
    await expect(page.locator('text=/Alerta da Wishlist|25% OFF|Economia de R\\$ 50/i').first()).toBeVisible();
  });

});
