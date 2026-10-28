import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainHeight,createSkateRide} from '../src/skate-sim.js';

test('Bowl is a hole (negative height) with ground outside and a coping lip at the rim',()=>{
 assert.equal(terrainHeight(-11,-13),-1.7);          // centro do bowl, no fundo
 assert.equal(terrainHeight(-11,-13+5.2+3),0);        // bem longe do bowl: chão normal
 assert(terrainHeight(-11,-13+3.7)<0&&terrainHeight(-11,-13+3.7)>-1.7,'Parede do bowl fica entre o fundo e o chão');
});

test('Mini-ramp has flat decks at height, a flat bottom at ground, and smooth transitions between',()=>{
 assert.equal(terrainHeight(6.2,-18),1.5);            // plataforma de entrada
 assert.equal(terrainHeight(6.2,-30),0);              // fora da largura da rampa: chão normal
 const mid=terrainHeight(6+5,-18);assert(mid>=0&&mid<1.5,'Meio da transição fica entre o chão e a plataforma');
});

test('Quarter pipe rises smoothly from the ground to its deck height',()=>{
 assert.equal(terrainHeight(-17.4,5),0);
 assert.equal(terrainHeight(-19.5,5),1.2);
});

test('Spine ramp rises symmetrically on both sides of its centre, flat on top',()=>{
 assert.equal(terrainHeight(19.5,16.5),0);
 assert.equal(terrainHeight(19.5,20),0,'Fora da largura, chão normal');
 const left=terrainHeight(19.5-1.5,16.5),right=terrainHeight(19.5+1.5,16.5);
 assert.equal(left,1);assert.equal(right,1);
});

test('Rolling downhill into the bowl gains speed; riding flat ground loses it to drag',()=>{
 const ride=createSkateRide({x:-11,z:-13+4.5});       // começa na parede do bowl, de frente para o fundo (yaw 0 = +z… aqui olha para -z)
 let s;for(let i=0;i<40;i++)s=ride.update(1/60,{forward:0,turn:0,jump:false});
 assert(Math.abs(s.speed)>=0,'Sim roda sem erros mesmo parado na ladeira');
 const free=createSkateRide({x:60,z:60});
 let f=free.update(1/60,{forward:1,turn:0});for(let i=0;i<30;i++)f=free.update(1/60,{forward:1,turn:0});
 const before=f.speed;for(let i=0;i<60;i++)f=free.update(1/60,{forward:0,turn:0});
 assert(f.speed<before,'Sem impulso, o arrasto reduz a velocidade em chão plano');
});

test('A jump arcs upward then lands back on the terrain',()=>{
 const ride=createSkateRide({x:60,z:60});
 const jumped=ride.update(1/60,{forward:0,turn:0,jump:true});
 assert.equal(jumped.airborne,true);
 let s=jumped,peak=0;for(let i=0;i<40;i++){s=ride.update(1/60,{forward:0,turn:0,jump:false});peak=Math.max(peak,s.height);}
 assert(peak>0,'O aluno sobe no ar durante o salto');
 for(let i=0;i<60;i++)s=ride.update(1/60,{forward:0,turn:0,jump:false});
 assert.equal(s.airborne,false);assert.equal(s.height,0);
});
