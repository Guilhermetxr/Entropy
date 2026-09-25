# ENTROPY design tokens

## Direcao
Estudio digital independente ENTROPY. A logo e uma estrela de estilhacos laranja (`assets/entropy-logo.png`), simbolo do caos que vira forma. A identidade combina uma base editorial escura, laranja de alta energia e tipografia tecnica para comunicar clareza, movimento e proximidade.

## Fundacao
- Cores: preto quente `#11110F`, papel `#F2EFE9`, laranja `#FF5A1F`.
- Tipografia display e interface: Space Grotesk.
- Tipografia tecnica e labels: DM Mono.
- Espacamento base: 8px, com blocos de 16, 24, 40, 64 e 96px.
- Easing principal: `cubic-bezier(.22, .8, .26, 1)`.
- Bordas: retas na maior parte da UI; circulos ficam reservados para a composicao visual do hero.

## Movimento
Entradas suaves por scroll com `IntersectionObserver`. O site abre com a marca (logo + ENTROPY) grande e fixa na tela; ao rolar, ela se desfaz da esquerda para a direita em particulas (mascara CSS sincronizada com o canvas), que viram uma nuvem solta, sem moldura, e pousam no hero. Ali o ciclo roda em 3D (perspectiva, camera orbitando): caos (campo de fluxo), ordem local formando um vortice espiral de estilhacos dourados e azul-marinho sobre um disco escuro, caos, colapso e big bang. Rolar de volta remonta a marca. O canvas e fixo na tela inteira, some quando o hero sai de vista e pausa fora da tela ou com a aba oculta. O cursor gira a camera e empurra as particulas. Com `prefers-reduced-motion` a marca fica parada e o vortice aparece estatico no hero.

## Componentes
CSS puro, sem biblioteca de componentes. A pagina usa um sistema pequeno de botoes, labels, itens de servico, cards de processo e CTA final.
