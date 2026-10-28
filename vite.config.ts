import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';
function releaseCommit(){
 if(/^[a-f0-9]{40}$/i.test(process.env.COMMIT_REF||''))return process.env.COMMIT_REF;
 try{return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{return 'local';}
}
export default defineConfig({plugins:[react(),{name:'portfolio-release',generateBundle(){this.emitFile({type:'asset',fileName:'release.json',source:JSON.stringify({commit:releaseCommit(),builtAt:new Date().toISOString()})});}}],server:{proxy:{'/api':'http://127.0.0.1:3001'}}});
