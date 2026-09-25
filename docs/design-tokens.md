# NEXO design tokens

## Direcao
Marca provisoria para um estudio digital independente. A identidade combina uma base editorial escura, laranja de alta energia e tipografia tecnica para comunicar clareza, movimento e proximidade.

## Fundacao
- Cores: preto quente `#11110F`, papel `#F2EFE9`, laranja `#FF5A1F`.
- Tipografia display e interface: Space Grotesk.
- Tipografia tecnica e labels: DM Mono.
- Espacamento base: 8px, com blocos de 16, 24, 40, 64 e 96px.
- Easing principal: `cubic-bezier(.22, .8, .26, 1)`.
- Bordas: retas na maior parte da UI; circulos ficam reservados para a composicao visual do hero.

## Movimento
Entradas suaves por scroll com `IntersectionObserver`. O hero tem um canvas de particulas em 3D (projecao em perspectiva, camera orbitando e cubo wireframe de referencia) que conta o conceito da marca ENTROPY em loop: singularidade, big bang, caos (campo de fluxo), ordem local formando um vortice espiral de estilhacos dourados e azul-marinho sobre fundo escuro, caos de novo e colapso. O cursor gira a camera e empurra as particulas. A animacao pausa fora da tela ou com a aba oculta, e com `prefers-reduced-motion` vira um quadro estatico com o vortice ja formado.

## Componentes
CSS puro, sem biblioteca de componentes. A pagina usa um sistema pequeno de botoes, labels, itens de servico, cards de processo e CTA final.
