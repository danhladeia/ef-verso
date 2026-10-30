# EF Verso — Cidade Ativa, personagens masculinos e femininos

Execute `npm install` e `npm run dev` nesta pasta. Abra o endereço mostrado pelo terminal. Para gerar a versão distribuível: `npm run build` (saída em `dist`).

No celular, use o endereço de rede exibido pelo Vite, com computador e celular na mesma rede. O firewall do computador precisa permitir a conexão. Não é necessário instalar aplicativo no celular.

## Futebol com os comandos do basquete, e seta "é você" — 30/10/2026 (tarde)

**Cabeça sumindo/"buraco" nos personagens: investigado, sem vão real na roupa.** Conferido com um script: nenhum vértice das roupas tem peso no osso da cabeça (são objetos separados na pele de esqueleto), então alargar/estreitar o peito e o quadril para o corpo de menino/menina não abre vão nenhum ali — e 200 combinações de aparência sorteadas, mais a prévia de cada roupa nos dois personagens, não mostraram nenhuma cabeça faltando. `tools/build_body_gender_variants.py` ganhou uma proteção (reduzir o ajuste perto de um osso de cabeça, se um dia existir) só por segurança. O que provavelmente aconteceu: no meio da investigação anterior, o modelo 3D ficou brevemente num estado intermediário (igual ao do aviso "futebol não funciona" de antes) enquanto eu reconstruía os arquivos — resolvido ao confirmar que o arquivo publicado é idêntico ao já testado. Se alguma cabeça sumir de novo depois disso, por favor avise em que personagem/roupa e em que tela (treino, partida, guarda-roupa) para eu reproduzir certinho.

**Futebol: câmera e comandos iguais aos do basquete.** O campo de futebol é comprido no eixo gol-a-gol (ao contrário da quadra de basquete), e a câmera antiga grudava do lado da bola sem mostrar o campo — dava a sensação de "comandos ruins" porque D/A e W/S pareciam não corresponder ao que aparecia na tela. A câmera agora fica de lado, fixa um pouco para fora do campo e acompanha a bola ao longo do comprimento — exatamente como no basquete — e D/A giram para fora/dentro da tela do mesmo jeito que no basquete.

**Seta "é você" flutuando sobre o aluno**, no basquete, futebol e vôlei — com os 6 personagens do mesmo tamanho e só a cor do time diferente, não dava para saber qual mover. Fica no ar (não gruda nos pés) para não ficar escondida atrás de outro jogador por perto.

Verificação: `node tools/crowd.test.mjs`/`node tools/verify-avatars.mjs` (corpos e cabeças ok), `node tools/verify-city-upgrade.mjs` (D no futebol move para o mesmo lado que no basquete), `node tools/soccer.test.mjs` continua cobrindo a física do jogo.

## Personagem menino/menina com corpo próprio, e clique "sem resposta" no guarda-roupa corrigido — 30/10/2026

**Menino e menina agora têm corpo de verdade, não só roupa/cabelo diferentes.** `tools/build_body_gender_variants.py` parte do mesmo esqueleto único dos alunos (não esculpe nada do zero) e desloca os vértices de cada roupa por grupo de osso — ombro e braço mais largos e quadril/perna mais estreitos no menino, o inverso, mais discreto, na menina, com uma leve diferença de altura — mantendo os mesmos pesos de esqueleto e materiais (as roupas, cores e animações continuam funcionando normalmente nos dois). No guarda-roupa ("Meu personagem"), um seletor **Personagem** fica separado das abas de roupa/visual, sempre visível no topo, com "Menino"/"Menina" — dá para trocar a qualquer momento, já com prévia 3D. Moradores e os times dos minijogos (basquete, vôlei, futebol) também têm essa variedade agora. A professora Lia usa o corpo feminino.

**Clique em "Abrir guarda-roupa" sem resposta visual, corrigido.** Na primeira vez que a prévia 3D do guarda-roupa é aberta no navegador (ex.: logo na criação do personagem, na abertura do jogo), carregar o modelo demora um instante — sem nenhum aviso, a caixa da prévia ficava vazia nesse meio tempo e parecia que o clique não tinha feito nada. Agora aparece "Carregando prévia…" até o modelo estar pronto.

**Confirmado: os comandos (WASD) respondem normalmente logo após terminar o cadastro**, e alunos de qualquer turma podem fazer as missões — a turma só escolhe o conteúdo de teoria (6º ao 9º ano) mostrado na Escola do Movimento, não trava nenhuma missão ou minijogo.

Verificação: `node tools/verify-avatars.mjs` (personagem menino/menina, inclusive salvando e recarregando), `node tools/verify-onboarding.mjs` (controles respondem logo após o cadastro) e `node tools/crowd.test.mjs`/os demais `verify-*.mjs` continuam cobrindo o resto.

## Cabeça quebrada corrigida, física do basquete, giro suave e estações do ano — 28/10/2026 (madrugada)

**Cabeça "capacete cinza" dos moradores/bots corrigida** (`src/student-character.js`). Com os penteados grandes (crespo/cacheado, que cobrem quase a cabeça toda com cachos sem fio visível), duas das sete cores de cabelo do sorteio automático — cinza e roxo, pensadas para quem escolhe no guarda-roupa — deixavam o personagem parecendo careca com um capacete liso, sem rosto visível. Moradores e os bots das partidas (basquete, vôlei, futebol) agora só sorteiam as 5 cores naturais; cinza e roxo continuam disponíveis para quem quiser em "Meu personagem".

**Física do arremesso de basquete corrigida** (`src/mission.js`). Depois que a bola cruzava o aro (ou errava), ela continuava seguindo a parábola pura com a altura travada no chão — ou seja, "deslizava" flutuando pela quadra feito um disco até o fim da animação, em vez de parar onde caiu. Agora a bola trava no ponto exato em que toca o chão (ou cai pela rede, numa cesta), como um arremesso de verdade.

**Giro da câmera em 3ª pessoa ficou suave.** A/D viravam o personagem "ligando" na velocidade máxima na hora e travando ao soltar. Agora o giro acelera aos poucos ao segurar e desacelera aos poucos ao soltar, como no deslize do skate/bike.

