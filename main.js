/* =====================================================================
   Router, render, dan interaksi
   ===================================================================== */
"use strict";
const ROUTES = ["beranda","jadwal","scheme","penilaian","hasil","gate","laporan","jurnal","log","peserta","pengaturan","profil"];
const route = () => { const h=(location.hash||"").slice(1); return ROUTES.includes(h) ? h : "beranda"; };
let unsub = null;

function render(){
  const root=document.getElementById("root");
  if(A.loading){ root.innerHTML=`<div class="login-wrap"><p class="muted">Memuat…</p></div>`; return; }
  if(!A.user){ root.innerHTML=loginView(A.loginErr); return; }
  if(!A.season){ root.innerHTML=shell(`<div class="empty">Belum ada musim. ${isAdmin()?'<button class="btn primary" id="seedSeason">Buat musim dari template bawaan</button>':"Minta admin membuat musim."}</div>`, route()); return; }
  let r=route(); if(r==="penilaian"&&!canWrite()) r="hasil"; if(r==="pengaturan"&&!isAdmin()) r="beranda";
  const a=document.activeElement; const keep=a&&a.id&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.tagName==="SELECT")?{id:a.id,s:a.selectionStart,e:a.selectionEnd}:null;
  const keepE=a&&a.dataset&&a.dataset.e?a.dataset.e:null; const sx=window.scrollX, sy=window.scrollY;
  const oldFiles=[...root.querySelectorAll("input[data-keepfile]")];
  root.innerHTML=shell(V[r](), r);
  oldFiles.forEach(o=>{ const n=root.querySelector(`input[data-keepfile="${o.dataset.keepfile}"]`); if(n) n.replaceWith(o); });
  if(keep){ const el=document.getElementById(keep.id); if(el){ el.focus({preventScroll:true}); try{ el.setSelectionRange(keep.s,keep.e); }catch(e){} } }
  else if(keepE){ const el=document.querySelector(`[data-e="${keepE}"]`); if(el) el.focus({preventScroll:true}); }
  window.scrollTo(sx,sy);
}

/* ---------------- Boot ---------------- */
async function openSeason(id){
  const s=A.seasons.find(x=>x.id===id); if(!s) return;
  A.season=s; A.cfg=s.config||{}; ui.editKey=null;
  try{ localStorage.setItem("tis-season", id); }catch(e){}
  const d=await Store.loadSeason(id); A.comps=d.competitors.sort((a,b)=>(a.sort||0)-(b.sort||0)); A.rec={}; d.records.forEach(r=>A.rec[r.id]=r);
  if(unsub) unsub();
  unsub = Store.subscribe(id, p=>{ if(p.eventType==="DELETE"){ delete A.rec[p.old.id]; } else { const r=p.new; const k=r.id; if(saveState[k]==="saving") return; A.rec[k]=r; } render(); refreshAct(); }, debounce(async()=>{ await reloadSeason(); },500));
  render();
}
async function reloadSeason(){
  try{ A.seasons=await Store.listSeasons(); const s=A.seasons.find(x=>x.id===A.season?.id); if(s){ A.season=s; A.cfg=s.config||{}; } const d=await Store.loadSeason(A.season.id); A.comps=d.competitors.sort((a,b)=>(a.sort||0)-(b.sort||0)); A.rec={}; d.records.forEach(r=>A.rec[r.id]=r); A.online=true; }
  catch(e){ A.online=false; }
  render();
}
async function afterLogin(res){
  A.user=res.user; A.profile=res.profile; A.loginErr=null;
  try{ A.profiles=await Store.listProfiles(); }catch(e){ A.profiles=[]; }
  try{ A.seasons=await Store.listSeasons(); }catch(e){ toast(errMsg(e)); A.seasons=[]; }
  let saved=null; try{ saved=localStorage.getItem("tis-season"); }catch(e){}
  const s=A.seasons.find(x=>x.id===saved)||A.seasons.find(x=>x.active)||A.seasons[0];
  A.loading=false; if(s) await openSeason(s.id); else render();
}
async function boot(){
  try{ const res=await Store.init(); if(res.user) await afterLogin(res); else { A.loading=false; render(); } }
  catch(e){ A.loading=false; A.loginErr="Tidak bisa terhubung ke database: "+errMsg(e); render(); }
  if(!DEMO){ Store.sb.auth.onAuthStateChange((ev)=>{ if(ev==="SIGNED_OUT"){ A.user=null; A.profile=null; A.season=null; if(unsub) unsub(); render(); } }); }
  window.addEventListener("online", ()=>{ A.online=true; if(A.season) reloadSeason(); });
  window.addEventListener("offline", ()=>{ A.online=false; render(); });
  document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible"&&A.season&&!DEMO&&!(ui.picking&&Date.now()-ui.picking<120000)) reloadSeason(); });
}
window.addEventListener("hashchange", ()=>{ if(route()==="log") ui.actFor=null; render(); window.scrollTo(0,0); });

