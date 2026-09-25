const { chromium } = require('playwright-core');
(async()=>{const out=process.argv[2];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const c=await b.newContext({locale:'ar-JO',viewport:{width:540,height:1080},recordVideo:{dir:out,size:{width:540,height:1080}},storageState:{cookies:[{name:'sw_country',value:'jo',url:'http://localhost:3200'}],origins:[{origin:'http://localhost:3200',localStorage:[{name:'sw_role',value:'browse'}]}]}});
 const p=await c.newPage();await p.goto('http://localhost:3200/ar');await p.waitForTimeout(800);
 const led=p.locator('.sw-ledger').first();await led.scrollIntoViewIfNeeded();await p.waitForTimeout(300);
 const bb=await led.boundingBox();await p.mouse.wheel(0,bb.y-120);await p.waitForTimeout(1500);console.log('ledger at',bb&&bb.y);
 const btns=led.locator('button');console.log('buttons',await btns.allInnerTexts());
 const n=await btns.count();for(let i=0;i<n;i++){const t=await btns.nth(i).innerText();if(t.trim()){await btns.nth(i).click().catch(()=>{});await p.waitForTimeout(1600);}}
 await p.waitForTimeout(1500);await p.screenshot({path:out+'/end.png'});await c.close();await b.close();})();
