// Partida de vôlei 3x3 — simulação pura, no mesmo desenho de hoops-sim.js/soccer-sim.js. A rede fica
// em COURT.netX: o time 0 joga do lado x<netX, o time 1 do lado x>netX; os dois times ficam de frente
// para a rede (o ataque é ao longo do eixo X), como pede a câmera fixa atrás de cada linha de fundo.
// Versão arcade: uma tacada por toque (sem contar bloqueio/levantamento/ataque separados).
export const GRAVITY=9.8;
export const COURT={netX:23,minX:14,maxX:32,minZ:71.5,maxZ:80.5},NET_HEIGHT=2.3,BALL_R=.22,PLAYER_R=.35,REACH=1.3,SPEED=4.6,HIT_HEIGHT=2.5,STEP=1/120;
const hyp=Math.hypot,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function random(s){s.seed=(s.seed+0x6D2B79F5)|0;let t=s.seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
export const sideOf=team=>team===0?-1:1; // -1: joga em x<netX; +1: joga em x>netX

export function createMatch({seed=1,teamSize=3,target=11,duration=180,humans=[0]}={}){
 const players=[];
 for(let team=0;team<2;team++)for(let slot=0;slot<teamSize;slot++){const id=players.length;players.push({id,team,slot,human:humans.includes(id),x:0,z:0,y:0,vx:0,vz:0,jump:0,face:0,cool:0,prev:{hit:false}});}
 const s={version:1,seed,time:0,clock:duration,target,phase:'serve',phaseTime:1.2,score:[0,0],serve:0,players,events:[],
  ball:{x:0,y:1,z:76,vx:0,vy:0,vz:0,holder:null,lastTeam:0,touches:0,noPick:0,age:0}};
 setupServe(s,0);return s;
}
export function setupServe(s,team){
 const side=sideOf(team);
 for(const p of s.players){
  const spots=[[2.4,0],[6.2,-2.6],[6.2,2.6]],spot=spots[p.slot%3];
  p.x=COURT.netX+side*spot[0];p.z=76+spot[1];p.vx=p.vz=0;p.jump=0;p.face=Math.atan2(-side,0);
 }
 const t=s.players.filter(p=>p.team===team),server=t.find(p=>p.human)||t[0];
 s.serve=team;s.ball.holder=server.id;s.ball.touches=0;s.ball.lastTeam=team;s.phase='serve';s.phaseTime=.9;
 placeHeld(s,server);
}
export function step(s,inputs={},dt=1/60){s.events=[];const n=Math.max(1,Math.ceil(dt/STEP-1e-6)),h=dt/n;for(let i=0;i<n;i++)tick(s,inputs,h);return s.events;}
function emit(s,type,data={}){s.events.push({type,time:s.time,...data});}
function finish(s){s.phase='over';emit(s,'over',{winner:s.score[0]>s.score[1]?0:1});}

function tick(s,inputs,h){
 s.time+=h;if(s.phase==='over')return;
 if(s.phase==='serve'){s.phaseTime-=h;if(s.phaseTime<=0&&s.ball.holder!=null){const p=s.players[s.ball.holder],hit=inputs[p.id]?.hit;if(hit||!p.human||s.phaseTime<-1.4)serveBall(s,p,inputs[p.id]);}}
 else if(s.phase==='point'){s.phaseTime-=h;if(s.phaseTime<=0){if(s.score[0]>=s.target||s.score[1]>=s.target||(s.clock<=0&&s.score[0]!==s.score[1]))finish(s);else setupServe(s,s.lastWinner);}}
 else if(s.phase==='live')s.clock=Math.max(0,s.clock-h);
 for(const p of s.players)updatePlayer(s,p,inputs[p.id]||{},h);
 separate(s);updateBall(s,h,inputs);
}
function updatePlayer(s,p,inp,h){
 const b=s.ball,live=s.phase==='live'||s.phase==='serve',holding=b.holder===p.id,hit=!!inp.hit,hitPress=hit&&!p.prev.hit;p.prev={hit};
 p.cool=Math.max(0,p.cool-h);
 if(p.jump>0){p.jump=Math.max(0,p.jump-h);p.y=Math.sin(Math.PI*(1-p.jump/.5))*.62;}else p.y=0;
 if(live&&!holding&&hitPress&&p.jump<=0&&p.y===0&&p.cool<=0){p.jump=.5;p.cool=.15;}
 const side=sideOf(p.team);
 let mx=clamp(+inp.mx||0,-1,1),mz=clamp(+inp.mz||0,-1,1);const len=hyp(mx,mz);if(len>1){mx/=len;mz/=len;}
 const k=Math.min(1,h*10);p.vx+=(mx*SPEED-p.vx)*k;p.vz+=(mz*SPEED-p.vz)*k;p.x+=p.vx*h;p.z+=p.vz*h;
 // Cada time fica confinado à própria quadra, de frente para a rede.
 p.x=side<0?clamp(p.x,COURT.minX+.3,COURT.netX-.3):clamp(p.x,COURT.netX+.3,COURT.maxX-.3);
 p.z=clamp(p.z,COURT.minZ+.3,COURT.maxZ-.3);p.face=Math.atan2(-side,0);
}
function separate(s){const ps=s.players;for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],b=ps[j];if(a.team!==b.team)continue;const dx=b.x-a.x,dz=b.z-a.z,d=hyp(dx,dz),min=PLAYER_R*2;if(d<min){const nx=d>1e-6?dx/d:1,nz=d>1e-6?dz/d:0,push=(min-d)/2;a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;}}}
function placeHeld(s,p){const b=s.ball,side=sideOf(p.team);b.x=p.x-side*.55;b.y=1.2+p.y;b.z=p.z;}

