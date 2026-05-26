# NOS Summer Wheel

Jogo browser casual construído com **Phaser.js + Vite + TypeScript**.

## Conceito

**NOS Summer Wheel** é um runner circular: uma wheel colorida gira continuamente e traz objetos até à zona do player (fixo na parte inferior). O jogador tem apenas uma ação: **saltar**.

- **Collectibles** (bola de praia, gelado, sol, bóia): recolha automática ao chegar ao player.
- **Perigos** (triângulo com `!`, onda/calor): quando entram na zona amarela, o jogador deve saltar.
- **HUD**: Pontos, Onda, Tempo e Combo.
- **Feedback visual**: partículas ao recolher, screen shake quando falha, água animada e fundo tropical.

## Stack

- [Phaser 3](https://phaser.io/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## Estrutura

```text
.
├── .github
│   └── workflows
│       └── deploy.yml
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src
│   ├── main.ts
│   ├── scenes
│   │   └── MainScene.ts
│   └── styles
│       └── main.css
└── README.md
```

## Como correr localmente

```bash
npm install
npm run dev
```

Depois abrir o URL indicado pelo Vite (normalmente `http://localhost:5173`).

## Scripts disponíveis

```bash
npm run dev
npm run build
npm run preview
```

## Deploy no GitHub Pages (sem instalar nada para jogar)

O projeto está preparado para publicar automaticamente no GitHub Pages com GitHub Actions:

- `vite.config.ts` usa `base: "/nos-summer-wheel/"`.
- O workflow em `.github/workflows/deploy.yml` faz `npm install`, `npm run build` e publica `dist`.

### Passo a passo para ativar

1. Faz push para o branch `main` no repositório GitHub.
2. No GitHub, abre **Settings > Pages**.
3. Em **Source**, seleciona **GitHub Actions**.
4. Vai ao separador **Actions** e confirma que o workflow **Deploy to GitHub Pages** correu com sucesso.
5. Após o deploy, abre o URL publicado (normalmente `https://<teu-utilizador>.github.io/nos-summer-wheel/`).

## Controlo

- **Clique / toque** ou **Space** para saltar.

## Notas de implementação

- Todos os assets atuais são **temporários** e gerados por **SVG em código** (Base64), sem depender de ficheiros externos.
- O código está organizado por responsabilidades (bootstrap em `main.ts`, lógica de gameplay em `MainScene.ts`, estilos em `main.css`).
- A dificuldade escala com pontos/ondas, aumentando rotação da wheel e frequência de spawns.
