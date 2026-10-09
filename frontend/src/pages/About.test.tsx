import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { About } from './About';

describe('About Page', () => {
  it('deve renderizar o título do MIST e o subtítulo do projeto', () => {
    render(<About />);

    expect(screen.getByText('MIST')).toBeInTheDocument();
    expect(screen.getByText('Multiplayer Instance for Steam-like Titles')).toBeInTheDocument();
  });

  it('deve exibir o botão direcionando para o repositório público do GitHub', () => {
    render(<About />);

    const githubBtn = screen.getByTestId('about-github-button');
    expect(githubBtn).toBeInTheDocument();
    expect(githubBtn).toHaveAttribute('href', 'https://github.com/GMoncks/topicosIV');
    expect(githubBtn).toHaveAttribute('target', '_blank');
  });

  it('deve conter as seções principais do README do MIST', () => {
    render(<About />);

    expect(screen.getByText(/1\. Comparação Funcional: MIST vs Steam/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Stack Tecnológica & Decisões Arquiteturais/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Microsserviços e Domínios/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Execução Local & Deploy em VPS \/ Home-Server/i)).toBeInTheDocument();
  });
});
