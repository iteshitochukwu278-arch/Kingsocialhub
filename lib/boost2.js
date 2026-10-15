// Boost 2 — second SMM provider (admin-configured). Credentials remain server-side (NOVA_API_KEY).
const axios = require('axios');
const crypto = require('crypto');
module.exports = function registerNovaBoost2({ app, mongoose, User, Transaction, auth, anyAdminAuth }) {
  const base = () => String(process.env.NOVA_BASE_URL || 'https://www.novasolution.ng/api/v1').replace(/\/+$/, '');
  const key = () => String(process.env.NOVA_API_KEY || '').trim();
  const schema = new mongoose.Schema({ itemId: {type:Number,unique:true,index:true}, sellPrice:{type:Number,default:0}, markup:{type:Number,default:0}, mode:{type:String,enum:['specific','markup'],default:'markup'}, enabled:{type:Boolean,default:true}, updatedAt:{type:Date,default:Date.now} });
  const Price = mongoose.models.NovaBoost2Price || mongoose.model('NovaBoost2Price', schema);
  const ordersSchema = new mongoose.Schema({ userId:mongoose.Schema.Types.ObjectId, itemId:Number, itemName:String, quantity:Number, link:String, providerOrder:String, status:String, cost:Number, sellTotal:Number, createdAt:{type:Date,default:Date.now} });
  const Order = mongoose.models.NovaBoost2Order || mongoose.model('NovaBoost2Order', ordersSchema);
  async function api(method,path,data,params) {
    if (!key()) { const e=new Error('Boost 2 is not set up yet. Please contact the administrator.'); e.status=503; throw e; }
    const r=await axios({method,url:base()+path,data,params,timeout:30000,headers:{Authorization:`Bearer ${key()}`,Accept:'application/json','Content-Type':'application/json',...(method==='post'?{'Idempotency-Key':crypto.randomUUID()}:{})}});
    return r.data;
  }
  const unwrap = d => (d && d.data && typeof d.data === 'object' && !Array.isArray(d.data)) ? d.data : (d || {});
  const rowsOf = d => { const u = unwrap(d); for (const k of ['services','items','products','results']) if (Array.isArray(u[k])) return u[k]; if (Array.isArray(d?.data)) return d.data; if (Array.isArray(d)) return d; return []; };
  async function fetchPage(page, withPerPage) {
    return api('get','/catalog/smm',null, withPerPage ? {page,per_page:80} : {page});
  }
  async function catalogue(force=false) {
    const products=[]; let page=1, more=true, withPerPage=true;
    while(more && page<=100) {
      let d;
      try { d = await fetchPage(page, withPerPage); }
      catch(e) {
        // Some accounts reject per_page — retry once without it before giving up.
        if (withPerPage && page===1 && e.response && e.response.status>=400 && e.response.status<500 && e.response.status!==401 && e.response.status!==403) { withPerPage=false; d = await fetchPage(page,false); }
        else throw e;
      }
      products.push(...rowsOf(d));
      const u = unwrap(d); more = !!(u.has_more || d?.has_more || u.next_page || d?.meta?.has_more); page++;
    }
    const prices=await Price.find({}).lean(); const pm=new Map(prices.map(p=>[Number(p.itemId),p]));
    const costOf = p => { const m=Number(p.price_minor); if (Number.isFinite(m)) return m/100; const x=Number(p.price ?? p.rate ?? p.cost); return Number.isFinite(x)?x:0; };
    return products.map(p=>{const cfg=pm.get(Number(p.id))||{};const cost=costOf(p);const sell=cfg.mode==='specific'?Number(cfg.sellPrice)||0:cost+(Number(cfg.markup)||0);return {id:Number(p.id),name:p.name||`Service ${p.id}`,category:p.category||'Social boosting',min:Number(p.min_qty ?? p.min)||1,max:Number(p.max_qty ?? p.max)||100000, cost,price:sell,enabled:cfg.enabled!==false,priced:sell>0};});
  }
  app.get('/api/boost2/services',auth,async(req,res)=>{res.set('Cache-Control','no-store');if(!key())return res.json({enabled:false,services:[],message:'Boost 2 is not available yet. Please contact the administrator.'});try{res.json({enabled:true,services:(await catalogue()).filter(x=>x.enabled&&x.priced)});}catch(e){const st=e.response?.status;const pm=e.response?.data?.message||e.response?.data?.error||e.message;console.error('[boost2] catalogue failed:',st,pm);res.status(502).json({error:'Could not load Boost 2 services right now. Please try again shortly.',detail:(st?`Error ${st}: `:'')+String(pm||'').slice(0,160).replace(/nova\s*solution|novasolution|nova/ig,'the provider')});}});
  app.post('/api/boost2/orders',auth,async(req,res)=>{let user,charged=0;try{const id=Number(req.body?.serviceId),qty=Number(req.body?.quantity),link=String(req.body?.link||'').trim();if(!id||!Number.isInteger(qty)||qty<1||!/^https?:\/\//i.test(link))return res.status(400).json({error:'Choose a service, valid quantity, and public http(s) link.'});const s=(await catalogue()).find(x=>x.id===id&&x.enabled&&x.priced);if(!s)return res.status(404).json({error:'Service unavailable.'});if(qty<s.min||qty>s.max)return res.status(400).json({error:`Quantity must be between ${s.min} and ${s.max}.`});const total=Math.round(s.price*qty/1000*100)/100;if(!(total>0))return res.status(400).json({error:'Selling price is not configured.'});user=await User.findOneAndUpdate({_id:req.user._id,balance:{$gte:total}},{$inc:{balance:-total}},{new:true});if(!user)return res.status(400).json({error:'Insufficient wallet balance.'});charged=total;let d;try{d=await api('post','/orders',{type:'smm',item_id:id,quantity:qty,payload:{link}});}catch(e){await User.updateOne({_id:user._id},{$inc:{balance:total}});charged=0;return res.status(400).json({error:e.response?.data?.message||'The order was rejected. Your wallet was refunded.'});}const ord=d.order||d;await Order.create({userId:user._id,itemId:id,itemName:s.name,quantity:qty,link,providerOrder:String(ord.number||''),status:ord.status||'processing',cost:s.cost*qty/1000,sellTotal:total});await Transaction.create({userId:user._id,type:'purchase',amount:total,description:`Boost 2 — ${s.name}`,status:'success'});res.json({ok:true,order:ord.number||null,status:ord.status||'processing',amountPaid:total,balance:user.balance});}catch(e){if(charged&&user?._id)await User.updateOne({_id:user._id},{$inc:{balance:charged}}).catch(()=>{});res.status(e.status||502).json({error:e.message||'Boost order failed'});}});
  app.get('/api/admin/boost2/services',anyAdminAuth,async(req,res)=>{try{res.json(await catalogue());}catch(e){res.status(e.status||502).json({error:e.message});}});
  app.put('/api/admin/boost2/services/:id',anyAdminAuth,async(req,res)=>{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid service ID'});const b=req.body||{},set={updatedAt:new Date()};if(b.mode!==undefined){if(!['specific','markup'].includes(b.mode))return res.status(400).json({error:'Mode must be specific or markup'});set.mode=b.mode;}for(const k of ['sellPrice','markup'])if(b[k]!==undefined){const n=Number(b[k]);if(!Number.isFinite(n)||n<0)return res.status(400).json({error:`${k} must be zero or greater`});set[k]=n;}if(typeof b.enabled==='boolean')set.enabled=b.enabled;await Price.updateOne({itemId:id},{$set:{itemId:id,...set}},{upsert:true});res.json({ok:true});});
};
