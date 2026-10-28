# Atualização de exploração e preparação da hospedagem

## Funcionalidades locais

- A câmera em terceira pessoa consulta somente obstáculos estáticos visíveis. Personagens ocultos de partidas e suas malhas não entram no raycast. O avatar não é mais ocultado por uma regra de proximidade da câmera.
- **Configurações** permite remapear as teclas da cidade, ajustar sensibilidade, inverter o eixo vertical e escolher entre arrastar o mouse ou capturar o mouse ao clicar. Esc libera a captura. As preferências são salvas no navegador. Os controles próprios das partidas continuam nos painéis de cada modalidade.
- 25 itens/obstáculos encontrados na faixa de circulação deixam de ser gerados. Faixas, calçadas e os equipamentos fora da pista permanecem.
- O trânsito tem oito carros e dois ônibus em rotas fechadas, com espaçamento entre veículos, parada do ônibus e prioridade ao pedestre que está à frente.
- **A pé / Skate / Bicicleta**, ou a tecla **V** no padrão, troca o transporte para explorar os bairros. Velocidades básicas: 6, 13 e 18 unidades/s, respectivamente. A pista de skate mantém sua própria atividade.
- O novo destino **Parque de Aventura** fica a leste da cidade, com acesso por (185, -30), trilha sinalizada, relevo percorrível, mirante e circuito de mountain bike. O minimapa inclui essa expansão.

## Validação

`node tools/verify-city-upgrade.mjs` percorre controles, troca de teclas e persistência, movimento com mouse, velocidades, trânsito, visibilidade do avatar, relevo, diálogo de conta e controles no celular. As capturas e o relatório ficam em `art-source/city-upgrade-review/`.

O teste encontrou e confirmou a correção de uma exceção de raycast em malhas ocultas. Isso cobre uma causa de desaparecimento do avatar; outros casos de cabeça ausente exigem uma reprodução específica se voltarem a ocorrer.

## Hospedagem

Código da API: `public/api/`. Banco: `deployment/schema.sql`. Preparação: `node tools/prepare-hostinger.mjs`. Instruções: `deployment/HOSTINGER.md`.

O PHP foi validado com a CLI oficial 8.3 e com requisições HTTP locais para sessão, CSRF, origem, exigência de login e limite de tamanho. A conexão e as operações no MySQL da Hostinger ainda precisam de validação no ambiente contratado. Não houve publicação ou alteração da conta da Hostinger.

## Auditoria dos cadernos

`art-source/theory-image-audit/AUDITORIA.md` registra o inventário de 112 páginas e 60 aulas. O resultado é que as aulas atuais não possuem referências às imagens dos PDFs. O inventário, a correspondência semana/página e os quatro contatos visuais foram gerados por `tools/audit_theory_images.py`. A integração das imagens e sua revisão pedagógica por aula são uma etapa posterior ao diagnóstico.
