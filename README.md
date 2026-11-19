# SiteNotes — Notas e Checklists por Site (Chrome Extension MV3)

Extensão de produtividade para navegadores Chromium (Google Chrome, Microsoft Edge, Brave, Opera) que transforma o **Painel Lateral (Side Panel)** em um caderno de notas e checklists contextual para cada página ou site visitado.

## Recursos

- **3 escopos contextuais:**
  - **Esta Página:** notas vinculadas à URL limpa (remove automaticamente parâmetros `utm_*`, `fbclid`, `gclid` e `#hash`).
  - **Este Site:** notas compartilhadas em todo o domínio (ex.: `github.com`).
  - **Rascunho Geral:** bloco acessível de qualquer aba (inclusive páginas internas `chrome://`).
- **Checklists interativas:** barra de progresso e badge discreto no ícone da extensão mostrando tarefas pendentes do site atual.
- **Captura pelo menu de contexto:** selecione texto em qualquer página, clique com o botão direito e salve como citação Markdown diretamente na nota da página ou do domínio.
- **Busca global & Pin:** pesquise por título, domínio, texto ou tarefas em todas as notas salvas, fixe notas importantes e reabra páginas com um clique.
- **Exportação e Backup:** copie qualquer nota em Markdown, baixe arquivos `.md` e exporte/importe backups completos em `.json`.
- **100% Local & Bilíngue:** funciona offline via `chrome.storage.local` com idioma automático (**Português PT-BR** e **Inglês**) e tema Claro / Escuro / Sistema.
- **Atalho de teclado:** `Alt+Shift+N` abre o painel lateral rapidamente.

## Testar localmente no Chrome

1. Clone ou baixe este repositório.
2. Abra `chrome://extensions` no Chrome (ou `edge://extensions` no Edge).
3. Ative o **Modo do desenvolvedor** (*Developer mode*).
4. Clique em **Carregar sem compactação** (*Load unpacked*) e selecione a pasta `extension/`.

## Desenvolvimento, Testes e Empacotamento

Requer **Node.js 20+** e `zip` (e Python 3 + Pillow caso queira regenerar os ícones/assets):

```bash
# Rodar testes unitários (URLs, Markdown, backup, manifest MV3 e i18n)
npm test

# Gerar pacote .zip pronto para a Chrome Web Store em dist/
npm run build

# (Opcional) Regenerar ícones PNG e imagens promocionais da loja
npm run assets
```

## Publicação na Chrome Web Store

Todo o material pronto para publicação está em [`store/STORE_LISTING.md`](store/STORE_LISTING.md), incluindo:
- Pacote gerado em `dist/sitenotes-v1.0.0.zip`
- Imagens promocionais e screenshots `1280x800` em `store/`
- Textos de descrição (PT-BR e EN), justificativas de permissões e Política de Privacidade pronta em [`docs/privacy.html`](docs/privacy.html).
