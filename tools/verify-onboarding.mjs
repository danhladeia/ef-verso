import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='art-source/onboarding-review';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],report={};
function monitor(page){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});}
const step=page=>page.evaluate(()=>[...document.querySelectorAll('.onboard-step')].find(s=>!s.hidden)?.dataset.step);
async function ready(page){await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.cityReady,null,{timeout:90000});}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});monitor(page);
 await ready(page);
 assert.equal(await step(page),'splash','A new browser sees the opening screen first');
 await page.screenshot({path:out+'/1-splash.png'});
 assert.equal(await page.evaluate(()=>document.querySelector('#interact').disabled||document.querySelector('#interact').offsetParent===null),true,'City controls stay unreachable behind the opening screen');

 // Teacher access code: wrong code is rejected, the right one (case-insensitive) registers a teacher
 // and skips straight to the city (no home, no character).
 await page.locator('#onboard-teacher-link').click();assert.equal(await step(page),'professor');
 await page.locator('#teacher-name').fill('Danilo');await page.locator('#teacher-token').fill('errado');
 await page.locator('#teacher-enter').click();assert.equal(await page.locator('#teacher-token-error').isVisible(),true,'A wrong code is rejected');
 await page.locator('#teacher-token').fill('ProfDanilo');await page.locator('#teacher-enter').click();
 await page.waitForFunction(()=>!document.querySelector('#onboarding')||document.querySelector('#onboarding').hidden);
 report.teacher=await page.evaluate(()=>JSON.parse(localStorage.getItem('ef-verso-student-v1')));
 assert.deepEqual(report.teacher,{version:1,role:'professor',name:'Danilo',school:'Danilo'});
 await page.waitForSelector('.teacher-chip');assert.match(await page.locator('.teacher-chip').textContent(),/Modo Professor.*Danilo/);
 await page.screenshot({path:out+'/teacher-city.png'});

 // Student sign-up: name + optional nickname + a turma picked from a dropdown.
 await page.evaluate(()=>localStorage.clear());await ready(page);
 await page.locator('#onboard-start').click();assert.equal(await step(page),'cadastro');
 await page.locator('#onboard-to-home').click();
 assert.equal(await page.locator('#onboard-name-error').isVisible(),true,'An empty name is rejected');
 await page.locator('#onboard-name').fill('Ana');await page.locator('#onboard-nick').fill('Aninha');await page.locator('#onboard-class').selectOption('7º B');
 await page.locator('#onboard-to-home').click();assert.equal(await step(page),'moradia');await page.screenshot({path:out+'/2-moradia.png'});
 assert.equal(await page.locator('#onboard-to-character').isDisabled(),true,'Cannot continue before picking a home');
 await page.locator('[data-home="escola"]').click();assert.equal(await page.locator('#onboard-to-character').isDisabled(),false);
 await page.locator('#onboard-to-character').click();assert.equal(await step(page),'personagem');
 await page.locator('#onboard-open-character').click();await page.waitForFunction(()=>!document.querySelector('#avatar-save').disabled,null,{timeout:15000});
 await page.screenshot({path:out+'/3-personagem.png'});
 await page.locator('#avatar-save').click();await page.waitForFunction(()=>!document.querySelector('#onboard-finish').hidden);
 await page.locator('#onboard-finish').click();
 await page.waitForFunction(()=>!document.querySelector('#onboarding')||document.querySelector('#onboarding').hidden);
 report.afterFinish=await page.evaluate(()=>({student:JSON.parse(localStorage.getItem('ef-verso-student-v1')),player:window.cityReview.player()}));
 assert.deepEqual(report.afterFinish.student,{version:1,role:'aluno',name:'Ana',nickname:'Aninha',className:'7º B',home:'escola'});
 assert(Math.hypot(report.afterFinish.player.x-6,report.afterFinish.player.z+22)<.5,'Spawns at the chosen home');
 assert.equal(await page.locator('.teacher-chip').count(),0,'A student does not get the teacher chip');
 await page.screenshot({path:out+'/4-city.png'});
 // Returning students skip straight to the city.
 await page.reload();await page.waitForFunction(()=>window.cityReady,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>document.querySelector('#onboarding')?.hidden??true),true,'A returning student does not see the opening screen again');
 report.errors=errors;fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
