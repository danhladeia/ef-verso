import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='art-source/avatar-review';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],report={};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('THREE'))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.addInitScript(()=>localStorage.setItem('ef-verso-student-v1',JSON.stringify({version:1,name:'Teste',className:'7º A',role:'aluno',home:'praca'})));
 const ready=async p=>{await p.goto('http://localhost:5173/');await p.waitForFunction(()=>window.cityReady,null,{timeout:90000});assert.equal(await p.evaluate(()=>window.cityStats().failures),0);};
 await ready(page);await page.locator('#customize').click();await page.waitForFunction(()=>!document.querySelector('#avatar-save').disabled,null,{timeout:15000});await page.waitForTimeout(400);await page.screenshot({path:out+'/editor-menino.png'});
 // Personagem (menino/menina): muda proporção do corpo de verdade, separado das abas de roupa/visual.
 assert.equal(await page.evaluate(()=>window.missionReview().appearance.bodyType),'masc','Padrão começa como menino');
 await page.locator('.avatar-bodytype-option[data-body-type="fem"]').click();await page.waitForTimeout(200);await page.screenshot({path:out+'/editor-menina.png'});
 assert.equal(await page.locator('.avatar-bodytype-option[data-body-type="fem"]').getAttribute('aria-checked'),'true');
 // Troca de roupa, cabelo e cor continuam funcionando com o corpo de menina selecionado.
 await page.locator('#wardrobe-tab-head').click();await page.waitForTimeout(150);await page.locator('.wardrobe-item[data-item="head_trancas"]').click();
 await page.locator('#wardrobe-tab-body').click();await page.waitForTimeout(150);await page.locator('.wardrobe-item[data-item="body_hoodie"]').click();
 await page.locator('.avatar-swatch[data-field="shirt"][data-value="#2fa36b"]').click();await page.waitForTimeout(200);await page.screenshot({path:out+'/editor-menina-roupa.png'});
 // Saia esportiva (roupa nova) e expressão (categoria nova, separada do cabelo).
 await page.locator('.wardrobe-item[data-item="body_saia"]').click();await page.waitForTimeout(150);
 await page.locator('#wardrobe-tab-expression').click();await page.waitForTimeout(150);
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('.wardrobe-item')].map(b=>b.dataset.item)),['none','expr_sorriso','expr_firme']);
 await page.locator('.wardrobe-item[data-item="expr_sorriso"]').click();await page.waitForTimeout(200);await page.screenshot({path:out+'/editor-saia-expressao.png'});
 await page.locator('#avatar-save').click();
 report.saved=await page.evaluate(()=>window.missionReview().appearance);
 assert.deepEqual({bodyType:report.saved.bodyType,head:report.saved.head,body:report.saved.body,shirt:report.saved.shirt,expression:report.saved.expression},{bodyType:'fem',head:'head_trancas',body:'body_saia',shirt:'#2fa36b',expression:'expr_sorriso'});
 await ready(page);assert.deepEqual((await page.evaluate(()=>window.missionReview().appearance)).bodyType,'fem','Aparência (incluindo o personagem escolhido) persiste ao recarregar');
 // Voltar para menino, cancelar, e a escolha salva (menina) continua intacta.
 await page.locator('#customize').click();await page.waitForFunction(()=>!document.querySelector('#avatar-save').disabled,null,{timeout:15000});
 await page.locator('.avatar-bodytype-option[data-body-type="masc"]').click();await page.locator('#avatar-cancel').click();
 assert.equal(await page.evaluate(()=>window.missionReview().appearance.bodyType),'fem','Cancelar não aplica a troca');
 await page.locator('#camera').click();await page.screenshot({path:out+'/in-city.png'});
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});phone.on('pageerror',e=>errors.push(e.message));
 await phone.addInitScript(()=>localStorage.setItem('ef-verso-student-v1',JSON.stringify({version:1,name:'Teste',className:'7º A',role:'aluno',home:'praca'})));
 await ready(phone);await phone.locator('#customize').tap();await phone.waitForFunction(()=>!document.querySelector('#avatar-save').disabled,null,{timeout:15000});await phone.screenshot({path:out+'/editor-mobile.png'});
 await phone.locator('.avatar-bodytype-option[data-body-type="fem"]').tap();await phone.locator('#avatar-save').tap();
 assert.equal(await phone.evaluate(()=>window.missionReview().appearance.bodyType),'fem');assert(!await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 report.errors=errors;fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(errors.length,0);
}finally{await browser.close();}
