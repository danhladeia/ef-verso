// Partida de basquete 3x3 em quadra inteira, como simulação pura (sem Three.js nem DOM).
// Todo o estado é um objeto simples (serializável) e cada jogador só age por entradas:
// {mx,mz,sprint,shoot,pass,passTo}. Assim, humanos, bots e, no futuro, jogadores remotos usam a mesma porta:
// um anfitrião roda step() com as entradas de todos e envia o estado.
import {GRAVITY,throwShot,idealPower} from './basketball.js';

export const COURT={minX:16,maxX:38,minZ:-7,maxZ:7,midX:27};
export const BALL_R=.17,THREE_POINT=5.8,CHARGE_TIME=1.1,STEP=1/120;
export const RIM={radius:.305,tube:.03};
const BOARD={halfW:.9,minY:3.195,maxY:4.245,thick:.12};
// Medidas do modelo basket-hoop (Kenney) colocado em x=16 e x=38; dir aponta da tabela para a quadra.
export const HOOPS=[{x:16.9325,y:3.22,z:0,dir:1,board:16.4925},{x:37.0675,y:3.22,z:0,dir:-1,board:37.5075}];
export const TEAM_NAMES=['Verde','Laranja'];
const PLAYER_R=.35,SPEED=5,SPRINT=7.2,REACH=.6,STEAL_RANGE=1.2;

export const attackHoop=team=>HOOPS[team===0?1:0];
export const defendHoop=team=>HOOPS[team===0?0:1];
const hyp=Math.hypot,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const forwardOf=p=>({x:Math.sin(p.face),z:Math.cos(p.face)});
export const rightOf=p=>({x:-Math.cos(p.face),z:Math.sin(p.face)});
function random(s){s.seed=(s.seed+0x6D2B79F5)|0;let t=s.seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}

export function createMatch({seed=1,teamSize=3,target=11,duration=180,humans=[0]}={}){
 const players=[];
 for(let team=0;team<2;team++)for(let slot=0;slot<teamSize;slot++){const id=players.length;players.push({id,team,slot,human:humans.includes(id),x:COURT.midX,z:0,y:0,vx:0,vz:0,face:0,charging:false,charge:0,release:0,shotPower:0,throwing:0,jump:0,cool:0,gotAt:0,dribble:0,prev:{shoot:false,pass:false}});}
 const s={version:1,seed,time:0,clock:duration,target,phase:'ready',phaseTime:1.2,score:[0,0],possession:0,players,request:null,events:[],ai:{},
  ball:{x:COURT.midX,y:1,z:0,vx:0,vy:0,vz:0,holder:null,state:'held',shooter:null,points:2,touched:false,lastTeam:0,noPick:0,passTarget:null,age:0}};
 setupPossession(s,0);return s;
}

/** Recoloca os times: quem ataca começa no próprio campo com a bola; um humano do time recebe a bola. */
export function setupPossession(s,team){
 const H=attackHoop(team),toward=-H.dir;
 for(const p of s.players){
  const attack=p.team===team,spots=attack?[[-2.5,0],[1,-4],[1,4]]:[[1.5,0],[4,-3],[4,3]],spot=spots[p.slot%3];
  p.x=COURT.midX+toward*spot[0];p.z=spot[1];p.vx=p.vz=0;p.charging=false;p.charge=0;p.release=0;p.jump=0;p.throwing=0;
  p.face=Math.atan2(attack?toward:-toward,0);
 }
 const team0=s.players.filter(p=>p.team===team),holder=team0.find(p=>p.human)||team0[0];
 if(holder.slot!==0){const first=team0[0],x=first.x,z=first.z;first.x=holder.x;first.z=holder.z;holder.x=x;holder.z=z;}
 give(s,holder);s.possession=team;s.phase='ready';s.phaseTime=1.2;s.request=null;
}
function give(s,p){const b=s.ball;b.holder=p.id;b.state='held';b.shooter=null;b.passTarget=null;b.vx=b.vy=b.vz=0;p.gotAt=s.time;p.charging=false;p.charge=0;b.lastTeam=p.team;placeHeld(s,p);}

