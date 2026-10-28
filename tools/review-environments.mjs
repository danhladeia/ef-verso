import {chromium} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1200,height:850}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.cityReady,null,{timeout:90000});
const report=await page.evaluate(()=>({routes:window.cityReview?.routes(),assets:window.cityDesign?.assets,fences:window.cityDesign?.fences,buildings:window.cityDesign?.buildings,stats:window.cityStats()}));
fs.mkdirSync('art-source/review',{recursive:true});
await page.screenshot({path:'art-source/review/desktop.png'});
await page.locator('#admin-flight').click();await page.waitForTimeout(300);await page.screenshot({path:'art-source/review/aerial.png'});
const places=await page.evaluate(()=>window.cityReview?.places||[]);
await page.addStyleTag({content:'.flight-panel{display:none!important}'});
for(let i=0;i<places.length;i++){await page.evaluate(i=>window.cityReview.inspect(i),i);await page.waitForTimeout(120);await page.screenshot({path:`art-source/review/zone-${i}.png`});}
const contact=await browser.newPage({viewport:{width:1440,height:1500}});await contact.setContent(`<html><body style="margin:0;background:#172d3c;color:white;font:16px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${places.map((p,i)=>`<div><img style="width:100%" src="http://localhost:5173/art-source/review/zone-${i}.png"><div style="padding:5px">${i+1}. ${p.name}</div></div>`).join('')}</body></html>`);await contact.waitForFunction(()=>[...document.images].every(i=>i.complete));await contact.screenshot({path:'art-source/review/all-environments.png',fullPage:true});
console.log(JSON.stringify({errors,...report}));await browser.close();if(errors.length||report.stats.failures)process.exitCode=1;
