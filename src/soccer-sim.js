// Partida de futebol 3x3 em quadra inteira, simulação pura (sem Three.js nem DOM) — mesmo desenho
// de hoops-sim.js: cada jogador só age por {mx,mz,sprint,shoot,pass}, pronta para humanos, bots ou,
// no futuro, jogadores remotos.
export const GRAVITY=9.8;
export const FIELD={minX:63,maxX:87,minZ:59,maxZ:89,midX:75,midZ:74};
export const BALL_R=.25,PLAYER_R=.35,GOAL_HALF=3,GOAL_HEIGHT=2.2,CHARGE_TIME=.6,SPEED=5.4,SPRINT=7.6,REACH=.55,STEAL_RANGE=1.1,STEP=1/120;
export const GOALS=[{z:59,dir:1},{z:89,dir:-1}];
export const attackGoal=team=>GOALS[team===0?1:0];
export const defendGoal=team=>GOALS[team===0?0:1];
const hyp=Math.hypot,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const forwardOf=p=>({x:Math.sin(p.face),z:Math.cos(p.face)});
function random(s){s.seed=(s.seed+0x6D2B79F5)|0;let t=s.seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}

export function createMatch({seed=1,teamSize=3,duration=150,humans=[0]}={}){
 const players=[];
 for(let team=0;team<2;team++)for(let slot=0;slot<teamSize;slot++){const id=players.length;players.push({id,team,slot,human:humans.includes(id),x:FIELD.midX??75,z:FIELD.midZ,vx:0,vz:0,face:0,charging:false,charge:0,release:0,cool:0,prev:{shoot:false,pass:false}});}
 const s={version:1,seed,time:0,clock:duration,phase:'ready',phaseTime:1.2,score:[0,0],players,request:null,events:[],
  ball:{x:75,y:.6,z:74,vx:0,vy:0,vz:0,holder:null,kicker:null,touched:false,lastTeam:0,noPick:0,age:0}};
 setupKickoff(s,0);return s;
}
export function setupKickoff(s,team){
 for(const p of s.players){
  const attack=p.team===team,forward=attackGoal(p.team).dir,spots=[[0,-4],[-4,-9],[4,-9]],spot=spots[p.slot%3];
  p.x=75+spot[0]*(attack?.6:1);p.z=74+forward*spot[1]*(attack?.5:1.3);p.vx=p.vz=0;p.charging=false;p.charge=0;p.release=0;
  p.face=Math.atan2(0,forward);
 }
 const t=s.players.filter(p=>p.team===team),holder=t.find(p=>p.human)||t[0];give(s,holder);s.phase='ready';s.phaseTime=1;s.request=null;
}
function give(s,p){const b=s.ball;b.holder=p.id;b.kicker=null;b.vx=b.vy=b.vz=0;b.lastTeam=p.team;p.charging=false;p.charge=0;placeHeld(s,p);}
export function step(s,inputs={},dt=1/60){s.events=[];const n=Math.max(1,Math.ceil(dt/STEP-1e-6)),h=dt/n;for(let i=0;i<n;i++)tick(s,inputs,h);return s.events;}
function emit(s,type,data={}){s.events.push({type,time:s.time,...data});}
function finish(s){s.phase='over';emit(s,'over',{winner:s.score[0]===s.score[1]?-1:s.score[0]>s.score[1]?0:1});}

