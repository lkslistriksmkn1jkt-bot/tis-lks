/* =====================================================================
   TIS LKS Instalasi Listrik · aplikasi web mandiri
   Data: Supabase (bila config.js diisi) atau mode demo (localStorage)
   ===================================================================== */
"use strict";
const VERSION = "v2027.4";
const CFG = window.TIS_CONFIG || {};
const DEMO = !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY;
const COLORS = ["#1D5FC4","#D35A22","#2F9A3F","#8E44AD","#B07A00","#0E8C8C","#C2372B","#5A6773"];
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "x"+Date.now().toString(36)+Math.random().toString(36).slice(2,10));

/* ---------------- Penyimpanan: mode demo ---------------- */
const LocalStore = {
  key: "tis-demo-v1",
  db: null,
  load(){ try{ this.db = JSON.parse(localStorage.getItem(this.key) || "null"); }catch(e){ this.db = null; }
    if(!this.db){ const sid = uid(); this.db = { seasons:[{id:sid,name:"LKS EI 2026–2027 (demo)",active:true,config:clone(window.TIS_SEED),created_at:new Date().toISOString()}],
      competitors:[{id:uid(),season_id:sid,name:"Siswa kelas XI",kelas:"XI",sekolah:"",peran:"Peserta",sort:1},{id:uid(),season_id:sid,name:"Siswa kelas X",kelas:"X",sekolah:"",peran:"Peserta",sort:2}],
      records:[], activity:[], profiles:[{id:"demo",name:"Pembina (demo)",email:"demo@lokal",role:"admin"}] }; this.save(); } if(!this.db.activity) this.db.activity=[]; },
  act(r, action){ const now=new Date().toISOString(); const last=action!=="hapus"&&this.db.activity.find(a=>a.rec_id===r.id&&a.user_id==="demo"&&a.action!=="hapus"&&Date.now()-Date.parse(a.at)<900000);
    if(last){ last.at=now; last.n++; } else this.db.activity.unshift({ id:Date.now()+Math.random(), season_id:r.season_id, rec_id:r.id, kind:r.kind, ref:r.ref, competitor_id:r.competitor_id, action, n:1, user_id:"demo", first_at:now, at:now }); },
  async listActivity(sid, from, to, lim){ return clone(this.db.activity.filter(a=>a.season_id===sid&&a.at>=from&&a.at<to)); },
  async setName(id, n){ const p=this.db.profiles.find(x=>x.id===id); if(p){ p.name=n; this.save(); } },
  save(){ try{ localStorage.setItem(this.key, JSON.stringify(this.db)); }catch(e){ toast("Penyimpanan browser penuh."); } },
  async init(){ this.load(); return { user:{id:"demo",email:"demo@lokal"}, profile:this.db.profiles[0] }; },
  async signIn(){ return {}; }, async signOut(){}, async updatePassword(){ return {}; },
  async updateName(n){ this.db.profiles[0].name = n; this.save(); },
  async listSeasons(){ return clone(this.db.seasons); },
  async loadSeason(id){ return { competitors: clone(this.db.competitors.filter(c=>c.season_id===id)), records: clone(this.db.records.filter(r=>r.season_id===id)) }; },
  async saveSeason(s){ const i=this.db.seasons.findIndex(x=>x.id===s.id); if(s.active) this.db.seasons.forEach(x=>x.active=false); if(i>=0) this.db.seasons[i]=clone(s); else this.db.seasons.push(clone(s)); this.save(); return s; },
  async deleteSeason(id){ this.db.seasons=this.db.seasons.filter(s=>s.id!==id); this.db.competitors=this.db.competitors.filter(c=>c.season_id!==id); this.db.records=this.db.records.filter(r=>r.season_id!==id); this.save(); },
  async saveCompetitor(c){ const i=this.db.competitors.findIndex(x=>x.id===c.id); if(i>=0) this.db.competitors[i]=clone(c); else this.db.competitors.push(clone(c)); this.save(); return c; },
  async deleteCompetitor(id){ this.db.competitors=this.db.competitors.filter(c=>c.id!==id); this.db.records=this.db.records.filter(r=>r.competitor_id!==id); this.save(); },
  async upsertRecord(r){ const i=this.db.records.findIndex(x=>x.id===r.id); r.updated_at=new Date().toISOString(); r.updated_by="demo"; this.act(r, i>=0?"ubah":"buat"); if(i>=0) this.db.records[i]=clone(r); else this.db.records.push(clone(r)); this.save(); return r; },
  async upsertRecords(rs){ for(const r of rs) await this.upsertRecord(r); },
  async deleteRecord(id){ const r=this.db.records.find(x=>x.id===id); if(r) this.act(r,"hapus"); this.db.records=this.db.records.filter(r=>r.id!==id); this.save(); },
  async listProfiles(){ return clone(this.db.profiles); },
  async setRole(){ },
  subscribe(){ return ()=>{}; }
};