/* ---------------- Foto TO ---------------- */
A.purl={}; const purlPending=new Set();
function photoUrl(path){ if(A.purl[path]) return A.purl[path]; purlPending.add(path); queueUrls(); return ""; }
const queueUrls=debounce(async()=>{ const ps=[...purlPending]; purlPending.clear(); if(!ps.length) return; let got={}; try{ got=await Store.photoUrls(ps); }catch(e){} ps.forEach(p=>{ A.purl[p]=got[p]||"err"; }); render(); },60);
async function compressImg(file){
  let src,w,h; try{ src=await createImageBitmap(file); w=src.width; h=src.height; }catch(e){ src=await new Promise((ok,no)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=()=>no(new Error("Format foto tidak didukung")); i.src=URL.createObjectURL(file); }); w=src.naturalWidth; h=src.naturalHeight; }
  const M=DEMO?900:1600, k=Math.min(1,M/Math.max(w,h)); const cv=document.createElement("canvas"); cv.width=Math.round(w*k); cv.height=Math.round(h*k); cv.getContext("2d").drawImage(src,0,0,cv.width,cv.height);
  return await new Promise(ok=>cv.toBlob(ok,"image/jpeg",DEMO?0.7:0.82));
}
async function uploadPhotos(eid,cid,crit,files){
  if(!canWrite()){ toast("Akun Anda hanya bisa melihat."); return; }
  if(!files.length) return; ui.upl=(ui.upl||0)+files.length; render(); let ok=0;
  for(const f of files){
    try{ const blob=await compressImg(f); const id=uid(); const path=`${A.season.id}/${eid}/${cid}/${id}.jpg`;
      await Store.uploadPhoto(path,blob); A.purl[path]=URL.createObjectURL(blob);
      if(await saveRec("photo", eid+"~"+crit+"~"+id, cid, { eid, crit:String(crit), path, by:A.user.id, name:A.profile?.name||A.user?.email||"", at:Date.now() })) ok++;
    }catch(e){ toast("Foto gagal diunggah: "+errMsg(e)); }
    ui.upl=Math.max(0,(ui.upl||1)-1); render();
  }
  if(ok) toast(ok+" foto tersimpan.");
}
const saveCNote = debounce((ev,cid,crit,v)=>saveMark(ev,cid,"cn"+crit,d=>{ d.cnotes=Object.assign({},d.cnotes||{}, {[crit]:v}); }), 800);

/* ---------------- Log harian ---------------- */
async function loadAct(d){
  const key=A.season.id+"|"+d; ui.actFor=key; A.act=null; A.actErr=null;
  const from=new Date(dparts(d)).toISOString(), to=new Date(dparts(addDays(d,1))).toISOString();
  try{ const rows=await Store.listActivity(A.season.id, from, to); if(ui.actFor!==key) return; A.act=rows; }
  catch(e){ if(ui.actFor!==key) return; A.actErr=errMsg(e); }
  setTimeout(render,0);
}
const refreshAct = debounce(()=>{ if(route()==="log"&&A.season) loadAct(ui.logDate||todayId()); }, 1500);
function setLogDate(d){ ui.logDate=d; ui.actFor=null; render(); }