**Sistema de estações do ano**, pelo calendário real de Brasília (`src/sky.js`): verão, outono, inverno e primavera (no hemisfério sul — verão em torno do ano-novo, não de julho) tingem o chão, o céu/neblina e a folhagem da floresta do Parque de Aventura (`src/adventure.js`) de cores próprias — verde forte no verão, laranja no outono, tons pálidos/azulados no inverno, verde viçoso na primavera — por cima do ciclo dia/noite já existente.

**Vôlei e os outros esportes revisados.** O jogo de vôlei 3x3 (`src/volley-match.js`) já existia e foi testado jogando de verdade (saque, rebatida, ponto); basquete, futebol e a pista de skate também foram conferidos em partida — todos funcionando, com as cabeças corrigidas.

Verificação: `node tools/crowd.test.mjs` (cor de cabelo natural para moradores/bots), `node tools/verify-mission.mjs` (física do arremesso), `node tools/verify-city-upgrade.mjs` (giro suave e as 4 estações), e os demais `verify-*.mjs`/`*.test.mjs` continuam cobrindo o resto.

## Céu dia/noite, mais trânsito, skate/bike com embalo e acampamento — 28/10/2026 (noite)

**Céu de verdade, no horário de Brasília** (`src/sky.js`). O jogo consulta o relógio real (fuso `America/Sao_Paulo`, sem precisar saber o fuso do jogador) e muda a cor do céu/neblina, a posição e intensidade do sol, e acende a lua e um campo de estrelas à noite — tudo contínuo ao longo do dia, não só dois estados. A luz do sol (que já seguia o aluno para a sombra) agora também gira de direção. Campo de visão bem mais longe (neblina de 140–460 m, câmeras com alcance de até 650 m) para dar pra ver a cidade e a montanha de longe.

**Trânsito: mais carros e ônibus, sinal de verdade.** De 10 para 18 veículos (13 carros, 5 ônibus). Cada um dos 4 cantos de cada laço da malha viária tem um sinal que alterna aberto/fechado (os pares e os ímpares se revezam, como um cruzamento de verdade) — os veículos freiam antes do sinal fechado, sem se sobrepor uns aos outros (já tinha controle de distância do carro da frente).

**Skate e bicicleta com embalo de verdade.** Antes, qualquer modo de transporte andava e parava instantaneamente, na mesma velocidade de giro do andar a pé. Agora skate e bike ganham velocidade aos poucos ao empurrar e continuam deslizando/pedalando um pouco na direção em que estavam indo ao soltar a tecla (saem numa rampa até a velocidade máxima, não liga/desliga). A trilha do Parque de Aventura (mountain bike) já estava aberta para andar — confirmado por teste automatizado (mais de 27 m percorridos de bike em 1,5 s nela). No skate, a animação deixou de ficar parada em pé mesmo andando rápido (usa uma postura agachada quando em movimento, já que o pacote de animações não tem um clipe de empurrar o skate).

**Câmera em 3ª pessoa: A/D vira o personagem por padrão** (como pedido) — virar de lado (strafe) continua disponível em Configurações, só não é mais o padrão.

**Acampamento da Serra, no Parque de Aventura.** Clareira com três cabanas de madeira (parede, telhado, porta, chaminé), fogueira central com pedras, lenha cruzada, luz quente e bancos de tora, e uma placa própria — ponto novo contado no progresso da trilha. Mata da montanha ficou duas vezes mais densa (240 árvores, duas cores de copa), ainda afastada do corredor da trilha e da clareira do acampamento.

Verificação: `node tools/verify-city-upgrade.mjs` cobre o céu, o trânsito com sinal, skate/bike (cidade e trilha) e a 3ª pessoa; `node tools/verify-city.mjs` e os demais `verify-*.mjs`/`*.test.mjs` continuam cobrindo o resto.

## Trânsito nos dois sentidos com rotas variadas, e pista de skate de verdade — 28/10/2026 (madrugada)

**Carros e ônibus não andam mais todos no mesmo sentido.** Seis rotas diferentes espalhadas pelo mapa (quadrado interno e externo da malha viária, cada um nos dois sentidos, mais dois retângulos "mistos" cobrindo outras partes do mapa) — metade das rotas horária, metade anti-horária. Os sinais de trânsito continuam funcionando certo mesmo com rotas cruzando o mesmo cruzamento: cada um dos 16 cruzamentos reais tem uma identidade própria (não depende de qual rota passa por ali), então nunca fica contraditório — um poste por cruzamento muda de verde para vermelho (e os veículos freiam antes dele).

**A pista de skate agora é de verdade, não só decoração.** Antes, as rampas/tigela da pista tinham uma barreira de colisão que impedia qualquer um de entrar nelas durante a exploração normal (só dava para usar no minijogo dedicado). Agora, só quem está andando a pé continua barrado — andando de skate ou bicicleta, o jogador entra de verdade na tigela, na mini-rampa e nas quarter-pipes, e o relevo embaixo dele passa a seguir a física real da pista (a mesma de `skate-sim.js`) em vez do chão plano da cidade. O pulo (Espaço) já funcionava em cima de skate/bike durante a exploração — confirmado, sem precisar de ajuste. O piso da pista é de cimento (já era, no Blender). Confirmado por teste automatizado: andando a pé numa posição dentro da tigela, o jogador fica no chão plano (bloqueado); de skate, ele afunda na tigela de verdade.

Verificação: `node tools/verify-city-upgrade.mjs` (rotas/sinais do trânsito e a tigela de skate) e `node tools/verify-skate.mjs`/`node tools/skate.test.mjs` (minijogo dedicado intacto).

## Carros andando de lado: corrigido — 28/10/2026 (fim de tarde)

A correção da mão da via (acima) deixou os carros bem mais visíveis — e aí apareceu um segundo bug: eles andavam de **lado**, mostrando a lateral em vez da frente. Causa: o carro recebia uma rotação fixa de 90° (`original.rotation.y=Math.PI/2`) somada à rotação da rota (que já aponta a direção certa sozinha) — a soma das duas ficava 90° errada. Reescrevi `src/traffic.js`: em vez de um ângulo fixo, a frente de cada carro é descoberta pelas próprias rodas do pacote (`wheel_front_*`/`wheel_rear_*`), então funciona para qualquer um dos 4 modelos sem precisar adivinhar. Conferido matematicamente: a direção real de cada um dos 8 carros (frente→trás, pelas rodas) bate exatamente com a direção da pista.

