const { chromium } = require('playwright-core');
const out=process.argv[2];
async function ctx(b,name){return b.newContext({locale:'ar-JO',viewport:{width:540,height:1080},recordVideo:{dir:out+'/'+name,size:{width:540,height:1080}},storageState:{cookies:[],origins:[{origin:'http://localhost:3200',localStorage:[{name:'sw_role',value:'browse'}]}]}});}
async function smooth(p,dy,ms){const steps=Math.round(ms/16);for(let i=0;i<steps;i++){await p.mouse.wheel(0,dy/steps);await p.waitForTimeout(16);}}
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 // R1 explore
 let c=await ctx(b,'explore');let p=await c.newPage();await p.goto('http://localhost:3200/ar/explore');await p.waitForTimeout(1500);await p.mouse.move(270,600);await smooth(p,1400,5000);await p.waitForTimeout(800);await c.close();
 // R2 feed
 c=await ctx(b,'feed');p=await c.newPage();await p.goto('http://localhost:3200/ar');await p.goto('http://localhost:3200/ar/feed');await p.waitForTimeout(1500);await p.mouse.move(270,600);await smooth(p,1600,6000);await p.waitForTimeout(800);await c.close();
 // R3 matcher
 c=await ctx(b,'match');p=await c.newPage();await p.goto('http://localhost:3200/ar/match');await p.waitForTimeout(1500);
 for(let step=0;step<8;step++){
   const txt=await p.locator('main').innerText().catch(()=>'' );console.log('STEP',step,txt.slice(-300).replace(/\n/g,' / '));
   const chips=p.locator('main button:not([disabled])');const names=await chips.allInnerTexts();
   const next=names.findIndex(n=>/التالي|اعرض|ابحث|تأكيد|أرسل|النتائج/.test(n));
   const opt=names.findIndex(n=>n.trim().length>1&&!/التالي|الوضع|English|تخط|رجوع/.test(n));
   if(opt>=0){await chips.nth(opt).click();await p.waitForTimeout(700);}
   const names2=await chips.allInnerTexts();const n2=names2.findIndex(n=>/التالي|اعرض|ابحث|تأكيد|أرسل|النتائج|تخطّ/.test(n));
   if(n2>=0){await chips.nth(n2).click();await p.waitForTimeout(1500);} else if(opt<0) break;
 }
 await p.waitForTimeout(2000);await smooth(p,900,3000);await p.waitForTimeout(1000);await p.screenshot({path:out+'/match-end.png'});await c.close();
 await b.close();})();
