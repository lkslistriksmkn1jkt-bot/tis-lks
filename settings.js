/* =====================================================================
   Pengaturan (khusus admin): musim, TO, jadwal, marking scheme, gate,
   angka teknis, seleksi, pengguna, backup
   ===================================================================== */
"use strict";
const SETS = [["musim","Musim"],["to","TO"],["jadwal","Jadwal"],["scheme","Marking scheme"],["gate","Gate"],["angka","Angka teknis"],["seleksi","Seleksi"],["pengguna","Pengguna"],["backup","Backup"]];
const SECTION_KEYS = { to:["events"], jadwal:["schedule"], scheme:["scheme"], gate:["gates"], angka:["angka","jlabel"], seleksi:["selection"], musim:["docUrl","jobsheetUrl"] };
function getPath(o, p){ return p.split(".").reduce((a,k)=>a==null?a:a[k], o); }
function setPath(o, p, v){ const ks=p.split("."); let a=o; for(let i=0;i<ks.length-1;i++){ if(a[ks[i]]==null) a[ks[i]] = /^\d+$/.test(ks[i+1]) ? [] : {}; a=a[ks[i]]; } a[ks[ks.length-1]]=v; }
function ensureEdit(){ const key=ui.set+":"+A.season.id; if(ui.editKey!==key||!ui.edit){ ui.editKey=key; const e={}; (SECTION_KEYS[ui.set]||[]).forEach(k=>e[k]=clone(A.cfg[k]??(k==="selection"?{}:k==="docUrl"||k==="jobsheetUrl"?"":[]))); e.seasonName=A.season.name; ui.edit=e; ui.dirty=false; } return ui.edit; }
const inp = (path, type="text", extra="") => { const v=getPath(ui.edit,path); return `<input type="${type}" data-e="${path}" value="${esc(v??"")}" ${extra}>`; };
const saveBar = () => `<div class="row no-print" style="position:sticky;bottom:0;background:var(--bg);padding:10px 0;border-top:1px solid var(--line)"><button class="btn primary" id="setSave">Simpan perubahan</button><button class="btn" id="setCancel">Batal</button>${ui.dirty?'<span class="note">Ada perubahan yang belum disimpan.</span>':""}</div>`;

