import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const php=process.env.EF_PHP_EXE;if(!php)throw Error('Set EF_PHP_EXE to a PHP CLI executable.');
execFileSync(php,['-l','public/api/index.php'],{stdio:'inherit'});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ef-verso-api-test-'));
fs.cpSync('public/api',path.join(dir,'api'),{recursive:true});
const port=18193,base=`http://127.0.0.1:${port}`;
fs.writeFileSync(path.join(dir,'api/_private/config.local.php'),`<?php return ['origin'=>'${base}','host'=>'localhost','database'=>'test','user'=>'test','password'=>'test'];`);
const server=spawn(php,['-S',`127.0.0.1:${port}`,'-t',dir],{stdio:'pipe',windowsHide:true});
try{
 let status;
 for(let i=0;i<40;i++){try{status=await fetch(base+'/api/index.php?action=status');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert(status?.ok);const cookie=status.headers.get('set-cookie').split(';')[0],data=await status.json();assert.equal(data.configured,true);assert.equal(data.signedIn,false);assert(data.csrf);
 const post=(action,input,headers={})=>fetch(base+'/api/index.php?action='+action,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,...headers},body:JSON.stringify(input)});
 assert.equal((await post('save',{})).status,403);
 assert.equal((await post('save',{}, {'X-CSRF-Token':data.csrf,Origin:'https://other.invalid'})).status,403);
 assert.equal((await post('load',{}, {'X-CSRF-Token':data.csrf,Origin:base})).status,401);
 assert.equal((await post('register',{padding:'a'.repeat(270000)},{'X-CSRF-Token':data.csrf,Origin:base})).status,413);
 console.log('PHP lint, sessão, CSRF, origem, autenticação obrigatória e limite de tamanho: OK. Banco MySQL real ainda depende da hospedagem.');
}finally{server.kill();}
