import { test, expect } from '@playwright/test';

test.describe('Disclaimer Acadêmico (E2E-DISCLAIMER-01)', () => {
  test('deve exibir o disclaimer acadêmico no topo da home-page, aguardar 5 segundos para liberar o botão fechar e permitir remoção', async ({ page }) => {
    // 1. Acessa a página inicial (Home-page / Loja)
    await page.goto('/');

    // 2. Confirma a exibição imediata do banner de disclaimer acadêmico no topo
    const disclaimer = page.getByTestId('academic-disclaimer');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText('Esse ecossistema é um trabalho acadêmico, sem jogos reais além dos categorizados como "MIST Studios!"');

    // 3. Garante que nos primeiros segundos o botão de fechar NÃO está visível
    const closeButton = page.getByTestId('academic-disclaimer-close');
    await expect(closeButton).not.toBeVisible();

    // 4. Aguarda os 5 segundos necessários para o temporizador liberar o fechamento
    await expect(closeButton).toBeVisible({ timeout: 7000 });

    // 5. Clica no botão de fechar ('x')
    await closeButton.click();

    // 6. Confirma que o disclaimer foi removido do DOM e a tela volta à visualização normal
    await expect(disclaimer).not.toBeVisible();

    // 7. Confirma que os elementos da Home-page e cabeçalho continuam operacionais
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1, h2, span').filter({ hasText: /MIST|Destaques|Loja/i }).first()).toBeVisible();
  });
});
