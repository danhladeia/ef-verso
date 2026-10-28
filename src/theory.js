import './theory.css';
import {readStudent} from './onboarding.js';

// Trilha teórica dentro do jogo: 3 unidades de 5 semanas, lidas na Escola do Movimento. Cada semana é
// teoria curta + passo a passo + dica de segurança + pergunta para conversar + desafio de movimento,
// seguida de um quiz de 3 perguntas. A semana N só libera depois que a N-1 for concluída — na falta de
// um professor de verdade controlando a liberação semanal (ver README), isso soa o papel dele por ora.
export const PROGRESS_KEY='ef-verso-theory-v1';
function gradeFromClassName(className){const n=Number(String(className||'').match(/\d+/)?.[0]);return [6,7,8,9].includes(n)?n:7;}
function readProgress(grade){try{const p=JSON.parse(localStorage.getItem(PROGRESS_KEY));if(p?.grade===grade)return p;}catch{}return {grade,done:[]};}
function saveProgress(p){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(p));}catch{}}

export async function createTheory({stopMovement,wallet}){
 const $=s=>panel.querySelector(s);
 const grade=gradeFromClassName(readStudent()?.className);
 let data=null,progress=readProgress(grade),active=false,screen='trail',week=null,quizIndex=0,quizScore=0,picked=null;
 const panel=document.createElement('section');panel.id='theory';panel.hidden=true;panel.setAttribute('aria-label','Trilha teórica');
 document.body.append(panel);
 async function load(){if(data)return data;const r=await fetch(`/theory/grade-${grade}.json`);data=await r.json();return data;}
 function weekList(){return data.units.flatMap(u=>u.weeks.map(w=>({...w,unit:u.title,place:u.place})));}
 function unlocked(n){return n===1||progress.done.includes(n-1);}
 function render(){
  if(screen==='trail')renderTrail();else if(screen==='read')renderRead();else renderQuiz();
 }
 function renderTrail(){
  const weeks=weekList();
  panel.innerHTML=`<div class="theory-card"><div class="theory-head"><small>TRILHA TEÓRICA · ${grade}º ANO</small><button id="theory-close" aria-label="Fechar">Fechar</button></div>
   <p class="theory-coins">🪙 ${wallet.coins} moedas${wallet.badges.length?' · 🏅 '+wallet.badges.join(', 🏅 '):''} · ${progress.done.length} / ${weeks.length} semanas concluídas</p>
   <div class="theory-units"></div></div>`;
  const list=$('.theory-units');let lastUnit=null;
  for(const w of weeks){
   if(w.unit!==lastUnit){lastUnit=w.unit;const h=document.createElement('h3');h.className='theory-unit-title';h.textContent=w.unit+' · '+w.place;list.append(h);}
   const done=progress.done.includes(w.number),open=unlocked(w.number);
   const card=document.createElement('button');card.type='button';card.className='theory-week'+(done?' done':'')+(open?'':' locked');card.disabled=!open;
   card.innerHTML=`<span class="theory-week-n">${done?'✓':open?w.number:'🔒'}</span><span class="theory-week-text"><strong>Semana ${w.number} · ${w.title}</strong><small>${open?w.objective:'Conclua a semana anterior para liberar.'}</small></span>`;
   card.onclick=()=>{week=w;screen='read';render();};
   list.append(card);
  }
  $('#theory-close').onclick=close;
 }
 function renderRead(){
  panel.innerHTML=`<div class="theory-card"><div class="theory-head"><small>SEMANA ${week.number} · ${week.unit}</small><button id="theory-back" aria-label="Voltar">← Trilha</button></div>
   <h2>${week.title}</h2><p class="theory-objective">${week.objective}</p>
   ${week.theory.map(p=>`<p>${p}</p>`).join('')}
   <h4>Passo a passo</h4><ol>${week.steps.map(s=>`<li>${s}</li>`).join('')}</ol>
   <p class="theory-tip">⚠️ <strong>Fique ligado:</strong> ${week.safety}</p>
   <p class="theory-discuss">💬 <strong>Pense e converse:</strong> ${week.discuss}</p>
   <p class="theory-challenge">🏃 <strong>Desafio de movimento:</strong> ${week.challenge}</p>
   <button id="theory-quiz" class="theory-primary">Fazer o quiz (3 perguntas)</button></div>`;
  $('#theory-back').onclick=()=>{screen='trail';render();};
  $('#theory-quiz').onclick=()=>{quizIndex=0;quizScore=0;picked=null;screen='quiz';render();};
 }
 function renderQuiz(){
  if(quizIndex>=week.quiz.length){
   const already=progress.done.includes(week.number),reward=already?0:quizScore*10;
   if(!already){progress.done.push(week.number);saveProgress(progress);wallet.award(reward);}
   const allDone=progress.done.length>=weekList().length;if(allDone)wallet.award(0,'Trilha Teórica · '+grade+'º ano');
   panel.innerHTML=`<div class="theory-card theory-result"><h2>${quizScore===3?'Mandou bem! 🎉':'Quiz concluído'}</h2>
    <p>Você acertou ${quizScore} de ${week.quiz.length} perguntas.${reward?` +${reward} moedas da trilha.`:''}</p>
    <button id="theory-trail" class="theory-primary">Voltar à trilha</button></div>`;
   $('#theory-trail').onclick=()=>{screen='trail';render();};return;
  }
  const q=week.quiz[quizIndex];
  panel.innerHTML=`<div class="theory-card"><small>PERGUNTA ${quizIndex+1} DE ${week.quiz.length}</small><h2>${q.question}</h2>
   <div class="theory-options"></div><p class="theory-feedback" id="theory-feedback" role="status"></p>
   <button id="theory-next" class="theory-primary" hidden>Continuar</button></div>`;
  const opts=$('.theory-options');
  q.options.forEach((text,i)=>{
   const b=document.createElement('button');b.type='button';b.className='theory-option';b.textContent=text;
   b.onclick=()=>{
    if(picked!=null)return;picked=i;
    [...opts.children].forEach((c,j)=>{if(j===q.correct)c.classList.add('correct');else if(j===i)c.classList.add('wrong');c.disabled=true;});
    if(i===q.correct){quizScore++;$('#theory-feedback').textContent='Isso aí! ✓';}
    else $('#theory-feedback').textContent='Quase — a certa era: '+q.options[q.correct];
    $('#theory-next').hidden=false;
   };
   opts.append(b);
  });
  $('#theory-next').onclick=()=>{quizIndex++;picked=null;render();};
 }
 async function open(){active=true;stopMovement();document.body.classList.add('theory-active');panel.hidden=false;await load();screen='trail';render();}
 function close(){active=false;document.body.classList.remove('theory-active');panel.hidden=true;}
 return {open,get active(){return active;},get grade(){return grade;}};
}