## Trânsito corrigido: mão da via e ônibus de verdade — 28/10/2026 (tarde)

**Carros e ônibus andavam na contramão.** O laço do trânsito (`src/traffic.js`) segue os dois eixos de rua internos (ou externos) da malha viária; o deslocamento para ficar numa faixa, em vez de em cima da linha central, estava para o lado ERRADO (2,2 m para dentro do laço, não para fora) — como o laço sempre vira à direita nos cantos, "para fora" é a mão correta. Corrigido: os veículos agora andam 2,3 m para fora do eixo da rua, dentro do asfalto.

**Ônibus com modelo de verdade.** Não existe nenhum ônibus pronto nos pacotes baixados (vila-pack, Kenney car-kit e outros só têm carros, caminhões e utilitários) — o ônibus era uma caixa amarela montada na hora em JavaScript. Modelado um ônibus de verdade no Blender (`tools/build_city_props.py` → `onibus.glb`: janelas, rodas com calota, retrovisores, letreiro "EF VERSO", para-choques), carregado como asset como os carros (que já vinham do `vila-pack.glb`).

## Revisão de arte: skins e pista de skate — 28/10/2026

**Pacote de personagens confirmado.** Comparado o KayKit Adventurers (em uso, `wardrobe-collection.glb`) com o Kenney Mini Characters (`tools/build_kenney_students.py`, protótipo em `public/models/students/kenney-alunos.glb`, não usado no jogo): o Kenney é bem mais simples (chibi, pouca roupa, sem acessórios de acessibilidade) e não tem o sistema de guarda-roupa por categoria. O KayKit continua sendo a escolha certa — mantém, e documenta aqui a comparação para não ser refeita à toa.

**Nova estrutura na pista de skate: spine.** Duas transições costas-com-costas (coping no topo, 1 m de altura), perto do posto de EPI, em área antes vazia — dá para pegar embalo de um lado e voar para o outro. Modelada em `tools/build_skatepark.py` e com física própria em `src/skate-sim.js` (mesma lógica de transição dos outros obstáculos), coberta por `tools/skate.test.mjs`.

**Avaliação do resto do mapa.** Sobrevoei praças, pista de skate, feira, bairro residencial e dojô pela ferramenta de inspeção (Admin · Voar): já têm bastante mobiliário urbano, vegetação e variação (chafariz de dois níveis com canteiros na Praça Central, barracas e carros na Feira, pérgola e tatame no Dojô). Não achei trechos obviamente vazios que pedissem reforço imediato — "aprimorar o jogo inteiro" é grande demais para uma passada só; peça um lugar específico (ou "mais variedade de grafite no muro", "mais bancos na rua X" etc.) para a próxima rodada.

## Skate de verdade, com física — 27/10/2026 (noite)

**Bowl afundado no chão.** O bowl do skatepark (`tools/build_skatepark.py`) deixou de ser uma plataforma elevada com rampa e escada de acesso: agora é um buraco de 1,7 m cavado no chão, com o coping (a borda) no nível do passeio — como uma piscina de skate de verdade, só "fechada" (a mini-rampa e os quarter pipes continuam elevados, que é como existem de verdade). Uma grade de proteção amarela corre em volta da borda. Isso mudou a forma como o modelo é encaixado na cidade: `place()` ancora pelo ponto mais baixo do modelo, então o chão da pista precisou de um deslocamento novo (`src/city-world.js`) para não flutuar no ar.

**Andar de skate, com física.** Perto da Aventura Urbana, o botão **Andar de skate** solta o aluno (com a própria aparência) sobre a pista, de skate, numa câmera própria em 3ª pessoa. `src/skate-sim.js` é a física pura: a altura do skatista em cada ponto (x, z) segue o relevo real do bowl, da mini-rampa e dos quarter pipes (a mesma matemática de transição em arco do gerador Blender); descer ganha velocidade com a gravidade, subir perde. A borda do bowl tem um "lip" de uns 20 cm que só se vence saltando — por isso dá para **saltar (ollie, Espaço)**: sem pular, o aluno é freado na borda; pulando, voa por cima. `src/skate-match.js` liga essa física à cena 3D e ao teclado/joystick compartilhados (WASD para andar e virar, Espaço para saltar), do mesmo jeito que as outras partidas. Teste: `node tools/skate.test.mjs` (física) e, com o servidor aberto, `node tools/verify-skate.mjs`.

**Corrigido de passagem:** durante qualquer partida (basquete, futebol, vôlei, skate), o WASD tinha parado de mover o jogador — o atalho de teclado da cidade (C/E/H/Espaço) bloqueava sem querer até a tecla de movimento entrar no conjunto compartilhado. Os botões para **entrar** numa atividade (`#hoops-enter`, `#soccer-enter`, `#volley-enter`, `#skate-enter`, `#theory-enter`) também não tinham posição própria — ficavam perdidos no canto do cabeçalho; agora ficam centralizados no rodapé.

## Logos, controles de toque e navegação guiada — 27/10/2026 (tarde)

**Identidade visual.** As logos geradas (pasta `assets/artes/`) foram recortadas e convertidas para WebP (`cidade/public/art/`, ~143 KB no total, contra 634 KB dos PNGs originais — pensado para a hospedagem compartilhada da Hostinger): `logo.webp` no cabeçalho (trocou o texto "EF VERSO" + a etiqueta "CIDADE ATIVA / PROTÓTIPO", removida para limpar a interface) e `favicon.webp` na aba do navegador. O ícone de administração **Admin · Voar** só é inserido no DOM quando `import.meta.env.DEV` é verdadeiro — some de qualquer build de produção, mas continua disponível (e testável pelo Playwright) no servidor de desenvolvimento.

