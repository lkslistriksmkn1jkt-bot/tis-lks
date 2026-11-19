/* =====================================================================
   TIS LKS · Penilaian Harian (latihan pendek, bukan Try Out)
   Sesi  : kind "harian", ref "h<id>", tanpa peserta
   Hasil : kind "harian", ref "h<id>~<soal>~<percobaan>", per peserta
   ===================================================================== */
const H_M = { baca:"Waktu baca / memahami gambar", kerja:"Waktu mengerjakan", salah:"Jumlah kesalahan", dev:"Deviasi maks (mm)", skor:"Skor ketelitian (0–100)" };
const H_JENIS = ["Membaca gambar","Drawing / sketsa","Marking out & layout","Pemasangan (trunking, conduit, komponen)","Terminasi & penyambungan kabel","Wiring panel","Pengukuran & pengujian","Teori / angka teknis","Lainnya"];
const H_TPL = [
  { title:"Drawing & membaca gambar", jenis:"Membaca gambar", items:"Sketsa 1\nSketsa 2\nSketsa 3", reps:2, m:["baca","kerja","salah","dev"], tBaca:3, tKerja:20, x:"Simbol & notasi benar /10\nKerapian gambar /5", note:"Siswa membaca gambar sampai paham (stopwatch baca), lalu menggambar/menandai ulang. Diulang untuk melihat peningkatan kecepatan dan ketelitian." },
  { title:"Drill marking / layout", jenis:"Marking out & layout", items:"Layout 1\nLayout 2", reps:3, m:["kerja","dev"], tBaca:"", tKerja:15, note:"" },
  { title:"Drill terminasi kabel", jenis:"Terminasi & penyambungan kabel", items:"10 terminasi", reps:3, m:["kerja","salah"], tBaca:"", tKerja:12, note:"" }
];
const hSessions = () => Object.values(A.rec).filter(r=>r.kind==="harian"&&!String(r.ref).includes("~")).map(r=>({ id:r.id, ref:r.ref, ...r.data })).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.at||0)-(b.at||0));
const hRes = (sref,item,rep,cid) => R("harian", sref+"~"+item+"~"+rep, cid) || {};
const mmss = s => { if(s===undefined||s===null||s===""||isNaN(s)) return ""; s=Math.max(0,Math.round(+s)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); };
const parseT = v => { v=String(v||"").trim().replace(",","."); if(!v) return null; if(v.includes(":")){ const [m,s]=v.split(":"); return Math.round((+m||0)*60+(+s||0)); } if(/^\d+(\.\d+)?$/.test(v)) return Math.round(+v*60); return null; };
const hParseX = txt => String(txt||"").split(/\n|;/).map(x=>x.trim()).filter(Boolean).map((l,i)=>{ const m=l.match(/^(.*?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*$/); return { name:(m?m[1]:l).trim(), max:m?hNum(m[2]):null }; });
const hXText = x => (x||[]).map(e=>e.name+(e.max?" /"+e.max:"")).join("\n");
function hMergeX(old,parsed){ const used=new Set(); return parsed.map((e,i)=>{ const ex=(old||[]).find(o=>o.name===e.name&&!used.has(o.id)); const id=ex?ex.id:"x"+Date.now().toString(36)+i; used.add(id); return { id, name:e.name, max:e.max }; }); }
function hMergeItems(old,names){ const used=new Set(); return names.map((n,i)=>{ let ex=(old||[]).find(o=>o.name===n&&!used.has(o.id)) || ((old||[])[i]&&!used.has(old[i].id)&&!names.includes(old[i].name)?old[i]:null); const id=ex?ex.id:"i"+Date.now().toString(36)+i; used.add(id); return { id, name:n }; }); }
const hNum = v => { const x=parseFloat(String(v??"").replace(",",".")); return isFinite(x)?x:null; };
function hStats(S,cid,rep){ const rs=[]; (S.items||[]).forEach(i=>{ for(let x=1;x<=(+S.reps||1);x++){ if(rep&&x!==rep) continue; const r=hRes(S.ref,i.id,x,cid); if(Object.keys(r).some(k=>!["by","at","phase","t0","t1","files"].includes(k)&&r[k]!==null&&r[k]!=="")) rs.push(r); } });
  const pct=rs.map(r=>{ const xs=(S.extra||[]).filter(x=>x.max&&hNum(r["x_"+x.id])!==null); return xs.length?xs.reduce((a,x)=>a+hNum(r["x_"+x.id])/x.max,0)/xs.length*100:null; });
  return { n:rs.length, baca:hAvg(rs.map(r=>hNum(r.baca))), kerja:hAvg(rs.map(r=>hNum(r.kerja))), salah:hAvg(rs.map(r=>hNum(r.salah))), dev:hAvg(rs.map(r=>hNum(r.dev))), skor:hAvg(rs.map(r=>hNum(r.skor))), pct:hAvg(pct) }; }
const hJenis = S => S.jenis||"Lainnya";
const hAvg = a => { a=a.filter(x=>x!==null&&x!==undefined&&x!==""&&!isNaN(x)); return a.length?a.reduce((x,y)=>x+ +y,0)/a.length:null; };

V.harian = () => {
  if(!A.comps.length) return noComps();
  const day=ui.hDay||todayId(); const all=hSessions(); const list=all.filter(s=>s.date===day);
  let S=list.find(s=>s.ref===ui.hSes)||list[0]||null;
  const editing = ui.hForm ? (ui.hForm==="new"?{}:all.find(s=>s.ref===ui.hForm)||{}) : null;
  const nav=`<div class="row no-print"><button class="btn sm" data-hday="-1">‹</button><input type="date" id="hDay" value="${day}" style="width:auto"><button class="btn sm" data-hday="1">›</button>${day!==todayId()?'<button class="btn sm" data-hday="0">Hari ini</button>':""}${canWrite()&&!editing?'<button class="btn sm primary" data-hform="new">+ Sesi baru</button>':""}</div>`;
  const tabs=list.length>1?`<div class="subnav no-print">${list.map(s=>`<button data-hses="${esc(s.ref)}" aria-pressed="${S&&S.ref===s.ref}">${esc(s.title)}</button>`).join("")}</div>`:"";
  const vw=`<div class="subnav no-print" style="margin-bottom:4px"><button data-hview="sesi" aria-pressed="${ui.hView!=="rekap"}">Sesi per hari</button><button data-hview="rekap" aria-pressed="${ui.hView==="rekap"}">Rekap per jenis penilaian</button></div>`;
  const intro=`<div><h2>Penilaian harian</h2><p class="lead">Latihan pendek yang diukur setiap hari: beberapa soal, diulang, dicatat waktu baca, waktu kerja, dan ketelitiannya. Terpisah dari Try Out (mini proyek yang dinilai lengkap dari awal sampai akhir).</p></div>`;
  if(ui.hView==="rekap") return intro+vw+hRekap(all)+hExportPanel(all);
  return `${intro}${vw}
  ${nav}${editing?hFormView(editing,day):""}${tabs}
  ${S?hSessionView(S):(editing?"":`<div class="empty">Belum ada sesi penilaian harian pada ${dlabel(day,true)}.${canWrite()?' Ketuk <b>+ Sesi baru</b> untuk membuat.':""}</div>`)}
  ${hExportPanel(all)}`;
};

function hFormView(s,day){
  const isNew=!s.ref; const m=s.m||["baca","kerja","salah","dev"];
  return `<form class="panel no-print" id="hForm"><div class="spread"><div class="label">${isNew?"Sesi baru":"Ubah sesi"}</div><button type="button" class="btn sm" id="hCancel">Batal</button></div>
  ${isNew?`<div class="row"><span class="note">Templat:</span>${H_TPL.map((t,i)=>`<button type="button" class="btn sm" data-htpl="${i}">${esc(t.title)}</button>`).join("")}</div>`:""}
  <div class="grid g3"><label class="f">Tanggal<input type="date" id="hfDate" value="${esc(s.date||day)}" required></label><label class="f">Jenis penilaian<input type="text" id="hfJenis" list="hJenisL" value="${esc(s.jenis||"")}" placeholder="Pilih atau ketik"><datalist id="hJenisL">${[...new Set(H_JENIS.concat(hSessions().map(x=>x.jenis).filter(Boolean)))].map(j=>`<option value="${esc(j)}">`).join("")}</datalist></label><label class="f">Judul sesi<input type="text" id="hfTitle" value="${esc(s.title||"")}" placeholder="Contoh: Drawing & membaca gambar" required></label></div>
  <div class="grid g2"><label class="f">Daftar soal (satu per baris)<textarea id="hfItems" rows="4" placeholder="Sketsa 1&#10;Sketsa 2&#10;Sketsa 3">${esc((s.items||[]).map(i=>i.name).join("\n"))}</textarea></label>
  <div><label class="f">Jumlah percobaan (ulangan)<input type="number" id="hfReps" min="1" max="6" value="${esc(s.reps||2)}"></label>
  <div class="f"><span>Yang diukur</span>${Object.entries(H_M).map(([k,v])=>`<label class="row" style="gap:6px"><input type="checkbox" data-hm="${k}" ${m.includes(k)?"checked":""}>${v}</label>`).join("")}</div></div></div>
  <div class="grid g3"><label class="f">Target baca (menit)<input type="number" inputmode="decimal" step="0.5" min="0" id="hfTB" value="${esc(s.tBaca??"")}"></label><label class="f">Target kerja (menit)<input type="number" inputmode="decimal" step="0.5" min="0" id="hfTK" value="${esc(s.tKerja??"")}"></label><label class="f">Target deviasi (mm)<input type="number" inputmode="decimal" step="0.5" min="0" id="hfTD" value="${esc(s.tDev??"")}"></label></div>
  <label class="f">Kriteria tambahan, dinilai angka (satu per baris; tulis nilai maks setelah garis miring)<textarea id="hfX" rows="2" placeholder="Simbol benar /10&#10;Kerapian gambar /5">${esc(hXText(s.extra))}</textarea></label>
  <label class="f">Tujuan / instruksi<textarea id="hfNote" rows="2">${esc(s.note||"")}</textarea></label>
  <div><button class="btn primary" type="submit">${isNew?"Buat sesi":"Simpan perubahan"}</button></div></form>`;
}

function hPhaseBtns(S,item,rep,c,r){
  const m=S.m||[]; const k=`${item}~${rep}~${c.id}`;
  if(!m.includes("baca")&&!m.includes("kerja")) return "";
  const ph=r.phase||"idle";
  const lb=hNum(S.tBaca)?Math.round(hNum(S.tBaca)*60):0, lk=hNum(S.tKerja)?Math.round(hNum(S.tKerja)*60):0;
  const run=(lbl,t,lim)=>{ const over=lim&&(Date.now()-t)/1000>lim; return `<span class="chip ${over?"bad":"warn"} big-t" data-runlim="${lim||""}" data-runsince="${t}">${lbl} <b data-since="${t}">${mmss((Date.now()-t)/1000)}</b>${lim?` <small>/ ${mmss(lim)}</small>`:""}</span>`; };
  if(ph==="baca") return `${run("Membaca",r.t0,lb)}${canWrite()?`<button class="btn sm primary" data-hgo="${k}" data-to="${m.includes("kerja")?"kerja":"done"}">${m.includes("kerja")?"Paham → mulai kerja":"Selesai baca"}</button>`:""}`;
  if(ph==="kerja") return `${run("Mengerjakan",r.t1,lk)}${canWrite()?`<button class="btn sm primary" data-hgo="${k}" data-to="done">■ Selesai</button>`:""}`;
  if(!canWrite()) return "";
  if(ph==="done") return `<button class="btn sm" data-hgo="${k}" data-to="reset">Ulangi stopwatch</button>`;
  return `<button class="btn sm primary" data-hgo="${k}" data-to="${m.includes("baca")?"baca":"kerja"}">▶ Mulai ${m.includes("baca")?"baca":"kerja"}</button>`;
}

function hSessionView(S){
  const items=S.items||[], reps=+S.reps||1, m=S.m||[];
  const item=items.find(i=>i.id===ui.hItem)?ui.hItem:(items[0]?.id||""); const rep=Math.min(Math.max(+ui.hRep||1,1),reps);
  const tB=hNum(S.tBaca), tK=hNum(S.tKerja), tD=hNum(S.tDev);
  const head=`<div class="panel"><div class="spread"><div><div class="label">${dlabel(S.date,true)} · ${esc(hJenis(S))} · ${items.length} soal × ${reps} percobaan</div><h3 style="margin:2px 0">${esc(S.title)}</h3></div>${canWrite()?`<span class="row no-print"><button class="btn sm" data-hform="${esc(S.ref)}">Ubah</button><button class="btn sm" data-hdel="${esc(S.ref)}">Hapus</button></span>`:""}</div>
    ${S.note?`<p>${esc(S.note).replace(/\n/g,"<br>")}</p>`:""}
    <div class="row">${m.map(k=>`<span class="chip">${H_M[k]}</span>`).join("")}${tB?`<span class="chip">target baca ${fmt(tB,tB%1?1:0)} mnt</span>`:""}${tK?`<span class="chip">target kerja ${fmt(tK,tK%1?1:0)} mnt</span>`:""}${(S.extra||[]).map(x=>`<span class="chip">${esc(x.name)}${x.max?" /"+x.max:""}</span>`).join("")}${tD!==null?`<span class="chip">target deviasi ≤ ${fmt(tD,1)} mm</span>`:""}</div>
    ${hFiles(S,"",`File soal sesi`)}
    <p class="note">oleh ${esc(S.by||"–")}</p></div>`;
  if(!items.length) return head+'<div class="empty">Sesi ini belum punya soal. Ketuk Ubah untuk menambah.</div>';
  const sel=`<div class="panel no-print"><div class="label">Soal</div><div class="subnav">${items.map(i=>`<button data-hitem="${esc(i.id)}" aria-pressed="${i.id===item}">${esc(i.name)}</button>`).join("")}</div>
    <div class="label" style="margin-top:8px">Percobaan</div><div class="subnav">${Array.from({length:reps},(_,i)=>`<button data-hrep="${i+1}" aria-pressed="${i+1===rep}">Percobaan ${i+1}</button>`).join("")}</div></div>`;
  const anyIdle=A.comps.some(c=>(hRes(S.ref,item,rep,c.id).phase||"idle")==="idle");
  const timed=m.includes("baca")||m.includes("kerja");
  const startAll=canWrite()&&timed&&anyIdle?`<button class="btn primary no-print" data-hall="${esc(item)}~${rep}" data-to="${m.includes("baca")?"baca":"kerja"}">▶ Mulai ${m.includes("baca")?"baca":"kerja"} semua peserta</button>`:"";
  const iname=items.find(i=>i.id===item)?.name||"";
  const prev=rep>1;
  const cards=A.comps.map(c=>{ const r=hRes(S.ref,item,rep,c.id); const p=prev?hRes(S.ref,item,rep-1,c.id):{}; const key=`${item}~${rep}~${c.id}`; const ro=canWrite()?"":"disabled";
    const cmp=(v,pv,t)=>{ const out=[]; if(v!==null&&v!==undefined&&t) out.push(v<=t?'<span class="chip good">✓ target</span>':'<span class="chip bad">lewat target</span>'); if(prev&&pv!==null&&pv!==undefined&&v!==null&&v!==undefined&&pv>0){ const d=Math.round((v-pv)/pv*100); out.push(`<span class="chip ${d<=0?"good":"warn"}">${d>0?"+":""}${d}% vs P${rep-1}</span>`);} return out.join(""); };
    const fld=(f,label,extra)=>`<label class="f">${label}<input ${ro} type="${f==="baca"||f==="kerja"?"text":"number"}" ${f==="baca"||f==="kerja"?'inputmode="decimal" placeholder="m:ss"':'inputmode="decimal" min="0" step="'+(f==="dev"?"0.5":"1")+'"'} id="hx-${f}-${c.id}" data-hres="${key}" data-f="${f}" value="${esc(f==="baca"||f==="kerja"?mmss(r[f]):(r[f]??""))}">${extra||""}</label>`;
    return `<div class="entry" style="border-left-color:${compColor(c)}"><div class="spread"><b>${badge(c,true)} ${esc(c.name)}</b><span class="row">${hPhaseBtns(S,item,rep,c,r)}</span></div>
      <div class="grid g3 h-g">${m.includes("baca")?fld("baca","Waktu baca"+(tB?` <span class="muted">(target ${mmss(tB*60)})</span>`:""),`<span class="row">${cmp(r.baca,p.baca,tB?tB*60:null)}</span>`):""}${m.includes("kerja")?fld("kerja","Waktu kerja"+(tK?` <span class="muted">(target ${mmss(tK*60)})</span>`:""),`<span class="row">${cmp(r.kerja,p.kerja,tK?tK*60:null)}</span>`):""}
      ${m.includes("salah")?fld("salah","Kesalahan",`<span class="row">${cmp(hNum(r.salah),hNum(p.salah),null)}</span>`):""}${m.includes("dev")?fld("dev","Deviasi maks (mm)"+(tD!==null?` <span class="muted">(target ≤ ${fmt(tD,1)})</span>`:""),`<span class="row">${hNum(r.dev)!==null&&tD!==null?(hNum(r.dev)<=tD?'<span class="chip good">✓ toleransi</span>':'<span class="chip bad">di luar toleransi</span>'):""}</span>`):""}${m.includes("skor")?fld("skor","Skor (0–100)"):""}${(S.extra||[]).map(x=>fld("x_"+x.id,esc(x.name)+(x.max?" (maks "+x.max+")":""))).join("")}</div>
      <label class="f">Catatan juri<input ${ro} type="text" id="hx-note-${c.id}" data-hres="${key}" data-f="note" value="${esc(r.note||"")}" placeholder="Bagian yang salah baca, simbol yang belum hafal, dll."></label>
      ${hFiles(S,null,"Foto hasil kerja",key,r)}
      ${r.by?`<div class="note">dicatat ${esc(r.by)}</div>`:""}</div>`; }).join("");
  return head+sel+`<div class="panel"><div class="spread"><div class="label">${esc(iname)} · Percobaan ${rep}</div>${startAll}</div>${hFiles(S,item,"Gambar / file soal: "+iname)}${cards}
    <p class="note no-print">Waktu bisa dari stopwatch atau diketik manual: <b>3:25</b> (3 menit 25 detik) atau <b>3,5</b> (menit). Data tersimpan otomatis.</p></div>`+hSummary(S);
}

function hFiles(S,item,label,rkey,r){
  const list=rkey?((r&&r.files)||[]):(S.files||[]).filter(f=>(f.item||"")===item);
  const tgt=rkey?"hr:"+rkey:"hs:"+(item||"-");
  const up=(ui.hUp||{})[tgt];
  const th=list.map(f=>{ const u=photoUrl(f.path); const del=canWrite()?`<button class="ph-del no-print" data-hfdel="${esc(tgt)}|${esc(f.id)}" title="Hapus">×</button>`:"";
    if(f.type==="application/pdf") return `<span class="h-file">${u&&u!=="err"?`<a href="${esc(u)}" target="_blank" rel="noopener">📄 ${esc(f.name||"soal.pdf")}</a>`:`📄 ${esc(f.name||"soal.pdf")}${u==="err"?" (gagal dimuat)":"…"}`}${del}</span>`;
    return `<span class="ph">${u&&u!=="err"?`<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="${esc(f.name||"")}"></a>`:`<span class="ph-ph">${u==="err"?"gagal":"…"}</span>`}${del}</span>`; }).join("");
  if(!list.length&&!canWrite()) return "";
  return `<div class="h-files"><div class="note">${esc(label)}${up?` · <b>mengunggah ${up}…</b>`:""}</div><div class="ph-grid">${th}${canWrite()?`<label class="ph-add no-print" title="Tambah">＋<input type="file" multiple data-keepfile="${esc(tgt)}" accept="${rkey?"image/*":"image/*,application/pdf"}" style="display:none"></label>`:""}</div></div>`;
}
async function hCompress(file){
  let src,w,h; try{ src=await createImageBitmap(file); w=src.width; h=src.height; }catch(e){ src=await new Promise((ok,no)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=()=>no(new Error("Format gambar tidak didukung")); i.src=URL.createObjectURL(file); }); w=src.naturalWidth; h=src.naturalHeight; }
  const M=DEMO?1000:2400, k=Math.min(1,M/Math.max(w,h)); const cv=document.createElement("canvas"); cv.width=Math.round(w*k); cv.height=Math.round(h*k); const g=cv.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,cv.width,cv.height); g.drawImage(src,0,0,cv.width,cv.height);
  return await new Promise(ok=>cv.toBlob(ok,"image/jpeg",DEMO?0.7:0.85));
}
async function hUpload(tgt,files){
  const S=hCur(); if(!S||!files.length) return; if(!canWrite()){ toast("Akun Anda hanya bisa melihat."); return; }
  ui.hUp=ui.hUp||{}; ui.hUp[tgt]=(ui.hUp[tgt]||0)+files.length; render(); const added=[];
  for(const f of files){
    try{ const pdf=f.type==="application/pdf"||/\.pdf$/i.test(f.name); if(pdf&&f.size>10*1024*1024) throw new Error("PDF lebih dari 10 MB");
      if(!pdf&&!/^image\//.test(f.type||"image/")) throw new Error("hanya gambar atau PDF");
      const blob=pdf?(f.type?f:new Blob([f],{type:"application/pdf"})):await hCompress(f); const id=uid();
      const path=`${A.season.id}/harian/${S.ref}/${id}.${pdf?"pdf":"jpg"}`;
      await Store.uploadPhoto(path,blob); A.purl[path]=pdf&&DEMO?"":URL.createObjectURL(blob); if(pdf&&DEMO) delete A.purl[path];
      added.push({ id, path, name:f.name, type:pdf?"application/pdf":"image/jpeg", by:A.profile?.name||"", at:Date.now() });
    }catch(e){ toast(`${f.name}: gagal diunggah (${errMsg(e)})`); }
    ui.hUp[tgt]=Math.max(0,ui.hUp[tgt]-1);
  }
  if(added.length){
    if(tgt.startsWith("hr:")){ const key=tgt.slice(3); const [it,rp,cid]=key.split("~"); const cur=hRes(S.ref,it,rp,cid); await hSaveRes(S.ref,key,{ files:(cur.files||[]).concat(added) }); }
    else { const item=tgt.slice(3)==="-"?"":tgt.slice(3); const cur=A.rec[recId("harian",S.ref,null)].data; await saveRec("harian",S.ref,null,{ ...cur, files:(cur.files||[]).concat(added.map(a=>({...a,item}))) }); }
    toast(added.length+" file tersimpan.");
  } else render();
}
async function hDelFile(tgt,fid){
  const S=hCur(); if(!S||!confirm("Hapus file ini?")) return;
  try{
    if(tgt.startsWith("hr:")){ const key=tgt.slice(3); const [it,rp,cid]=key.split("~"); const cur=hRes(S.ref,it,rp,cid); const f=(cur.files||[]).find(x=>x.id===fid); if(f) await Store.deletePhoto(f.path).catch(()=>{}); await hSaveRes(S.ref,key,{ files:(cur.files||[]).filter(x=>x.id!==fid) }); }
    else { const cur=A.rec[recId("harian",S.ref,null)].data; const f=(cur.files||[]).find(x=>x.id===fid); if(f) await Store.deletePhoto(f.path).catch(()=>{}); await saveRec("harian",S.ref,null,{ ...cur, files:(cur.files||[]).filter(x=>x.id!==fid) }); }
    toast("File dihapus.");
  }catch(e){ toast(errMsg(e)); }
}

function hRekap(all){
  if(!all.length) return '<div class="empty">Belum ada sesi penilaian harian.</div>';
  const groups={}; all.forEach(S=>{ (groups[hJenis(S)]=groups[hJenis(S)]||[]).push(S); });
  const order=Object.keys(groups).sort((a,b)=>{ const ia=H_JENIS.indexOf(a), ib=H_JENIS.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b); });
  const f=(v,k)=>v===null?"–":(k==="baca"||k==="kerja"?mmss(v):k==="pct"?Math.round(v)+"%":fmt(v,1));
  const trendChip=(a,b,lbl)=>{ if(a===null||b===null||!a) return ""; const d=Math.round((b-a)/a*100); return `<span class="chip ${d<=0?"good":"warn"}">${lbl} ${d>0?"+":""}${d}%</span>`; };
  return order.map(j=>{ const ss=groups[j];
    const sum=A.comps.map(c=>{ const st=ss.map(S=>hStats(S,c.id)).filter(x=>x.n);
      if(!st.length) return `<tr><td>${badge(c,true)} ${esc(c.name)}</td><td colspan="7" class="muted">belum ada hasil</td></tr>`;
      const av=k=>hAvg(st.map(x=>x[k])); const fst=st[0], lst=st[st.length-1];
      return `<tr><td>${badge(c,true)} ${esc(c.name)}</td><td class="num">${st.length}</td><td class="num">${f(av("baca"),"baca")}</td><td class="num">${f(av("kerja"),"kerja")}</td><td class="num">${f(av("salah"))}</td><td class="num">${f(av("dev"))}</td><td class="num">${f(av("pct"),"pct")}</td><td>${st.length>1?trendChip(fst.baca,lst.baca,"baca")+trendChip(fst.kerja,lst.kerja,"kerja")+(fst.salah!==null&&lst.salah!==null?`<span class="chip ${lst.salah<=fst.salah?"good":"warn"}">salah ${fmt(fst.salah,1)}→${fmt(lst.salah,1)}</span>`:""):'<span class="muted">1 sesi</span>'}</td></tr>`; }).join("");
    const hist=ss.slice().reverse().map(S=>`<tr><td><a href="#harian" data-hgoto="${esc(S.ref)}">${dlabel(S.date)}</a></td><td>${esc(S.title)}</td>${A.comps.map(c=>{ const x=hStats(S,c.id); return `<td class="num">${x.n?[x.baca!==null?"B "+mmss(x.baca):"",x.kerja!==null?"K "+mmss(x.kerja):"",x.salah!==null?"S "+fmt(x.salah,1):"",x.dev!==null?"D "+fmt(x.dev,1):"",x.pct!==null?Math.round(x.pct)+"%":""].filter(Boolean).join(" · "):"–"}</td>`; }).join("")}</tr>`).join("");
    return `<div class="panel"><div class="spread"><h3 style="margin:0">${esc(j)}</h3><span class="chip">${ss.length} sesi</span></div>
      <div class="tbl-wrap"><table class="h-sum"><thead><tr><th>Peserta</th><th>Sesi</th><th>Baca</th><th>Kerja</th><th>Salah/soal</th><th>Dev (mm)</th><th>Kriteria</th><th>Perkembangan (sesi pertama → terakhir)</th></tr></thead><tbody>${sum}</tbody></table></div>
      <details><summary class="note">Riwayat sesi (${ss.length})</summary><div class="tbl-wrap"><table class="h-sum"><thead><tr><th>Tanggal</th><th>Sesi</th>${A.comps.map(c=>`<th>${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${hist}</tbody></table></div></details></div>`; }).join("")
  +`<p class="note">Rata-rata dari semua soal dan percobaan. B = baca, K = kerja (menit:detik), S = kesalahan per soal, D = deviasi maks, % = rata-rata kriteria tambahan terhadap nilai maksimumnya.</p>`;
}

function hSummary(S){
  const items=S.items||[], reps=+S.reps||1, m=S.m||[];
  const short={baca:"Baca",kerja:"Kerja",salah:"Salah",dev:"Dev",skor:"Skor"};
  (S.extra||[]).forEach(x=>short["x_"+x.id]=x.name.length>9?x.name.slice(0,8)+"…":x.name);
  const cols=m.concat((S.extra||[]).map(x=>"x_"+x.id));
  const val=(r,k)=>k==="baca"||k==="kerja"?mmss(r[k]):(r[k]===undefined||r[k]===""?"":fmt(hNum(r[k]),k==="dev"?1:0));
  const rows=items.map(i=>Array.from({length:reps},(_,x)=>`<tr><td>${x===0?`<b>${esc(i.name)}</b>`:""}</td><td class="num">P${x+1}</td>${A.comps.map(c=>{ const r=hRes(S.ref,i.id,x+1,c.id); return cols.map(k=>`<td class="num">${val(r,k)}</td>`).join(""); }).join("")}</tr>`).join("")).join("");
  const avgRow=Array.from({length:reps},(_,x)=>`<tr class="tot"><td>${x===0?"<b>Rata-rata</b>":""}</td><td class="num">P${x+1}</td>${A.comps.map(c=>cols.map(k=>{ const a=hAvg(items.map(i=>{ const v=hRes(S.ref,i.id,x+1,c.id)[k]; return v===undefined||v===""?null:hNum(v); })); return `<td class="num"><b>${a===null?"":(k==="baca"||k==="kerja"?mmss(a):fmt(a,k==="dev"?1:k==="salah"?1:0))}</b></td>`; }).join("")).join("")}</tr>`).join("");
  let trend="";
  if(reps>1) trend=`<div class="row">${A.comps.map(c=>{ const out=[]; ["baca","kerja"].filter(k=>m.includes(k)).forEach(k=>{ const a=hAvg(items.map(i=>hNum(hRes(S.ref,i.id,1,c.id)[k]))), b=hAvg(items.map(i=>hNum(hRes(S.ref,i.id,reps,c.id)[k]))); if(a&&b) { const d=Math.round((b-a)/a*100); out.push(`<span class="chip ${d<=0?"good":"warn"}">${esc(c.name)} · ${short[k]} ${d>0?"+":""}${d}% (P1→P${reps})</span>`);} }); return out.join(""); }).join("")}</div>`;
  return `<div class="panel"><div class="label">Ringkasan sesi</div>${trend}<div class="tbl-wrap"><table class="h-sum"><thead><tr><th rowspan="2">Soal</th><th rowspan="2"></th>${A.comps.map(c=>`<th colspan="${cols.length}" style="border-bottom:3px solid ${compColor(c)}">${esc(c.name)}</th>`).join("")}</tr><tr>${A.comps.map(()=>cols.map(k=>`<th>${short[k]}</th>`).join("")).join("")}</tr></thead><tbody>${rows}${avgRow}</tbody></table></div>
  <p class="note">Baca/Kerja dalam menit:detik. Dev = deviasi maks (mm). Percobaan berikutnya dibandingkan dengan sebelumnya; turun = lebih cepat/lebih sedikit salah.</p></div>`;
}

function hExportPanel(all){
  return `<div class="panel no-print"><div class="label">Unduh penilaian harian</div>
    <div class="row"><label class="f" style="flex:1;min-width:140px">Dari<input type="date" id="hxFrom" value="${ui.hxFrom||(all.length?all[0].date:todayId())}"></label><label class="f" style="flex:1;min-width:140px">Sampai<input type="date" id="hxTo" value="${ui.hxTo||todayId()}"></label></div>
    <div class="row"><button class="btn sm primary" id="hXls">Unduh Excel</button></div>
    <p class="note">Sheet Hasil (setiap soal × percobaan × peserta), Rekap (rata-rata per sesi dan percobaan), dan Per jenis (perkembangan tiap jenis penilaian).</p></div>
  ${canWrite()?`<div class="panel no-print"><div class="label">Rencana penilaian harian (Excel)</div>
    <p class="note">Susun sesi untuk banyak hari sekaligus di Excel: unduh rencana, isi atau ubah barisnya, lalu unggah kembali. Baris yang sudah ada (punya Kode) akan diperbarui, baris tanpa Kode dibuat sebagai sesi baru. Hasil penilaian yang sudah diisi tidak terhapus.</p>
    <div class="row"><button class="btn sm" id="hPlanXls">Unduh rencana Excel</button><label class="btn sm primary" style="display:inline-block">📂 Unggah rencana Excel<input type="file" data-keepfile="hxl" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style="display:none"></label></div></div>`:""}`;
}

/* ---------- aksi ---------- */
async function hSaveRes(sref,key,patch){
  const [item,rep,cid]=key.split("~"); const ref=sref+"~"+item+"~"+rep;
  const cur=R("harian",ref,cid)||{};
  const data={ ...cur, ...patch, by:A.profile?.name||A.user?.email||"", at:Date.now() };
  return saveRec("harian",ref,cid,data);
}
function hPhase(cur,to){
  const now=Date.now(), p={};
  if(to==="baca"){ Object.assign(p,{phase:"baca",t0:now,t1:null}); }
  else if(to==="kerja"){ if(cur.phase==="baca"&&cur.t0) p.baca=Math.round((now-cur.t0)/1000); Object.assign(p,{phase:"kerja",t1:now}); }
  else if(to==="done"){ if(cur.phase==="baca"&&cur.t0) p.baca=Math.round((now-cur.t0)/1000); if(cur.phase==="kerja"&&cur.t1) p.kerja=Math.round((now-cur.t1)/1000); p.phase="done"; }
  else if(to==="reset"){ Object.assign(p,{phase:"idle",t0:null,t1:null,baca:null,kerja:null}); }
  return p;
}
const hCur = () => { const day=ui.hDay||todayId(); const l=hSessions().filter(s=>s.date===day); return l.find(s=>s.ref===ui.hSes)||l[0]||null; };

document.addEventListener("click", async e=>{
  const a=e.target.closest("[data-hgoto]"); if(a){ e.preventDefault(); const S=hSessions().find(s=>s.ref===a.dataset.hgoto); if(S){ ui.hView="sesi"; ui.hDay=S.date; ui.hSes=S.ref; ui.hItem=null; ui.hRep=1; render(); window.scrollTo(0,0); } return; }
  const t=e.target.closest("button,[data-hday]"); if(!t) return;
  if(t.dataset.hday!==undefined){ const k=+t.dataset.hday; ui.hDay=k===0?todayId():addDays(ui.hDay||todayId(),k); ui.hSes=null; render(); return; }
  if(t.dataset.hses){ ui.hSes=t.dataset.hses; ui.hItem=null; ui.hRep=1; render(); return; }
  if(t.dataset.hitem){ ui.hItem=t.dataset.hitem; render(); return; }
  if(t.dataset.hrep){ ui.hRep=+t.dataset.hrep; render(); return; }
  if(t.dataset.hform){ ui.hForm=t.dataset.hform; render(); document.getElementById("hForm")?.scrollIntoView({behavior:"smooth"}); return; }
  if(t.id==="hCancel"){ ui.hForm=null; render(); return; }
  if(t.dataset.htpl!==undefined){ const T=H_TPL[+t.dataset.htpl]; const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
    set("hfTitle",T.title); set("hfJenis",T.jenis||""); set("hfItems",T.items); set("hfReps",T.reps); set("hfTB",T.tBaca); set("hfTK",T.tKerja); set("hfNote",T.note); set("hfX",T.x||"");
    document.querySelectorAll("[data-hm]").forEach(x=>x.checked=T.m.includes(x.dataset.hm)); return; }
  if(t.dataset.hdel){ const sref=t.dataset.hdel; const S=hSessions().find(s=>s.ref===sref);
    if(!confirm(`Hapus sesi "${S?.title||""}" beserta semua hasilnya?`)) return;
    const ids=Object.values(A.rec).filter(r=>r.kind==="harian"&&(r.ref===sref||String(r.ref).startsWith(sref+"~"))).map(r=>r.id);
    const paths=ids.flatMap(id=>(A.rec[id]?.data?.files||[]).map(f=>f.path));
    try{ for(const p of paths) await Store.deletePhoto(p).catch(()=>{}); for(const id of ids){ await Store.deleteRecord(id); delete A.rec[id]; } ui.hSes=null; toast("Sesi dihapus."); render(); }catch(err){ toast(errMsg(err)); } return; }
  if(t.dataset.hgo){ const S=hCur(); if(!S) return; const [item,rep,cid]=t.dataset.hgo.split("~"); const cur=hRes(S.ref,item,rep,cid);
    if(t.dataset.to==="reset"&&!confirm("Ulangi stopwatch? Waktu yang tercatat akan dikosongkan.")) return;
    await hSaveRes(S.ref,t.dataset.hgo,hPhase(cur,t.dataset.to)); return; }
  if(t.dataset.hall){ const S=hCur(); if(!S) return; const [item,rep]=t.dataset.hall.split("~");
    for(const c of A.comps){ const cur=hRes(S.ref,item,rep,c.id); if((cur.phase||"idle")==="idle") await hSaveRes(S.ref,`${item}~${rep}~${c.id}`,hPhase(cur,t.dataset.to)); } return; }
  if(t.dataset.hview){ ui.hView=t.dataset.hview; render(); return; }
  if(t.dataset.hfdel){ const [tg,fid]=t.dataset.hfdel.split("|"); await hDelFile(tg,fid); return; }
  if(t.id==="hXls"){ exportHarian(); return; }
  if(t.id==="hPlanXls"){ exportPlan(); return; }
});
document.addEventListener("change", async e=>{
  const t=e.target;
  if(t.id==="hDay"){ if(t.value){ ui.hDay=t.value; ui.hSes=null; render(); } return; }
  if(t.id==="hxFrom"||t.id==="hxTo"){ ui[t.id]=t.value; return; }
  if(t.dataset.keepfile&&/^h[sr]:/.test(t.dataset.keepfile)){ const fs=[...t.files]; t.value=""; await hUpload(t.dataset.keepfile,fs); return; }
  if(t.dataset.keepfile==="hxl"){ const f=t.files[0]; t.value=""; if(f) await importPlan(f); return; }
  if(t.dataset.hres){ const S=hCur(); if(!S) return; const f=t.dataset.f; let v=t.value.trim();
    if(f==="baca"||f==="kerja"){ if(v===""){ v=null; } else { v=parseT(v); if(v===null){ toast("Format waktu: 3:25 atau 3,5 (menit)."); return; } } }
    else if(f!=="note"){ v=v===""?"":String(Math.max(0,hNum(v)??0)); }
    const patch={[f]:v}; if((f==="baca"||f==="kerja")&&v!==null){ const cur=hRes(S.ref,...t.dataset.hres.split("~")); if(cur.phase==="baca"||cur.phase==="kerja"){} else patch.phase=cur.phase||"idle"; }
    await hSaveRes(S.ref,t.dataset.hres,patch); return; }
});
document.addEventListener("submit", async e=>{
  if(e.target.id!=="hForm") return; e.preventDefault(); e.stopImmediatePropagation();
  const g=id=>document.getElementById(id).value.trim();
  const old=ui.hForm!=="new"?hSessions().find(s=>s.ref===ui.hForm):null;
  const names=g("hfItems").split("\n").map(x=>x.trim()).filter(Boolean);
  if(!g("hfTitle")||!names.length){ toast("Isi judul dan minimal satu soal."); return; }
  const items=hMergeItems(old?.items,names); const extra=hMergeX(old?.extra,hParseX(g("hfX")));
  const m=[...document.querySelectorAll("[data-hm]")].filter(x=>x.checked).map(x=>x.dataset.hm);
  const data={ ...(old||{}), date:g("hfDate")||todayId(), title:g("hfTitle"), jenis:g("hfJenis"), items, reps:Math.min(6,Math.max(1,+g("hfReps")||1)), m, tBaca:g("hfTB"), tKerja:g("hfTK"), tDev:g("hfTD"), extra, note:g("hfNote") };
  delete data.id; delete data.ref;
  if(!old){ data.by=A.profile?.name||A.user?.email||""; data.at=Date.now(); }
  const ref=old?old.ref:"h"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  if(await saveRec("harian",ref,null,data)){ ui.hForm=null; ui.hDay=data.date; ui.hSes=ref; ui.hItem=null; ui.hRep=1; toast(old?"Sesi diperbarui.":"Sesi dibuat."); render(); }
}, true);

setInterval(()=>{ document.querySelectorAll("[data-since]").forEach(el=>{ const s=+el.dataset.since; if(s) el.textContent=mmss((Date.now()-s)/1000); });
  document.querySelectorAll("[data-runlim]").forEach(el=>{ const lim=+el.dataset.runlim, s=+el.dataset.runsince; if(lim&&s){ const over=(Date.now()-s)/1000>lim; el.classList.toggle("bad",over); el.classList.toggle("warn",!over); } }); }, 1000);

async function exportHarian(){
  const from=document.getElementById("hxFrom").value, to=document.getElementById("hxTo").value;
  if(!from||!to||from>to){ toast("Periksa rentang tanggal."); return; }
  try{ await loadXLSX(); }catch(e){ toast(e.message); return; }
  const ses=hSessions().filter(s=>s.date>=from&&s.date<=to);
  if(!ses.length){ toast("Tidak ada sesi pada rentang ini."); return; }
  const n=v=>{ const x=hNum(v); return x===null?"":x; };
  const H=[["Tanggal","Hari","Jenis penilaian","Sesi","Soal","Percobaan","Peserta","Waktu baca (m:ss)","Baca (detik)","Waktu kerja (m:ss)","Kerja (detik)","Kesalahan","Deviasi maks (mm)","Skor","Target baca (mnt)","Target kerja (mnt)","Kriteria tambahan","Catatan","Dicatat oleh"]];
  const Rk=[["Tanggal","Jenis penilaian","Sesi","Percobaan","Peserta","Rata-rata baca (m:ss)","Rata-rata kerja (m:ss)","Total kesalahan","Rata-rata deviasi (mm)","Rata-rata skor","Soal terisi"]];
  ses.forEach(S=>{ (S.items||[]).forEach(i=>{ for(let x=1;x<=(+S.reps||1);x++) A.comps.forEach(c=>{ const r=hRes(S.ref,i.id,x,c.id); if(!Object.keys(r).length) return;
      H.push([S.date,HARI[dparts(S.date).getDay()],hJenis(S),S.title,i.name,x,c.name,mmss(r.baca),n(r.baca),mmss(r.kerja),n(r.kerja),n(r.salah),n(r.dev),n(r.skor),n(S.tBaca),n(S.tKerja),(S.extra||[]).filter(x=>r["x_"+x.id]!==undefined&&r["x_"+x.id]!=="").map(x=>x.name+": "+r["x_"+x.id]+(x.max?"/"+x.max:"")).join("; "),r.note||"",r.by||""]); }); });
    for(let x=1;x<=(+S.reps||1);x++) A.comps.forEach(c=>{ const rs=(S.items||[]).map(i=>hRes(S.ref,i.id,x,c.id)).filter(r=>Object.keys(r).length); if(!rs.length) return;
      const ab=hAvg(rs.map(r=>hNum(r.baca))), ak=hAvg(rs.map(r=>hNum(r.kerja))), ad=hAvg(rs.map(r=>hNum(r.dev))), as=hAvg(rs.map(r=>hNum(r.skor)));
      Rk.push([S.date,hJenis(S),S.title,x,c.name,ab===null?"":mmss(ab),ak===null?"":mmss(ak),rs.reduce((a,r)=>a+(hNum(r.salah)||0),0),ad===null?"":Math.round(ad*10)/10,as===null?"":Math.round(as),rs.length]); }); });
  const wb=XLSX.utils.book_new();
  const w1=XLSX.utils.aoa_to_sheet(H); w1["!cols"]=[{wch:11},{wch:8},{wch:22},{wch:26},{wch:16},{wch:9},{wch:16},{wch:10},{wch:9},{wch:10},{wch:9},{wch:9},{wch:10},{wch:7},{wch:9},{wch:9},{wch:30},{wch:40},{wch:16}]; XLSX.utils.book_append_sheet(wb,w1,"Hasil");
  const w2=XLSX.utils.aoa_to_sheet(Rk); w2["!cols"]=[{wch:11},{wch:22},{wch:26},{wch:9},{wch:16},{wch:12},{wch:12},{wch:10},{wch:12},{wch:10},{wch:9}]; XLSX.utils.book_append_sheet(wb,w2,"Rekap");
  const J=[["Jenis penilaian","Peserta","Jumlah sesi","Rata-rata baca (m:ss)","Rata-rata kerja (m:ss)","Kesalahan per soal","Deviasi rata-rata (mm)","Kriteria tambahan (%)","Kerja sesi pertama (m:ss)","Kerja sesi terakhir (m:ss)","Perubahan kerja (%)"]];
  const gs={}; ses.forEach(S=>(gs[hJenis(S)]=gs[hJenis(S)]||[]).push(S));
  Object.keys(gs).forEach(j=>A.comps.forEach(c=>{ const st=gs[j].map(S=>hStats(S,c.id)).filter(x=>x.n); if(!st.length) return; const av=k=>hAvg(st.map(x=>x[k])); const r1=v=>v===null?"":Math.round(v*10)/10; const a=st[0].kerja, b=st[st.length-1].kerja;
    J.push([j,c.name,st.length,av("baca")===null?"":mmss(av("baca")),av("kerja")===null?"":mmss(av("kerja")),r1(av("salah")),r1(av("dev")),av("pct")===null?"":Math.round(av("pct")),a===null?"":mmss(a),b===null?"":mmss(b),a&&b&&st.length>1?Math.round((b-a)/a*100):""]); }));
  const w3=XLSX.utils.aoa_to_sheet(J); w3["!cols"]=[{wch:28},{wch:16},{wch:8},{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:12},{wch:12},{wch:10}]; XLSX.utils.book_append_sheet(wb,w3,"Per jenis");
  XLSX.writeFile(wb,`Penilaian_Harian_${from}_sd_${to}.xlsx`);
}

/* ---------- Rencana harian via Excel ---------- */
const PLAN_H=["Tanggal","Hari","Jenis penilaian","Judul sesi","Soal (pisahkan dengan ;)","Percobaan","Waktu baca","Waktu kerja","Kesalahan","Deviasi","Skor","Kriteria tambahan (pisahkan ;  contoh: Kerapian /5)","Target baca (mnt)","Target kerja (mnt)","Target deviasi (mm)","Tujuan / instruksi","Jadwal hari itu (info, tidak dibaca)","Kode (jangan diubah)"];
const YT=b=>b?"Y":"T";
async function exportPlan(){
  try{ await loadXLSX(); }catch(e){ toast(e.message); return; }
  const ses=hSessions(); const rows=[PLAN_H];
  const days=[...new Set(sched().filter(s=>s.kind==="day"&&s.date).map(s=>s.date).concat(ses.map(s=>s.date)))].sort();
  const info=d=>sched().filter(s=>s.date&&d>=s.date&&d<=(s.end||s.date)).map(s=>(s.label?s.label+": ":"")+s.title).join(" | ");
  days.forEach(d=>{ const l=ses.filter(s=>s.date===d); const hari=HARI[dparts(d).getDay()];
    if(!l.length) rows.push([d,hari,"","","","","","","","","","","","","","",info(d),""]);
    l.forEach(S=>{ const m=S.m||[]; rows.push([d,hari,S.jenis||"",S.title,(S.items||[]).map(i=>i.name).join("; "),+S.reps||1,YT(m.includes("baca")),YT(m.includes("kerja")),YT(m.includes("salah")),YT(m.includes("dev")),YT(m.includes("skor")),hXText(S.extra).replace(/\n/g,"; "),S.tBaca||"",S.tKerja||"",S.tDev||"",S.note||"",info(d),S.ref]); }); });
  const P=[["PETUNJUK RENCANA PENILAIAN HARIAN"],[""],["0. Jenis penilaian dipakai untuk rekap perkembangan. Pilihan: "+H_JENIS.join(", ")+". Boleh menulis jenis lain."],["1. Satu baris = satu sesi penilaian harian. Boleh lebih dari satu baris pada tanggal yang sama."],["2. Tanggal ditulis 2026-11-19 (tahun-bulan-tanggal) atau 19/11/2026."],["3. Soal dipisah titik koma, contoh: Sketsa 1; Sketsa 2; Sketsa 3"],["4. Percobaan = berapa kali soal diulang (1–6)."],["5. Kolom Waktu baca, Waktu kerja, Kesalahan, Deviasi, Skor diisi Y (diukur) atau T (tidak)."],["6. Kriteria tambahan: nama kriteria, garis miring, nilai maksimum. Pisah dengan titik koma. Contoh: Simbol benar /10; Kerapian /5"],["7. Target boleh dikosongkan. Target dipakai untuk tanda ✓ / lewat target."],["8. Baris tanpa Judul sesi tidak dibaca (biarkan kosong untuk hari tanpa penilaian harian)."],["9. Kolom Kode diisi otomatis oleh aplikasi. Jangan diubah. Untuk menyalin sesi ke hari lain, salin barisnya lalu KOSONGKAN Kode."],["10. Gambar/file soal (foto atau PDF) diunggah langsung di aplikasi pada sesi dan soal masing-masing."],["11. Menghapus baris di Excel TIDAK menghapus sesi di aplikasi. Hapus sesi lewat tombol Hapus di menu Penilaian Harian."],[""],["Contoh pengisian:"],PLAN_H.slice(0,16),["2026-11-19","Kamis","Membaca gambar","Drawing & membaca gambar","Sketsa 1; Sketsa 2; Sketsa 3",2,"Y","Y","Y","Y","T","Simbol & notasi benar /10; Kerapian gambar /5",3,20,1,"Baca gambar sampai paham, lalu gambar ulang. Diulang untuk melihat peningkatan."]];
  const wb=XLSX.utils.book_new();
  const w=XLSX.utils.aoa_to_sheet(rows); w["!cols"]=[{wch:11},{wch:8},{wch:24},{wch:28},{wch:30},{wch:9},{wch:8},{wch:8},{wch:8},{wch:8},{wch:6},{wch:34},{wch:9},{wch:9},{wch:9},{wch:40},{wch:50},{wch:16}]; w["!freeze"]={xSplit:3,ySplit:1}; w["!autofilter"]={ref:"A1:R"+rows.length};
  XLSX.utils.book_append_sheet(wb,w,"Rencana");
  const w2=XLSX.utils.aoa_to_sheet(P); w2["!cols"]=[{wch:100}]; XLSX.utils.book_append_sheet(wb,w2,"Petunjuk");
  XLSX.writeFile(wb,`Rencana_Penilaian_Harian_${A.season.name||"TIS"}.xlsx`.replace(/[^\w.\-]+/g,"_"));
}
function hDate(v){
  if(v===null||v===undefined||v==="") return "";
  if(typeof v==="number"){ const d=new Date(Math.round((v-25569)*864e5)); return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0"); }
  if(v instanceof Date) return v.getFullYear()+"-"+String(v.getMonth()+1).padStart(2,"0")+"-"+String(v.getDate()).padStart(2,"0");
  v=String(v).trim(); let m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
  m=v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if(m) return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
  return null;
}
async function importPlan(file){
  try{ await loadXLSX(); }catch(e){ toast(e.message); return; }
  let rows; try{ const wb=XLSX.read(await file.arrayBuffer(),{type:"array"}); const ws=wb.Sheets["Rencana"]||wb.Sheets[wb.SheetNames[0]]; rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""}); }catch(e){ toast("Berkas tidak bisa dibaca: "+e.message); return; }
  const hi=rows.findIndex(r=>String(r[0]).trim().toLowerCase()==="tanggal"&&r.some(x=>String(x).toLowerCase().startsWith("judul")));
  if(hi<0){ toast("Format tidak dikenali. Pakai berkas dari tombol Unduh rencana Excel."); return; }
  const yes=v=>/^(y|ya|yes|v|✓|1|x)$/i.test(String(v).trim());
  const ses=hSessions(); const plan=[], bad=[];
  const H=rows[hi].map(x=>String(x).trim().toLowerCase()); const col=pre=>H.findIndex(x=>x.startsWith(pre));
  const C={ date:0, jenis:col("jenis"), title:col("judul"), soal:col("soal"), reps:col("percobaan"), baca:col("waktu baca"), kerja:col("waktu kerja"), salah:col("kesalahan"), dev:col("deviasi"), skor:col("skor"), x:col("kriteria"), tb:col("target baca"), tk:col("target kerja"), td:col("target deviasi"), note:col("tujuan"), code:col("kode") };
  const v=(r,k)=>C[k]<0?"":r[C[k]];
  rows.slice(hi+1).forEach((r,i)=>{ const title=String(v(r,"title")||"").trim(); if(!title) return; const date=hDate(r[0]);
    if(!date){ bad.push(hi+i+2); return; }
    const names=String(v(r,"soal")||"").split(/;|\n/).map(x=>x.trim()).filter(Boolean); if(!names.length) names.push("Soal 1");
    const code=String(v(r,"code")||"").trim(); const old=code?ses.find(s=>s.ref===code):null;
    const m=["baca","kerja","salah","dev","skor"].filter(k=>yes(v(r,k)));
    const t=v=>v===""||v===null||v===undefined?"":String(v).replace(",",".");
    const data={ ...(old||{}), date, title, jenis:String(v(r,"jenis")||"").trim(), items:hMergeItems(old?.items,names), reps:Math.min(6,Math.max(1,parseInt(v(r,"reps"))||1)), m, extra:hMergeX(old?.extra,hParseX(v(r,"x"))), tBaca:t(v(r,"tb")), tKerja:t(v(r,"tk")), tDev:t(v(r,"td")), note:String(v(r,"note")||"").trim() };
    delete data.id; delete data.ref; if(!old){ data.by=A.profile?.name||A.user?.email||""; data.at=Date.now()+i; }
    plan.push({ ref:old?old.ref:(code&&/^h[\w]+$/.test(code)?code:"h"+Date.now().toString(36)+i+Math.random().toString(36).slice(2,4)), data, isNew:!old });
  });
  if(!plan.length){ toast(bad.length?`Tanggal tidak terbaca di baris ${bad.join(", ")}.`:"Tidak ada baris berisi Judul sesi."); return; }
  const nNew=plan.filter(p=>p.isNew).length;
  if(!confirm(`Impor rencana: ${nNew} sesi baru, ${plan.length-nNew} sesi diperbarui.${bad.length?`\nBaris ${bad.join(", ")} dilewati (tanggal tidak terbaca).`:""}\nLanjutkan?`)) return;
  if(!canWrite()){ toast("Akun Anda hanya bisa melihat."); return; }
  const recs=plan.map(p=>({ id:recId("harian",p.ref,null), season_id:A.season.id, kind:"harian", ref:p.ref, competitor_id:null, data:p.data }));
  try{ await Store.upsertRecords(recs); recs.forEach(r=>A.rec[r.id]=r); toast(`Rencana diimpor: ${nNew} baru, ${plan.length-nNew} diperbarui.`); render(); }
  catch(e){ toast("Gagal impor: "+errMsg(e)); }
}
