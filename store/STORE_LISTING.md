# Chrome Web Store Publishing Kit — SiteNotes

Este guia contém tudo pronto para copiar e colar no **Chrome Web Store Developer Dashboard** (`https://chrome.google.com/webstore/devconsole`).

---

## 1. Pacote e Imagens Prontas

- **Pacote `.zip` para upload:** `dist/sitenotes-v1.0.0.zip` (gere novamente com `npm run build`)
- **Ícone da loja (128x128):** `extension/icons/icon128.png`
- **Screenshots (1280x800):**
  - `store/screenshot-1-1280x800.png`
  - `store/screenshot-2-1280x800.png`
- **Small Promo Tile (440x280):** `store/promo-small-440x280.png`
- **Marquee Promo Tile (1400x560):** `store/marquee-1400x560.png`

---

## 2. Store Listing (Português - Brasil)

- **Título:** `SiteNotes — Notas e Checklists por Site`
- **Resumo (até 132 caracteres):**
  `Salve notas e checklists por site ou página no Painel Lateral do Chrome, com busca rápida e exportação em Markdown.`
- **Categoria:** `Productivity` (Produtividade)
- **Idiomas:** `English`, `Português (Brasil)`
- **Descrição detalhada:**

```text
SiteNotes transforma o Painel Lateral do Chrome em um bloco de notas e checklists contextual para cada página ou site que você visita.

🚀 Principais recursos:
• 3 níveis de contexto: alterne facilmente entre "Esta Página" (URL limpa sem parâmetros UTM), "Este Site" (domínio inteiro) e "Rascunho Geral".
• Checklists com barra de progresso: acompanhe tarefas pendentes por página ou projeto com indicador visual direto no ícone da extensão.
• Captura rápida com botão direito: selecione qualquer texto em um site, clique com o botão direito e salve como citação Markdown direto na nota da página ou do domínio.
• Busca instantânea: pesquise entre todas as suas notas, domínios e tarefas salvas, fixe notas importantes e abra o link original com um clique.
• Exportação limpa: copie qualquer nota em Markdown formatado, baixe arquivos .md ou exporte/importe backups completos em JSON.
• Tema Claro, Escuro ou Automático e interface bilíngue (Português e Inglês).
• Atalho de teclado: Alt+Shift+N para abrir o painel instantaneamente.

🔒 Privacidade em primeiro lugar:
O SiteNotes funciona 100% offline usando apenas armazenamento local do navegador (chrome.storage.local). Sem contas obrigatórias, sem rastreadores e sem envio de dados para servidores externos.
```

---

## 3. Store Listing (English)

- **Title:** `SiteNotes — Notes & Checklists per Website`
- **Summary (<= 132 chars):**
  `Keep contextual notes and checklists for every website or page in Chrome's Side Panel, with instant search and Markdown export.`
- **Detailed Description:**

```text
SiteNotes turns Chrome's Side Panel into a smart, contextual workspace for notes and checklists tied to the exact page or website you are viewing.

🚀 Key Features:
• 3 Context Scopes: Switch effortlessly between "This Page" (normalized URL without tracking UTM parameters), "This Site" (entire domain), and a "Global Scratchpad".
• Interactive Checklists: Track tasks with a live progress bar and a subtle toolbar badge showing pending tasks on websites you revisit.
• Right-Click Quote Capture: Highlight text on any webpage and save it directly as a Markdown blockquote to your page or domain note.
• Global Search & Pinning: Search across all saved sites, notes, and checklist items, pin important notes, and jump back to any URL in one click.
• Markdown & JSON Export: Copy any note as clean Markdown, download .md files, or export/import full JSON backups.
• Light, Dark, or System Theme + Automatic bilingual UI (English & Portuguese).
• Keyboard Shortcut: Press Alt+Shift+N anytime to open SiteNotes.

🔒 Privacy First:
100% local storage via chrome.storage.local. Zero analytics, zero ads, and zero external servers.
```

---

## 4. Aba "Privacy practices" (Justificativas de Permissões)

- **Single purpose description:**
  > SiteNotes provides a Chrome Side Panel workspace for saving contextual notes and checklists per webpage, website domain, or global scratchpad locally on the user's device.

- **Permission justifications:**
  - **`sidePanel`**: Required to display the SiteNotes note and checklist editor inside Chrome's native Side Panel alongside active tabs.
  - **`storage`**: Required to persist the user's notes, checklists, and appearance/language settings locally via `chrome.storage.local`.
  - **`tabs`**: Required to read the active tab's URL and title so SiteNotes can automatically display and save notes associated with the current webpage or domain.
  - **`contextMenus`**: Required to provide the right-click menu option allowing users to append highlighted text directly into their page or domain note.

- **Remote code:** `No, I am not using Remote code`
- **Data usage certification:** Marcar que a extensão **não coleta nem transmite dados do usuário** (`Does not collect user data`).
- **Privacy Policy URL:**
  Após ativar o **GitHub Pages** no repositório (Settings → Pages → Branch `main` / `/docs`), use:
  `https://kyouz2148.github.io/sitenotes-extension/privacy.html`
- **Homepage / Support URL:**
  `https://kyouz2148.github.io/sitenotes-extension/`

---

## 5. Passo a passo para publicar na Chrome Web Store

1. **Testar localmente no Chrome antes de enviar:**
   - Abra `chrome://extensions`
   - Ative o **Modo do desenvolvedor** (Developer mode) no canto superior direito
   - Clique em **Carregar sem compactação** (Load unpacked) e selecione a pasta `extension/`
   - Teste o painel lateral, atalho `Alt+Shift+N`, menu de contexto com botão direito e exportação Markdown.
2. **Ativar GitHub Pages para a Política de Privacidade:**
   - No GitHub (`Kyouz2148/sitenotes-extension`), vá em **Settings → Pages**
   - Em *Build and deployment*, selecione **Deploy from a branch**, branch `main` e pasta `/docs`, e salve.
3. **Registrar conta de desenvolvedor na Chrome Web Store (se ainda não tiver):**
   - Acesse `https://chrome.google.com/webstore/devconsole` (taxa única de US$ 5 cobrada pelo Google).
4. **Enviar o pacote:**
   - Clique em **+ New Item** → faça upload de `dist/sitenotes-v1.0.0.zip`.
   - Preencha os campos de **Store listing** e **Privacy practices** usando os textos acima e envie as imagens de `store/`.
   - Clique em **Submit for review**. Como não há host permissions amplas (`<all_urls>`), a revisão costuma ser rápida (geralmente 1 a 3 dias úteis).