function tick(s,inputs,h){
 s.time+=h;if(s.phase==='over')return;
 if(s.phase==='ready'){s.phaseTime-=h;if(s.phaseTime<=0){s.phase='live';emit(s,'live');}}
 else if(s.phase==='scored'){s.phaseTime-=h;if(s.phaseTime<=0){if(s.clock<=0)finish(s);else setupKickoff(s,1-s.lastScorer);}}
 else if(s.phase==='live'){s.clock=Math.max(0,s.clock-h);if(s.clock<=0&&s.ball.holder==null&&s.ball.y<.4){if(s.score[0]!==s.score[1])finish(s);else s.clock=12;}}
 for(const p of s.players)updatePlayer(s,p,inputs[p.id]||{},h);
 separate(s);updateBall(s,h);
}
function updatePlayer(s,p,inp,h){
 const b=s.ball,live=s.phase==='live',holding=b.holder===p.id,shoot=!!inp.shoot,pass=!!inp.pass;
 const shootPress=shoot&&!p.prev.shoot,shootRelease=!shoot&&p.prev.shoot,passPress=pass&&!p.prev.pass;p.prev={shoot,pass};
 p.cool=Math.max(0,p.cool-h);
 if(holding&&live){
  if(p.release>0){p.release-=h;if(p.release<=0)kick(s,p);}
  else if(p.charging){p.charge=Math.min(1,p.charge+h/CHARGE_TIME);if(shootRelease||!shoot){p.charging=false;p.power=p.charge;p.release=.08;}}
  else if(shootPress){p.charging=true;p.charge=0;}
  else if(passPress)passBall(s,p,inp);
 }else if(live&&!holding){
  const holder=b.holder!=null?s.players[b.holder]:null;
  if(holder&&holder.team!==p.team&&(shootPress||passPress)&&p.cool<=0)tryTackle(s,p,holder);
 }
 const locked=s.phase==='ready'||p.charging||p.release>0;
 const rawMx=clamp(+inp.mx||0,-1,1),rawMz=clamp(+inp.mz||0,-1,1);
 let mx=locked?0:rawMx,mz=locked?0:rawMz;const len=hyp(mx,mz);if(len>1){mx/=len;mz/=len;}
 const top=(inp.sprint?SPRINT:SPEED)*(holding?.88:1),k=Math.min(1,h*11);
 p.vx+=(mx*top-p.vx)*k;p.vz+=(mz*top-p.vz)*k;p.x+=p.vx*h;p.z+=p.vz*h;
 p.x=clamp(p.x,FIELD.minX+.3,FIELD.maxX-.3);p.z=clamp(p.z,FIELD.minZ+.3,FIELD.maxZ-.3);
 // A mira do chute é para onde o aluno está olhando: enquanto carrega a força, o movimento (joystick/WASD)
 // vira o corpo, como apontar; soltando o passe/movimento, a mira trava na última direção.
 let want=null;
 if(p.charging&&hyp(rawMx,rawMz)>.2)want=Math.atan2(rawMx,rawMz);
 else if(!p.charging&&p.release<=0&&hyp(p.vx,p.vz)>.4)want=Math.atan2(p.vx,p.vz);
 if(want!==null){const d=Math.atan2(Math.sin(want-p.face),Math.cos(want-p.face));p.face+=clamp(d,-h*15,h*15);}
}
function separate(s){const ps=s.players;for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],b=ps[j],dx=b.x-a.x,dz=b.z-a.z,d=hyp(dx,dz),min=PLAYER_R*2;if(d<min){const nx=d>1e-6?dx/d:1,nz=d>1e-6?dz/d:0,push=(min-d)/2;a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;}}}
function placeHeld(s,p){const b=s.ball,f=forwardOf(p);b.x=p.x+f.x*.55;b.y=BALL_R;b.z=p.z+f.z*.55;}
export function shotStart(p){const f=forwardOf(p);return {x:p.x+f.x*.5,y:BALL_R,z:p.z+f.z*.5};}
function nearestOpponent(s,p){let best=null,dist=Infinity;for(const o of s.players)if(o.team!==p.team){const d=hyp(o.x-p.x,o.z-p.z);if(d<dist){dist=d;best=o;}}return {player:best,dist};}
export function pickPassTarget(s,p,inp={}){
 const mates=s.players.filter(o=>o.team===p.team&&o.id!==p.id);if(inp.passTo!=null){const m=mates.find(o=>o.id===inp.passTo);if(m)return m;}
 const len=hyp(inp.mx||0,inp.mz||0),f=len>.3?{x:inp.mx/len,z:inp.mz/len}:forwardOf(p);
 let best=null,score=-Infinity;for(const m of mates){const dx=m.x-p.x,dz=m.z-p.z,d=hyp(dx,dz)||1,v=(dx*f.x+dz*f.z)/d*2-d*.04+Math.min(3,nearestOpponent(s,m).dist)*.12;if(v>score){score=v;best=m;}}
 return best;
}
// Como no basquete: o chute segue para onde o aluno está olhando, com uma ajuda sutil de mira
// quando ele já está quase de frente para o gol (até ~16°); virado para longe do gol, o chute vai largo.
const AIM_FULL=16*Math.PI/180,AIM_WINDOW=42*Math.PI/180,AIM_HELP=.7;
function kick(s,p){
 const G=attackGoal(p.team),start=shotStart(p),{player:o,dist}=nearestOpponent(s,p),contest=clamp((1.4-dist)/1.4,0,1);
 let heading=p.face;const toGoal=Math.atan2(75-start.x,G.z-start.z),miss=Math.atan2(Math.sin(toGoal-heading),Math.cos(toGoal-heading)),abs=Math.abs(miss);
 const help=abs<AIM_FULL?AIM_HELP:abs<AIM_WINDOW?AIM_HELP*(AIM_WINDOW-abs)/(AIM_WINDOW-AIM_FULL):0;
 heading+=miss*help+(random(s)-.5)*2*contest*.1;
 const power=p.power??p.charge,speed=6+power*11,flat=speed*.82,up=speed*.42+1.2;
 const b=s.ball;Object.assign(b,{holder:null,x:start.x,y:start.y,z:start.z,vx:Math.sin(heading)*flat,vy:up,vz:Math.cos(heading)*flat,kicker:p.id,touched:false,lastTeam:p.team,noPick:.3,age:0});
 p.charging=false;p.release=0;emit(s,'shot',{id:p.id,team:p.team,power,heading});
}
function passBall(s,p,inp){
 const m=pickPassTarget(s,p,inp);if(!m)return;const b=s.ball,start=shotStart(p),d=hyp(m.x-start.x,m.z-start.z),t=clamp(d/9,.25,1.1);
 const tx=m.x+m.vx*t,tz=m.z+m.vz*t;Object.assign(b,{holder:null,x:start.x,y:start.y,z:start.z,vx:(tx-start.x)/t,vy:.65/t,vz:(tz-start.z)/t,kicker:p.id,passTarget:m.id,touched:false,lastTeam:p.team,noPick:.12,age:0});
 p.face=Math.atan2(m.x-p.x,m.z-p.z);s.request=null;emit(s,'pass',{id:p.id,to:m.id,team:p.team});
}
function tryTackle(s,p,holder){
 p.cool=.8;const d=hyp(holder.x-p.x,holder.z-p.z);if(d>STEAL_RANGE)return;
 if(random(s)<.3+(holder.charging?.15:0)){give(s,p);emit(s,'tackle',{id:p.id,from:holder.id,team:p.team});}else emit(s,'challenge',{id:p.id});
}
function updateBall(s,h){
 const b=s.ball;if(b.holder!=null){placeHeld(s,s.players[b.holder]);return;}
 b.age+=h;b.noPick=Math.max(0,b.noPick-h);const prevZ=b.z;
 const grounded=b.y<=BALL_R+1e-3;
 b.vy-=GRAVITY*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;
 if(b.y<BALL_R){b.y=BALL_R;if(b.vy<0){b.vy=-b.vy*.45;if(b.vy<.6)b.vy=0;b.vx*=.82;b.vz*=.82;}}
 // Pouco arrasto no ar (um chute alto precisa chegar ao gol); mais atrito quando a bola já rola no chão.
 const drag=grounded?2.2:.08;b.vx*=1-h*drag;b.vz*=1-h*drag;
 if(s.phase==='live'){
  // Um gol vale só para quem ataca aquele lado do campo (nunca gol contra, para manter o jogo simples e positivo).
  for(const G of GOALS){
   const crossed=(prevZ-G.z)*(b.z-G.z)<0,scorer=b.kicker!=null?s.players[b.kicker]:null;
   if(crossed&&Math.abs(b.x-75)<GOAL_HALF&&b.y<GOAL_HEIGHT&&scorer&&attackGoal(scorer.team).z===G.z){
    s.score[scorer.team]++;s.lastScorer=scorer.team;s.phase='scored';s.phaseTime=1.6;emit(s,'goal',{team:scorer.team,id:scorer.id});return;
   }
  }
  if(b.y<.5&&(b.x<FIELD.minX-.3||b.x>FIELD.maxX-.3+.6||b.z<FIELD.minZ-.3||b.z>FIELD.maxZ+.3)){
   const team=1-b.lastTeam,taker=s.players.filter(p=>p.team===team).sort((p,q)=>hyp(p.x-b.x,p.z-b.z)-hyp(q.x-b.x,q.z-b.z))[0];
   emit(s,'out',{team});taker.x=clamp(b.x,FIELD.minX+.5,FIELD.maxX-.5);taker.z=clamp(b.z,FIELD.minZ+.5,FIELD.maxZ-.5);give(s,taker);return;
  }
 }
 if(b.noPick>0||s.phase!=='live')return;
 let best=null,dist=Infinity;for(const p of s.players){const d=hyp(p.x-b.x,p.z-b.z);if(d<REACH&&b.y<1.1&&d<dist){dist=d;best=p;}}
 if(best){const before=b.lastTeam;give(s,best);emit(s,best.team===before?'control':'intercept',{id:best.id,team:best.team});}
}
