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
├── index.html
├── package.json
├── tsconfig.json
├── src
│   ├── main.ts
│   ├── scenes
│   │   └── MainScene.ts
│   └── styles
│       └── main.css
└── README.md
```

## Como correr

```bash
npm install
npm run dev
```

Depois abrir o URL indicado pelo Vite (normalmente `http://localhost:5173`).

## Comandos úteis

```bash
npm run build
npm run preview
```

## Controlo

- **Clique / toque** ou **Space** para saltar.

## Notas de implementação

- Todos os assets atuais são **temporários** e gerados por **SVG em código** (Base64), sem depender de ficheiros externos.
- O código está organizado por responsabilidades (bootstrap em `main.ts`, lógica de gameplay em `MainScene.ts`, estilos em `main.css`).
- A dificuldade escala com pontos/ondas, aumentando rotação da wheel e frequência de spawns.
