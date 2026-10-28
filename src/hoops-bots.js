// Bots do 3x3: decidem como um jogador, devolvendo só entradas {mx,mz,sprint,shoot,pass,passTo}.
// A memória de cada bot fica em s.ai (parte do estado), então a partida continua determinística.
import {attackHoop,defendHoop,idealCharge,COURT} from './hoops-sim.js';

const hyp=Math.hypot,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function random(s){s.seed=(s.seed+0x6D2B79F5)|0;let t=s.seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
function toward(p,x,z,stop=.25){const dx=x-p.x,dz=z-p.z,d=hyp(dx,dz);return d<stop?{mx:0,mz:0,d}:{mx:dx/d*Math.min(1,d/.8),mz:dz/d*Math.min(1,d/.8),d};}
const nearest=(s,p,team)=>{let best=null,dist=Infinity;for(const o of s.players)if(o.team===team&&o!==p){const d=hyp(o.x-p.x,o.z-p.z);if(d<dist){dist=d;best=o;}}return {player:best,dist};};

/** Entradas de todos os bots (jogadores que não são humanos). skill: 0 (iniciante) a 1. */
export function botInputs(s,{skill=.5,ids=s.players.filter(p=>!p.human).map(p=>p.id)}={}){
 const out={};for(const id of ids)out[id]=botInput(s,s.players[id],skill);return out;
}
function botInput(s,p,skill){
 const ai=s.ai[p.id]??={next:0,mx:0,mz:0,charge:.5,shoot:false,pass:false,passTo:null,cut:0,sprint:false};
 const b=s.ball,input={mx:ai.mx,mz:ai.mz,sprint:ai.sprint,shoot:false,pass:false,passTo:null};
 if(s.phase!=='live'&&s.phase!=='scored')return {mx:0,mz:0};
 // Carregando o arremesso: segura até a força escolhida e solta.
 if(b.holder===p.id&&p.charging){input.mx=input.mz=0;input.shoot=p.charge<ai.charge;return input;}
 if(s.time<ai.next){input.shoot=ai.shoot;input.pass=ai.pass;input.passTo=ai.passTo;ai.pass=false;ai.shoot=false;return input;}
 ai.next=s.time+.18+random(s)*.12;ai.shoot=ai.pass=false;ai.passTo=null;ai.sprint=false;
 const holder=b.holder!=null?s.players[b.holder]:null,H=attackHoop(p.team),D=defendHoop(p.team),court=-H.dir;
 let move={mx:0,mz:0};
 if(s.phase==='scored'){move=toward(p,COURT.midX+(p.team===s.lastScorer?court*-2:court*-4),p.z*.8);}
 else if(holder===p){
  const d=hyp(H.x-p.x,H.z-p.z),guard=nearest(s,p,1-p.team),held=s.time-p.gotAt;
  const request=s.request&&s.request.team===p.team&&s.time-s.request.time<1.5&&s.request.id!==p.id?s.players[s.request.id]:null;
  const open=guard.dist>1.25,close=d<2.4;
  if(request&&nearest(s,request,1-p.team).dist>1){ai.pass=true;ai.passTo=request.id;}
  else if((close&&held>.25)||(d<6.4&&open&&held>.6)||(d<5&&held>1.8)||(held>4.5&&d<8.5)){
   // Força com erro que diminui com a habilidade; a ajuda do jogo corrige só um pouco.
   ai.charge=clamp(idealCharge(p)+(random(s)-.5)*(.5-skill*.3),.05,1);ai.shoot=true;
  }else if((held>2.4&&random(s)<.35)||(guard.dist<.9&&held>.8&&random(s)<.5)){
   const mates=s.players.filter(o=>o.team===p.team&&o!==p).map(o=>({o,open:nearest(s,o,1-p.team).dist,d:hyp(H.x-o.x,H.z-o.z)})).sort((a,b)=>(b.open-b.d*.15)-(a.open-a.d*.15));
   if(mates[0]&&mates[0].open>1.2){ai.pass=true;ai.passTo=mates[0].o.id;}
  }
  if(!ai.shoot&&!ai.pass){
   // Ataca a cesta contornando o marcador.
   let tx=H.x+H.dir*1.4,tz=clamp(p.z*.6,-2,2);
   if(guard.player&&guard.dist<2){const side=Math.sign(p.z-guard.player.z)||(random(s)<.5?-1:1);tz=clamp(p.z+side*2.2,-5.5,5.5);tx=p.x+court*1.5;}
   move=toward(p,tx,tz,.1);ai.sprint=d>9;
  }
 }else if(holder&&holder.team===p.team){
  // Ataque sem bola: espaçamento em asas e cantos; às vezes corta para a cesta.
  const spots=[[4.8,-4.2],[4.8,4.2],[1.2,-5.6],[1.2,5.6],[6.2,0]],used=s.players.filter(o=>o.team===p.team&&o!==holder).sort((a,b)=>a.slot-b.slot),i=used.indexOf(p);
  if(ai.cut<s.time-5&&random(s)<.08){ai.cut=s.time;}
  const cutting=s.time-ai.cut<1.4,spot=cutting?[1.6,p.z>0?1:-1]:spots[(i*2+(p.slot%2))%spots.length];
  move=toward(p,H.x+H.dir*spot[0],spot[1]);ai.sprint=cutting||move.d>6;
 }else if(holder){
  // Defesa individual: fica entre o adversário do mesmo número e a própria cesta.
  const mark=s.players.find(o=>o.team!==p.team&&o.slot===p.slot)||holder,onBall=mark===holder;
  const dx=D.x-mark.x,dz=D.z-mark.z,dd=hyp(dx,dz)||1,gap=onBall?1.15:1.8;
  move=toward(p,mark.x+dx/dd*gap,mark.z+dz/dd*gap,.15);ai.sprint=move.d>3;
  const dist=hyp(holder.x-p.x,holder.z-p.z);
  if(onBall&&holder.charging&&dist<1.6)ai.shoot=true;
  else if(onBall&&dist<1.1&&p.cool<=0&&random(s)<.1+skill*.1)ai.pass=true;
 }else{
  // Bola solta (rebote, passe errado): o mais perto de cada time corre para ela; os outros voltam.
  const mates=s.players.filter(o=>o.team===p.team).sort((a,c)=>hyp(a.x-b.x,a.z-b.z)-hyp(c.x-b.x,c.z-b.z));
  if(b.state==='pass'&&b.passTarget===p.id)move=toward(p,b.x+b.vx*.25,b.z+b.vz*.25,.05);
  else if(mates[0]===p||(b.state==='shot'&&mates[1]===p)){move=toward(p,b.x+b.vx*.3,b.z+b.vz*.3,.05);ai.sprint=true;if(b.y>2.1&&b.y<2.9&&hyp(b.x-p.x,b.z-p.z)<.8)ai.shoot=true;}
  else{const back=b.state==='shot'&&s.players[b.shooter]?.team===p.team?H:D;move=toward(p,back.x+back.dir*3.5,(p.slot-1)*3);}
 }
 ai.mx=move.mx;ai.mz=move.mz;input.mx=move.mx;input.mz=move.mz;input.sprint=ai.sprint;input.shoot=ai.shoot;input.pass=ai.pass;input.passTo=ai.passTo;
 return input;
}
