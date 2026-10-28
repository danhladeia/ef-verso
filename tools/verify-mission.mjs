import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],report={};
const out='art-source/mission-review';fs.mkdirSync(out,{recursive:true});
function monitor(page){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});}
// Pula a abertura/cadastro/moradia/personagem (testados à parte em verify-onboarding.mjs) pré-preenchendo o aluno salvo.
async function ready(page){await page.addInitScript(()=>localStorage.setItem('ef-verso-student-v1',JSON.stringify({name:'Teste',className:'7A',home:'praca',version:1})));await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.cityReady,null,{timeout:90000});assert.equal(await page.evaluate(()=>window.cityStats().failures),0);}
// Arremesso livre: segura Espaço (ou o botão, no toque) pelo tempo que dá a força desejada, em relação à ideal.
const holdFor=async(page,offset)=>Math.max(0,(await page.evaluate(()=>window.missionReview().ideal))+offset)*1300;
async function finish(page,expected){await page.waitForFunction(n=>window.missionReview().attempts===n,expected,{timeout:10000});await page.waitForFunction(()=>!window.missionReview().shooting,null,{timeout:10000});await page.waitForTimeout(150);}
async function shot(page,offset,expected){const ms=await holdFor(page,offset);await page.keyboard.down('Space');await page.waitForTimeout(ms);await page.keyboard.up('Space');await finish(page,expected);}
async function touchShot(page,offset,expected){const ms=await holdFor(page,offset),button=page.locator('#shoot');await button.dispatchEvent('pointerdown',{pointerId:7,isPrimary:true});await page.waitForTimeout(ms);await button.dispatchEvent('pointerup',{pointerId:7,isPrimary:true});await finish(page,expected);}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});monitor(page);await ready(page);
 // Sem o botão Explorar no desktop (é controle de toque): a ação equivalente é a tecla E, após tirar o foco do botão clicado antes.
 const interact=async()=>{await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('e');};
 assert.equal(await page.evaluate(()=>window.missionReview().stage),'school');await page.screenshot({path:out+'/start.png'});
 await page.locator('#mission-go').click();await page.waitForFunction(()=>document.querySelector('#interact').textContent.includes('Professora Lia'),null,{timeout:40000});await interact();await page.screenshot({path:out+'/teacher.png'});await page.locator('#mission-accept').click();
 assert.equal(await page.evaluate(()=>window.missionReview().stage),'court');
 await page.locator('#mission-go').click();await page.waitForFunction(()=>document.querySelector('#interact').textContent==='Pegar bola e treinar',null,{timeout:40000});await interact();
 await page.keyboard.press('F2');assert(await page.locator('.practice-panel').isVisible());assert(!await page.locator('body').evaluate(e=>e.classList.contains('flying')));
 await page.screenshot({path:out+'/practice.png'});
 await shot(page,-.35,1);assert.equal(await page.evaluate(()=>window.missionReview().baskets),0);
 await shot(page,0,2);assert.equal(await page.evaluate(()=>window.missionReview().baskets),1);
 // Leaving and reloading preserves a partial mission.
 await page.locator('#leave-court').click();await ready(page);assert.equal(await page.evaluate(()=>window.missionReview().baskets),1);
 await page.evaluate(()=>window.cityReview.visit(2));await interact();
 // Anda para trás (de frente para a cesta) e arremessa de mais longe.
 await page.keyboard.down('s');await page.waitForTimeout(350);await page.keyboard.up('s');assert(await page.evaluate(()=>window.missionReview().practicing),'Moving inside the court keeps the practice');
 await shot(page,0,3);assert.equal(await page.evaluate(()=>window.missionReview().baskets),2);
 await shot(page,0,4);assert.equal(await page.evaluate(()=>window.missionReview().stage),'return');await page.screenshot({path:out+'/three-baskets.png'});
 await page.locator('#leave-court').click();await page.locator('#mission-go').click();await page.waitForFunction(()=>document.querySelector('#interact').textContent.includes('Professora Lia'),null,{timeout:40000});await interact();await page.locator('#mission-accept').click();
 assert.equal(await page.evaluate(()=>window.missionReview().coins),100);await ready(page);report.desktop=await page.evaluate(()=>window.missionReview());assert.equal(report.desktop.stage,'complete');assert.equal(report.desktop.coins,100);
 await page.locator('#camera').click();await page.screenshot({path:out+'/character-third.png'});
 await page.evaluate(()=>window.cityReview.visit(1));await interact();await page.locator('#mission-accept').click();assert.equal(await page.evaluate(()=>window.missionReview().coins),100);
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),phone=await context.newPage();monitor(phone);await ready(phone);await phone.screenshot({path:out+'/mobile-start.png'});
 assert(!await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await phone.evaluate(()=>window.cityReview.visit(1));await phone.locator('#interact').tap();await phone.locator('#mission-accept').tap();await phone.evaluate(()=>window.cityReview.visit(2));await phone.locator('#interact').tap();
 await phone.screenshot({path:out+'/mobile-practice.png'});await touchShot(phone,0,1);assert.equal(await phone.evaluate(()=>window.missionReview().baskets),1);
 await phone.locator('#leave-court').tap();await phone.locator('#jump').tap();await phone.waitForFunction(()=>window.cityReview.player().y>.2);assert.equal(await phone.evaluate(()=>window.missionReview().animation),'jump');
 await ready(phone);report.mobile=await phone.evaluate(()=>window.missionReview());assert.equal(report.mobile.baskets,1);report.errors=errors;assert.equal(errors.length,0);fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