async function exportJurnal(){
  const from=document.getElementById("jxFrom").value, to=document.getElementById("jxTo").value, cid=document.getElementById("jxCid").value;
  if(!from||!to||from>to){ toast("Periksa rentang tanggal."); return; }
  try{ await loadXLSX(); }catch(e){ toast(e.message); return; }
  const num=v=>v===undefined||v===null||v===""||isNaN(v)?"":+v;
  const list=Object.values(A.rec).filter(r=>r.kind==="journal"&&(!cid||r.competitor_id===cid)).map(r=>({cid:r.competitor_id,...r.data})).filter(j=>(j.date||"")>=from&&(j.date||"")<=to).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.at||0)-(b.at||0));
  if(!list.length){ toast("Tidak ada catatan jurnal pada rentang ini."); return; }
  const J=[["Tanggal","Hari","Peserta","Drill / pekerjaan","Waktu (mnt)","Time plan (mnt)","Selisih plan (%)","Deviasi maks (mm)","Cacat","Bahan tambahan","Kondisi","Tidur (jam)","Sudah bisa","Belum bisa","Dicatat oleh"]].concat(list.map(j=>{ const w=num(j.waktu), p=num(j.plan); return [j.date,HARI[dparts(j.date).getDay()],cname(j.cid),j.drill||"",w,p,w!==""&&p?Math.round((w-p)/p*100):"",num(j.dev),num(j.cacat),num(j.bahan),j.kondisi||"",num(j.tidur),j.bisa||"",j.belum||"",j.by||""]; }));
  const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length*10)/10:"";
  const S=[["Peserta","Jumlah catatan","Hari tercatat","Rata-rata deviasi (mm)","Deviasi terbaik (mm)","Rata-rata selisih plan (%)","Total cacat","Total bahan tambahan","Kondisi tidak baik (kali)"]].concat(A.comps.filter(c=>!cid||c.id===cid).map(c=>{ const a=list.filter(j=>j.cid===c.id); const dev=a.map(j=>num(j.dev)).filter(x=>x!==""); const tp=a.filter(j=>num(j.waktu)!==""&&num(j.plan)).map(j=>(j.waktu-j.plan)/j.plan*100);
    return [c.name,a.length,new Set(a.map(j=>j.date)).size,avg(dev),dev.length?Math.min(...dev):"",avg(tp),a.reduce((x,j)=>x+(+j.cacat||0),0),a.reduce((x,j)=>x+(+j.bahan||0),0),a.filter(j=>j.kondisi&&j.kondisi!=="Baik").length]; }));
  const wb=XLSX.utils.book_new();
  const w1=XLSX.utils.aoa_to_sheet(J); w1["!cols"]=[{wch:11},{wch:8},{wch:16},{wch:30},{wch:9},{wch:10},{wch:10},{wch:11},{wch:7},{wch:9},{wch:12},{wch:8},{wch:45},{wch:45},{wch:16}]; XLSX.utils.book_append_sheet(wb,w1,"Jurnal");
  const w2=XLSX.utils.aoa_to_sheet(S); w2["!cols"]=[{wch:18},{wch:10},{wch:10},{wch:14},{wch:14},{wch:16},{wch:9},{wch:12},{wch:14}]; XLSX.utils.book_append_sheet(wb,w2,"Ringkasan");
  XLSX.writeFile(wb, "Jurnal-"+(cid?cname(cid).replace(/[^\w-]+/g,"_")+"-":"")+from+"_sd_"+to+".xlsx"); toast("Excel jurnal diunduh.");
}
async function exportLog(){
  const from=document.getElementById("logFrom").value, to=document.getElementById("logTo").value;
  if(!from||!to||from>to){ toast("Periksa rentang tanggal."); return; }
  try{ await loadXLSX(); }catch(e){ toast(e.message); return; }
  let act=[]; try{ act=await Store.listActivity(A.season.id, new Date(dparts(from)).toISOString(), new Date(dparts(addDays(to,1))).toISOString(), 5000); }catch(e){}
  const SES={ya:"Sesuai jadwal",sebagian:"Sebagian sesuai",ganti:"Diganti materi lain"};
  const jd=x=>sched().filter(s=>s.date&&x>=s.date&&x<=(s.end||s.date)).map(s=>s.label+": "+s.title.replace(/\n/g," / ")).join(" | ");
  const logs=Object.values(A.rec).filter(r=>r.kind==="log"&&r.data?.date>=from&&r.data?.date<=to).map(r=>r.data).sort((a,b)=>a.date.localeCompare(b.date)||(a.start||"").localeCompare(b.start||""));
  const L=[["Tanggal","Hari","Asisten","Jam mulai","Jam selesai","Kesesuaian","Hadir","Tidak hadir","Kegiatan","Capaian siswa","Kendala & tindak lanjut","Alat / bahan","Jadwal hari itu"]].concat(logs.map(l=>[l.date,HARI[dparts(l.date).getDay()],pname(l.by)||l.name,l.start||"",l.end||"",SES[l.sesuai]||"",A.comps.filter(c=>(l.hadir||[]).includes(c.id)).map(c=>c.name).join(", "),A.comps.filter(c=>!(l.hadir||[]).includes(c.id)).map(c=>c.name).join(", "),l.kegiatan||"",l.capaian||"",l.kendala||"",l.bahan||"",jd(l.date)]));
  const at=a=>{ const t=new Date(a.at); return [t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"), hhmm(a.at)]; };
  const T=[["Tanggal","Jam","Oleh","Kegiatan di aplikasi"]].concat([...act].reverse().map(a=>[...at(a),pname(a.user_id),actText(a)]));
  const staff=(A.profiles||[]).filter(p=>p.role==="juri"||p.role==="admin");
  const days=[...new Set(sched().filter(s=>s.kind==="day"&&s.date>=from&&s.date<=to).map(s=>s.date))].sort();
  const K=[["Tanggal latihan"].concat(staff.map(p=>p.name||p.email))].concat(days.map(x=>[x].concat(staff.map(p=>{ const l=R("log",x+"~"+p.id); return l?"✓ "+(l.start||"")+(l.end?"–"+l.end:""):"–"; }))));
  const wb=XLSX.utils.book_new();
  const w1=XLSX.utils.aoa_to_sheet(L); w1["!cols"]=[{wch:11},{wch:8},{wch:18},{wch:9},{wch:9},{wch:18},{wch:20},{wch:20},{wch:60},{wch:45},{wch:45},{wch:30},{wch:60}]; XLSX.utils.book_append_sheet(wb,w1,"Log asisten");
  const w2=XLSX.utils.aoa_to_sheet(T); w2["!cols"]=[{wch:11},{wch:6},{wch:18},{wch:70}]; XLSX.utils.book_append_sheet(wb,w2,"Aktivitas");
  const w3=XLSX.utils.aoa_to_sheet(K); w3["!cols"]=[{wch:14}].concat(staff.map(()=>({wch:18}))); XLSX.utils.book_append_sheet(wb,w3,"Rekap");
  XLSX.writeFile(wb, "Log-harian-"+from+"_sd_"+to+".xlsx"); toast("Excel log diunduh.");
}

/* ---------------- Penilaian ---------------- */
function markDoc(ev,cid){ return clone(R("mark",ev,cid)||{ marks:{} }); }
async function saveMark(ev, cid, key, mut){
  if(R("lock",ev)?.locked){ toast("Nilai TO ini terkunci."); render(); return; }
  const d=markDoc(ev,cid); d.marks=d.marks||{}; mut(d); d.savedAt=Date.now(); d.by=A.profile?.name||"";
  await saveRec("mark", ev, cid, d, ev+"/"+cid+"/"+key);
}
const aspInputs = () => [...document.querySelectorAll("#view [data-asp]:not([disabled])")];
function focusNext(el){ const l=aspInputs(), nx=l[l.indexOf(el)+1]; if(nx){ nx.focus(); if(nx.select) nx.select(); } else el.blur(); }
function commitAsp(el){
  const id=el.dataset.asp, kind=el.dataset.kind, ev=ui.ev, cid=ui.cid, prev=R("mark",ev,cid)?.marks?.[id];
  if(kind==="M"){ const c=el.value.trim().toUpperCase(); let v; if(c==="Y"||c==="1") v=1; else if(c==="N"||c==="0") v=0; else if(c==="") v=undefined; else { el.value=prev===1?"Y":prev===0?"N":""; toast("Isi Y atau N (1 atau 0)."); return false; }
    if(v!==prev) saveMark(ev,cid,id,d=>{ if(v===undefined) delete d.marks[id]; else d.marks[id]=v; }); return true; }
  if(kind==="C"){ const s=aspects().find(a=>a.id===id); const v=el.value===""?undefined:Math.max(0,Math.min(+s.n,Math.round(+el.value))); if(v!==prev) saveMark(ev,cid,id,d=>{ if(v===undefined) delete d.marks[id]; else d.marks[id]=v; }); return true; }
  if(kind==="J"){ const vals=[0,1,2].map(k=>{ const x=document.getElementById("as-"+id+"-"+k).value; return x===""?null:Math.max(0,Math.min(3,Math.round(+x))); }); const nums=vals.filter(x=>x!==null); const k=ev+"/"+cid+"/"+id;
    if(nums.length>1 && Math.max(...nums)-Math.min(...nums)>1){ jBad[k]=vals; render(); toast("Selisih nilai antar juri lebih dari 1. Diskusikan dulu, lalu isi ulang."); return false; }
    delete jBad[k]; if(JSON.stringify(Array.isArray(prev)?prev:[])===JSON.stringify(nums.length?vals:[])){ render(); return true; }
    saveMark(ev,cid,id,d=>{ if(nums.length) d.marks[id]=vals; else delete d.marks[id]; }); return true; }
}
const saveNote = debounce((ev,cid,v)=>saveMark(ev,cid,"note",d=>{ d.note=v; }), 800);

/* ---------------- Event: keydown ---------------- */
document.addEventListener("keydown", e=>{
  const t=e.target; if(!t.dataset||!t.dataset.asp||e.key!=="Enter") return; e.preventDefault();
  if(t.dataset.kind==="J"&&t.dataset.k!=="2"){ document.getElementById("as-"+t.dataset.asp+"-"+(+t.dataset.k+1)).focus(); return; }
  const l=aspInputs(); const nxId=l[l.indexOf(t)+1]?.id || null;
  t.dataset.done="1"; const ok=commitAsp(t);
  if(ok!==false){ const go=()=>{ const nx=nxId&&document.getElementById(nxId); if(nx){ nx.focus(); if(nx.select) nx.select(); } else if(document.activeElement) document.activeElement.blur(); }; go(); setTimeout(go,0); }
  setTimeout(()=>{ if(t.isConnected) delete t.dataset.done; },0);
});

/* ---------------- Event: click ---------------- */
document.addEventListener("click", e=>{ const el=e.target; if(el&&el.closest&&(el.matches("input[data-keepfile]")||el.closest("label")?.querySelector("input[data-keepfile]"))) ui.picking=Date.now(); }, true);
document.addEventListener("click", async e=>{
  const t=e.target.closest("button,a"); if(!t) return;
  if(t.id==="signOut"){ e.preventDefault(); await Store.signOut(); A.user=null; A.season=null; if(unsub) unsub(); render(); return; }
  if(t.id==="seedSeason"){ const s={ id:uid(), name:"LKS EI (template)", active:true, config:clone(window.TIS_SEED) }; try{ await Store.saveSeason(s); A.seasons=await Store.listSeasons(); await openSeason(s.id); }catch(err){ toast(errMsg(err)); } return; }
  if(t.dataset.ev){ ui.ev=t.dataset.ev; rememberUI(); }
  if(t.dataset.logday!==undefined){ const n=+t.dataset.logday; setLogDate(n===0?todayId():addDays(ui.logDate||todayId(),n)); return; }
  if(t.dataset.logto){ e.preventDefault(); setLogDate(t.dataset.logto); window.scrollTo(0,0); return; }
  if(t.id==="jXls"){ await exportJurnal(); return; }
  if(t.id==="jPrint"){ window.print(); return; }
  if(t.id==="logXls"){ await exportLog(); return; }
  if(t.id==="logPrint"){ window.print(); return; }
  if(t.id==="actReload"){ ui.actFor=null; render(); return; }
  if(t.dataset.dellog){ if(confirm("Hapus log harian ini?")){ try{ await Store.deleteRecord(t.dataset.dellog); delete A.rec[t.dataset.dellog]; ui.actFor=null; render(); toast("Log dihapus."); }catch(err){ toast(errMsg(err)); } } return; }
  if(t.id==="qShow"){ ui.quizShow=!ui.quizShow; render(); return; }
  if(t.id==="qNew"){ newQuiz(); render(); return; }
  if(t.dataset.jtab){ ui.jtab=t.dataset.jtab; rememberUI(); render(); return; }
  if(t.dataset.desc){ ui.openDesc=ui.openDesc===t.dataset.desc?null:t.dataset.desc; render(); return; }
  if(t.dataset.rcid){ ui.rcid=t.dataset.rcid; rememberUI(); render(); return; }
  if(t.dataset.gcid){ ui.gcid=t.dataset.gcid; rememberUI(); render(); return; }
  if(t.dataset.detail){ ui.detail=ui.detail===t.dataset.detail?null:t.dataset.detail; render(); return; }
  if(t.dataset.delphoto){ if(!confirm("Hapus foto ini?")) return; try{ await Store.deletePhoto(t.dataset.path).catch(()=>{}); await Store.deleteRecord(t.dataset.delphoto); delete A.rec[t.dataset.delphoto]; render(); toast("Foto dihapus."); }catch(err){ toast(errMsg(err)); } return; }
  if(t.id==="waCopy"){ const txt=waText(ui.pev,ui.pcid); if(!txt){ toast("Belum ada nilai untuk dilaporkan."); return; } try{ await navigator.clipboard.writeText(txt); toast("Ringkasan disalin. Tempel di WhatsApp."); }catch(e){ const ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); toast("Ringkasan disalin. Tempel di WhatsApp."); }catch(_){ toast("Tidak bisa menyalin otomatis."); } ta.remove(); } return; }
  if(t.id==="printBtn"){ window.print(); return; }
  if(t.id==="lockBtn"){ const cur=!!R("lock",ui.ev)?.locked; await saveRec("lock", ui.ev, null, { locked:!cur, by:A.profile?.name||"", at:Date.now() }); toast(!cur?"Nilai dikunci.":"Kunci dibuka."); return; }
  if(t.dataset.noteItem){ const id=t.dataset.noteItem; for(const c of A.comps){ const d=clone(R("done",id,c.id)||{}); const v=prompt("Catatan untuk "+c.name+" (kosongkan untuk menghapus):", d.note||""); if(v===null) return; if((d.note||"")!==v){ d.note=v; await saveRec("done", id, c.id, d); } } return; }
  if(t.dataset.del){ if(confirm("Hapus catatan jurnal ini?")){ try{ await Store.deleteRecord(t.dataset.del); delete A.rec[t.dataset.del]; render(); toast("Catatan dihapus."); }catch(err){ toast(errMsg(err)); } } return; }
  /* peserta */
  if(t.dataset.savecomp){ const id=t.dataset.savecomp, c={...compById(id)}; c.name=document.getElementById("pn-"+id).value.trim()||c.name; c.kelas=document.getElementById("pk-"+id).value.trim(); c.peran=document.getElementById("pr-"+id).value.trim(); c.sekolah=document.getElementById("ps-"+id).value.trim();
    try{ const s=await Store.saveCompetitor(c); A.comps[A.comps.findIndex(x=>x.id===id)]={...c,...s}; toast("Data peserta disimpan."); render(); }catch(err){ toast(errMsg(err)); } return; }
  if(t.dataset.delcomp){ const c=compById(t.dataset.delcomp); if(!confirm(`Hapus ${c.name} beserta semua nilai dan jurnalnya? Tindakan ini tidak bisa dibatalkan.`)) return; try{ await Store.deleteCompetitor(c.id); A.comps=A.comps.filter(x=>x.id!==c.id); Object.keys(A.rec).forEach(k=>{ if(A.rec[k].competitor_id===c.id) delete A.rec[k]; }); render(); toast("Peserta dihapus."); }catch(err){ toast(errMsg(err)); } return; }
  if(t.id==="addComp"){ const c={ id:uid(), season_id:A.season.id, name:"Peserta baru", kelas:"", sekolah:"", peran:"Peserta", sort:(A.comps.length?Math.max(...A.comps.map(x=>x.sort||0)):0)+1 }; try{ const s=await Store.saveCompetitor(c); A.comps.push({...c,...s}); render(); }catch(err){ toast(errMsg(err)); } return; }
  /* profil */
  if(t.id==="prSave"){ const n=document.getElementById("prName").value.trim(); try{ await Store.updateName(n); A.profile.name=n; const me=(A.profiles||[]).find(x=>x.id===A.user.id); if(me) me.name=n; toast("Nama disimpan."); render(); }catch(err){ toast(errMsg(err)); } return; }
  /* pengaturan */
  if(t.dataset.set){ if(ui.dirty&&!confirm("Perubahan belum disimpan. Tinggalkan?")) return; ui.set=t.dataset.set; ui.editKey=null; rememberUI(); if(ui.set==="pengguna"&&!DEMO&&!A.profiles.length){ try{ A.profiles=await Store.listProfiles(); }catch(err){ toast(errMsg(err)); } } render(); return; }
  if(t.id==="setSave"){ await saveSettings(); return; }
  if(t.id==="setCancel"){ ui.editKey=null; ui.dirty=false; render(); return; }
  if(t.dataset.add){ const arr=getPath(ui.edit,t.dataset.add); const p=t.dataset.add;
    const blank = p==="events" ? { id:"to"+(arr.length+1), name:"TO-"+(arr.length+1), fase:"", date:todayId(), label:"", limit:240, scope:[], focus:"" }
      : p==="scheme" ? { id:String(arr.length+1), name:"Kriteria baru", subs:[] }
      : p==="gates" ? { id:"G"+(arr.length+1), ph:"", phName:"", items:[] }
      : /subs$/.test(p) ? { id:getPath(ui.edit,p.replace(/\.subs$/,"")).id+"."+(arr.length+1), d:"", t:"M", max:1 } : {};
    arr.push(blank); ui.dirty=true; render(); return; }
  if(t.dataset.rm){ const p=t.dataset.rm.split("."); const idx=+p.pop(); const arr=getPath(ui.edit,p.join(".")); if(!confirm("Hapus baris ini?")) return; arr.splice(idx,1); ui.dirty=true; render(); return; }
  if(t.dataset.dup){ const i=+t.dataset.dup; const s=clone(ui.edit.schedule[i]); s.id="s"+uid().slice(0,8); ui.edit.schedule.splice(i+1,0,s); ui.dirty=true; render(); return; }
  if(t.dataset.addsched){ const last=[...ui.edit.schedule].reverse().find(s=>s.tab===ui.jedTab)||{tab:ui.jedTab||"Jadwal",group:"",kind:"day"}; ui.edit.schedule.push({ id:"s"+uid().slice(0,8), tab:last.tab, group:last.group, kind:last.kind, date:"", end:"", label:"", title:"", target:"", hours:"", to:"", note:"" }); ui.dirty=true; render(); return; }
  if(t.id==="sortSched"){ ui.edit.schedule.sort((a,b)=>(a.tab||"").localeCompare(b.tab||"")||(a.date||"").localeCompare(b.date||"")); ui.dirty=true; render(); return; }
  if(t.dataset.jedtab){ ui.jedTab=t.dataset.jedtab; render(); return; }
  if(t.id==="setActive"){ try{ await Store.saveSeason({ ...A.season, active:true }); A.seasons=await Store.listSeasons(); A.season=A.seasons.find(s=>s.id===A.season.id); toast("Musim ini sekarang aktif."); render(); }catch(err){ toast(errMsg(err)); } return; }
  if(t.dataset.openseason){ await openSeason(t.dataset.openseason); return; }
  if(t.dataset.delseason){ const s=A.seasons.find(x=>x.id===t.dataset.delseason); const typed=prompt(`Menghapus musim menghapus SEMUA peserta, nilai, dan jurnalnya. Ketik nama musim untuk konfirmasi:\n${s.name}`); if(typed!==s.name){ if(typed!==null) toast("Nama tidak cocok, musim tidak dihapus."); return; } try{ await Store.deleteSeason(s.id); A.seasons=await Store.listSeasons(); toast("Musim dihapus."); render(); }catch(err){ toast(errMsg(err)); } return; }
  if(t.id==="nsCreate"){ await createSeason(); return; }
  if(t.id==="loadUsers"){ try{ A.profiles=await Store.listProfiles(); render(); }catch(err){ toast(errMsg(err)); } return; }
  if(t.id==="bkExport"){ exportBackup(); return; }
  if(t.id==="xlExport"){ await exportExcel(); return; }
  if(t.id==="xlRead"){ await readExcel(); return; }
  if(t.id==="xlApply"){ await applyExcel(); return; }
  if(t.id==="xlClear"){ ui.xl=null; render(); return; }
  if(t.id==="bkImport"){ await importBackup(); return; }
});

