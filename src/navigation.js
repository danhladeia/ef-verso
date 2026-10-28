// Colisão e rotas no plano XZ.
// Obstáculos: caixas {x,z,w,d} (meia-largura com folga de 0,32 já somada) e círculos {x,z,r,circle:true}.
// O aluno é um círculo: ao encostar, é empurrado para fora e desliza pela borda (como no Jogo_RPG_EF7).
const CELL=8,CLEARANCE=.32;
export function createNavigation(solids,limit,allowed=()=>true){
 // Grade espacial: cada obstáculo entra em todas as células que cobre, para consultas rápidas.
 const grid=new Map(),key=(i,j)=>i+','+j;
 for(const s of solids){
  const hw=s.w+1,hd=s.d+1;
  for(let i=Math.floor((s.x-hw)/CELL);i<=Math.floor((s.x+hw)/CELL);i++)for(let j=Math.floor((s.z-hd)/CELL);j<=Math.floor((s.z+hd)/CELL);j++){const k=key(i,j);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(s);}
 }
 const near=(x,z)=>grid.get(key(Math.floor(x/CELL),Math.floor(z/CELL)))||[];
 const inside=(s,x,z)=>s.circle?Math.hypot(x-s.x,z-s.z)<s.r+CLEARANCE:Math.abs(x-s.x)<s.w&&Math.abs(z-s.z)<s.d;
 const blocked=(x,z)=>Math.abs(x)>limit||Math.abs(z)>limit||!allowed(x,z)||near(x,z).some(s=>inside(s,x,z));
 /** Empurra o círculo (pos, raio r) para fora dos obstáculos fixos e dos `others` ({x,z,r}). Devolve
  * true se encostou. `skipKind` ignora um tipo de obstáculo (de skate/bicicleta nas rampas de verdade
  * da pista: quem anda a pé continua barrado, sem passar o parâmetro). */
 function resolve(pos,r=.35,others=[],skipKind=null){
  let touched=false;
  for(let pass=0;pass<2;pass++){
   for(const s of near(pos.x,pos.z)){
    if(s.kind===skipKind)continue;
    if(s.circle){const dx=pos.x-s.x,dz=pos.z-s.z,min=s.r+r,d=Math.hypot(dx,dz);if(d>=min||d<1e-6)continue;pos.x=s.x+dx/d*min;pos.z=s.z+dz/d*min;touched=true;continue;}
    const hw=s.w-CLEARANCE,hd=s.d-CLEARANCE,px=Math.max(s.x-hw,Math.min(pos.x,s.x+hw)),pz=Math.max(s.z-hd,Math.min(pos.z,s.z+hd)),dx=pos.x-px,dz=pos.z-pz,d2=dx*dx+dz*dz;
    if(d2>=r*r)continue;touched=true;
    if(d2>1e-8){const d=Math.sqrt(d2);pos.x=px+dx/d*r;pos.z=pz+dz/d*r;}
    else{const exits=[pos.x-(s.x-hw),s.x+hw-pos.x,pos.z-(s.z-hd),s.z+hd-pos.z],i=exits.indexOf(Math.min(...exits));if(i===0)pos.x=s.x-hw-r;else if(i===1)pos.x=s.x+hw+r;else if(i===2)pos.z=s.z-hd-r;else pos.z=s.z+hd+r;}
   }
   for(const o of others){const dx=pos.x-o.x,dz=pos.z-o.z,min=o.r+r,d=Math.hypot(dx,dz);if(d>=min||d<1e-6)continue;pos.x=o.x+dx/d*min;pos.z=o.z+dz/d*min;touched=true;}
  }
  const L=limit-r;if(Math.abs(pos.x)>L||Math.abs(pos.z)>L){pos.x=Math.max(-L,Math.min(L,pos.x));pos.z=Math.max(-L,Math.min(L,pos.z));touched=true;}
  if(!allowed(pos.x,pos.z)){pos.x=Math.max(-171.5,Math.min(311.5,pos.x));pos.z=Math.max(-171.5,Math.min(171.5,pos.z));if(pos.x>172)pos.z=Math.max(-107.5,Math.min(87.5,pos.z));touched=true;}
  return touched;
 }
 // Rotas: células de 1 m com folga, para não atravessar cercas finas.
 const step=1,n=Math.floor(limit*2/step)+1,cells=new Uint8Array(n*n);
 for(let z=0;z<n;z++)for(let x=0;x<n;x++)if(!allowed(x*step-limit,z*step-limit))cells[z*n+x]=1;
 for(const s of solids){const x0=Math.max(0,Math.floor((s.x-s.w+limit)/step)),x1=Math.min(n-1,Math.ceil((s.x+s.w+limit)/step)),z0=Math.max(0,Math.floor((s.z-s.d+limit)/step)),z1=Math.min(n-1,Math.ceil((s.z+s.d+limit)/step));for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const px=x*step-limit,pz=z*step-limit;if(s.circle?Math.hypot(px-s.x,pz-s.z)<s.r+CLEARANCE+.35:Math.abs(px-s.x)<s.w+.35&&Math.abs(pz-s.z)<s.d+.35)cells[z*n+x]=1;}}
 const point=id=>({x:(id%n)*step-limit,z:Math.floor(id/n)*step-limit});const cell=(x,z)=>Math.round((z+limit)/step)*n+Math.round((x+limit)/step);
 function closest(id){if(!cells[id])return id;const p=point(id);for(let r=1;r<=3;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const x=p.x+dx*step,z=p.z+dz*step,j=cell(x,z);if(Math.abs(x)<=limit&&Math.abs(z)<=limit&&!cells[j])return j;}return -1;}
 function route(from,to){const start=closest(cell(from.x,from.z)),end=closest(cell(to.x,to.z));if(start<0||end<0)return [];const parent=new Int32Array(n*n).fill(-1),queue=new Int32Array(n*n);let head=0,tail=0;queue[tail++]=start;parent[start]=start;while(head<tail){const a=queue[head++];if(a===end)break;for(const b of [a-1,a+1,a-n,a+n]){if(b<0||b>=n*n||parent[b]!==-1||cells[b])continue;if(Math.abs(b-a)===1&&Math.floor(b/n)!==Math.floor(a/n))continue;parent[b]=a;queue[tail++]=b;}}if(parent[end]===-1)return [];const result=[];let cur=end;while(cur!==start){result.push(point(cur));cur=parent[cur];}return result.reverse();}
 return {blocked,resolve,route};
}
