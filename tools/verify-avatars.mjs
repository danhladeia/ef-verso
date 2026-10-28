import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='art-source/avatar-review';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],report={};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('THREE'))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const ready=async p=>{await p.goto('http://localhost:5173/');await p.waitForFunction(()=>window.cityReady,null,{timeout:90000});assert.equal(await p.evaluate(()=>window.cityStats().failures),0);};
 await ready(page);await page.locator('#customize').click();await page.waitForFunction(()=>!document.querySelector('#avatar-save').disabled);await page.waitForTimeout(400);await page.screenshot({path:out+'/editor-male.png'});
 for(const body of ['male','female'])for(const hair of ['simpleparted','buzzed','long','buns','none']){await page.locator('#avatar-body').selectOption(body);await page.locator('#avatar-hair').selectOption(hair);await page.waitForTimeout(60);await page.locator('#avatar-preview').screenshot({path:out+`/${body}-${hair}.png`});}
 await page.locator('#avatar-body').selectOption('female');await page.locator('#avatar-hair').selectOption('long');await page.locator('[data-field="shirt"]').nth(2).click();await page.waitForTimeout(300);await page.screenshot({path:out+'/editor-female.png'});await page.locator('#avatar-save').click();
 assert.equal(await page.evaluate(()=>window.missionReview().appearance.body),'female');await ready(page);report.saved=await page.evaluate(()=>window.missionReview().appearance);assert.equal(report.saved.hair,'long');assert.equal(report.saved.shirt,'#279178');
 await page.locator('#customize').click();await page.waitForFunction(()=>!document.querySelector('#avatar-save').disabled);await page.locator('#avatar-body').selectOption('male');await page.locator('#avatar-cancel').click();assert.equal(await page.evaluate(()=>window.missionReview().appearance.body),'female');
 await page.locator('#camera').click();await page.screenshot({path:out+'/in-city.png'});
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});phone.on('pageerror',e=>errors.push(e.message));await ready(phone);await phone.locator('#customize').tap();await phone.waitForFunction(()=>!document.querySelector('#avatar-save').disabled);await phone.screenshot({path:out+'/editor-mobile.png'});await phone.locator('#avatar-hair').selectOption('buns');await phone.locator('#avatar-save').tap();assert.equal(await phone.evaluate(()=>window.missionReview().appearance.hair),'buns');assert(!await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 report.errors=errors;fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(errors.length,0);
}finally{await browser.close();}