/* ---------------- Event: change ---------------- */
document.addEventListener("change", async e=>{
  const t=e.target;
  if(t.id==="seasonSel"){ await openSeason(t.value); return; }
  if(t.id==="jxFrom"||t.id==="jxTo"||t.id==="jxCid"){ ui[t.id]=t.value; return; }
  if(t.id==="logFrom"||t.id==="logTo"){ ui[t.id]=t.value; return; }
  if(t.id==="logDate"){ if(t.value) setLogDate(t.value); return; }
  if(t.dataset.uname){ const id=t.dataset.uname, n=t.value.trim(); try{ await Store.setName(id, n); const p=A.profiles.find(x=>x.id===id); if(p) p.name=n; if(id===A.user.id) A.profile.name=n; toast("Nama disimpan."); render(); }catch(err){ toast(errMsg(err)); } return; }
  if(t.dataset.asp){ if(t.dataset.done){ delete t.dataset.done; return; } if(t.dataset.kind==="J"){ const id=t.dataset.asp; setTimeout(()=>{ const a=document.activeElement; if(a&&a.dataset&&a.dataset.asp===id&&a.dataset.kind==="J") return; commitAsp(t); },0); } else commitAsp(t); return; }
  if(t.dataset.extra){ const f=t.dataset.extra; const v=f==="k3"?t.checked:(t.value===""?null:Math.max(0,Math.round(+t.value))); await saveMark(ui.ev,ui.cid,f,d=>{ d[f]=v; }); return; }
  if(t.dataset.done){ const d=clone(R("done",t.dataset.done,t.dataset.cid)||{}); d.done=t.checked; d.at=Date.now(); await saveRec("done", t.dataset.done, t.dataset.cid, d); return; }
  if(t.dataset.gate){ const cid=ui.gcid, g=t.dataset.gate, i=+t.dataset.gi; const all=clone(R("gate","all",cid)||{}); const r=all[g]||{items:[]}; r.items=r.items||[]; r.items[i]=t.checked;
    const gd=gates().find(x=>x.id===g); const done=gd.items.every((_,k)=>r.items[k]); r.date=done?(r.date||todayId()):null; all[g]=r; await saveRec("gate","all",cid,all); if(done) toast(`Gate ${g} lulus.`); return; }
  if(t.id==="evSel"){ ui.ev=t.value; rememberUI(); render(); return; }
  if(t.id==="cidSel"){ ui.cid=t.value; rememberUI(); render(); return; }
  if(t.id==="lostOnly"){ ui.lostOnly=t.checked; render(); return; }
  if(t.id==="rKind"){ ui.pkind=t.value; rememberUI(); render(); return; }
  if(t.id==="rCid"){ ui.pcid=t.value; rememberUI(); render(); return; }
  if(t.id==="rEv"){ ui.pev=t.value; rememberUI(); render(); return; }
  if(t.dataset.role){ try{ await Store.setRole(t.dataset.role, t.value); const p=A.profiles.find(x=>x.id===t.dataset.role); if(p) p.role=t.value; if(t.dataset.role===A.user.id) A.profile.role=t.value; toast("Peran diubah."); render(); }catch(err){ toast(errMsg(err)); render(); } return; }
  /* pengaturan: perubahan struktur */
  if(t.dataset.e && t.tagName==="SELECT"){ setPath(ui.edit,t.dataset.e,t.value); ui.dirty=true; if(/\.t$|\.kind$/.test(t.dataset.e)) render(); return; }
  if(t.dataset.scope!==undefined){ const ev=ui.edit.events[+t.dataset.scope]; ev.scope=ev.scope||[]; const c=isNaN(+t.dataset.crit)?t.dataset.crit:+t.dataset.crit; ev.scope=ev.scope.filter(x=>String(x)!==String(c)); if(t.checked) ev.scope.push(c); ev.scope.sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true})); ui.dirty=true; return; }
  if(t.dataset.keepfile&&t.dataset.keepfile.startsWith("ph:")){ const files=[...t.files]; t.value=""; ui.picking=0; await uploadPhotos(ui.ev,ui.cid,t.dataset.keepfile.slice(3),files); return; }
  if(t.dataset.keepfile){ ui.files=ui.files||{}; ui.files[t.dataset.keepfile]=t.files[0]||null; ui.picking=0; if(t.dataset.keepfile==="xl"&&t.files[0]){ await readExcel(); } else render(); return; }
  if(t.dataset.xlsheet){ ui.xl[t.dataset.xlsheet].apply=t.checked; return; }
  if(t.dataset.selfull){ const s=ui.edit.selection; s.full=(s.full||[]).filter(x=>x!==t.dataset.selfull); if(t.checked) s.full.push(t.dataset.selfull); ui.dirty=true; return; }
});

