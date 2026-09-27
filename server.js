const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {URL}=require('url');

// Loads .env automatically for this starter. On Render, Environment Variables
// are preferred; .env is included here only to make setup easier.
const ENV_FILE=path.join(__dirname,'.env');
if(fs.existsSync(ENV_FILE)){
  for(const line of fs.readFileSync(ENV_FILE,'utf8').split(/\r?\n/)){
    const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if(m && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');
  }
}
const PORT=Number(process.env.PORT||3000),BASE_URL=process.env.BASE_URL||`http://localhost:${PORT}`;
const LOOTLABS_API_TOKEN=process.env.LOOTLABS_API_TOKEN||'';
const LOOTLABS_POSTBACK_URL=process.env.LOOTLABS_POSTBACK_URL||`${BASE_URL}/api/lootlabs/postback`;
const TRIAL_SECONDS=Number(process.env.TRIAL_SECONDS||3600);
const DATA_FILE=path.join(__dirname,'data.json');
let db=fs.existsSync(DATA_FILE)?JSON.parse(fs.readFileSync(DATA_FILE,'utf8')):{trials:{},licenses:{}};
function save(){fs.writeFileSync(DATA_FILE,JSON.stringify(db,null,2))}
function send(res,status,data,type='application/json'){res.writeHead(status,{'Content-Type':type,'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(data):data)}
function body(req){return new Promise((ok,bad)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{ok(s?JSON.parse(s):{})}catch(e){bad(e)}})})}
function rnd(n=6){return crypto.randomBytes(10).toString('base64url').replace(/[^A-Z0-9]/gi,'').slice(0,n).toUpperCase()}
function makeLicense(type,duration,client){const now=Math.floor(Date.now()/1000),key=`REAL-${type}-${rnd()}-${rnd(5)}`;db.licenses[key]={key,type,status:'ACTIVE',createdAt:now,expiresAt:duration?now+duration:null,maxAccounts:type==='FREE'?1:null,accounts:client?[String(client)]:[],tabs:['HOME','BOX','FUSE']};save();return db.licenses[key]}
function valid(x){if(!x||x.status!=='ACTIVE')return false;if(x.expiresAt&&Date.now()/1000>=x.expiresAt){x.status='EXPIRED';save();return false}return true}
async function lootLink(id){if(!LOOTLABS_API_TOKEN)throw Error('LOOTLABS_API_TOKEN is not configured');const r=await fetch('https://creators.lootlabs.gg/api/public/content_locker',{method:'POST',headers:{Authorization:`Bearer ${LOOTLABS_API_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({title:"REALS'M FREE TRIAL",url:`${BASE_URL}/trial/complete?id=${encodeURIComponent(id)}`,tier_id:1,number_of_tasks:1,theme:1})});const d=await r.json();if(!r.ok||d.type==='error')throw Error(d.message||'LootLabs request failed');if(!d?.message?.loot_url)throw Error('LootLabs did not return loot_url');return d.message.loot_url+'&puid='+encodeURIComponent(id)}
async function route(req,res){const u=new URL(req.url,BASE_URL);if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});return res.end()}
if(req.method==='GET'&&u.pathname==='/'){return send(res,200,fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8'),'text/html;charset=utf-8')}
if(req.method==='POST'&&u.pathname==='/api/trial/start'){try{const d=await body(req),client=String(d.clientId||'').trim();if(!client)return send(res,400,{ok:false,error:'clientId required'});if(Object.values(db.trials).some(x=>x.clientId===client&&x.issuedKey))return send(res,409,{ok:false,error:'TRIAL_ALREADY_USED'});const id=crypto.randomUUID();db.trials[id]={trialId:id,clientId:client,createdAt:Math.floor(Date.now()/1000),issuedKey:null};save();const link=await lootLink(id);db.trials[id].lootUrl=link;save();return send(res,200,{ok:true,trialId:id,lootUrl:link})}catch(e){return send(res,500,{ok:false,error:e.message})}}
if(req.method==='GET'&&u.pathname==='/api/lootlabs/postback'){const id=u.searchParams.get('click_id');const t=id&&db.trials[id];if(!t)return send(res,404,{ok:false,error:'Unknown click_id'});if(!t.issuedKey){const l=makeLicense('FREE',TRIAL_SECONDS,t.clientId);t.issuedKey=l.key;t.completed=true;t.uniqueId=u.searchParams.get('unique_id')||null;save()}return send(res,200,{ok:true})}
if(req.method==='GET'&&u.pathname==='/api/trial/status'){const t=db.trials[u.searchParams.get('id')];if(!t)return send(res,404,{ok:false,error:'NOT_FOUND'});return send(res,200,{ok:true,completed:!!t.issuedKey,key:t.issuedKey||null})}
if(req.method==='POST'&&u.pathname==='/api/license/verify'){try{const d=await body(req),key=String(d.key||'').trim().toUpperCase(),client=String(d.clientId||'').trim(),l=db.licenses[key];if(!valid(l))return send(res,200,{ok:false,status:'INVALID_OR_EXPIRED'});if(l.maxAccounts!==null&&!l.accounts.includes(client)){if(l.accounts.length>=l.maxAccounts)return send(res,200,{ok:false,status:'ACCOUNT_LIMIT'});l.accounts.push(client);save()}return send(res,200,{ok:true,status:'ACTIVE',type:l.type,expiresAt:l.expiresAt,tabs:l.tabs})}catch(e){return send(res,400,{ok:false,error:e.message})}}
if(req.method==='GET'&&u.pathname==='/api/admin/stats'){const a=Object.values(db.licenses),active=a.filter(valid).length;return send(res,200,{totalLicenses:a.length,active,expired:a.filter(x=>x.status==='EXPIRED').length,free:a.filter(x=>x.type==='FREE').length,premium:a.filter(x=>x.type==='PREMIUM').length})}
if(req.method==='GET'&&u.pathname==='/trial/complete')return send(res,200,`<!doctype html><html><body style="font-family:Arial;background:#0f0f19;color:white;padding:30px"><h2>REALS'M FREE TRIAL</h2><p>Verification received. Return to the hub and press CHECK TRIAL.</p></body></html>`,'text/html;charset=utf-8');
return send(res,404,{ok:false,error:'NOT_FOUND'})}
http.createServer((q,r)=>route(q,r).catch(e=>send(r,500,{ok:false,error:e.message}))).listen(PORT,()=>console.log(`REALS'M V6 server on ${BASE_URL}`));