**Correr/Pular/Explorar viraram controles só de toque.** Esses três botões (antes sempre visíveis) agora ficam `display:none` em telas com `pointer:fine` (mouse de desktop) — lá as ações equivalentes já existem no teclado (Shift para correr, Espaço para pular, E para interagir). Em `pointer:coarse` (celular/tablet) eles aparecem com visual de HUD de jogo: fundo translúcido com desfoque, Correr/Pular circulares, parecido com os controles de toque de jogos mobile comuns.

**Trilha guia até o destino.** Ao escolher um lugar pelo menu lateral ou pelo clique no minimapa, uma linha tracejada dourada aparece no chão ligando o aluno ao destino (`updateGuide()` em `src/main.js`), e some sozinha ao chegar.

**H: ver o personagem de frente.** Tecla nova que gira a câmera para a frente do aluno (como um espelho rápido) sem precisar abrir o guarda-roupa; pressionar de novo (ou qualquer ação) volta à câmera anterior. Trava o movimento enquanto ativa, do mesmo jeito que o guarda-roupa ou um diálogo.

**Teclas "grudadas".** Alt-tab, trocar de aba ou clicar fora do jogo podia engolir o evento de soltar uma tecla e deixar o aluno "andando sozinho" até a próxima tecla. Agora a janela zera o estado de teclas ao perder e ao recuperar o foco, e também quando a aba fica oculta (`visibilitychange`).

## Estado atual — 27/10/2026

**Alunos no estilo do Jogo_RPG_EF7.** Jogador, professora e moradores usam o KayKit Adventurers 2.0 (CC0), o mesmo pacote do RPG, editado no Blender para parecerem alunos: `tools/build_kaykit_students.py` combina cabeças e roupas de personagens diferentes num esqueleto único, tira a barba do cabelo curto, reduz os polígonos e acrescenta mochila escolar, óculos de grau e escuros, aparelho auditivo, apito e cadeira de rodas (`public/models/students/kaykit-alunos.glb`, 1,2 MB; fonte em `art-source/kaykit-alunos.blend`). As animações ficam em `public/models/students/anims/` (KayKit Character Animations, CC0) e são ligadas aos ossos pelo nome, como no RPG. As cores mudam no shader: cada bloco do atlas pertence a pele, cabelo, roupa, detalhe, bermuda ou tênis, e a nova cor mantém o degradê original. O guarda-roupa oferece 8 tons de pele, 4 rostos e cabelos, 3 roupas, cores de cabelo, roupa, detalhe, bermuda e tênis, óculos, aparelho auditivo, mochila em 6 cores e cadeira de rodas. Rosto com barba e colete ficam para adultos. A chave de aparência passou a ser `ef-verso-alunos-v3`.

**Cores e brilho.** Iluminação igual à do RPG: luz de hemisfério quente (1,6), sol forte (2,2) seguindo o aluno com sombra de área 28, ACES com exposição 1,05 e névoa lilás de 55 a 120. A câmera de cima passou a ser em perspectiva (FOV 42), com zoom pela roda do mouse; na 3ª pessoa, A/D giram o aluno e a câmera.

**Colisões.** Como no RPG: o aluno é um círculo de raio 0,35 que, ao encostar, desliza pela borda em vez de travar. Árvores, postes, semáforos, chafariz, coreto e esculturas usam colisão redonda; prédios e cercas, caixas. Moradores também bloqueiam a passagem. A busca usa uma grade espacial de células de 8 unidades (`src/navigation.js`).

**Pista de skate.** Modelo próprio feito no Blender (`tools/build_skatepark.py`, `public/models/skate/skatepark.glb`) com bowl elevado, mini-rampa, quarter pipes, escadaria com corrimão e hubbas, funbox, pirâmide, manual pad, ledge, flat bar, kicker, muro grafitado, arquibancada, toldos, área de iniciantes demarcada e posto de EPI. Do lado de fora, um painel mostra as regras da pista. `src/skaters.js` anima quatro skatistas do Kenney Mini Skate: dois na área de rua, uma na mini-rampa e um no bowl.

**Praças e cidade.** `tools/build_city_props.py` gera a Praça Central (calçada portuguesa em ondas, chafariz em dois níveis, canteiros com bancos), academias ao ar livre (Centro de Ginástica e Bairro da Saúde), o coreto da Praça das Danças, pontos de ônibus, banca, carrinho de sorvete, coleta seletiva, bicicletário, bebedouro, mesas de piquenique, pódio do Museu e relógio de sol da Ciência. As calçadas ganharam árvores e oito pontos de ônibus, e os gramados restantes receberam jardins. Seis painéis educativos repetem a teoria dos cadernos nos locais certos: fair play, frequência cardíaca, aula em três partes, hidratação, lutar não é brigar e Não Deixe Rastro. Pombos ciscam perto do chafariz e voam quando o aluno se aproxima (`src/ambient.js`).

**Desempenho.** Na verificação automática, a vista inicial ficou com 237 chamadas de desenho e 167 mil triângulos no desktop, e 141 chamadas e 104 mil triângulos no celular emulado. A geometria estática é fundida por setor de 32 unidades; materiais de cor lisa viram cores por vértice de um único material. Esses números vêm de um enquadramento e não substituem a medição em computadores reais da escola.

Verificação: `node tools/crowd.test.mjs`, `node --test tools/mission.test.mjs`, `npm run build`; com o servidor aberto, `node tools/verify-city.mjs` e `node tools/verify-mission.mjs`. Para reconstruir os modelos: Blender em segundo plano, a partir da raiz do projeto, com os três scripts citados acima.

## Revisão urbana — 24/10/2026

Mapa com terreno de 352 × 352 unidades, limite caminhável ±172 e 19 destinos. O novo traçado substitui as expansões sobrepostas anteriores: oito vias conectadas, dezesseis cruzamentos, faixas de pedestre, calçadas e quarteirões definidos. Cercas têm dimensões explícitas e portões abertos. As casas e os equipamentos aproveitam os pacotes locais; o bowl do skate foi modelado no Blender, junto dos dez edifícios próprios.

