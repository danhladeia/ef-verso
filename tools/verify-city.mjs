import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],results={};
function monitor(page){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});}
// Pula a abertura/cadastro/moradia/personagem (testados à parte em verify-onboarding.mjs) pré-preenchendo o aluno salvo.
async function ready(page){await page.addInitScript(()=>localStorage.setItem('ef-verso-student-v1',JSON.stringify({name:'Teste',className:'7A',home:'praca',version:1})));await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.cityReady,null,{timeout:90000});assert.equal(await page.evaluate(()=>window.cityStats().failures),0);}
const page=await browser.newPage({viewport:{width:1440,height:1000}});monitor(page);
try{
 await ready(page);
 // Correr/Pular/Explorar são controles de toque: no desktop ficam escondidos e as ações passam por teclado (Shift/Espaço/E).
 for(const id of ['#run','#jump','#interact'])assert.equal(await page.locator(id).isVisible(),false,id+' must be hidden on desktop');
 results.routes=await page.evaluate(()=>window.cityReview.routes());
 assert(results.routes.every((p,i)=>!p.blocked&&(i===0||p.steps>0)),'Every destination must be reachable');
 results.clearRoutes=await page.evaluate(async()=>{
  const {createNavigation}=await import('/src/navigation.js');const nav=createNavigation(window.cityReview.solids,172);
  return window.cityReview.places.every(target=>{
   let previous={x:0,z:10};for(const p of nav.route(previous,target)){
    for(let t=0;t<=1;t+=.1)if(nav.blocked(previous.x+(p.x-previous.x)*t,previous.z+(p.z-previous.z)*t))return false;
    previous=p;
   }return true;
  });
 });assert(results.clearRoutes,'Route segments must not cross thin fences');
 await page.locator('nav [data-place="1"]').click();
 await page.waitForFunction(()=>document.querySelector('#interact').textContent.includes('Professora Lia'),null,{timeout:40000});
 results.walkToSchool=await page.evaluate(()=>window.cityReview.player());
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('e');assert.equal(await page.locator('#mission-dialog').evaluate(e=>e.open),true);await page.locator('#mission-later').click();
 await page.locator('#reset').click();
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Space');await page.waitForFunction(()=>window.cityReview.player().y>.2);results.jump=true;
 await page.waitForFunction(()=>window.cityReview.player().y===0);
 await page.keyboard.down('s');await page.waitForTimeout(500);await page.keyboard.up('s');
 const walk=await page.evaluate(()=>window.cityReview.player()),walkDist=Math.hypot(walk.x,walk.z-10);
 await page.locator('#reset').click();await page.evaluate(()=>document.activeElement?.blur());
 // Sem o botão Correr no desktop, segurar Shift é o jeito de correr.
 await page.keyboard.down('Shift');await page.keyboard.down('s');await page.waitForTimeout(500);await page.keyboard.up('s');await page.keyboard.up('Shift');
 results.runPosition=await page.evaluate(()=>window.cityReview.player());const runDist=Math.hypot(results.runPosition.x,results.runPosition.z-10);
 assert(runDist>2&&runDist>walkDist,'Holding Shift must move faster than plain walking');
 await page.locator('#reset').click();await page.locator('#camera').click();await page.waitForTimeout(200);
 assert(await page.locator('body').evaluate(e=>e.classList.contains('third-person')));await page.screenshot({path:'art-source/review/third-person.png'});
 await page.locator('#admin-flight').click();await page.locator('select[aria-label="Inspecionar ambiente"]').selectOption('15');
 await page.waitForTimeout(200);await page.screenshot({path:'art-source/review/skate-inspection.png'});
 await page.locator('[data-action="exit"]').click();assert(!await page.locator('body').evaluate(e=>e.classList.contains('flying')));
 results.desktopStats=await page.evaluate(()=>window.cityStats());
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const phone=await mobile.newPage();monitor(phone);await ready(phone);
 assert(!await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Mobile must not overflow');
 for(const id of ['#joystick','#run','#jump','#camera','#admin-flight','#interact'])assert(await phone.locator(id).isVisible(),id+' mobile control');
 await phone.locator('#jump').tap();await phone.waitForFunction(()=>window.cityReview.player().y>.2);await phone.waitForFunction(()=>window.cityReview.player().y===0);
 await phone.screenshot({path:'art-source/review/mobile.png'});
 await phone.locator('#admin-flight').tap();await phone.locator('select[aria-label="Inspecionar ambiente"]').selectOption('15');await phone.screenshot({path:'art-source/review/mobile-admin.png'});
 await phone.locator('[data-action="exit"]').tap();await phone.locator('#camera').tap();await phone.screenshot({path:'art-source/review/mobile-third-person.png'});
 results.mobileStats=await phone.evaluate(()=>window.cityStats());results.errors=errors;assert.equal(errors.length,0);
 fs.writeFileSync('art-source/review/verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
