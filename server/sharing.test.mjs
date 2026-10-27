import test from 'node:test';import assert from 'node:assert/strict';
import {portfolioInvitation,portfolioEmail,emailHref,buyerShareLink} from '../shared/sharing.ts';
test('friend links retain collection ownership and drop staff fragments and unrelated parameters',()=>{
 const url=new URL(buyerShareLink('https://portfolio.example/?broker=wrong&collection=chosen&email=private#invite=secret','home-1'));
 assert.equal(url.href,'https://portfolio.example/?collection=chosen&development=home-1');
 assert.equal(buyerShareLink('https://portfolio.example/?broker=owner#admin'),'https://portfolio.example/?broker=owner');
 assert.equal(buyerShareLink('https://portfolio.example/?email=private#admin'),'https://portfolio.example/');
});
test('prepared collection emails preserve broker context on every development and never set a recipient',()=>{
 const email=portfolioEmail('https://portfolio.example/?collection=chosen',[{id:'home-1',name:'First Home',area:'Chelsea'},{id:'home-2',name:'Second Home',area:'Battersea'}],'Homes for you\r\nBcc: unwanted');
 assert.ok(email.body.includes('development=home-1&collection=chosen'));assert.ok(email.body.includes('development=home-2&collection=chosen'));assert.ok(email.body.includes(portfolioInvitation));
 const href=emailHref(email.subject,email.body);assert.ok(href.startsWith('mailto:?subject='));assert.ok(!new URL(href).pathname);assert.ok(!new URL(href).searchParams.has('bcc'));assert.ok(!email.subject.includes('\n'));
 const own=portfolioEmail('https://portfolio.example/?broker=owner',[{id:'home-1',name:'Home',area:'Angel'}]);assert.ok(own.body.includes('development=home-1&broker=owner'));
});
