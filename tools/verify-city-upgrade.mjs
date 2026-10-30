import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='art-source/city-upgrade-review';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],report={};
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 await page.addInitScript(()=>{localStorage.setItem('ef-verso-student-v1',JSON.stringify({version:1,name:'Teste',className:'7º A',role:'aluno',home:'praca'}));});
 page.on('pageerror',e=>{if(errors.length<8)errors.push(e.stack||e.message);});
 await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.cityReady,null,{timeout:120000});
 assert.equal(await page.evaluate(()=>window.cityStats().failures),0);
 report.roads=await page.evaluate(()=>{
  const roads=[-100,-48,48,100];return {removed:window.cityDesign.clearedRoadItems,blockers:window.cityReview.solids.filter(s=>Math.max(s.w,s.d)<12&&roads.some(a=>Math.abs(s.z)<=105&&Math.abs(s.x-a)<2||Math.abs(s.x)<=105&&Math.abs(s.z-a)<2)).map(s=>({x:s.x,z:s.z,kind:s.kind}))};
 });assert.equal(report.roads.blockers.length,0);
 const before=await page.evaluate(()=>window.travelReview.traffic());await page.waitForTimeout(1200);
 const after=await page.evaluate(()=>window.travelReview.traffic());
 assert.equal(after.filter(v=>v.bus).length,5);assert(after.some((v,i)=>v.distance>before[i].distance));report.traffic=after.length;
 await page.locator('#settings-open').click();await page.locator('[data-binding="forward"]').click();await page.keyboard.press('i');
 await page.locator('#settings-save').click();assert.equal(await page.evaluate(()=>window.travelReview.settings().keys.forward),'i');
 await page.locator('#camera').click();const yaw=await page.evaluate(()=>window.travelReview.camera().yaw);
 await page.mouse.move(800,500);await page.mouse.down();await page.mouse.move(960,540,{steps:10});await page.mouse.up();
 assert.notEqual(await page.evaluate(()=>window.travelReview.camera().yaw),yaw);
 report.mouseLook=true;
 // Giro com A/D suave: a câmera acelera aos poucos (não "liga" na velocidade máxima) e, ao soltar,
 // continua girando um pouco antes de parar (desacelera) em vez de travar na hora.
 {
  const yaw0=await page.evaluate(()=>window.travelReview.camera().yaw);
  await page.keyboard.down('d');await page.waitForTimeout(70);
  const yaw1=await page.evaluate(()=>window.travelReview.camera().yaw);
  await page.keyboard.up('d');
  const yawAtRelease=await page.evaluate(()=>window.travelReview.camera().yaw);
  await page.waitForTimeout(150);
  const yaw2=await page.evaluate(()=>window.travelReview.camera().yaw);
  const earlyDelta=Math.abs(yaw1-yaw0),fullRate=2.6*.07,afterRelease=Math.abs(yaw2-yawAtRelease);
  report.smoothTurn={earlyDelta,fullRate,afterRelease};
  assert(earlyDelta<fullRate*.85,'Giro deve acelerar aos poucos, não já na velocidade máxima: '+JSON.stringify(report.smoothTurn));
  assert(afterRelease>.01,'Giro deve desacelerar devagar, continuando um pouco após soltar: '+JSON.stringify(report.smoothTurn));
 }
 for(const mode of ['walk','skate','bike']){
  await page.evaluate(mode=>{window.travelReview.select(mode);const a=window.travelReview.avatar();a.parent.position.set(-48,0,0);},mode);
  const p0=await page.evaluate(()=>window.cityReview.player());await page.keyboard.down('i');await page.waitForTimeout(700);await page.keyboard.up('i');
  const p1=await page.evaluate(()=>window.cityReview.player());report[mode]=Math.hypot(p1.x-p0.x,p1.z-p0.z);
 }
 assert(report.bike>report.walk);assert(report.skate>report.walk);
 // Camera can no longer hide the avatar when invisible game rosters or props are nearby.
 for(const [x,z] of [[0,0],[0,10],[28,3],[-48,0],[267,-49]]){
  await page.evaluate(([x,z])=>window.travelReview.avatar().parent.position.set(x,0,z),[x,z]);
  await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.travelReview.camera().avatarVisible),true);
 }
 const peak=await page.evaluate(()=>window.cityReview.player());assert(peak.y>20);report.mountainHeight=peak.y;
 // Sistema de estações: cada uma tinge o chão/céu de um jeito diferente (testado forçando cada uma via
 // o hook de DEV, sem depender da data real do dia em que o teste roda).
 await page.evaluate(()=>window.skyReview.setHour(12));
 report.seasons=[];
 for(let s=0;s<4;s++){await page.evaluate(s=>window.skyReview.setSeason(s),s);await page.waitForTimeout(100);report.seasons.push(await page.evaluate(()=>({name:window.skyReview.seasonName(),ground:window.skyReview.groundColor()})));}
 await page.evaluate(()=>window.skyReview.setSeason(null));
 assert.equal(new Set(report.seasons.map(s=>s.ground)).size,4,'As 4 estações devem tingir o chão de cores diferentes: '+JSON.stringify(report.seasons));
 // A trilha do Parque de Aventura precisa dar para andar/pedalar de verdade, não só decoração.
 await page.evaluate(()=>{window.travelReview.select('bike');window.cityReview.visit(19);});
 const t0=await page.evaluate(()=>window.cityReview.player());
 await page.keyboard.down('i');await page.waitForTimeout(1500);await page.keyboard.up('i');
 const t1=await page.evaluate(()=>window.cityReview.player());
 report.trailRide=Math.hypot(t1.x-t0.x,t1.z-t0.z);assert(report.trailRide>8,'Bike deve avançar bastante pela trilha em 1,5 s: '+report.trailRide);
 // A pista de skate precisa ser de verdade: andando a pé, a tigela continua bloqueada (chão plano);
 // de skate/bicicleta, o jogador afunda nela de acordo com o relevo real da pista (skate-sim.js).
 await page.evaluate(()=>{const c=window.cityDesign.skatepark;window.travelReview.select('walk');window.travelReview.avatar().parent.position.set(c.x-11,0,c.z-13);});
 await page.waitForTimeout(400);
 const walkY=(await page.evaluate(()=>window.cityReview.player())).y;
 await page.evaluate(()=>window.travelReview.select('skate'));
 await page.waitForTimeout(400);
 const skateY=(await page.evaluate(()=>window.cityReview.player())).y;
 report.skateBowl={walkY,skateY};
 assert(skateY<walkY-.3,'De skate, o jogador deve afundar na tigela de verdade: '+JSON.stringify(report.skateBowl));
 // Futebol: D deve mover o jogador para a direita da tela (como no basquete), e a seta "é você" deve
 // acompanhar o jogador 0 enquanto a partida está ativa.
 await page.evaluate(()=>window.cityReview.visit(11));
 await page.waitForFunction(()=>!document.querySelector('#soccer-enter')?.hidden,null,{timeout:10000});
 await page.locator('#soccer-enter').click();
 await page.waitForFunction(()=>!document.querySelector('#soccer-match')?.hidden,null,{timeout:10000});
 await page.waitForTimeout(600);
 const sp0=await page.evaluate(()=>window.questReview.soccerPlayers()[0]);
 await page.keyboard.down('d');await page.waitForTimeout(600);await page.keyboard.up('d');
 const sp1=await page.evaluate(()=>window.questReview.soccerPlayers()[0]);
 report.soccerControls={dz:sp1.z-sp0.z};
 assert(sp1.z-sp0.z<-.3,'D deve mover o jogador na direção que aparece à direita da câmera: '+JSON.stringify(report.soccerControls));
 await page.locator('#soccer-leave').click();await page.waitForTimeout(300);
 await page.locator('#camera').click();await page.screenshot({path:out+'/adventure.png'});
 await page.evaluate(()=>window.travelReview.avatar().parent.position.set(-48,0,0));await page.waitForTimeout(200);await page.screenshot({path:out+'/city.png'});
 await page.locator('#settings-open').click();await page.locator('#settings-dialog').screenshot({path:out+'/settings.png'});await page.locator('#settings-cancel').click();
 await page.reload();await page.waitForFunction(()=>window.cityReady,null,{timeout:120000});assert.equal(await page.evaluate(()=>window.travelReview.settings().keys.forward),'i');
 await page.locator('#cloud-open').click();await page.getByText('Modo local:',{exact:false}).waitFor();await page.locator('#cloud-close').click();
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await phone.addInitScript(()=>localStorage.setItem('ef-verso-student-v1',JSON.stringify({version:1,name:'Teste',className:'7º A',role:'aluno'})));await phone.goto('http://localhost:5173/');await phone.waitForFunction(()=>window.cityReady,null,{timeout:120000});await phone.locator('#settings-open').tap();await phone.locator('#settings-dialog').screenshot({path:out+'/mobile-settings.png'});assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.close();
 report.errors=errors;fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify(report));
}finally{await browser.close();}