export function step(s,inputs={},dt=1/60){
 s.events=[];const n=Math.max(1,Math.ceil(dt/STEP-1e-6)),h=dt/n;
 for(let i=0;i<n;i++)tick(s,inputs,h);
 return s.events;
}
function emit(s,type,data={}){s.events.push({type,time:s.time,...data});}

function tick(s,inputs,h){
 s.time+=h;
 if(s.phase==='over')return;
 if(s.phase==='ready'){s.phaseTime-=h;if(s.phaseTime<=0){s.phase='live';emit(s,'live');}}
 else if(s.phase==='scored'){s.phaseTime-=h;if(s.phaseTime<=0){if(s.score[0]>=s.target||s.score[1]>=s.target||(s.clock<=0&&s.score[0]!==s.score[1]))finish(s);else setupPossession(s,1-s.lastScorer);}}
 else if(s.phase==='live'){s.clock=Math.max(0,s.clock-h);if(s.clock<=0&&s.ball.state!=='shot'&&s.score[0]!==s.score[1]){finish(s);return;}}
 for(const p of s.players)updatePlayer(s,p,inputs[p.id]||{},h);
 separate(s);
 updateBall(s,h);
}
function finish(s){s.phase='over';emit(s,'over',{winner:s.score[0]>s.score[1]?0:1});}

function updatePlayer(s,p,inp,h){
 const b=s.ball,live=s.phase==='live',holding=b.holder===p.id,shoot=!!inp.shoot,pass=!!inp.pass;
 const shootPress=shoot&&!p.prev.shoot,shootRelease=!shoot&&p.prev.shoot,passPress=pass&&!p.prev.pass;p.prev={shoot,pass};
 p.cool=Math.max(0,p.cool-h);p.throwing=Math.max(0,p.throwing-h);
 if(p.jump>0){p.jump=Math.max(0,p.jump-h);p.y=Math.sin(Math.PI*(1-p.jump/.55))*.55;}else p.y=0;
 if(holding&&live){
  if(p.release>0){p.release-=h;if(p.release<=0)launchShot(s,p);}
  else if(p.charging){p.charge=Math.min(1,p.charge+h/CHARGE_TIME);if(shootRelease||!shoot){p.charging=false;p.shotPower=p.charge;p.release=.22;p.throwing=.7;}}
  else if(shootPress){p.charging=true;p.charge=0;emit(s,'charge',{id:p.id});}
  else if(passPress)passBall(s,p,inp);
 }else if(live&&!holding){
  const holder=b.holder!=null?s.players[b.holder]:null;
  if(holder&&holder.team===p.team&&passPress){s.request={team:p.team,id:p.id,time:s.time};emit(s,'request',{id:p.id});}
  else if(holder&&holder.team!==p.team&&passPress&&p.cool<=0)trySteal(s,p,holder);
  if(shootPress&&p.jump<=0&&p.y===0&&(!holder||holder.team!==p.team)){p.jump=.55;emit(s,'jump',{id:p.id});}
 }
 // Movimento: quem carrega ou solta o arremesso fica parado e vira para a cesta.
 const locked=s.phase==='ready'||p.charging||p.release>0;
 let mx=locked?0:clamp(+inp.mx||0,-1,1),mz=locked?0:clamp(+inp.mz||0,-1,1);const len=hyp(mx,mz);if(len>1){mx/=len;mz/=len;}
 const top=(inp.sprint?SPRINT:SPEED)*(holding?.92:1),k=Math.min(1,h*12);
 p.vx+=(mx*top-p.vx)*k;p.vz+=(mz*top-p.vz)*k;p.x+=p.vx*h;p.z+=p.vz*h;
 p.x=clamp(p.x,COURT.minX+.3,COURT.maxX-.3);p.z=clamp(p.z,COURT.minZ+.3,COURT.maxZ-.3);
 let want=null;
 if(p.charging||p.release>0){const H=attackHoop(p.team);want=Math.atan2(H.x-p.x,H.z-p.z);}
 else if(hyp(p.vx,p.vz)>.4)want=Math.atan2(p.vx,p.vz);
 if(want!==null){const d=Math.atan2(Math.sin(want-p.face),Math.cos(want-p.face));p.face+=clamp(d,-h*14,h*14);}
 if(holding)p.dribble+=h*(hyp(p.vx,p.vz)>.6?7.5:0);
}
function separate(s){
 const ps=s.players;
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],b=ps[j],dx=b.x-a.x,dz=b.z-a.z,d=hyp(dx,dz),min=PLAYER_R*2;
  if(d<min){const nx=d>1e-6?dx/d:1,nz=d>1e-6?dz/d:0,push=(min-d)/2;a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;}}
}
export function placeHeld(s,p){
 const b=s.ball,f=forwardOf(p),r=rightOf(p),moving=hyp(p.vx,p.vz)>.6;
 if(p.charging||p.release>0){b.x=p.x+f.x*.3+r.x*.25;b.z=p.z+f.z*.3+r.z*.25;b.y=1.2+p.charge*.3+p.y;}
 else if(moving){b.x=p.x+f.x*.38+r.x*.32;b.z=p.z+f.z*.38+r.z*.32;b.y=BALL_R+(.95-BALL_R)*Math.abs(Math.sin(p.dribble));}
 else{b.x=p.x+f.x*.3+r.x*.3;b.z=p.z+f.z*.3+r.z*.3;b.y=.85+p.y;}
}
/** Ponto de onde a bola sai no arremesso (também usado para mostrar a força ideal). */
export function shotStart(p){const f=forwardOf(p),r=rightOf(p);return {x:p.x+f.x*.3+r.x*.2,y:1.55+p.y,z:p.z+f.z*.3+r.z*.2};}
export function idealCharge(p){return clamp(idealPower(shotStart(p),attackHoop(p.team)),0,1);}
function nearestOpponent(s,p){let best=null,dist=Infinity;for(const o of s.players)if(o.team!==p.team){const d=hyp(o.x-p.x,o.z-p.z);if(d<dist){dist=d;best=o;}}return {player:best,dist};}