/* ---------------- Penyimpanan: Supabase ---------------- */
const SupaStore = {
  sb: null, ch: null,
  async init(){
    this.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true } });
    const { data } = await this.sb.auth.getSession();
    const user = data.session?.user || null;
    if(!user) return { user:null, profile:null };
    return { user, profile: await this.profile(user.id) };
  },
  async profile(id){ const { data } = await this.sb.from("profiles").select("*").eq("id", id).maybeSingle(); return data || { id, role:"viewer", name:"" }; },
  async signIn(email, password){ const { data, error } = await this.sb.auth.signInWithPassword({ email, password }); if(error) throw error; return { user:data.user, profile: await this.profile(data.user.id) }; },
  async signOut(){ await this.sb.auth.signOut(); },
  async updatePassword(pw){ const { error } = await this.sb.auth.updateUser({ password: pw }); if(error) throw error; },
  async updateName(n){ const { error } = await this.sb.from("profiles").update({ name:n }).eq("id", A.user.id); if(error) throw error; },
  async listSeasons(){ const { data, error } = await this.sb.from("seasons").select("*").order("created_at"); if(error) throw error; return data; },
  async loadSeason(id){
    const c = await this.sb.from("competitors").select("*").eq("season_id", id).order("sort"); if(c.error) throw c.error;
    const records = []; let from = 0;
    while(true){ const r = await this.sb.from("records").select("*").eq("season_id", id).range(from, from+999); if(r.error) throw r.error; records.push(...r.data); if(r.data.length < 1000) break; from += 1000; }
    return { competitors:c.data, records };
  },
  async saveSeason(s){
    if(s.active){ const r = await this.sb.from("seasons").update({ active:false }).neq("id", s.id); if(r.error) throw r.error; }
    const { data, error } = await this.sb.from("seasons").upsert({ id:s.id, name:s.name, active:s.active, config:s.config, updated_at:new Date().toISOString() }).select().single(); if(error) throw error; return data;
  },
  async deleteSeason(id){ const { error } = await this.sb.from("seasons").delete().eq("id", id); if(error) throw error; },
  async saveCompetitor(c){ const { data, error } = await this.sb.from("competitors").upsert(c).select().single(); if(error) throw error; return data; },
  async deleteCompetitor(id){ const { error } = await this.sb.from("competitors").delete().eq("id", id); if(error) throw error; },
  async upsertRecord(r){ const row = { id:r.id, season_id:r.season_id, kind:r.kind, ref:r.ref, competitor_id:r.competitor_id||null, data:r.data, updated_at:new Date().toISOString() };
    const { error } = await this.sb.from("records").upsert(row); if(error) throw error; return row; },
  async upsertRecords(rs){ for(let i=0;i<rs.length;i+=500){ const rows = rs.slice(i,i+500).map(r=>({ id:r.id, season_id:r.season_id, kind:r.kind, ref:r.ref, competitor_id:r.competitor_id||null, data:r.data, updated_at:new Date().toISOString() }));
    const { error } = await this.sb.from("records").upsert(rows); if(error) throw error; } },
  async deleteRecord(id){ const { error } = await this.sb.from("records").delete().eq("id", id); if(error) throw error; },
  async listProfiles(){ const { data, error } = await this.sb.from("profiles").select("*").order("created_at"); if(error) throw error; return data; },
  async setRole(id, role){ const { error } = await this.sb.from("profiles").update({ role }).eq("id", id); if(error) throw error; },
  async setName(id, name){ const { error } = await this.sb.from("profiles").update({ name }).eq("id", id); if(error) throw error; },
  async listActivity(sid, from, to, lim){ const { data, error } = await this.sb.from("activity").select("*").eq("season_id", sid).gte("at", from).lt("at", to).order("at", { ascending:false }).limit(lim||500); if(error) throw error; return data; },
  subscribe(seasonId, onRecord, onOther){
    if(this.ch) this.sb.removeChannel(this.ch);
    this.ch = this.sb.channel("tis-"+seasonId)
      .on("postgres_changes", { event:"*", schema:"public", table:"records", filter:"season_id=eq."+seasonId }, p => onRecord(p))
      .on("postgres_changes", { event:"*", schema:"public", table:"competitors", filter:"season_id=eq."+seasonId }, () => onOther())
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"seasons", filter:"id=eq."+seasonId }, () => onOther())
      .subscribe();
    return () => { if(this.ch) this.sb.removeChannel(this.ch); this.ch = null; };
  }
};
const Store = DEMO ? LocalStore : SupaStore;