`src/city-layout.js` define ruas e destinos; `src/city-world.js` monta a cidade, compartilha materiais e agrupa instâncias em setores de 32 unidades para descarte fora da câmera; `src/navigation.js` calcula caminhos considerando obstáculos. Os módulos antigos de expansão permanecem como histórico, mas não são importados pela cena atual. Não há carregamento progressivo de setores.

Minimapa, corrida, salto, duas câmeras e voo de inspeção estão disponíveis. O seletor **Inspecionar ambiente** do modo Admin enquadra cada um dos 19 locais. As placas próximas diminuem na terceira pessoa para não cobrir a visão.

Fontes editáveis: `art-source/*.blend`. Reconstrução: executar Blender em segundo plano com `tools/build_landmarks.py`, `tools/build_sports.py` e `tools/build_skate_bowl.py`. Modelos de distribuição: `public/models/`.

Verificação: `npm run build`; com o servidor local aberto, `node tools/verify-city.mjs` verifica caminhos, colisões dos segmentos, caminhada, interação, corrida, salto, câmeras, voo e interface de toque em navegador com viewport móvel. `node tools/review-environments.mjs` captura os 19 ambientes. Evidências ficam em `art-source/review/`.

## Roupas dos alunos arredondadas

As roupas (camiseta, camisa com bandana, casaco) estavam com os braços e pernas com cara de cano poligonal — o Decimate do `tools/build_kaykit_students.py` reduzia demais os polígonos (razão 0,5) e a malha ficava sem sombreamento suave. Corrigido: a razão do Decimate das roupas subiu para 0,85 (a das cabeças, para 0,72) e cada peça agora recebe sombreamento suave por ângulo (`shade_smooth_by_angle`, 42°) depois de decimada e depois de unida — o mesmo truque que dá o aspecto arredondado dos moldes originais da KayKit, sem pesar o arquivo (foi de 1,2 MB para 1,5 MB). Comparação em `art-source/outfits-before.png` e `art-source/outfits-after.png`, geradas por `tools/render_outfits.py`.

## Minigames dos outros esportes — futebol e vôlei

Perto do Campo de Futebol e da Quadra de Vôlei, os botões **Jogar futebol 3x3** e **Jogar vôlei 3x3** entram em partidas completas contra bots, na mesma arquitetura do basquete (simulação pura + bots + cena 3D separados). No futebol a câmera é lateral, estilo transmissão esportiva (como FIFA), acompanhando a bola ao longo do campo; os botões são **Chutar** (segura para dar força, solta para chutar na direção em que o aluno está olhando) e **Passar/Desarmar**. No vôlei a câmera fica fixa atrás da linha de fundo do time do aluno, de frente para a rede — diferente do futebol e do basquete, porque o pedido foi que o vôlei ficasse "de frente para a rede"; o único botão é **Rebater/Sacar**, e o movimento (WASD/joystick) no momento da rebatida mira a bola para um canto da quadra adversária. Os dois jogos têm placar, cronômetro e bots nos dois times (exceto o jogador); no futebol vale gol normal (sem lance de impedimento), e no vôlei a bola que cai dentro da quadra do time que não rebateu pontua para o adversário, como no vôlei de verdade.

`src/soccer-sim.js` e `src/volley-sim.js` seguem o mesmo contrato do basquete: cada jogador só recebe `{mx,mz,shoot,pass}` (futebol) ou `{mx,mz,hit}` (vôlei), prontos para multijogador real no futuro. `src/soccer-bots.js` e `src/volley-bots.js` controlam os bots; `src/soccer-match.js` e `src/volley-match.js` ligam a simulação à cena 3D, reaproveitando os mesmos personagens KayKit com a cor de cada time. Os adereços estáticos de bola que ficavam parados no centro do campo e da quadra de vôlei foram retirados, já que agora os jogos têm bola de verdade.

Testes: `node --test tools/soccer.test.mjs` e `node --test tools/volley.test.mjs` cobrem gol certo/errado, passe, desarme, o bloqueio da rede, o saque e uma partida inteira simulada só com bots (reprodutível pela semente, sem ninguém sair do campo ou da própria quadra).

Primeira versão: os bots de futebol e vôlei são mais simples que os do basquete (sem talas de bloqueio no vôlei, sem impedimento no futebol), e ainda não há áudio nem tela de celebração além do aviso de gol/ponto. Multijogador real (vários humanos) fica para depois, como no basquete.

## Sistema genérico de missões e carteira única

`src/quests.js` é o novo motor de missões, pensado para criar missões novas rápido, sem escrever reducer nem tela do zero:
- **`createWallet(storage)`** — uma carteira única de moedas e insígnias, compartilhada por toda atividade. `award(coins, insígnia?)` é idempotente: pedir a mesma insígnia de novo não dá moeda em dobro.
- **`createCounterMission({id, target, coinsOnComplete, badge}, storage, wallet)`** — uma missão "aconteça X vezes" (gol, ponto, semana lida…) em quatro linhas: guarda o progresso sozinha, e quando bate a meta, premia a carteira uma única vez.

A missão de basquete continua em `quest-state.js`/`mission.js` (tem diálogo e etapas, é especial demais para um contador), mas agora também premia pela carteira única. A trilha teórica faz o mesmo. E duas missões novas, pequenas, provam o motor funcionando: **Primeiro Gol** (futebol, `soccer-match.js`) e **Primeiro Ponto** (vôlei, `volley-match.js`) dão 20 moedas e uma insígnia na primeira vez. O placar de moedas que o aluno vê — no quadro da missão de basquete e no topo da trilha teórica — é a mesma carteira em todo lugar.

Testes: `node --test tools/quests.test.mjs` cobre a carteira (soma, insígnia só uma vez, sobrevive a reinício, tolera navegador sem `localStorage`) e a missão contador (progresso, recompensa uma única vez, duas missões diferentes dividindo a mesma carteira sem se misturar).

Ainda falta: um sistema de etapas genérico para missões com diálogo (hoje só a de basquete tem, copiada à mão); mais contadores para os outros jogos (ex.: "5 passes certos", "3 rebotes"); e mostrar a carteira também na tela do futebol e do vôlei, não só no aviso de quando a missão é concluída.

## Trilha teórica dentro do jogo