function launchShot(s,p){
 const H=attackHoop(p.team),start=shotStart(p),{player:o,dist}=nearestOpponent(s,p);
 // Marcação: um defensor perto (e pulando) atrapalha a direção e a força.
 const contest=clamp((1.8-dist)/1.8,0,1)*(o&&o.jump>0?1.7:1);
 const angle=Math.atan2(H.x-start.x,H.z-start.z)+(random(s)-.5)*2*contest*.09,power=p.shotPower+(random(s)-.5)*2*contest*.06;
 const shot=throwShot(start,H,{x:Math.sin(angle),z:Math.cos(angle)},power),b=s.ball;
 Object.assign(b,{holder:null,state:'shot',x:start.x,y:start.y,z:start.z,vx:shot.velocity.x,vy:shot.velocity.y,vz:shot.velocity.z,shooter:p.id,touched:false,lastTeam:p.team,noPick:.4,age:0,
  points:hyp(start.x-H.x,start.z-H.z)>THREE_POINT?3:2});
 p.charging=false;p.release=0;emit(s,'shot',{id:p.id,team:p.team,points:b.points,contest,power:p.shotPower,ideal:shot.ideal});
}
export function pickPassTarget(s,p,inp={}){
 const mates=s.players.filter(o=>o.team===p.team&&o.id!==p.id);if(inp.passTo!=null){const m=mates.find(o=>o.id===inp.passTo);if(m)return m;}
 const len=hyp(inp.mx||0,inp.mz||0),f=len>.3?{x:inp.mx/len,z:inp.mz/len}:forwardOf(p);
 let best=null,score=-Infinity;for(const m of mates){const dx=m.x-p.x,dz=m.z-p.z,d=hyp(dx,dz)||1,v=(dx*f.x+dz*f.z)/d*2-d*.05+Math.min(3,nearestOpponent(s,m).dist)*.15;if(v>score){score=v;best=m;}}
 return best;
}
function passBall(s,p,inp){
 const m=pickPassTarget(s,p,inp);if(!m)return;
 const b=s.ball,f=forwardOf(p),start={x:p.x+f.x*.35,y:1.2,z:p.z+f.z*.35},d=hyp(m.x-start.x,m.z-start.z),t=clamp(d/12,.22,.8);
 const tx=m.x+m.vx*t,tz=m.z+m.vz*t,ty=1.1;
 Object.assign(b,{holder:null,state:'pass',x:start.x,y:start.y,z:start.z,vx:(tx-start.x)/t,vy:(ty-start.y+.5*GRAVITY*t*t)/t,vz:(tz-start.z)/t,shooter:null,passTarget:m.id,lastTeam:p.team,noPick:.12,age:0,passer:p.id});
 p.face=Math.atan2(m.x-p.x,m.z-p.z);p.throwing=.45;s.request=null;emit(s,'pass',{id:p.id,to:m.id,team:p.team});
}
function trySteal(s,p,holder){
 p.cool=.9;const d=hyp(holder.x-p.x,holder.z-p.z);if(d>STEAL_RANGE){emit(s,'reach',{id:p.id});return;}
 const chance=.28+(holder.charging?.2:0)+(hyp(holder.vx,holder.vz)>4?.1:0);
 if(random(s)<chance){give(s,p);s.possession=p.team;emit(s,'steal',{id:p.id,from:holder.id,team:p.team});}else emit(s,'reach',{id:p.id});
}