/* ---------------- State aplikasi ---------------- */
const A = { user:null, profile:null, seasons:[], season:null, cfg:null, comps:[], rec:{}, loading:true, online:true, profiles:[] };
const ui = { ev:null, cid:null, rcid:null, gcid:null, detail:null, lostOnly:false, pev:null, pcid:null, pkind:"summary", jtab:null, logDate:null, logFrom:null, jxFrom:null, jxTo:null, jxCid:"", logTo:null, actFor:null, set:"musim", openDesc:null, quiz:null, quizShow:false, edit:null, editKey:null };
const saveState = {}, jBad = {};
try{ Object.assign(ui, JSON.parse(localStorage.getItem("tis-ui")||"{}")); }catch(e){}
function rememberUI(){ try{ localStorage.setItem("tis-ui", JSON.stringify({ ev:ui.ev, cid:ui.cid, rcid:ui.rcid, gcid:ui.gcid, pev:ui.pev, pcid:ui.pcid, pkind:ui.pkind, jtab:ui.jtab, set:ui.set })); }catch(e){} }
const role = () => A.profile?.role || "viewer";
const canWrite = () => role()==="admin" || role()==="juri";
const isAdmin = () => role()==="admin";

/* ---------------- Utilitas ---------------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const fmt = (n,d=2) => n===null||n===undefined||isNaN(n) ? "—" : Number(n).toFixed(d).replace(".",",");
const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"], BLN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const dparts = id => { if(!id) return null; const [y,m,d] = id.split("-").map(Number); return new Date(y, m-1, d); };
const dlabel = (id,long) => { const dt = dparts(id); if(!dt) return "—"; return (long ? HARI[dt.getDay()] : HARI[dt.getDay()].slice(0,3)) + ", " + dt.getDate() + " " + BLN[dt.getMonth()]; };
const rangeLabel = (s,e) => { const a=dparts(s), b=dparts(e); if(!a) return "—"; if(!b) return dlabel(s); return a.getDate()+(a.getMonth()!==b.getMonth()?" "+BLN[a.getMonth()]:"")+"–"+b.getDate()+" "+BLN[b.getMonth()]+(a.getFullYear()!==new Date().getFullYear()||b.getFullYear()!==a.getFullYear()?" "+b.getFullYear():""); };
const todayId = () => { const t=new Date(); return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"); };
const addDays = (id,n) => { const d=dparts(id); d.setDate(d.getDate()+n); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const initials = n => (n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
function toast(m){ const t=document.getElementById("toast"); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true, 3000); }
const debounce = (fn,ms) => { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
function errMsg(e){ const m = e && (e.message || e.error_description || String(e)); if(/Invalid login/i.test(m)) return "E-mail atau kata sandi salah."; if(/Email not confirmed/i.test(m)) return "Akun belum dikonfirmasi. Minta admin mengonfirmasi di Supabase."; if(/row-level security|permission/i.test(m)) return "Akun Anda tidak punya izin untuk perubahan ini."; if(/records_kind_check|check constraint/i.test(m)) return "Database belum diperbarui. Admin perlu menjalankan update-log.sql di Supabase."; if(/Failed to fetch|NetworkError/i.test(m)) return "Tidak ada koneksi internet."; return m || "Terjadi kesalahan."; }

/* ---------------- Akses data musim ---------------- */
const compColor = c => COLORS[(A.comps.indexOf(c) % COLORS.length + COLORS.length) % COLORS.length];
const compById = id => A.comps.find(c=>c.id===id);
const cname = id => compById(id)?.name || "?";
const recId = (kind, ref, cid) => A.season.id+":"+kind+":"+ref+":"+(cid||"-");
const R = (kind, ref, cid) => A.rec[recId(kind,ref,cid)]?.data;
const scheme = () => A.cfg.scheme || [];
const aspects = () => scheme().flatMap(c => c.subs.map(s => ({ ...s, crit:c.id })));
const events = () => A.cfg.events || [];
const evById = id => events().find(e=>e.id===id);
const critMax = id => { const c = scheme().find(x=>x.id==id); return c ? c.subs.reduce((a,s)=>a+(+s.max||0),0) : 0; };
const schemeTotal = () => scheme().reduce((a,c)=>a+critMax(c.id),0);
const scopeAsp = ev => aspects().filter(a => (ev.scope||[]).map(String).includes(String(a.crit)));

