import { Page } from '@playwright/test';

export interface MockUserOptions {
  id?: number;
  username?: string;
  wallet_balance?: number;
  points_balance?: number;
  level?: number;
  avatar_url?: string;
  avatar_frame_url?: string | null;
}

export async function setupAuthenticatedSession(page: Page, options: MockUserOptions = {}) {
  const user = {
    id: options.id ?? 1,
    username: options.username ?? 'player_one',
    email: `${options.username ?? 'player_one'}@mist.com`,
    wallet_balance: options.wallet_balance ?? 200.0,
    points_balance: options.points_balance ?? 500,
    level: options.level ?? 2,
    avatar_url: options.avatar_url ?? 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&q=80',
    avatar_frame_url: options.avatar_frame_url ?? null,
    created_at: new Date().toISOString(),
  };

  // Injeta token no localStorage antes de carregar a página
  await page.addInitScript(() => {
    localStorage.setItem('mist_token', 'fake_test_jwt_token_123');
  });

  // Intercepta rotas base autenticadas
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });

  await page.route('**/api/store/wishlist', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/library/my-games', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/social/notifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, unread_count: 0 }),
    });
  });

  await page.route('**/api/social/friends', async (route) => {
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

  await page.route('**/api/cards/level-progress*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        level: options.level ?? 2,
        current_level: options.level ?? 2,
        current_xp: 100,
        next_level_xp: 200,
        progress_percent: 50,
      }),
    });
  });

  return user;
}
