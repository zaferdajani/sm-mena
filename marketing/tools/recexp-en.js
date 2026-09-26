const { chromium } = require('playwright-core');
(async()=>{const out=process.argv[2];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const c=await b.newContext({locale:'en-US',viewport:{width:540,height:1080},recordVideo:{dir:out,size:{width:540,height:1080}},storageState:{cookies:[],origins:[{origin:'http://localhost:3200',localStorage:[{name:'sw_role',value:'browse'}]}]}});
 const p=await c.newPage();await p.goto('http://localhost:3200/en/explore');await p.waitForTimeout(1500);await p.mouse.move(270,600);
 for(let i=0;i<300;i++){await p.mouse.wheel(0,5);await p.waitForTimeout(16);} await p.waitForTimeout(800);await c.close();await b.close();})();