function updateBall(s,h){
 const b=s.ball;
 if(b.holder!=null){placeHeld(s,s.players[b.holder]);return;}
 b.age+=h;b.noPick=Math.max(0,b.noPick-h);
 const prevY=b.y;b.vy-=GRAVITY*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;
 for(const H of HOOPS){collideRim(s,b,H);collideBoard(s,b,H);}
 // Cesta: o centro da bola desce pelo plano do aro, por dentro dele.
 for(const H of HOOPS){
  const inside=hyp(b.x-H.x,b.z-H.z)<RIM.radius-RIM.tube;
  if(prevY>=H.y&&b.y<H.y&&inside&&b.state==='shot'){
   const team=s.players[b.shooter].team;
   if(H===attackHoop(team)&&s.phase==='live'){s.score[team]+=b.points;s.lastScorer=team;s.phase='scored';s.phaseTime=1.6;b.state='dead';emit(s,'score',{team,points:b.points,id:b.shooter});}
   else b.state='loose';
  }
  // A rede segura a bola e a solta embaixo do aro.
  if(inside&&b.y<H.y&&b.y>H.y-.5){b.vx*=1-h*6;b.vz*=1-h*6;b.vy=Math.max(b.vy,-3.2);}
 }
 if(b.y<BALL_R){b.y=BALL_R;if(b.vy<0){b.vy=-b.vy*.7;if(b.vy<.7)b.vy=0;b.vx*=.88;b.vz*=.88;if(b.state==='shot'){b.state='loose';emit(s,'miss',{id:b.shooter});}if(b.state==='pass')b.state='loose';}}
 if(b.y<=BALL_R+1e-3&&b.vy===0){b.vx*=1-h*1.5;b.vz*=1-h*1.5;}
 if(b.state==='pass'&&b.age>1.2)b.state='loose';
 if(s.phase!=='live')return;
 // Fora da quadra: a bola vai para o time que não tocou por último.
 if(b.y<.6&&(b.x<COURT.minX-.3||b.x>COURT.maxX+.3||Math.abs(b.z)>COURT.maxZ+.3)){
  const team=1-b.lastTeam,taker=s.players.filter(p=>p.team===team).sort((p,q)=>hyp(p.x-b.x,p.z-b.z)-hyp(q.x-b.x,q.z-b.z))[0];
  emit(s,'out',{team});taker.x=clamp(b.x,COURT.minX+.5,COURT.maxX-.5);taker.z=clamp(b.z,COURT.minZ+.5,COURT.maxZ-.5);give(s,taker);s.possession=team;return;
 }
 if(b.noPick>0)return;
 // Pegar a bola: no passe, qualquer um alcança (interceptação); no arremesso, só depois de tocar o aro, a tabela ou cair abaixo das mãos.
 if(b.state==='shot'&&!b.touched&&b.y>1.7)return;
 let best=null,dist=Infinity;
 for(const p of s.players){const d=hyp(p.x-b.x,p.z-b.z),top=p.jump>0?2.6:2.05;
  // No passe, o destinatário alcança mais longe; o adversário precisa estar bem na linha da bola.
  const reach=b.state!=='pass'?REACH:p.id===b.passTarget?.85:p.team===b.lastTeam?REACH:.38;if(d<reach&&b.y<top+p.y&&d<dist){dist=d;best=p;}}
 if(best){const state=b.state,before=b.lastTeam,passer=b.passer;give(s,best);
  emit(s,state==='pass'?(best.team===before?'catch':'intercept'):'rebound',{id:best.id,team:best.team,from:passer});
  if(best.team!==s.possession){s.possession=best.team;}
 }
}
function collideRim(s,b,H){
 const dx=b.x-H.x,dz=b.z-H.z,d=hyp(dx,dz);if(d<1e-6||Math.abs(b.y-H.y)>BALL_R+RIM.tube||d>RIM.radius+BALL_R+RIM.tube||d<RIM.radius-BALL_R-RIM.tube)return;
 const qx=H.x+dx/d*RIM.radius,qz=H.z+dz/d*RIM.radius;let nx=b.x-qx,ny=b.y-H.y,nz=b.z-qz;const len=hyp(nx,ny,nz),min=BALL_R+RIM.tube;
 if(len>=min||len<1e-6)return;nx/=len;ny/=len;nz/=len;
 b.x=qx+nx*min;b.y=H.y+ny*min;b.z=qz+nz*min;bounce(b,nx,ny,nz,.55,.85);
 if(!b.touched||b.age-(b.rimAt||0)>.15)emit(s,'rim',{});b.rimAt=b.age;b.touched=true;
}
function collideBoard(s,b,H){
 const x0=Math.min(H.board,H.board-H.dir*BOARD.thick),x1=Math.max(H.board,H.board-H.dir*BOARD.thick);
 const cx=clamp(b.x,x0,x1),cy=clamp(b.y,BOARD.minY,BOARD.maxY),cz=clamp(b.z,-BOARD.halfW,BOARD.halfW);
 let nx=b.x-cx,ny=b.y-cy,nz=b.z-cz,len=hyp(nx,ny,nz);if(len>=BALL_R)return;
 if(len<1e-6){nx=H.dir;ny=0;nz=0;len=1;b.x=H.dir>0?x1:x0;}else{nx/=len;ny/=len;nz/=len;}
 b.x=cx+nx*BALL_R;b.y=cy+ny*BALL_R;b.z=cz+nz*BALL_R;bounce(b,nx,ny,nz,.62,.9);
 if(!b.touched||b.age-(b.boardAt||0)>.15)emit(s,'board',{});b.boardAt=b.age;b.touched=true;
}
function bounce(b,nx,ny,nz,restitution,friction){
 const vn=b.vx*nx+b.vy*ny+b.vz*nz;if(vn>=0)return;
 const tx=b.vx-vn*nx,ty=b.vy-vn*ny,tz=b.vz-vn*nz;
 b.vx=tx*friction-vn*restitution*nx;b.vy=ty*friction-vn*restitution*ny;b.vz=tz*friction-vn*restitution*nz;
}