V.pengaturan = () => {
  if(!isAdmin()) return `<div class="empty">Menu ini khusus admin.</div>`;
  ensureEdit(); const E=ui.edit; let body="";
  if(ui.set==="musim"){
    body=`<div class="panel"><div class="label">Musim yang sedang dibuka</div><label class="f">Nama musim${inp("seasonName")}</label>
      <label class="f">Tautan dokumen program (opsional)${inp("docUrl","url")}</label><label class="f">Tautan jobsheet (opsional)${inp("jobsheetUrl","url")}</label>
      <div class="row">${A.season.active?'<span class="chip good">Musim aktif</span>':'<button class="btn sm" id="setActive">Jadikan musim aktif</button>'}</div>${saveBar()}</div>
    <div class="panel"><div class="label">Semua musim</div><div class="tbl-wrap"><table><thead><tr><th>Nama</th><th>Status</th><th></th></tr></thead><tbody>${A.seasons.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.active?'<span class="chip good">aktif</span>':""}${s.id===A.season.id?' <span class="chip acc">dibuka</span>':""}</td><td>${s.id!==A.season.id?`<button class="btn sm" data-openseason="${s.id}">Buka</button> `:""}${!s.active?`<button class="btn sm danger" data-delseason="${s.id}">Hapus</button>`:""}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="panel"><div class="label">Buat musim baru (tahun berikutnya)</div>
      <p class="note">Jadwal, TO, marking scheme, dan gate disalin dari sumber yang dipilih. Semua tanggal digeser sesuai jumlah minggu. Nilai, centang, dan jurnal tidak ikut disalin.</p>
      <div class="grid g3"><label class="f">Nama musim baru<input type="text" id="nsName" value="LKS EI ${new Date().getFullYear()+1}–${new Date().getFullYear()+2}"></label>
      <label class="f">Sumber<select id="nsSrc"><option value="cur">Salin musim yang dibuka</option><option value="seed">Template bawaan</option></select></label>
      <label class="f">Geser tanggal (minggu)<input type="number" id="nsShift" value="52"></label></div>
      <label class="tick"><input type="checkbox" id="nsComps">Salin juga daftar peserta</label>
      <div><button class="btn primary" id="nsCreate">Buat musim baru</button></div></div>`;
  }
  else if(ui.set==="to"){
    const crits=scheme();
    body=`<p class="lead">Atur try out: tanggal, batas waktu, dan kriteria yang diujikan. ID dipakai sebagai kunci nilai, jangan diubah setelah TO dinilai.</p>
    <div class="tbl-wrap"><table class="ed-tbl" style="min-width:980px"><thead><tr><th>ID</th><th>Nama</th><th>Fase</th><th>Tanggal</th><th>Label tanggal</th><th>Batas (menit)</th><th>Kriteria diujikan</th><th>Fokus</th><th></th></tr></thead><tbody>
    ${E.events.map((e,i)=>`<tr><td>${inp(`events.${i}.id`,"text",'style="width:70px"')}</td><td>${inp(`events.${i}.name`,"text",'style="width:80px"')}</td><td>${inp(`events.${i}.fase`,"text",'style="width:50px"')}</td><td>${inp(`events.${i}.date`,"date")}</td><td>${inp(`events.${i}.label`)}</td><td>${inp(`events.${i}.limit`,"number",'style="width:80px"')}</td>
      <td><div class="scope-ck">${crits.map(c=>`<label><input type="checkbox" data-scope="${i}" data-crit="${esc(c.id)}" ${(e.scope||[]).map(String).includes(String(c.id))?"checked":""}>${esc(c.id)}</label>`).join("")}</div></td><td>${inp(`events.${i}.focus`)}</td><td><button class="btn sm danger" data-rm="events.${i}">Hapus</button></td></tr>`).join("")}</tbody></table></div>
    <div><button class="btn" data-add="events">+ Tambah TO</button></div>${saveBar()}`;
  }
  else if(ui.set==="jadwal"){
    const tabs=[...new Set(E.schedule.map(s=>s.tab))]; ui.jedTab = ui.jedTab && tabs.includes(ui.jedTab) ? ui.jedTab : (tabs[0]||"");
    const evOpts=(cur)=>`<option value="">–</option>`+events().map(e=>`<option value="${e.id}" ${e.id===cur?"selected":""}>${esc(e.name)}</option>`).join("");
    body=`<p class="lead">Satu baris = satu hari, satu akhir pekan, atau satu minggu. Kolom "Tab" mengelompokkan jadwal (mis. Fase 1, Fase 2). Untuk tugas akhir pekan, tulis satu tugas per baris.</p>
    <div class="subnav">${tabs.map(t=>`<button type="button" data-jedtab="${esc(t)}" aria-pressed="${t===ui.jedTab}">${esc(t)} (${E.schedule.filter(s=>s.tab===t).length})</button>`).join("")}</div>
    <div class="tbl-wrap"><table class="ed-tbl" style="min-width:1250px"><thead><tr><th>Tab</th><th>Grup</th><th>Jenis</th><th>Tanggal</th><th>Sampai</th><th>Kode</th><th>Materi / fokus</th><th>Target</th><th>Jam</th><th>TO</th><th>Catatan</th><th></th></tr></thead><tbody>
    ${E.schedule.map((s,i)=>s.tab!==ui.jedTab?"":`<tr><td>${inp(`schedule.${i}.tab`,"text",'style="width:70px"')}</td><td>${inp(`schedule.${i}.group`,"text",'style="width:110px"')}</td>
      <td><select data-e="schedule.${i}.kind">${[["day","Hari"],["weekend","Akhir pekan"],["week","Minggu"]].map(k=>`<option value="${k[0]}" ${s.kind===k[0]?"selected":""}>${k[1]}</option>`).join("")}</select></td>
      <td>${inp(`schedule.${i}.date`,"date")}</td><td>${inp(`schedule.${i}.end`,"date")}</td><td>${inp(`schedule.${i}.label`,"text",'style="width:80px"')}</td>
      <td><textarea data-e="schedule.${i}.title">${esc(s.title)}</textarea></td><td><textarea data-e="schedule.${i}.target" style="min-width:160px">${esc(s.target)}</textarea></td>
      <td>${inp(`schedule.${i}.hours`,"number",'style="width:60px" step="0.5"')}</td><td><select data-e="schedule.${i}.to">${evOpts(s.to)}</select></td><td><textarea data-e="schedule.${i}.note" style="min-width:140px">${esc(s.note||"")}</textarea></td>
      <td><button class="btn sm" data-dup="${i}" title="Sisipkan salinan di bawah">+</button> <button class="btn sm danger" data-rm="schedule.${i}">×</button></td></tr>`).join("")}</tbody></table></div>
    <div class="row"><button class="btn" data-addsched="1">+ Tambah baris di tab ini</button><button class="btn" id="sortSched">Urutkan menurut tanggal</button></div>${saveBar()}`;
  }
  else if(ui.set==="scheme"){
    const tot=E.scheme.reduce((a,c)=>a+c.subs.reduce((x,s)=>x+(+s.max||0),0),0), tj=E.scheme.reduce((a,c)=>a+c.subs.filter(s=>s.t==="J").reduce((x,s)=>x+(+s.max||0),0),0);
    body=`<p class="lead">Kriteria dan aspek penilaian. Jenis: M = ya/tidak, C = hitungan (isi jumlah poin di kolom n), J = judgement 0–3. ID aspek dipakai sebagai kunci nilai: jangan diubah setelah ada TO yang dinilai.</p>
    <div class="${Math.abs(tot-100)<0.01?"okbox":"warnbox"}">Total ${fmt(tot)} poin (J ${fmt(tj)} · M ${fmt(tot-tj)}). ${Math.abs(tot-100)<0.01?"Sudah 100.":"Sebaiknya totalnya 100."}</div>
    ${E.scheme.map((c,ci)=>`<div class="crit"><div class="crit-h"><div class="row" style="flex:1"><span class="note">ID</span>${inp(`scheme.${ci}.id`,"text",'style="width:50px"')}<span class="note">Nama</span>${inp(`scheme.${ci}.name`,"text",'style="flex:1;min-width:160px"')}</div><span class="num">${fmt(c.subs.reduce((x,s)=>x+(+s.max||0),0))}</span><button class="btn sm danger" data-rm="scheme.${ci}">Hapus kriteria</button></div>
      <div class="tbl-wrap" style="border:none;border-radius:0"><table class="ed-tbl" style="min-width:720px"><thead><tr><th>ID</th><th>Aspek</th><th>Jenis</th><th>Maks</th><th>n (C)</th><th></th></tr></thead><tbody>${c.subs.map((s,si)=>`<tr><td>${inp(`scheme.${ci}.subs.${si}.id`,"text",'style="width:60px"')}</td><td>${inp(`scheme.${ci}.subs.${si}.d`,"text",'style="min-width:280px;width:100%"')}</td>
        <td><select data-e="scheme.${ci}.subs.${si}.t">${["M","C","J"].map(t=>`<option ${s.t===t?"selected":""}>${t}</option>`).join("")}</select></td><td>${inp(`scheme.${ci}.subs.${si}.max`,"number",'style="width:70px" step="0.5"')}</td><td>${s.t==="C"?inp(`scheme.${ci}.subs.${si}.n`,"number",'style="width:60px"'):""}</td><td><button class="btn sm danger" data-rm="scheme.${ci}.subs.${si}">×</button></td></tr>`).join("")}</tbody></table></div>
      <div style="padding:8px 14px"><button class="btn sm" data-add="scheme.${ci}.subs">+ Aspek</button></div></div>`).join("")}
    <div><button class="btn" data-add="scheme">+ Kriteria</button></div>${saveBar()}`;
  }
  else if(ui.set==="gate"){
    body=`<p class="lead">Gate test per fase. Tulis satu syarat per baris.</p>
    ${E.gates.map((g,i)=>`<div class="panel"><div class="grid g3"><label class="f">ID${inp(`gates.${i}.id`)}</label><label class="f">Kode fase${inp(`gates.${i}.ph`)}</label><label class="f">Nama fase${inp(`gates.${i}.phName`)}</label></div>
      <label class="f">Syarat (satu per baris)<textarea data-lines="gates.${i}.items">${esc((g.items||[]).join("\n"))}</textarea></label><div><button class="btn sm danger" data-rm="gates.${i}">Hapus gate</button></div></div>`).join("")}
    <div><button class="btn" data-add="gates">+ Gate</button></div>${saveBar()}`;
  }
  else if(ui.set==="angka"){
    body=`<div class="panel"><div class="label">Angka teknis (kuis di Beranda)</div><p class="note">Satu baris: pertanyaan | jawaban</p><textarea data-angka="1" style="min-height:320px">${esc((E.angka||[]).map(a=>a[0]+" | "+a[1]).join("\n"))}</textarea></div>
    <div class="panel"><div class="label">Arti skor judgement 0–3</div><p class="note">Empat baris, untuk skor 0, 1, 2, 3.</p><textarea data-lines="jlabel" style="min-height:120px">${esc((E.jlabel||[]).join("\n"))}</textarea></div>${saveBar()}`;
  }
  else if(ui.set==="seleksi"){
    const s=E.selection; s.w=s.w||{full:50,trend:20,gate:20,kons:10}; s.full=s.full||[];
    const opt=cur=>`<option value="">–</option>`+events().map(e=>`<option value="${e.id}" ${e.id===cur?"selected":""}>${esc(e.name)}</option>`).join("");
    body=`<p class="lead">Indeks seleksi membantu membandingkan peserta. Bobot dalam persen; jumlah tidak harus tepat 100 (dinormalisasi otomatis).</p>
    <div class="panel"><div class="grid g3"><label class="f">Bobot full simulation (%)${inp("selection.w.full","number")}</label><label class="f">Bobot tren (%)${inp("selection.w.trend","number")}</label><label class="f">Bobot gate (%)${inp("selection.w.gate","number")}</label><label class="f">Bobot konsistensi (%)${inp("selection.w.kons","number")}</label><label class="f">Target skor (garis di grafik)${inp("selection.target","number")}</label></div>
    <div class="label">TO yang dihitung sebagai full simulation</div><div class="scope-ck">${events().map(e=>`<label style="font-size:14px"><input type="checkbox" data-selfull="${e.id}" ${s.full.includes(e.id)?"checked":""}>${esc(e.name)}</label>`).join(" ")}</div>
    <div class="grid g2"><label class="f">Tren dari TO<select data-e="selection.trendFrom">${opt(s.trendFrom)}</select></label><label class="f">Tren sampai TO<select data-e="selection.trendTo">${opt(s.trendTo)}</select></label></div></div>${saveBar()}`;
  }
  else if(ui.set==="pengguna"){
    body = DEMO ? `<div class="warnbox">Pengguna hanya tersedia bila aplikasi sudah terhubung ke Supabase.</div>` :
    `<div class="panel"><div class="label">Menambah pengguna baru</div><ol class="tasks"><li>Buka dashboard Supabase › Authentication › Users › <b>Add user</b> › <b>Create new user</b>.</li><li>Isi e-mail dan kata sandi, centang <b>Auto Confirm User</b>, lalu Create.</li><li>Pengguna baru otomatis berperan <b>Pengamat</b>. Ubah perannya di tabel bawah.</li></ol></div>
    <div class="panel"><div class="spread"><div class="label">Daftar pengguna</div><button class="btn sm" id="loadUsers">Muat ulang</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Nama</th><th>E-mail</th><th>Peran</th></tr></thead><tbody>${(A.profiles||[]).map(p=>`<tr><td>${esc(p.name||"")}</td><td>${esc(p.email||"")}</td><td><select data-role="${p.id}">${[["admin","Admin (pembina)"],["juri","Juri (isi nilai)"],["viewer","Pengamat (hanya lihat)"]].map(r=>`<option value="${r[0]}" ${p.role===r[0]?"selected":""}>${r[1]}</option>`).join("")}</select></td></tr>`).join("")||'<tr><td colspan="3" class="muted">Tekan Muat ulang.</td></tr>'}</tbody></table></div>
    <p class="note">Admin: semua menu termasuk Pengaturan. Juri: mengisi nilai, jadwal, gate, jurnal. Pengamat: hanya melihat (cocok untuk siswa).</p></div>`;
  }
  else if(ui.set==="backup"){
    body=`<div class="panel"><div class="label">Unduh cadangan musim ini</div><p class="note">Berkas JSON berisi pengaturan musim, peserta, nilai, centang jadwal, gate, dan jurnal. Simpan di Google Drive setiap bulan.</p><div><button class="btn primary" id="bkExport">Unduh cadangan (.json)</button></div></div>
    <div class="panel"><div class="label">Pulihkan dari cadangan</div><p class="note">Cadangan dipulihkan sebagai <b>musim baru</b>, sehingga data yang ada tidak tertimpa.</p><input type="file" id="bkFile" accept=".json,application/json"><div><button class="btn" id="bkImport">Pulihkan</button></div></div>`;
  }
  return `<div class="spread no-print"><div><h2>Pengaturan</h2><p class="lead">Khusus admin. Perubahan berlaku untuk musim <b>${esc(A.season.name)}</b>.</p></div></div>
  <div class="subnav no-print">${SETS.map(s=>`<button type="button" data-set="${s[0]}" aria-pressed="${ui.set===s[0]}">${s[1]}</button>`).join("")}</div>${body}`;
};

