import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
const output=path.join(root,'deployment/hostinger/public_html');
// Copy generated build only; private deployment configuration must be set on the server.
fs.mkdirSync(output,{recursive:true});
fs.cpSync(path.join(root,'dist'),output,{recursive:true,filter:source=>path.basename(source)!=='config.local.php'});
fs.copyFileSync(path.join(root,'deployment/schema.sql'),path.join(root,'deployment/hostinger/schema.sql'));
fs.copyFileSync(path.join(root,'deployment/HOSTINGER.md'),path.join(root,'deployment/hostinger/LEIA-ME.md'));
console.log('Pacote pronto:',path.join(root,'deployment/hostinger'));