/* ---------------- Event: input ---------------- */
document.addEventListener("input", e=>{
  const t=e.target;
  if(t.dataset.kind==="M"){ const c=t.value.toUpperCase(); t.classList.toggle("y",c==="Y"||c==="1"); t.classList.toggle("n",c==="N"||c==="0"); }
  if(t.id==="evNote") saveNote(ui.ev,ui.cid,t.value);
  if(t.dataset.cnote!==undefined) saveCNote(ui.ev,ui.cid,t.dataset.cnote,t.value);
  if(t.dataset.e && t.tagName!=="SELECT"){ setPath(ui.edit,t.dataset.e,t.type==="number"?(t.value===""?"":+t.value):t.value); ui.dirty=true; }
  if(t.dataset.lines){ setPath(ui.edit,t.dataset.lines,t.value.split("\n").map(x=>x.trim()).filter(Boolean)); ui.dirty=true; }
  if(t.dataset.angka){ ui.edit.angka=t.value.split("\n").map(l=>l.split("|").map(x=>x.trim())).filter(a=>a[0]).map(a=>[a[0],a.slice(1).join(" | ")]); ui.dirty=true; }
});

/* ---------------- Event: submit ---------------- */
document.addEventListener("submit", async e=>{
  const f=e.target; e.preventDefault();
  if(f.id==="loginForm"){ const b=document.getElementById("lgBtn"); b.disabled=true; b.textContent="Memeriksa…";
    try{ const res=await Store.signIn(document.getElementById("lgEmail").value.trim(), document.getElementById("lgPass").value); A.loading=true; render(); await afterLogin(res); }
    catch(err){ A.loginErr=errMsg(err); render(); } return; }
  if(f.id==="pwForm"){ const a=document.getElementById("pw1").value, b=document.getElementById("pw2").value; if(a!==b){ toast("Kedua kata sandi tidak sama."); return; } try{ await Store.updatePassword(a); toast("Kata sandi berhasil diganti."); f.reset(); }catch(err){ toast(errMsg(err)); } return; }
  if(f.id==="logForm"){ const g=id=>document.getElementById(id).value.trim(); const d=ui.logDate||todayId();
    const data={ date:d, start:g("lgStart"), end:g("lgEnd"), sesuai:g("lgSesuai"), hadir:[...document.querySelectorAll("[data-hadir]")].filter(x=>x.checked).map(x=>x.dataset.hadir), kegiatan:g("lgKeg"), capaian:g("lgCap"), kendala:g("lgKen"), bahan:g("lgBahan"), by:A.user.id, name:A.profile?.name||A.user?.email||"", at:Date.now() };
    if(!data.kegiatan){ toast("Isi dulu kegiatan yang dilakukan."); return; }
    if(await saveRec("log", d+"~"+A.user.id, null, data)){ toast("Log disimpan."); refreshAct(); } return; }
  if(f.id==="jForm"){ const g=id=>document.getElementById(id).value.trim();
    const data={ date:g("jDate")||todayId(), drill:g("jDrill"), waktu:g("jWaktu"), plan:g("jPlan"), dev:g("jDev"), cacat:g("jCacat"), bahan:g("jBahan"), kondisi:g("jKondisi"), tidur:g("jTidur"), bisa:g("jBisa"), belum:g("jBelum"), at:Date.now(), by:A.profile?.name||"" };
    if(!data.drill&&!data.bisa&&!data.belum&&!data.waktu){ toast("Isi minimal drill, waktu, atau catatan."); return; }
    const cid=g("jCid"); const ref="j"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    if(await saveRec("journal", ref, cid, data)){ toast("Catatan disimpan."); } return; }
});

window.addEventListener("beforeunload", e=>{ if(ui.dirty){ e.preventDefault(); e.returnValue=""; } });
boot();
