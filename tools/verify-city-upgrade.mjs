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
 assert.equal(after.filter(v=>v.bus).length,2);assert(after.some((v,i)=>v.distance>before[i].distance));report.traffic=after.length;
 await page.locator('#settings-open').click();await page.locator('[data-binding="forward"]').click();await page.keyboard.press('i');
 await page.locator('#settings-save').click();assert.equal(await page.evaluate(()=>window.travelReview.settings().keys.forward),'i');
 await page.locator('#camera').click();const yaw=await page.evaluate(()=>window.travelReview.camera().yaw);
 await page.mouse.move(800,500);await page.mouse.down();await page.mouse.move(960,540,{steps:10});await page.mouse.up();
 assert.notEqual(await page.evaluate(()=>window.travelReview.camera().yaw),yaw);
 report.mouseLook=true;
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
 await page.locator('#camera').click();await page.screenshot({path:out+'/adventure.png'});
 await page.evaluate(()=>window.travelReview.avatar().parent.position.set(-48,0,0));await page.waitForTimeout(200);await page.screenshot({path:out+'/city.png'});
 await page.locator('#settings-open').click();await page.locator('#settings-dialog').screenshot({path:out+'/settings.png'});await page.locator('#settings-cancel').click();
 await page.reload();await page.waitForFunction(()=>window.cityReady,null,{timeout:120000});assert.equal(await page.evaluate(()=>window.travelReview.settings().keys.forward),'i');
 await page.locator('#cloud-open').click();await page.getByText('Modo local:',{exact:false}).waitFor();await page.locator('#cloud-close').click();
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await phone.addInitScript(()=>localStorage.setItem('ef-verso-student-v1',JSON.stringify({version:1,name:'Teste',className:'7º A',role:'aluno'})));await phone.goto('http://localhost:5173/');await phone.waitForFunction(()=>window.cityReady,null,{timeout:120000});await phone.locator('#settings-open').tap();await phone.locator('#settings-dialog').screenshot({path:out+'/mobile-settings.png'});assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.close();
 report.errors=errors;fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify(report));
}finally{await browser.close();}
