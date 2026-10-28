// Sistema genérico de missões: uma carteira única (moedas e insígnias) compartilhada por todas as
// atividades, e um construtor de "missão contador" para criar missões novas (gol, ponto, semana da
// trilha…) em poucas linhas, sem escrever tela nem reducer do zero. A missão de basquete (com diálogo
// e etapas) continua em quest-state.js/mission.js — é especial demais para caber num contador —, mas
// agora também recompensa pela carteira única, para o aluno ver as moedas de qualquer atividade juntas.
export const WALLET_KEY='ef-verso-wallet-v1';

function loadWallet(storage){
 try{const w=JSON.parse(storage.getItem(WALLET_KEY));if(w&&Number.isFinite(w.coins)&&Array.isArray(w.badges))return {coins:Math.max(0,Math.floor(w.coins)),badges:[...new Set(w.badges.filter(b=>typeof b==='string'))]};}catch{}
 return {coins:0,badges:[]};
}
/** Carteira única: moedas e insígnias de todas as missões (basquete, trilha teórica, futebol, vôlei…). */
export function createWallet(storage){
 let wallet=loadWallet(storage),saved=true;
 function save(){try{storage.setItem(WALLET_KEY,JSON.stringify(wallet));saved=true;}catch{saved=false;}}
 return {
  get coins(){return wallet.coins;},
  get badges(){return wallet.badges;},
  get saved(){return saved;},
  /** Dá moedas e, opcionalmente, uma insígnia. Chamar de novo com a mesma insígnia não dá nada (idempotente). */
  award(coins=0,badge=null){
   if(badge&&wallet.badges.includes(badge))return;
   if(coins<=0&&!badge)return;
   wallet={coins:wallet.coins+Math.max(0,Math.floor(coins)),badges:badge?[...wallet.badges,badge]:wallet.badges};
   save();
  },
 };
}

/** Missão "contador": completa ao acontecer `target` vezes um evento (gol, ponto, cesta, semana lida…).
 * Uma linha para criar, uma linha para avançar (`mission.progress()`); a recompensa vai para a carteira
 * compartilhada, uma única vez, mesmo chamando progress() depois de já ter completado. */
export function createCounterMission({id,target=1,coinsOnComplete=0,badge=null},storage,wallet){
 const key=`ef-verso-mission-${id}-v1`;
 let count=0,done=false,saved=true;
 try{const s=JSON.parse(storage.getItem(key));if(s){count=Math.min(target,Math.max(0,Math.floor(s.count)||0));done=!!s.done;}}catch{saved=false;}
 function save(){try{storage.setItem(key,JSON.stringify({count,done}));saved=true;}catch{saved=false;}}
 function progress(n=1){
  if(done)return false;
  count=Math.min(target,count+Math.max(0,n));
  const justCompleted=count>=target;
  if(justCompleted){done=true;wallet.award(coinsOnComplete,badge);}
  save();return justCompleted;
 }
 return {id,target,progress,get count(){return count;},get done(){return done;},get saved(){return saved;}};
}