A Escola do Movimento agora tem um botão **Ver trilha teórica**, separado da conversa com a professora Lia sobre o basquete. A trilha usa o conteúdo já escrito em `teoria/teoria-6-ano.md` a `teoria-9-ano.md` (3 unidades, 15 semanas por série, cada semana com teoria, passo a passo, dica de segurança, pergunta para conversar, desafio de movimento e quiz de 3 perguntas) — nada de conteúdo novo foi inventado para esta etapa. `tools/build_theory.mjs` converte cada markdown em `cidade/public/theory/grade-X.json`; `src/theory.js` lê esse JSON e mostra a trilha, a leitura da semana e o quiz, com progresso salvo em `localStorage` (`ef-verso-theory-v1`). A série do aluno vem da turma digitada no cadastro (ex.: "7A" → 7º ano; cai no 7º ano se não der para identificar).

Cada semana só libera depois que a anterior for concluída — na falta de um professor de verdade controlando a liberação semanal (o plano original), isso faz esse papel por enquanto: todo aluno libera no próprio ritmo, sem esperar ninguém. Acertar as 3 perguntas de uma semana nova dá 10 moedas por acerto (separadas das moedas da missão de basquete); repetir uma semana já concluída não dá moeda de novo.

Testes: `node --test tools/theory.test.mjs` confere que o conversor produz as 15 semanas de cada série, sem campo vazio e com 3 alternativas e uma resposta válida em cada pergunta. Testei a sequência inteira no navegador (ler a semana, responder o quiz, liberar a semana seguinte, salvar o progresso).

Ainda falta: a liberação não é controlada pelo professor de verdade (não há login nem turma de verdade, só o nome digitado no cadastro). As moedas da trilha agora somam com as de todo o resto, pela carteira única (ver seção abaixo).

## Abertura, cadastro, moradia e personagem (primeiro acesso)

Na primeira vez que o navegador abre o jogo, `src/onboarding.js` mostra, em sequência e por cima de tudo (a cidade só é liberada depois): a tela de abertura, com fundo em degradê animado, logo e botões entrando aos poucos; o cadastro (nome, apelido opcional e turma, escolhida numa lista de 6º a 9º ano); a escolha de onde morar (três bairros, cada um reposiciona o ponto de partida do aluno na cidade); e, por fim, o guarda-roupa de verdade (`src/customizer.js`) para montar o personagem antes de entrar. Os dados ficam em `localStorage` (`ef-verso-student-v1`); numa visita seguinte, o aluno entra direto na cidade, sem repetir os passos. Enquanto a abertura está na tela, os controles da cidade (andar, interagir, missão, jogos) ficam bloqueados, do mesmo jeito que já acontecia com a missão e os jogos esportivos.

**Acesso do professor.** Na tela de abertura, o link **Sou professor(a)** pede um nome e um código de acesso, em vez do cadastro de aluno — sem conta nem servidor, o código é só uma lista fixa no próprio código-fonte (`TEACHER_TOKENS` em `src/onboarding.js`): `profdanilo` e `edfjesuzinha`, cada um identificando um professor diferente. Um código certo entra direto na cidade, sem escolher moradia nem montar personagem, e mostra um aviso **Modo Professor** no cabeçalho. Um código errado mostra uma mensagem e deixa tentar de novo. Trocar ou acrescentar um código é editar essa lista — para um uso real, em mais de um computador, isso precisa virar um código validado por um servidor, não uma lista no código-fonte do navegador.

Testes: `node tools/verify-onboarding.mjs` cobre a sequência inteira (abertura → cadastro com validação de nome → moradia → personagem → cidade, com o aluno aparecendo no bairro certo) e o acesso do professor (código errado barrado, código certo entra e mostra o aviso), além de confirmar que uma visita seguinte pula direto para a cidade. `verify-city.mjs`, `verify-mission.mjs` e `verify-wardrobe-collection.mjs` pré-preenchem o cadastro antes de abrir a página, para continuar testando a cidade sem passar pela abertura toda vez.

Ainda falta: o código do professor não dá acesso a nada especial além do aviso no cabeçalho — não existe um painel do professor (lista de alunos, validar o desafio de movimento, liberar a trilha semana a semana). É a peça do projeto original ainda sem código.

Ainda falta: não há conta nem sincronização entre aparelhos (cada navegador tem seu próprio cadastro), e a escolha de moradia por enquanto só define onde o aluno começa a jogar — não existe uma "casa" visitável na cidade.

## Jogo completo de basquete 3x3 — base do multijogador

Perto da Quadra de Basquete, o botão **Jogar 3x3 na quadra** entra numa partida completa, 3 contra 3 em quadra inteira (time Verde contra Laranja), separada do treino guiado de arremessos da missão. O aluno controla um jogador (WASD/joystick movem, Espaço segura para arremessar/pular na defesa, E passa ou tenta roubar); os outros 5 são bots. A física mora em `src/hoops-sim.js`: aro e tabela sólidos (a bola bate e quica, não atravessa mais), cesta de 2 ou 3 pontos conforme o arco pintado na quadra, posse, rebote, interceptação de passe, roubo, lateral e placar com cronômetro de 3 minutos ou 11 pontos. Toda a simulação funciona só com entradas `{mx,mz,sprint,shoot,pass,passTo}` por jogador, sem nada de 3D ou de tela — por isso um servidor poderá rodá-la e enviar o estado a vários jogadores no futuro, sem reescrevê-la. `src/hoops-bots.js` decide os bots (ataque com espaçamento e cortes, defesa individual marcando por número); numa partida só entre bots, os dois times pontuam de forma equilibrada. Cestas que o aluno fizer na partida também contam para a missão **Primeiras Cestas**, do mesmo jeito que as do treino guiado. `src/hoops-match.js` liga a simulação à cena 3D: os 6 personagens reaproveitam o mesmo modelo KayKit dos alunos, cada time com uma cor de camisa; a câmera acompanha a bola pela lateral da quadra, como uma transmissão.

Testes: `node --test tools/hoops.test.mjs` cobre a física do aro e da tabela, arremessos certos e errados a partir de vários pontos, passe, roubo e uma partida inteira simulada só com bots (reprodutível pela semente, sem ninguém sair da quadra).