function jVals(v){ return Array.isArray(v) ? v.filter(x=>x!==null&&x!==""&&!isNaN(x)).map(Number) : (v===undefined||v===null||v==="" ? [] : [Number(v)]); }
function subPts(s, v){
  if(v===undefined||v===null||v==="") return null;
  if(s.t==="M") return v ? +s.max : 0;
  if(s.t==="C") return Math.max(0, Math.min(+v, +s.n)) * s.max / s.n;
  if(s.t==="J"){ const a=jVals(v); if(!a.length) return null; return Math.round(a.reduce((x,y)=>x+y,0)/a.length/3*s.max*100)/100; }
  return null;
}
function calc(eid, cid){
  const ev = evById(eid); if(!ev) return null; const rec = R("mark", eid, cid); if(!rec) return null;
  const scope = (ev.scope||[]).map(String); let raw=0, filled=0; const byCrit={}, byAsp={};
  scheme().forEach(c => { if(!scope.includes(String(c.id))) return; let ct=0; c.subs.forEach(s => { const p=subPts(s, rec.marks?.[s.id]); byAsp[s.id]=p; if(p!==null){ filled++; ct+=p; } }); byCrit[c.id]=Math.round(ct*100)/100; raw+=ct; });
  const asp = scopeAsp(ev); if(!filled && !rec.k3 && !rec.bahan) return null;
  const max = scope.reduce((a,id)=>a+critMax(id),0) || 1; const bahan=+rec.bahan||0, k3=!!rec.k3;
  const net = k3 ? 0 : Math.max(0, raw-bahan);
  return { raw:Math.round(raw*100)/100, max, net:Math.round(net*100)/100, score:Math.round(net/max*10000)/100, byCrit, byAsp, filled, all:asp.length, complete:filled===asp.length, bahan, k3, minutes:rec.minutes||null, plan:rec.plan||null };
}
const pctCls = p => p>=90 ? "good" : p>=65 ? "warn" : "bad";
const gates = () => A.cfg.gates || [];
function gateStatus(cid, gid){ const g=gates().find(x=>x.id===gid); const r=(R("gate","all",cid)||{})[gid]; const items=r?.items||[]; const n=g.items.filter((_,i)=>items[i]).length; return { done:g.items.length>0&&n===g.items.length, n, total:g.items.length, date:r?.date||null }; }
const gatesPassed = cid => gates().filter(g=>gateStatus(cid,g.id).done).length;
function selection(cid){
  const sc = A.cfg.selection || { full:[], w:{full:50,trend:20,gate:20,kons:10} }; const w = sc.w || {};
  const full = (sc.full||[]).map(id=>calc(id,cid)).filter(c=>c&&c.complete).map(c=>c.score);
  const avgFull = full.length ? full.reduce((a,b)=>a+b,0)/full.length : null;
  const c1 = sc.trendFrom ? calc(sc.trendFrom,cid) : null, c2 = sc.trendTo ? calc(sc.trendTo,cid) : null; const trend = c1&&c2 ? c2.score-c1.score : null;
  const gp = gatesPassed(cid), gt = gates().length || 1;
  const all = events().map(e=>calc(e.id,cid)).filter(Boolean); const k3 = all.filter(c=>c.k3).length, bahan = all.reduce((a,c)=>a+c.bahan,0);
  const kons = Math.max(0, 100-15*k3-3*bahan); const ts = trend===null ? 50 : Math.max(0, Math.min(100, 50+trend*2.5));
  const W = (+w.full||0)+(+w.trend||0)+(+w.gate||0)+(+w.kons||0) || 1;
  const idx = avgFull===null ? null : ((+w.full||0)*avgFull + (+w.trend||0)*ts + (+w.gate||0)*(gp/gt*100) + (+w.kons||0)*kons)/W;
  return { avgFull, nFull:full.length, nFullTotal:(sc.full||[]).length, trend, gp, gt, k3, bahan, kons, idx, w };
}
const sched = () => A.cfg.schedule || [];
const schedTabs = () => [...new Set(sched().map(s=>s.tab||"Jadwal"))];
function currentItems(){ const t=todayId(); return sched().filter(s => { const end = s.end || s.date; return s.date && t>=s.date && t<=end; }); }

/* ---------------- Simpan data ---------------- */
async function saveRec(kind, ref, cid, data, key){
  if(!canWrite()){ toast("Akun Anda hanya bisa melihat."); return false; }
  const r = { id:recId(kind,ref,cid), season_id:A.season.id, kind, ref, competitor_id:cid||null, data };
  const k = key || r.id; saveState[k] = "saving"; A.rec[r.id] = r; render();
  try{ await Store.upsertRecord(r); delete saveState[k]; render(); return true; }
  catch(e){ saveState[k] = "err"; render(); toast("Gagal menyimpan: "+errMsg(e)); return false; }
}
async function saveSeasonCfg(newCfg, msg){
  if(!isAdmin()){ toast("Hanya admin yang bisa mengubah pengaturan."); return false; }
  const s = { ...A.season, config:newCfg };
  try{ const saved = await Store.saveSeason(s); A.season = { ...A.season, ...saved, config:newCfg }; A.cfg = newCfg; const i=A.seasons.findIndex(x=>x.id===s.id); if(i>=0) A.seasons[i]=A.season; toast(msg||"Pengaturan disimpan."); render(); return true; }
  catch(e){ toast("Gagal menyimpan: "+errMsg(e)); return false; }
}
