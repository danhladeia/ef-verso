// Bots do vôlei: se posicionam na própria quadra e rebatem quando a bola chega perto, de frente para a rede.
import {COURT,sideOf} from './volley-sim.js';
const hyp=Math.hypot,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function toward(p,x,z,stop=.2){const dx=x-p.x,dz=z-p.z,d=hyp(dx,dz);return d<stop?{mx:0,mz:0}:{mx:dx/d*Math.min(1,d/.6),mz:dz/d*Math.min(1,d/.6)};}

export function botInputs(s,{ids=s.players.filter(p=>!p.human).map(p=>p.id)}={}){const out={};for(const id of ids)out[id]=botInput(s,s.players[id]);return out;}
function botInput(s,p){
 const side=sideOf(p.team),b=s.ball,mine=(b.x-COURT.netX)*side<=.4;
 if(s.ball.holder===p.id)return {hit:true}; // sacar assim que o tempo de preparo passar
 if(mine&&b.y<3&&hyp(p.x-b.x,p.z-b.z)<1.4){
  // Vai até a bola e rebate apontando para um canto afastado do adversário mais perto.
  const move=toward(p,b.x,b.z,.08);return {mx:move.mx,mz:move.mz,hit:hyp(p.x-b.x,p.z-b.z)<.9};
 }
 // Posição de base: espalhados na própria quadra, meio-afastados da rede.
 const spots=[[2.6,0],[6,-2.8],[6,2.8]],home={x:COURT.netX+side*spots[p.slot%3][0],z:76+spots[p.slot%3][1]};
 const move=toward(p,home.x,home.z,.3);return {mx:move.mx,mz:move.mz};
}