A linha de 3 pontos, os bots e a câmera lateral são uma primeira versão: ainda não há áudio de apito/placar, falta nítida de "bola fora" na interface e o ajuste fino de dificuldade dos bots. Multijogador real (vários humanos) fica para depois; a arquitetura já separa simulação de apresentação para isso.

## Primeira missão jogável — Primeiras Cestas

Clique em **Ir até a escola**, aproxime-se da professora Lia e aceite a missão. Vá até a quadra e escolha **Pegar bola e treinar**. A câmera passa para a 3ª pessoa e o aluno anda livremente pela quadra, quicando a bola (W/S andam, A/D giram). Para arremessar, fique de frente para a cesta, **segure Espaço** (ou o botão, no toque) e solte: quanto mais tempo segurando, mais longe a bola vai (de 1 a 12 m, carga completa em 1,3 s). A faixa amarela da barra mostra a força certa para onde o aluno está. Uma ajuda sutil corrige a mira e a força só quando o aluno já está perto do certo (até 15° de erro, a direção é corrigida em 80%; até 35°, menos; na força, a 0,12 da ideal, corrige 65%). Depois de cada tentativa, a dica diz se faltou força, se passou do aro ou se é preciso virar. São três cestas, sem limite de tentativas ou cronômetro; sair da quadra ou Esc encerra o treino. Volte à professora para receber 100 moedas e a insígnia **Primeiras Cestas**. É possível repetir o treino, sem conceder a recompensa novamente.

Até 24/10/2026, o jogador, a professora e os moradores usavam **Ultimate Modular Men + Ultimate Modular Women**, de Quaternius (CC0 nos arquivos recebidos); os parágrafos abaixo descrevem essa versão anterior. No guarda-roupa, **Personagem** permite escolher Masculino/Feminino; os catálogos seguintes mostram somente as peças compatíveis com essa base. A professora Lia usa a base feminina.

Seleção atual por base: 3 conjuntos de rosto/cabelo, 2 roupas, 2 calças/bermudas, 2 calçados, óculos opcionais e mochila opcional. São 18 peças originais selecionadas e 4 acessórios próprios preparados no Blender (22 peças no catálogo). As peças de cabeça originais incluem o cabelo: ainda não há troca independente entre rosto e cabelo. Paletas alteram pele, cabelo, roupa, calça, calçado e mochila. As miniaturas são geradas a partir dos modelos; prévia giratória, salvar e cancelar continuam disponíveis. O catálogo não expõe todos os 21 trajes dos pacotes completos.

A seleção prioriza roupas casuais, reduz a estatura padrão dos alunos para 1,85 unidade e aumenta levemente a proporção da cabeça; a professora mantém proporções originais e 2,05 unidades. São adaptações estilizadas, não modelos originalmente desenhados para uma idade específica.

`src/crowd.js` ativa 24 moradores no desktop (12 de cada base) e 11 em telas compactas/dispositivos de toque (6 femininos e 5 masculinos), distribuídos por 11 áreas. Eles caminham, fazem pausas e respeitam os obstáculos da navegação. NPCs próximos oferecem conversas pelo botão Interagir/E quando não há um destino prioritário ao lado. Personagens distantes ficam ocultos; as animações são reduzidas a distância e os moradores permanecem visíveis no modo Admin. Diálogos e o editor pausam a circulação. Não são adversários esportivos nem novas missões.

`node tools/crowd.test.mjs` verifica os dois arquivos reais, poses sem acúmulo, catálogo, seleção de peças compatíveis, população mista, circulação, colisões e pausa. `art-source/wardrobe-review.html` permite revisar a tela de 390 × 844 e consultar o estado; essa página não integra a distribuição. Evidências atuais: `art-source/students-review/`.

Reconstrução: executar Blender em segundo plano, da raiz do repositório, com `cidade/tools/build_modular_students.py`. Fontes preparadas: `art-source/students-masculine.blend` e `students-feminine.blend`. Modelos web: `public/models/students/masculine.glb` e `feminine.glb` (cerca de 4,4 MB no total), com 5 clipes originais selecionados: repouso, caminhada, corrida, aceno e interação. Os pacotes não incluem salto; o adaptador compõe sua pose e o movimento vertical vem da física do jogo. Os braços são ajustados para segurar e lançar a bola.

A aparência usa `ef-verso-students-v1`, separada da missão e das preferências dos catálogos anteriores. `src/student-character.js` controla as duas bases; `src/customizer.js` cria o editor; `src/wardrobe-thumbnails.js` compartilha renderizador e cache. Implementações anteriores permanecem como histórico. Licenças em `../CREDITOS.md`.

`src/student-character.js` controla as animações; `src/mission.js` integra professora, missão, bola, câmera e interface; `src/basketball.js` calcula o lançamento e a passagem descendente pelo aro; `src/quest-state.js` valida e salva o progresso em `localStorage` (`ef-verso-progress-v1`). Missão, cestas, tentativas, moedas, insígnia e locais descobertos persistem neste navegador. A posição do avatar volta à praça ao recarregar. Não há conta ou sincronização entre dispositivos; se o armazenamento falhar, a interface informa.

Testes: `node --test tools/mission.test.mjs` verifica progressão, recompensa única, persistência e acerto físico. Com o servidor aberto, `node tools/verify-mission.mjs` percorre o fluxo real, incluindo erro, acertos, retomada após recarregar e toque em viewport móvel. Capturas e resultados em `art-source/mission-review/`.

O basquete é um treino livre de arremesso, sem partida completa, adversários ou colisão física da bola com a tabela. Interiores, outras modalidades e skate jogável continuam pendentes. O personagem ainda não caminha sobre rampas. A validação móvel usa emulação, não um aparelho físico.

## Controles

