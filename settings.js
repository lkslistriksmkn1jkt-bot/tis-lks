/* =====================================================================
   Pengaturan (khusus admin): musim, TO, jadwal, marking scheme, gate,
   angka teknis, seleksi, pengguna, backup
   ===================================================================== */
"use strict";
const SETS = [["musim","Musim"],["to","TO"],["jadwal","Jadwal"],["scheme","Marking scheme"],["gate","Gate"],["angka","Angka teknis"],["seleksi","Seleksi"],["excel","Excel"],["pengguna","Pengguna"],["backup","Backup"]];
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
    body=`<p class="lead">Atur try out: tanggal, batas waktu, dan kriteria yang diujikan. ID dipakai sebagai kunci nilai, jangan diubah setelah TO dinilai. Bisa juga lewat Excel (menu <b>Excel</b>).</p>
    <div class="tbl-wrap"><table class="ed-tbl" style="min-width:1150px"><thead><tr><th>ID</th><th>Nama</th><th>Fase</th><th>Tanggal</th><th>Label tanggal</th><th>Batas (menit)</th><th>Kriteria diujikan</th><th>Fokus</th><th></th></tr></thead><tbody>
    ${E.events.map((e,i)=>`<tr><td data-l="ID">${inp(`events.${i}.id`,"text",'style="width:70px"')}</td><td data-l="Nama">${inp(`events.${i}.name`,"text",'style="width:80px"')}</td><td data-l="Fase">${inp(`events.${i}.fase`,"text",'style="width:50px"')}</td><td data-l="Tanggal">${inp(`events.${i}.date`,"date")}</td><td data-l="Label tanggal">${inp(`events.${i}.label`)}</td><td data-l="Batas (menit)">${inp(`events.${i}.limit`,"number",'style="width:80px"')}</td>
      <td data-l="Kriteria diujikan"><div class="scope-ck">${crits.map(c=>`<label><input type="checkbox" data-scope="${i}" data-crit="${esc(c.id)}" ${(e.scope||[]).map(String).includes(String(c.id))?"checked":""}>${esc(c.id)}</label>`).join("")}</div></td><td data-l="Fokus"><textarea class="focus-ta" data-e="events.${i}.focus" rows="3">${esc(e.focus||"")}</textarea></td><td><button class="btn sm danger" data-rm="events.${i}">Hapus TO ini</button></td></tr>`).join("")}</tbody></table></div>
    <div><button class="btn" data-add="events">+ Tambah TO</button></div>${saveBar()}`;
  }
  else if(ui.set==="jadwal"){
    const tabs=[...new Set(E.schedule.map(s=>s.tab))]; ui.jedTab = ui.jedTab && tabs.includes(ui.jedTab) ? ui.jedTab : (tabs[0]||"");
    const evOpts=(cur)=>`<option value="">–</option>`+events().map(e=>`<option value="${e.id}" ${e.id===cur?"selected":""}>${esc(e.name)}</option>`).join("");
    body=`<p class="lead">Satu baris = satu hari, satu akhir pekan, atau satu minggu. Kolom "Tab" mengelompokkan jadwal (mis. Fase 1, Fase 2). Untuk tugas akhir pekan, tulis satu tugas per baris. Perubahan besar lebih mudah lewat Excel (menu <b>Excel</b>).</p>
    <div class="subnav">${tabs.map(t=>`<button type="button" data-jedtab="${esc(t)}" aria-pressed="${t===ui.jedTab}">${esc(t)} (${E.schedule.filter(s=>s.tab===t).length})</button>`).join("")}</div>
    <div class="tbl-wrap"><table class="ed-tbl" style="min-width:1250px"><thead><tr><th>Tab</th><th>Grup</th><th>Jenis</th><th>Tanggal</th><th>Sampai</th><th>Kode</th><th>Materi / fokus</th><th>Target</th><th>Jam</th><th>TO</th><th>Catatan</th><th></th></tr></thead><tbody>
    ${E.schedule.map((s,i)=>s.tab!==ui.jedTab?"":`<tr><td data-l="Tab">${inp(`schedule.${i}.tab`,"text",'style="width:70px"')}</td><td data-l="Grup">${inp(`schedule.${i}.group`,"text",'style="width:110px"')}</td>
      <td data-l="Jenis"><select data-e="schedule.${i}.kind">${[["day","Hari"],["weekend","Akhir pekan"],["week","Minggu"]].map(k=>`<option value="${k[0]}" ${s.kind===k[0]?"selected":""}>${k[1]}</option>`).join("")}</select></td>
      <td data-l="Tanggal">${inp(`schedule.${i}.date`,"date")}</td><td data-l="Sampai (opsional)">${inp(`schedule.${i}.end`,"date")}</td><td data-l="Kode">${inp(`schedule.${i}.label`,"text",'style="width:80px"')}</td>
      <td data-l="Materi / fokus"><textarea data-e="schedule.${i}.title">${esc(s.title)}</textarea></td><td data-l="Target"><textarea data-e="schedule.${i}.target" style="min-width:160px">${esc(s.target)}</textarea></td>
      <td data-l="Jam">${inp(`schedule.${i}.hours`,"number",'style="width:60px" step="0.5"')}</td><td data-l="TO">${`<select data-e="schedule.${i}.to">${evOpts(s.to)}</select>`}</td><td data-l="Catatan">${`<textarea data-e="schedule.${i}.note" style="min-width:140px">${esc(s.note||"")}</textarea>`}</td>
      <td><div class="row"><button class="btn sm" data-dup="${i}">+ Salin di bawah</button><button class="btn sm danger" data-rm="schedule.${i}">Hapus</button></div></td></tr>`).join("")}</tbody></table></div>
    <div class="row"><button class="btn" data-addsched="1">+ Tambah baris di tab ini</button><button class="btn" id="sortSched">Urutkan menurut tanggal</button></div>${saveBar()}`;
  }
  else if(ui.set==="scheme"){
    const tot=E.scheme.reduce((a,c)=>a+c.subs.reduce((x,s)=>x+(+s.max||0),0),0), tj=E.scheme.reduce((a,c)=>a+c.subs.filter(s=>s.t==="J").reduce((x,s)=>x+(+s.max||0),0),0);
    body=`<p class="lead">Kriteria dan aspek penilaian. Jenis: M = ya/tidak, C = hitungan (isi jumlah poin di kolom n), J = judgement 0–3. ID aspek dipakai sebagai kunci nilai: jangan diubah setelah ada TO yang dinilai.</p>
    <div class="${Math.abs(tot-100)<0.01?"okbox":"warnbox"}">Total ${fmt(tot)} poin (J ${fmt(tj)} · M ${fmt(tot-tj)}). ${Math.abs(tot-100)<0.01?"Sudah 100.":"Sebaiknya totalnya 100."}</div>
    ${E.scheme.map((c,ci)=>`<div class="crit"><div class="crit-h" style="flex-wrap:wrap"><div class="row" style="flex:1;min-width:0"><span class="note">ID</span>${inp(`scheme.${ci}.id`,"text",'style="width:50px"')}<span class="note">Nama</span>${inp(`scheme.${ci}.name`,"text",'style="flex:1;min-width:140px"')}</div><span class="num">${fmt(c.subs.reduce((x,s)=>x+(+s.max||0),0))}</span><button class="btn sm danger" data-rm="scheme.${ci}">Hapus kriteria</button></div>
      <div class="tbl-wrap" style="border:none;border-radius:0"><table class="ed-tbl" style="min-width:720px"><thead><tr><th>ID</th><th>Aspek</th><th>Jenis</th><th>Maks</th><th>n (C)</th><th></th></tr></thead><tbody>${c.subs.map((s,si)=>`<tr><td data-l="ID aspek">${inp(`scheme.${ci}.subs.${si}.id`,"text",'style="width:60px"')}</td><td data-l="Aspek">${inp(`scheme.${ci}.subs.${si}.d`,"text",'style="min-width:280px;width:100%"')}</td>
        <td data-l="Jenis (M/C/J)"><select data-e="scheme.${ci}.subs.${si}.t">${["M","C","J"].map(t=>`<option ${s.t===t?"selected":""}>${t}</option>`).join("")}</select></td><td data-l="Maks">${inp(`scheme.${ci}.subs.${si}.max`,"number",'style="width:70px" step="0.5"')}</td><td ${s.t==="C"?'data-l="n (jumlah poin hitungan)"':""}>${s.t==="C"?inp(`scheme.${ci}.subs.${si}.n`,"number",'style="width:60px"'):""}</td><td><button class="btn sm danger" data-rm="scheme.${ci}.subs.${si}">Hapus aspek</button></td></tr>`).join("")}</tbody></table></div>
      <div style="padding:8px 14px"><button class="btn sm" data-add="scheme.${ci}.subs">+ Aspek</button></div></div>`).join("")}
    <div><button class="btn" data-add="scheme">+ Kriteria</button></div>${saveBar()}`;
  }
  else if(ui.set==="gate"){
    body=`<p class="lead">Gate test per fase. Tulis satu syarat per baris.</p>
    ${E.gates.map((g,i)=>`<div class="panel"><div class="grid g3"><label class="f">ID${inp(`gates.${i}.id`)}</label><label class="f">Kode fase${inp(`gates.${i}.ph`)}</label><label class="f">Nama fase${inp(`gates.${i}.phName`)}</label></div>
      <label class="f">Syarat (satu per baris)<textarea data-lines="gates.${i}.items">${esc((g.items||[]).join("\n"))}</textarea></label><div><button class="btn sm danger" data-rm="gates.${i}">Hapus gate</button></div></div>`).join("")}
    <div><button class="btn" data-add="gates">+ Gate</button></div>${saveBar()}`;
  }
  else if(ui.set==="excel"){
    const X=ui.xl; const names={jadwal:"Jadwal",to:"TO",scheme:"Marking scheme",gate:"Gate"};
    body=`<div class="panel"><div class="label">1 · Unduh Excel</div>
      <p>Berisi data musim <b>${esc(A.season.name)}</b> saat ini dalam 5 sheet: <b>Petunjuk, Jadwal, TO, Marking scheme, Gate</b>. Edit di Excel atau Google Sheets di laptop: tambah, hapus, atau ubah baris sesuka hati.</p>
      <div><button class="btn primary" id="xlExport">Unduh Excel (.xlsx)</button></div>
      <p class="note">Tanggal ditulis 2026-11-19 atau 19/11/2026. Kolom ID boleh dikosongkan untuk baris baru. Jangan ubah ID TO dan ID aspek yang sudah dinilai.</p></div>
    <div class="panel"><div class="label">2 · Impor Excel yang sudah diedit</div>
      <input type="file" id="xlFile" accept=".xlsx,.xls,.csv">
      <div><button class="btn" id="xlRead">Baca berkas</button></div>
      ${X?`<div class="tbl-wrap rwrap"><table class="rtbl"><thead><tr><th>Terapkan</th><th>Sheet</th><th class="n">Baris</th><th>Hasil pemeriksaan</th></tr></thead><tbody>${Object.keys(names).filter(k=>X[k]).map(k=>{const r=X[k];return `<tr><td data-l="Terapkan"><label class="tick"><input type="checkbox" data-xlsheet="${k}" ${r.apply?"checked":""} ${r.errors.length?"disabled":""}>${r.errors.length?"Tidak bisa":"Ya"}</label></td><td data-l="Sheet"><b>${names[k]}</b></td><td class="n" data-l="Baris">${r.rows.length}</td><td data-l="Hasil pemeriksaan">${r.errors.length?`<div class="err">${r.errors.slice(0,8).map(esc).join("<br>")}${r.errors.length>8?"<br>… dan "+(r.errors.length-8)+" lainnya":""}</div>`:'<span class="chip good">Siap</span>'}${r.warns.length?`<div class="note">${r.warns.slice(0,6).map(esc).join("<br>")}</div>`:""}</td></tr>`;}).join("")}</tbody></table></div>
      <p class="note">Sheet yang dicentang akan <b>menggantikan seluruh</b> bagian yang sama di musim ini. Sheet yang tidak dicentang tidak diubah. Nilai, centang jadwal, dan jurnal yang sudah ada tetap tersimpan.</p>
      <div class="row"><button class="btn primary" id="xlApply">Terapkan & simpan</button><button class="btn" id="xlClear">Batal</button></div>`:""}</div>`;
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
    <div class="tbl-wrap"><table><thead><tr><th>Nama</th><th>E-mail</th><th>Peran</th></tr></thead><tbody>${(A.profiles||[]).map(p=>`<tr><td data-l="Nama"><input type="text" data-uname="${p.id}" value="${esc(p.name||"")}" placeholder="Nama lengkap" style="min-width:180px"></td><td data-l="E-mail">${esc(p.email||"")}</td><td><select data-role="${p.id}">${[["admin","Admin (pembina)"],["juri","Juri (isi nilai)"],["viewer","Pengamat (hanya lihat)"]].map(r=>`<option value="${r[0]}" ${p.role===r[0]?"selected":""}>${r[1]}</option>`).join("")}</select></td></tr>`).join("")||'<tr><td colspan="3" class="muted">Tekan Muat ulang.</td></tr>'}</tbody></table></div>
    <p class="note">Ganti nama langsung di kotak Nama, lalu ketuk di luar kotak; nama tersimpan otomatis dan dipakai di Log Harian serta nilai. Admin: semua menu termasuk Pengaturan. Juri: mengisi nilai, jadwal, gate, jurnal. Pengamat: hanya melihat (cocok untuk siswa).</p></div>`;
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
  if(ui.set==="to"){ cfg.events.forEach(e=>{ e.limit=+e.limit||0; if(!e.id) e.id="to"+uid().slice(0,6); }); fixLabels(cfg.events); }
  if(ui.set==="jadwal") cfg.schedule.forEach(s=>{ s.hours=s.hours===""?"":+s.hours; if(!s.id) s.id="s"+uid().slice(0,8); });
  if(ui.set==="scheme") cfg.scheme.forEach(c=>c.subs.forEach(s=>{ s.max=+s.max||0; if(s.t==="C") s.n=+s.n||1; else delete s.n; }));
  if(ui.set==="seleksi"){ const w=cfg.selection.w; Object.keys(w).forEach(k=>w[k]=+w[k]||0); cfg.selection.target=+cfg.selection.target||0; }
  if(ui.set==="musim" && E.seasonName && E.seasonName!==A.season.name){ A.season.name=E.seasonName; }
  const ok=await saveSeasonCfg(cfg); if(ok){ ui.dirty=false; ui.editKey=null; render(); }
}

function fixLabels(list){ (list||[]).forEach(e=>{ const old=events().find(x=>x.id===e.id); if(e.date && (!e.label || (old && old.label===e.label && old.date!==e.date))) e.label=dlabel(e.date,true)+" "+e.date.slice(0,4); }); return list; }
/* ---------- Excel: unduh & impor ---------- */
function loadXLSX(){ if(window.XLSX) return Promise.resolve(); return new Promise((res,rej)=>{ const sc=document.createElement("script"); sc.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; sc.onload=res; sc.onerror=()=>rej(new Error("Gagal memuat pustaka Excel. Periksa koneksi internet.")); document.head.appendChild(sc); }); }
const KIND_OUT={day:"Hari",weekend:"Akhir pekan",week:"Minggu"};
function kindIn(v){ const t=String(v||"").trim().toLowerCase(); if(["hari","day","harian"].includes(t)) return "day"; if(["akhir pekan","weekend","akhir minggu","sabtu-minggu","mandiri"].includes(t)) return "weekend"; if(["minggu","week","mingguan","pekan"].includes(t)) return "week"; return null; }
function dateIn(v){
  if(v===""||v==null) return "";
  if(typeof v==="number" && window.XLSX){ const d=XLSX.SSF.parse_date_code(v); if(!d) return null; return d.y+"-"+String(d.m).padStart(2,"0")+"-"+String(d.d).padStart(2,"0"); }
  const t=String(v).trim(); let m;
  if((m=t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
  if((m=t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
  return null;
}
const numIn = v => v===""||v==null ? "" : (isNaN(+String(v).replace(",",".")) ? null : +String(v).replace(",","."));
async function exportExcel(){
  try{ await loadXLSX(); }catch(e){ toast(e.message); return; }
  const wb=XLSX.utils.book_new();
  const pet=[["PETUNJUK TEMPLATE TIS"],[""],["Sheet","Isi"],["Jadwal","Satu baris = satu hari, satu akhir pekan, atau satu minggu. Jenis: Hari / Akhir pekan / Minggu. Tab mengelompokkan jadwal (mis. Fase 1, Fase 2). Grup = judul kelompok (mis. Minggu 1, F2 · Hand Skill)."],["","Tugas akhir pekan: tulis satu tugas per baris di kolom Materi (tekan Alt+Enter untuk baris baru di sel)."],["","Kolom TO diisi ID TO dari sheet TO (mis. to1) bila hari itu ada TO."],["TO","ID TO wajib dan unik (mis. to1). Kriteria diujikan ditulis nomor kriteria dipisah koma (mis. 1,3,4) atau 'semua'. Batas dalam menit."],["Marking scheme","Satu baris = satu aspek. Jenis: M = ya/tidak, C = hitungan (isi kolom n), J = judgement 0–3. Total maks sebaiknya 100."],["Gate","Satu baris = satu gate. Syarat dipisah baris (Alt+Enter) di dalam sel."],[""],["Format tanggal","2026-11-19 atau 19/11/2026"],["Kolom ID kosong","Untuk baris baru, ID dibuat otomatis."],["Penting","Jangan mengubah ID TO atau ID aspek yang sudah punya nilai, agar nilai lama tetap terbaca."],["Impor","Di aplikasi: Pengaturan › Excel › Impor. Pilih sheet yang ingin diterapkan."]];
  const ws0=XLSX.utils.aoa_to_sheet(pet); ws0["!cols"]=[{wch:18},{wch:120}]; XLSX.utils.book_append_sheet(wb,ws0,"Petunjuk");
  const J=[["ID","Tab","Grup","Jenis","Tanggal","Sampai","Kode","Materi","Target","Jam","TO","Catatan"]].concat(sched().map(s=>[s.id||"",s.tab||"",s.group||"",KIND_OUT[s.kind]||"Hari",s.date||"",s.end||"",s.label||"",s.title||"",s.target||"",s.hours===""||s.hours==null?"":s.hours,s.to||"",s.note||""]));
  const ws1=XLSX.utils.aoa_to_sheet(J); ws1["!cols"]=[{wch:10},{wch:9},{wch:28},{wch:12},{wch:12},{wch:12},{wch:12},{wch:60},{wch:40},{wch:6},{wch:7},{wch:50}]; XLSX.utils.book_append_sheet(wb,ws1,"Jadwal");
  const T=[["ID","Nama","Fase","Tanggal","Label tanggal","Batas (menit)","Kriteria diujikan","Fokus"]].concat(events().map(e=>[e.id,e.name,e.fase||"",e.date||"",e.label||"",e.limit||"",(e.scope||[]).length===scheme().length?"semua":(e.scope||[]).join(","),e.focus||""]));
  const ws2=XLSX.utils.aoa_to_sheet(T); ws2["!cols"]=[{wch:8},{wch:10},{wch:6},{wch:12},{wch:26},{wch:13},{wch:18},{wch:50}]; XLSX.utils.book_append_sheet(wb,ws2,"TO");
  const M=[["ID kriteria","Nama kriteria","ID aspek","Aspek","Jenis","Maks","n"]]; scheme().forEach(c=>c.subs.forEach(a=>M.push([c.id,c.name,a.id,a.d,a.t,a.max,a.t==="C"?a.n:""])));
  const ws3=XLSX.utils.aoa_to_sheet(M); ws3["!cols"]=[{wch:11},{wch:34},{wch:9},{wch:60},{wch:6},{wch:6},{wch:5}]; XLSX.utils.book_append_sheet(wb,ws3,"Marking scheme");
  const G=[["ID","Kode fase","Nama fase","Syarat"]].concat(gates().map(g=>[g.id,g.ph||"",g.phName||"",(g.items||[]).join("\n")]));
  const ws4=XLSX.utils.aoa_to_sheet(G); ws4["!cols"]=[{wch:6},{wch:10},{wch:34},{wch:80}]; XLSX.utils.book_append_sheet(wb,ws4,"Gate");
  XLSX.writeFile(wb, "TIS-"+A.season.name.replace(/[^\w-]+/g,"_")+"-"+todayId()+".xlsx");
}
function sheetRows(wb, name){
  const key=wb.SheetNames.find(n=>n.trim().toLowerCase()===name.toLowerCase()); if(!key) return null;
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[key],{defval:"",raw:true});
  return rows.map(r=>{ const o={}; Object.keys(r).forEach(k=>o[k.trim().toLowerCase()]=typeof r[k]==="string"?r[k].replace(/\r/g,"").trim():r[k]); return o; }).filter(o=>Object.values(o).some(v=>v!==""&&v!=null));
}
async function readExcel(){
  const f=document.getElementById("xlFile").files[0]; if(!f){ toast("Pilih berkas Excel dulu."); return; }
  try{ await loadXLSX(); }catch(e){ toast(e.message); return; }
  let wb; try{ wb=XLSX.read(await f.arrayBuffer(),{type:"array"}); }catch(e){ toast("Berkas tidak bisa dibaca sebagai Excel."); return; }
  const X={};
  /* TO */
  const tR=sheetRows(wb,"TO");
  if(tR){ const r={rows:[],errors:[],warns:[]}; const seen=new Set(); const critIds=scheme().map(c=>String(c.id));
    tR.forEach((o,i)=>{ const n=i+2; const id=String(o["id"]||"").trim(); if(!id){ r.errors.push(`Baris ${n}: ID TO kosong.`); return; } if(seen.has(id)) r.errors.push(`Baris ${n}: ID ${id} dobel.`); seen.add(id);
      const date=dateIn(o["tanggal"]); if(date===null||date==="") r.errors.push(`Baris ${n}: tanggal "${o["tanggal"]}" tidak dikenali.`);
      const lim=numIn(o["batas (menit)"]); if(lim===null) r.errors.push(`Baris ${n}: batas menit bukan angka.`);
      const ks=String(o["kriteria diujikan"]||"").trim(); let scope;
      if(/^semua$/i.test(ks)) scope=scheme().map(c=>c.id); else scope=ks.split(/[,;\s]+/).filter(Boolean).map(x=>isNaN(+x)?x:+x);
      scope.forEach(x=>{ if(!critIds.includes(String(x))) r.warns.push(`Baris ${n}: kriteria ${x} tidak ada di marking scheme saat ini.`); });
      r.rows.push({ id, name:String(o["nama"]||id), fase:String(o["fase"]??""), date:date||"", label:String(o["label tanggal"]||""), limit:lim||0, scope, focus:String(o["fokus"]||"") }); });
    events().forEach(e=>{ if(!seen.has(e.id) && A.comps.some(c=>R("mark",e.id,c.id))) r.warns.push(`TO ${e.name} (${e.id}) sudah punya nilai tetapi tidak ada di Excel. Nilainya tetap tersimpan, tapi tidak tampil.`); });
    r.apply=!r.errors.length; X.to=r; }
  /* Jadwal */
  const jR=sheetRows(wb,"Jadwal");
  if(jR){ const r={rows:[],errors:[],warns:[]}; const toIds=new Set((X.to&&!X.to.errors.length?X.to.rows:events()).map(e=>e.id)); const seen=new Set();
    jR.forEach((o,i)=>{ const n=i+2; const kind=kindIn(o["jenis"]); if(!kind) r.errors.push(`Baris ${n}: jenis "${o["jenis"]}" harus Hari, Akhir pekan, atau Minggu.`);
      const date=dateIn(o["tanggal"]); if(date===null||date==="") r.errors.push(`Baris ${n}: tanggal "${o["tanggal"]}" tidak dikenali.`);
      const end=dateIn(o["sampai"]); if(end===null) r.errors.push(`Baris ${n}: tanggal sampai "${o["sampai"]}" tidak dikenali.`);
      const hours=numIn(o["jam"]); if(hours===null) r.errors.push(`Baris ${n}: jam bukan angka.`);
      let id=String(o["id"]||"").trim(); if(!id||seen.has(id)) id="s"+uid().slice(0,8); seen.add(id);
      const to=String(o["to"]||"").trim(); if(to&&!toIds.has(to)) r.warns.push(`Baris ${n}: TO "${to}" tidak ditemukan.`);
      r.rows.push({ id, tab:String(o["tab"]||"Jadwal"), group:String(o["grup"]||""), kind:kind||"day", date:date||"", end:end||"", label:String(o["kode"]??""), title:String(o["materi"]??""), target:String(o["target"]??""), hours:hours===null?"":hours, to, note:String(o["catatan"]??"") }); });
    const doneIds=new Set(Object.values(A.rec).filter(x=>x.kind==="done").map(x=>x.ref)); const newIds=new Set(r.rows.map(x=>x.id)); const lost=[...doneIds].filter(x=>!newIds.has(x)).length;
    if(lost) r.warns.push(`${lost} baris jadwal yang sudah dicentang tidak ada di Excel (ID berubah/terhapus). Centangnya tidak tampil lagi.`);
    r.apply=!r.errors.length; X.jadwal=r; }
  /* Marking scheme */
  const mR=sheetRows(wb,"Marking scheme");
  if(mR){ const r={rows:[],errors:[],warns:[]}; const crit=[]; const seenA=new Set();
    mR.forEach((o,i)=>{ const n=i+2; const cid=o["id kriteria"]===""?"":(isNaN(+o["id kriteria"])?String(o["id kriteria"]):+o["id kriteria"]); if(cid===""){ r.errors.push(`Baris ${n}: ID kriteria kosong.`); return; }
      let c=crit.find(x=>String(x.id)===String(cid)); if(!c){ c={id:cid,name:String(o["nama kriteria"]||"Kriteria "+cid),subs:[]}; crit.push(c); }
      const aid=String(o["id aspek"]||"").trim()||(cid+"."+(c.subs.length+1)); if(seenA.has(aid)) r.errors.push(`Baris ${n}: ID aspek ${aid} dobel.`); seenA.add(aid);
      const t=String(o["jenis"]||"").trim().toUpperCase(); if(!["M","C","J"].includes(t)) r.errors.push(`Baris ${n}: jenis harus M, C, atau J.`);
      const max=numIn(o["maks"]); if(max===null||max==="") r.errors.push(`Baris ${n}: maks bukan angka.`);
      const nn=numIn(o["n"]); if(t==="C"&&(!nn)) r.errors.push(`Baris ${n}: aspek jenis C butuh kolom n.`);
      const sub={id:aid,d:String(o["aspek"]||""),t:t||"M",max:+max||0}; if(t==="C") sub.n=+nn||1; c.subs.push(sub); });
    r.rows=crit; const tot=crit.reduce((a,c)=>a+c.subs.reduce((x,s)=>x+s.max,0),0); if(Math.abs(tot-100)>0.01) r.warns.push(`Total maks ${fmt(tot)} (bukan 100). Tetap bisa disimpan.`);
    const marked=new Set(); Object.values(A.rec).filter(x=>x.kind==="mark").forEach(x=>Object.keys(x.data?.marks||{}).forEach(k=>marked.add(k))); const lostA=[...marked].filter(k=>!seenA.has(k)); if(lostA.length) r.warns.push(`Aspek ${lostA.slice(0,5).join(", ")}${lostA.length>5?"…":""} sudah punya nilai tetapi tidak ada di Excel.`);
    r.apply=!r.errors.length; X.scheme=r; }
  /* Gate */
  const gR=sheetRows(wb,"Gate");
  if(gR){ const r={rows:[],errors:[],warns:[]}; gR.forEach((o,i)=>{ const n=i+2; const id=String(o["id"]||"").trim(); if(!id){ r.errors.push(`Baris ${n}: ID gate kosong.`); return; }
      r.rows.push({ id, ph:String(o["kode fase"]||""), phName:String(o["nama fase"]||""), items:String(o["syarat"]||"").split(/\n|;/).map(x=>x.trim()).filter(Boolean) }); });
    r.apply=!r.errors.length; X.gate=r; }
  if(!Object.keys(X).length){ toast("Tidak ada sheet Jadwal, TO, Marking scheme, atau Gate di berkas ini."); return; }
  ui.xl=X; render();
}
async function applyExcel(){
  const X=ui.xl; if(!X) return; const pick=Object.keys(X).filter(k=>X[k].apply&&!X[k].errors.length);
  if(!pick.length){ toast("Tidak ada sheet yang dipilih."); return; }
  const label={jadwal:"Jadwal",to:"TO",scheme:"Marking scheme",gate:"Gate"};
  if(!confirm("Ganti "+pick.map(k=>label[k]).join(", ")+" di musim "+A.season.name+" dengan isi Excel?")) return;
  const cfg=clone(A.cfg);
  if(pick.includes("jadwal")) cfg.schedule=X.jadwal.rows;
  if(pick.includes("to")) cfg.events=fixLabels(X.to.rows);
  if(pick.includes("scheme")) cfg.scheme=X.scheme.rows;
  if(pick.includes("gate")) cfg.gates=X.gate.rows;
  const ok=await saveSeasonCfg(cfg,"Isi Excel diterapkan dan disimpan."); if(ok){ ui.xl=null; ui.editKey=null; render(); }
}
