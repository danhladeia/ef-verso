import './onboarding.css';

// Primeiro acesso: abertura, cadastro (aluno ou professor com código), escolha de onde morar e criação
// do personagem. Só aparece uma vez por navegador (ef-verso-student-v1); depois disso entra direto na
// cidade. Professores entram com um código em vez de escolher moradia e personagem.
export const STUDENT_KEY='ef-verso-student-v1';
// Códigos de acesso do professor: cada um cadastra um professor diferente (nome vem do próprio código,
// por enquanto — sem servidor, não dá para validar contra uma lista de verdade). Veja README.
const TEACHER_TOKENS={profdanilo:'Danilo',edfjesuzinha:'EF Jesuzinha'};
const HOMES=[
 {id:'praca',name:'Perto da Praça Central',text:'Bem no coração da cidade, perto de tudo.',x:4,z:16},
 {id:'escola',name:'Perto da Escola do Movimento',text:'A um pulo da escola, fácil pegar as missões.',x:6,z:-22},
 {id:'bairro',name:'Bairro Residencial',text:'Um bairro mais calmo, com casas e jardins.',x:4,z:-72},
];
const TURMAS=['6º A','6º B','6º C','7º A','7º B','7º C','8º A','8º B','8º C','9º A','9º B','9º C'];
export function readStudent(){try{return JSON.parse(localStorage.getItem(STUDENT_KEY));}catch{return null;}}

export function createOnboarding({player,updateCamera,onFinish=()=>{}}){
 const existing=readStudent();
 const overlay=document.createElement('div');overlay.id='onboarding';overlay.hidden=!!existing;
 overlay.innerHTML=`
  <section class="onboard-step" data-step="splash">
   <div class="onboard-card">
    <span class="onboard-logo">EF<b>VERSO</b></span>
    <p class="onboard-tag">Educação Física em movimento, dentro de uma cidade para explorar.</p>
    <button id="onboard-start" class="onboard-primary">Começar</button>
    <button id="onboard-teacher-link" class="onboard-link" type="button">Sou professor(a)</button>
   </div>
  </section>
  <section class="onboard-step" data-step="cadastro" hidden>
   <div class="onboard-card">
    <small>PASSO 1 DE 3</small><h2>Como você se chama?</h2>
    <label>Nome<input id="onboard-name" maxlength="24" autocomplete="off" placeholder="Digite seu nome"></label>
    <label>Apelido <span class="onboard-optional">(opcional)</span><input id="onboard-nick" maxlength="16" autocomplete="off" placeholder="Como quer ser chamado"></label>
    <label>Turma<select id="onboard-class">${TURMAS.map(t=>`<option>${t}</option>`).join('')}</select></label>
    <p class="onboard-error" id="onboard-name-error" role="alert" hidden>Escreva seu nome para continuar.</p>
    <button id="onboard-to-home" class="onboard-primary">Continuar</button>
   </div>
  </section>
  <section class="onboard-step" data-step="professor" hidden>
   <div class="onboard-card">
    <small>ACESSO DO PROFESSOR</small><h2>Código de acesso</h2>
    <p>Peça o código à coordenação ou use o que você recebeu ao montar o jogo.</p>
    <label>Nome<input id="teacher-name" maxlength="24" autocomplete="off" placeholder="Seu nome"></label>
    <label>Código<input id="teacher-token" maxlength="24" autocomplete="off" placeholder="Digite o código"></label>
    <p class="onboard-error" id="teacher-token-error" role="alert" hidden>Código inválido. Confira e tente de novo.</p>
    <button id="teacher-enter" class="onboard-primary">Entrar</button>
    <button id="teacher-back" class="onboard-link" type="button">← Sou aluno(a)</button>
   </div>
  </section>
  <section class="onboard-step" data-step="moradia" hidden>
   <div class="onboard-card onboard-card-wide">
    <small>PASSO 2 DE 3</small><h2>Onde seu personagem vai morar?</h2>
    <div class="onboard-homes" id="onboard-homes"></div>
    <button id="onboard-to-character" class="onboard-primary" disabled>Continuar</button>
   </div>
  </section>
  <section class="onboard-step" data-step="personagem" hidden>
   <div class="onboard-card">
    <small>PASSO 3 DE 3</small><h2>Monte seu personagem</h2>
    <p>Escolha o visual do seu jeito de jogar. Dá para mudar depois, a qualquer momento.</p>
    <button id="onboard-open-character" class="onboard-primary">Abrir guarda-roupa</button>
    <button id="onboard-finish" class="onboard-secondary" hidden>Entrar na cidade</button>
   </div>
  </section>`;
 document.body.append(overlay);
 const $=s=>overlay.querySelector(s);
 let step=existing?'done':'splash',home=null;
 function show(next){step=next;overlay.querySelectorAll('.onboard-step').forEach(s=>s.hidden=s.dataset.step!==next);}
 function finish(data){const full={version:1,...data};try{localStorage.setItem(STUDENT_KEY,JSON.stringify(full));}catch{}overlay.remove();onFinish(full);}
 $('#onboard-start').onclick=()=>show('cadastro');
 $('#onboard-teacher-link').onclick=()=>show('professor');
 $('#teacher-back').onclick=()=>show('splash');
 $('#teacher-enter').onclick=()=>{
  const code=$('#teacher-token').value.trim().toLowerCase(),teacherName=$('#teacher-name').value.trim();
  if(!TEACHER_TOKENS[code]){$('#teacher-token-error').hidden=false;$('#teacher-token').focus();return;}
  $('#teacher-token-error').hidden=true;
  // O professor não escolhe moradia nem personagem: entra direto, no centro da cidade.
  finish({role:'professor',name:teacherName||TEACHER_TOKENS[code],school:TEACHER_TOKENS[code]});
 };
 $('#onboard-to-home').onclick=()=>{
  const name=$('#onboard-name').value.trim();
  if(!name){$('#onboard-name-error').hidden=false;$('#onboard-name').focus();return;}
  $('#onboard-name-error').hidden=true;show('moradia');
 };
 for(const h of HOMES){
  const card=document.createElement('button');card.type='button';card.className='onboard-home';card.dataset.home=h.id;
  card.innerHTML=`<strong>${h.name}</strong><span>${h.text}</span>`;
  card.onclick=()=>{home=h;overlay.querySelectorAll('.onboard-home').forEach(c=>c.setAttribute('aria-pressed',String(c===card)));$('#onboard-to-character').disabled=false;};
  $('#onboard-homes').append(card);
 }
 $('#onboard-to-character').onclick=()=>show('personagem');
 let onOpenCharacter=null;
 $('#onboard-open-character').onclick=()=>onOpenCharacter?.();
 $('#onboard-finish').onclick=()=>{
  const name=$('#onboard-name').value.trim()||'Aluno',nickname=$('#onboard-nick').value.trim(),className=$('#onboard-class').value;
  const chosenHome=home||HOMES[0];
  player.position.set(chosenHome.x,0,chosenHome.z);updateCamera?.(1,true);
  finish({role:'aluno',name,nickname,className,home:chosenHome.id});
 };
 if(!existing){const h=HOMES[0];player.position.set(h.x,0,h.z);}
 return {
  get active(){return overlay.isConnected&&!overlay.hidden;},
  /** Chamado quando o jogo estiver pronto, para ligar o botão "Abrir guarda-roupa" ao editor de verdade. */
  onCharacterStep(open){onOpenCharacter=async()=>{await open();$('#onboard-finish').hidden=false;$('#onboard-open-character').textContent='Trocar de novo';};},
 };
}