- Shift + movimento: correr; botão Correr alterna corrida no toque.
- Espaço ou Pular: salto com gravidade e retorno ao chão, sem salto duplo. Colisões horizontais continuam sólidas; ainda não é possível subir em telhados ou saltar sobre obstáculos.
- Admin · Voar ou F2: inspeção aérea local, sem autenticação administrativa. Não disponibilizar esse botão como controle de acesso em uma versão pública.
- No voo: WASD/joystick deslocam a câmera; arrastar muda a direção; Espaço/Q sobe, Ctrl/E desce, Shift acelera, roda do mouse aproxima/afasta. Botões Subir/Descer atendem toque. Ver cidade inteira restaura a vista geral. Escape ou Voltar ao personagem sai do voo e preserva a posição do avatar.

- WASD/setas ou joystick de toque: movimento relativo à câmera. Na 3ª pessoa, W/S andam e A/D giram o aluno.
- C ou botão superior: câmera de cima / terceira pessoa. Roda do mouse: zoom (de cima) ou distância da câmera (3ª pessoa).
- Arrastar a cena: girar a câmera.
- E ou botão inferior: explorar um ponto próximo.
- Praça: retornar ao início.
- Botões de locais: calculam uma rota ao destino contornando obstáculos. Movimento manual cancela a rota.

## Histórico anterior à revisão urbana

As dimensões, quantidades e limitações descritas abaixo registram etapas anteriores. Para a implementação vigente, considere a seção Estado atual acima.

### Expansão dos ambientes — segunda faixa urbana

Terreno ampliado para 304 × 304 unidades (limites de movimento ±148). Quatro novos destinos levam o total a 16: Centro de Ciência do Corpo a leste (118,8), Galeria da Turma ao sul (0,118), Aventura Urbana a oeste (-118,0) e Acampamento e Orientação ao norte (0,-124). Um anel de caminhos em ±118 conecta esses ambientes à cidade anterior. A visão geral do voo foi ajustada para o novo tamanho.

Barracas, bancos de tronco e pinheiros foram reutilizados do pacote local Paderunt Camping; originais em `../assets/paderunt/camping`, cópias de uso em `public/models/camping`. Os pavilhões, painéis, rampas e parede de escalada são geometria própria do protótipo. Rampas e paredes são decorativas e têm colisões simplificadas; ainda não permitem skate, escalada ou caminhada sobre superfícies elevadas. Não há novos conteúdos curriculares ou mecânicas implementados nesta expansão. O mapa ainda não possui carregamento por setores, e a ampliação precisa ser testada em aparelhos móveis reais.

### Revisão arquitetônica e esportiva

Fachadas ampliadas com molduras, floreiras, bandeiras e elementos próprios: relógio da escola, entrada envidraçada do ginásio, troféu do museu, claraboia da ginástica e estrutura de madeira no dojô. Modelos reunidos por edifício para compartilhar materiais.

Áreas esportivas: campo de futebol no sudeste (78,67), quadra de vôlei ao sul (25,76) e basquete na quadra central. Adicionados traves, redes, tabelas, aros, cones e arquibancada produzidos por `tools/build_sports.py`. Bolas reutilizadas de `assets/dleom/sports-balls` (BlackSoccerBall, Basketball1, volleyball), com materiais embutidos, sem novas dependências de textura. As dimensões das quadras são adaptadas ao protótipo, não regulamentares. Bolas e equipamentos ainda são cenográficos, sem simulação esportiva. Agora há doze pontos de descoberta. O desempenho em celular continua pendente de medição.

Edifícios próprios produzidos no Blender: escola, ginásio, museu, centro cultural, ginástica, dojô, saúde e visitantes. Fontes editáveis em `art-source/*.blend`; modelos web em `public/models/landmarks/*.glb`; prévia conjunta em `art-source/edificios-preview.png`. Para reconstruir: Blender em segundo plano com `tools/build_landmarks.py`. Os oito modelos totalizam aproximadamente 718 KB e usam materiais simples, sem texturas externas. São fachadas com colisão sólida, sem interiores acessíveis. O museu e o ginásio acrescentam dois pontos de descoberta, totalizando dez.

Expansão do mapa: terreno de 204 × 204 unidades, limite caminhável de ±98, oito locais exploráveis. Acrescentados Centro de Ginástica, Praça das Danças, Dojô das Lutas, Bairro da Saúde e Entrada da Trilha. Os bairros são ligados por um anel de caminhos nas coordenadas ±54 e acessos laterais a ±12. A decoração inclui colchonetes, pista de dança, palco, tatame, bancos, postes e vegetação. As atividades são pontos informativos, não minijogos completos. As instâncias reutilizam a geometria e os materiais dos dois pacotes existentes; o mapa ainda não usa carregamento por distrito.

Praça central, escola representada por prédio provisório, quadra, parque, entorno urbano, árvores, colisões simplificadas e três pontos de descoberta. Modelos locais carregados em GLB. Resolução limitada a 1,5 vezes a tela e iluminação sem sombras dinâmicas para reduzir custo gráfico.

Avatar e equipamentos de quadra são provisórios. Esta versão não contém esportes jogáveis, multiplayer, autenticação, persistência de progresso ou painel do professor. A câmera em terceira pessoa ainda precisa de prevenção de obstruções. O desempenho em celulares físicos ainda precisa ser medido; layout responsivo não garante compatibilidade com todos os aparelhos.

## Créditos

### Direção visual atual

A interface usa a paleta roxa/amarela, tipografia e tratamentos de cartões de `Jogo_RPG_EF7`. Os prédios, bancos, postes e árvores agora vêm dos pacotes `cidade.glb` e `floresta.glb` dessa referência, copiados como `vila-pack.glb` e `floresta-pack.glb`. Esses pacotes correspondem aos modelos KayKit já usados no jogo de referência. A geometria, a disposição da cidade e o avatar provisório ainda não reproduzem integralmente aquele jogo. Os arquivos Kenney listados abaixo permanecem disponíveis como assets da versão inicial.

- `public/models/school.glb`: Kenney City Kit Commercial, `building-a.glb`.
- `public/models/building.glb`: Kenney City Kit Commercial, `building-c.glb`.
- `public/models/tree.glb`: Kenney Mini Arena, `tree.glb` (crédito adicional no pacote: Tony Schär).
- Licenças e originais permanecem em `../assets/kenney/`. Consulte também `../CREDITOS.md`.

O protótipo segue Three.js, conforme o plano salvo do projeto. Os assets originais não são alterados.