/** Lança a bola com uma altura de pico dada, caindo até y=0 no fim do percurso (toque de rede incluso). */
function arc(ball,p,start,target,team,apexAbove){
 const apex=Math.max(start.y+.3,apexAbove),vy=Math.sqrt(2*GRAVITY*(apex-start.y)),t=(vy+Math.sqrt(vy*vy+2*GRAVITY*start.y))/GRAVITY;
 const d=hyp(target.x-start.x,target.z-start.z)||.5;
 Object.assign(ball,{holder:null,x:start.x,y:start.y,z:start.z,vx:(target.x-start.x)/t,vy,vz:(target.z-start.z)/t,lastTeam:team,touches:0,noPick:.17,age:0});
}
function serveBall(s,p){
 const side=sideOf(p.team),target={x:COURT.netX-side*(6+random(s)*3),z:clamp(76+(random(s)-.5)*6,COURT.minZ+1,COURT.maxZ-1)};
 arc(s.ball,p,{x:p.x,y:1.4,z:p.z},target,p.team,NET_HEIGHT+.7);s.phase='live';emit(s,'serve',{id:p.id,team:p.team});
}
/** Para onde a tacada manda a bola: perto da linha de fundo adversária por padrão, ou guiada pelo movimento. */
function aimTarget(s,p,inp){
 const side=sideOf(p.team),defSide=-side,steer=clamp(inp?.mx||0,-1,1),depth=clamp(inp?.mz||0,-1,1);
 if(Math.abs(steer)>.15||Math.abs(depth)>.15)return {x:COURT.netX+defSide*clamp(4.5+depth*3,1.5,8),z:clamp(p.z+steer*4,COURT.minZ+1,COURT.maxZ-1)};
 return {x:COURT.netX+defSide*(4+random(s)*3),z:clamp(76+(random(s)-.5)*6,COURT.minZ+1,COURT.maxZ-1)};
}
function hitBall(s,p,inp){
 const start={x:p.x,y:1.2+p.y+(p.jump>0?.35:0),z:p.z};
 arc(s.ball,p,start,aimTarget(s,p,inp),p.team,NET_HEIGHT+(p.jump>0?.9:.5));
 emit(s,'hit',{id:p.id,team:p.team,spike:p.jump>0});
}
function updateBall(s,h,inputs){
 const b=s.ball;if(b.holder!=null){placeHeld(s,s.players[b.holder]);return;}
 if(s.phase!=='live')return; // entre os pontos, a bola fica parada onde caiu
 b.age+=h;b.noPick=Math.max(0,b.noPick-h);const prevX=b.x;
 b.vy-=GRAVITY*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;
 // Rede: obstáculo vertical fino em x=netX; a bola que bate nela cai do lado de quem mandou.
 if((prevX-COURT.netX)*(b.x-COURT.netX)<0&&b.y<NET_HEIGHT){b.x=COURT.netX+Math.sign(prevX-COURT.netX)*.05;b.vx=0;}
 if(s.phase==='live'&&b.y<=BALL_R){
  b.y=BALL_R;
  const landedSide=b.x<COURT.netX?-1:1,inBounds=b.x>COURT.minX&&b.x<COURT.maxX&&b.z>COURT.minZ&&b.z<COURT.maxZ;
  const winner=inBounds?(landedSide<0?1:0):1-b.lastTeam;
  s.score[winner]++;s.lastWinner=winner;s.phase='point';s.phaseTime=1.5;b.holder=null;b.vx=b.vy=b.vz=0;
  emit(s,'point',{team:winner,out:!inBounds});return;
 }
 if(b.noPick>0||s.phase!=='live')return;
 // Pular é o jeito de atacar: perto da rede, numa bola alta (no nível dela ou mais), só quem estiver
 // no salto rebate — como um ataque/bloqueio de verdade. Mais longe da rede, ainda dá pra cavar/passar
 // sem pular (senão o jogo vira "ninguém nunca alcança", sem ninguém pra treinar o tempo do salto).
 const DIG_HEIGHT=1.8;
 let best=null,dist=Infinity;
 for(const p of s.players){const side=sideOf(p.team);if((b.x-COURT.netX)*side<-.3)continue;const jumping=p.jump>0;if(!jumping&&b.y>=DIG_HEIGHT)continue;const d=hyp(p.x-b.x,p.z-b.z),top=jumping?HIT_HEIGHT+.6:DIG_HEIGHT;if(d<REACH&&b.y<top&&d<dist){dist=d;best=p;}}
 if(best){b.touches++;emit(s,'touch',{id:best.id,team:best.team});hitBall(s,best,inputs[best.id]||{});}
}
