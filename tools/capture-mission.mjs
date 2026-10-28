import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const interact=mobile?()=>p.locator('#interact').tap():async()=>{await p.evaluate(()=>document.activeElement?.blur());await p.keyboard.press('e');};
  await p.goto('http://localhost:5173/');await p.waitForFunction(()=>window.cityReady,null,{timeout:60000});await p.evaluate(()=>window.cityReview.visit(1));await interact();await p.locator('#mission-accept').click();await p.evaluate(()=>window.cityReview.visit(2));await interact();
  await p.locator('#shot-power').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(300);
  await p.screenshot({path:`art-source/mission-review/${mobile?'mobile-practice':'practice'}.png`});
  if(mobile){await p.setViewportSize({width:844,height:390});await p.waitForTimeout(200);await p.screenshot({path:'art-source/mission-review/mobile-landscape.png'});assert(await p.locator('#shoot').isVisible());}
  await p.locator('#shoot').click();await p.waitForTimeout(650);await p.screenshot({path:`art-source/mission-review/${mobile?'mobile-shot':'shot'}.png`});await p.waitForFunction(()=>window.missionReview().baskets===1);assert.equal(errors.length,0);await context.close();
 }
 console.log('Framing, touch layouts and scoring passed.');
}finally{await browser.close();}
