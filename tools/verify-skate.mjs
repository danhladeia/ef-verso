import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],page=await (await browser.newContext({viewport:{width:1440,height:1000}})).newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
try{
 await page.addInitScript(()=>localStorage.setItem('ef-verso-student-v1',JSON.stringify({name:'Teste',className:'7A',home:'praca',version:1})));
 await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.cityReady,null,{timeout:90000});
 // O bowl afundado: fundo bem abaixo do chão, parede entre o fundo e o chão, nível normal longe dele.
 const bowl=await page.evaluate(()=>({floor:window.skateReview.terrainHeight(-11,-13),wall:window.skateReview.terrainHeight(-11,-9.3),outside:window.skateReview.terrainHeight(-11,-4)}));
 assert.equal(bowl.floor,-1.7,'Fundo do bowl a 1,7 m abaixo do chão');
 assert(bowl.wall<0&&bowl.wall>-1.7,'Parede do bowl fica entre o fundo e o chão');
 assert.equal(bowl.outside,0,'Fora do bowl o chão é normal');
 await page.evaluate(()=>window.cityReview.visit(15));
 await page.waitForFunction(()=>document.querySelector('#interact').textContent.includes('Aventura Urbana'),null,{timeout:10000});
 assert.equal(await page.locator('#skate-enter').isVisible(),true,'O botão de andar de skate aparece perto da pista');
 await page.locator('#skate-enter').click();
 await page.waitForFunction(()=>window.skateReview.active(),null,{timeout:5000});
 assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('skate-active')),true);
 const start=await page.evaluate(()=>window.skateReview.state());
 await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');
 const moved=await page.evaluate(()=>window.skateReview.state());
 assert(Math.hypot(moved.x-start.x,moved.z-start.z)>1,'Segurar W move o skatista para a frente');
 assert(moved.speed>0,'A velocidade aumenta ao acelerar');
 // Ollie: Espaço deve tirar o skatista do chão por um instante.
 await page.keyboard.down(' ');await page.waitForTimeout(50);await page.keyboard.up(' ');
 await page.waitForFunction(()=>window.skateReview.state().airborne,null,{timeout:1000});
 await page.waitForFunction(()=>!window.skateReview.state().airborne,null,{timeout:2000});
 await page.locator('#skate-leave').click();
 assert.equal(await page.evaluate(()=>window.skateReview.active()),false,'Esc/Sair encerra o passeio');
 assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('skate-active')),false);
 assert.equal(errors.length,0,'Sem erros de console: '+JSON.stringify(errors));
 console.log('Skate: bowl afundado, movimento, ollie e saída da pista OK.');
}finally{await browser.close();}