/* ---------- Aksi pengaturan ---------- */
function shiftCfg(cfg, days){
  const c=clone(cfg); const sh=d=>d?addDays(d,days):d;
  (c.events||[]).forEach(e=>{ e.date=sh(e.date); if(e.date) e.label=dlabel(e.date,true)+" "+e.date.slice(0,4); });
  (c.schedule||[]).forEach(s=>{ s.date=sh(s.date); s.end=sh(s.end); });
  return c;
}
async function createSeason(){
  const name=document.getElementById("nsName").value.trim()||"Musim baru"; const src=document.getElementById("nsSrc").value; const weeks=+document.getElementById("nsShift").value||0; const copyComps=document.getElementById("nsComps").checked;
  const base = src==="seed" ? window.TIS_SEED : A.cfg; const cfg=shiftCfg(base, weeks*7);
  const s={ id:uid(), name, active:false, config:cfg };
  try{ await Store.saveSeason(s);
    if(copyComps && src==="cur") for(const c of A.comps) await Store.saveCompetitor({ id:uid(), season_id:s.id, name:c.name, kelas:c.kelas, sekolah:c.sekolah, peran:c.peran, sort:c.sort });
    toast("Musim baru dibuat."); A.seasons=await Store.listSeasons(); await openSeason(s.id); }
  catch(e){ toast("Gagal membuat musim: "+errMsg(e)); }
}
function exportBackup(){
  const data={ app:"TIS-LKS", version:VERSION, exported:new Date().toISOString(), season:{ name:A.season.name, config:A.cfg }, competitors:A.comps, records:Object.values(A.rec) };
  const blob=new Blob([JSON.stringify(data,null,1)],{type:"application/json"}); const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="TIS-backup-"+A.season.name.replace(/[^\w-]+/g,"_")+"-"+todayId()+".json"; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1000);
}
async function importBackup(){
  const f=document.getElementById("bkFile").files[0]; if(!f){ toast("Pilih berkas cadangan dulu."); return; }
  let d; try{ d=JSON.parse(await f.text()); }catch(e){ toast("Berkas bukan JSON yang valid."); return; }
  if(!d.season||!d.season.config){ toast("Berkas ini bukan cadangan TIS."); return; }
  const sid=uid(); const map={};
  try{ await Store.saveSeason({ id:sid, name:(d.season.name||"Musim")+" (pulihan)", active:false, config:d.season.config });
    for(const c of (d.competitors||[])){ const nid=uid(); map[c.id]=nid; await Store.saveCompetitor({ id:nid, season_id:sid, name:c.name, kelas:c.kelas||"", sekolah:c.sekolah||"", peran:c.peran||"", sort:c.sort||0 }); }
    const recs=(d.records||[]).filter(r=>!r.competitor_id||map[r.competitor_id]).map(r=>{ const cid=r.competitor_id?map[r.competitor_id]:null; const id = r.kind==="journal" ? sid+":journal:"+uid()+":"+(cid||"-") : sid+":"+r.kind+":"+r.ref+":"+(cid||"-"); return { id, season_id:sid, kind:r.kind, ref:r.ref, competitor_id:cid, data:r.data }; });
    await Store.upsertRecords(recs);
    toast("Cadangan dipulihkan sebagai musim baru."); A.seasons=await Store.listSeasons(); await openSeason(sid); }
  catch(e){ toast("Gagal memulihkan: "+errMsg(e)); }
}
async function saveSettings(){
  const E=ui.edit; const cfg=clone(A.cfg);
  (SECTION_KEYS[ui.set]||[]).forEach(k=>{ cfg[k]=clone(E[k]); });
  if(ui.set==="to") cfg.events.forEach(e=>{ e.limit=+e.limit||0; if(!e.id) e.id="to"+uid().slice(0,6); });
  if(ui.set==="jadwal") cfg.schedule.forEach(s=>{ s.hours=s.hours===""?"":+s.hours; if(!s.id) s.id="s"+uid().slice(0,8); });
  if(ui.set==="scheme") cfg.scheme.forEach(c=>c.subs.forEach(s=>{ s.max=+s.max||0; if(s.t==="C") s.n=+s.n||1; else delete s.n; }));
  if(ui.set==="seleksi"){ const w=cfg.selection.w; Object.keys(w).forEach(k=>w[k]=+w[k]||0); cfg.selection.target=+cfg.selection.target||0; }
  if(ui.set==="musim" && E.seasonName && E.seasonName!==A.season.name){ A.season.name=E.seasonName; }
  const ok=await saveSeasonCfg(cfg); if(ok){ ui.dirty=false; ui.editKey=null; render(); }
}
