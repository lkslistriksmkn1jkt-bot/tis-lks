/* =====================================================================
   Tampilan (views)
   ===================================================================== */
"use strict";
const V = {};
const typBadge = s => `<span class="typ ${s.t==="J"?"J":"M"}">${s.t==="J"?"J":"M"}</span>`;
const badge = (c, sm) => `<span class="badge ${sm?"badge-sm":""}" style="background:${compColor(c)}">${esc(initials(c.name))}</span>`;
const compSeg = (attr, cur) => `<div class="seg" style="flex-wrap:wrap">${A.comps.map(c=>`<button type="button" ${attr}="${c.id}" aria-pressed="${c.id===cur}">${esc(c.name)}</button>`).join("")}</div>`;
const noComps = () => `<div class="empty">Belum ada peserta di musim ini. ${isAdmin()?'Tambahkan di menu <a class="link" href="#peserta">Peserta</a>.':"Minta admin menambahkan peserta."}</div>`;

/* ---------- Login ---------- */
function loginView(err){
  return `<div class="login-wrap"><form class="login" id="loginForm">
    <div class="eyebrow" style="color:var(--muted)">LKS SMK · <b style="color:var(--warn)">Electrical Installations</b></div>
    <h1>Training Information System</h1>
    <p class="muted" style="font-size:14px">Masuk dengan akun yang dibuat admin.</p>
    <label class="f">E-mail<input type="email" id="lgEmail" autocomplete="username" required></label>
    <label class="f">Kata sandi<input type="password" id="lgPass" autocomplete="current-password" required></label>
    ${err?`<p class="err">${esc(err)}</p>`:""}
    <button class="btn primary" type="submit" id="lgBtn">Masuk</button>
    <p class="note">Lupa kata sandi? Minta admin mengatur ulang dari dashboard Supabase.</p>
  </form></div>`;
}

/* ---------- Kerangka ---------- */
const NAV = [["beranda","Beranda"],["jadwal","Jadwal"],["scheme","Marking Scheme"],["penilaian","Assessment",()=>canWrite()],["harian","Penilaian Harian"],["hasil","Results"],["gate","Gate Test"],["laporan","Reports"],["jurnal","Jurnal"],["log","Log Harian"],["istilah","Istilah"],["peserta","Peserta"],["pengaturan","Pengaturan",()=>isAdmin()],["profil","Profil"]];
function shell(inner, r){
  const roleName = { admin:"Admin", juri:"Juri", viewer:"Pengamat" }[role()];
  const seasonOpts = A.seasons.map(s=>`<option value="${s.id}" ${s.id===A.season?.id?"selected":""}>${esc(s.name)}${s.active?" (aktif)":""}</option>`).join("");
  return `${DEMO?'<div class="demo">MODE DEMO · data hanya tersimpan di browser ini. Isi config.js untuk memakai database bersama.</div>':""}
  <header class="band"><div class="wrap">
    <div class="hdr-top"><div class="eyebrow"><span>LKS SMK · Bidang Lomba</span><b>Electrical Installations</b>${CFG.SCHOOL?`<span>${esc(CFG.SCHOOL)}</span>`:""}</div>
      <div class="userbox"><b>${esc(A.profile?.name||A.user?.email||"")}</b><span>(${roleName})</span>${DEMO?"":'<a href="#" id="signOut">Keluar</a>'}</div></div>
    <h1>Training Information System</h1>
    <div class="row" style="gap:8px"><label class="sub" for="seasonSel">Musim</label><select id="seasonSel" style="width:auto;max-width:100%;background:transparent;color:var(--band-ink);border-color:var(--band-muted)">${seasonOpts}</select></div>
    <div class="navw"><button type="button" class="nav-arr l" data-navs="-1" aria-label="Menu sebelumnya" hidden>‹</button><nav class="tabs" id="tabs" aria-label="Menu">${NAV.filter(n=>!n[2]||n[2]()).map(n=>`<a href="#${n[0]}" ${n[0]===r?'aria-current="page"':""}>${n[1]}</a>`).join("")}</nav><button type="button" class="nav-arr r" data-navs="1" aria-label="Menu berikutnya" hidden>›</button></div>
  </div></header>
  <main><div class="wrap" id="view">${inner}</div></main>
  <footer class="foot"><div class="wrap"><span class="src ${DEMO?"local":A.online?"live":""}">${DEMO?"MODE DEMO · DATA LOKAL":A.online?"SUPABASE LIVE":"OFFLINE · MENUNGGU KONEKSI"}</span><span>TIS LKS Instalasi Listrik · <span class="num">${VERSION}</span></span></div></footer>`;
}

/* ---------- Beranda ---------- */
function newQuiz(){ const n=(A.cfg.angka||[]).length; const idx=[...Array(n).keys()]; ui.quiz=[]; while(ui.quiz.length<Math.min(3,n)){ ui.quiz.push(idx.splice(Math.floor(Math.random()*idx.length),1)[0]); } ui.quizShow=false; }
V.beranda = () => {
  const t=todayId(); const cur=currentItems(); const day=cur.find(s=>s.kind==="day"); const we=cur.find(s=>s.kind==="weekend"); const wk=cur.find(s=>s.kind==="week");
  const isWE=[0,6].includes(new Date().getDay());
  let today;
  if(we||(isWE&&wk)){ const it=we||wk; const tasks=we?we.title.split("\n"):[(wk.note||"").replace(/^Tugas akhir pekan:\s*/,"")];
    today=`<div class="spread"><div><div class="label">${esc(it.tab)} · tugas mandiri akhir pekan</div><h3>${esc(it.group)}</h3></div><span class="chip acc">±2–3 jam</span></div><ol class="tasks">${tasks.filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join("")}</ol>${we?`<p class="note">${esc(we.target)}</p>`:""}`; }
  else if(day){ const i=sched().filter(s=>s.tab===day.tab&&s.kind==="day").indexOf(day)+1, n=sched().filter(s=>s.tab===day.tab&&s.kind==="day").length;
    today=`<div class="spread"><div><div class="label">${esc(day.tab)} · hari ke-${i} dari ${n}</div><h3>${dlabel(day.date,true)} · ${esc(day.group)}</h3></div><span class="chip ${day.to?"warn":"acc"}">${esc(day.label)}</span></div>
    <div class="grid g2"><div><div class="label">Materi & drill</div><p>${esc(day.title)}</p></div><div><div class="label">Target</div><p>${esc(day.target)}</p></div></div><div class="row"><a class="btn sm" href="#jadwal">Buka jadwal</a>${A.cfg.jobsheetUrl?`<a class="btn sm" href="${esc(A.cfg.jobsheetUrl)}" target="_blank" rel="noopener">Buka jobsheet</a>`:""}</div>`; }
  else if(wk){ today=`<div class="spread"><div><div class="label">${esc(wk.tab)} · ${esc(wk.label)} · ${wk.hours||"?"} jam</div><h3>${rangeLabel(wk.date,wk.end)} · ${esc(wk.group)}</h3></div>${wk.to?`<span class="chip warn">${esc(evById(wk.to)?.name||wk.to)}</span>`:""}</div>
    <div class="grid g2"><div><div class="label">Fokus latihan</div><p>${esc(wk.title)}</p></div><div><div class="label">Yang dinilai</div><p>${esc(wk.target)}</p></div></div>`; }
  else { const nx=sched().filter(s=>s.date>t).sort((a,b)=>a.date.localeCompare(b.date))[0];
    today = nx ? `<div class="label">Tidak ada latihan hari ini</div><h3>Berikutnya: ${dlabel(nx.date,true)} · ${esc(nx.group)}</h3><p class="muted">${esc(nx.title.split("\n")[0])}</p>` : `<div class="label">Jadwal musim ini sudah selesai</div><h3>${esc(A.season.name)}</h3>`; }
  const days=sched().filter(s=>s.kind==="day"||s.kind==="week");
  const comps = A.comps.length ? A.comps.map(c=>{ const done=days.filter(s=>R("done",s.id,c.id)?.done).length; const gp=gatesPassed(c.id);
    const last=[...events()].reverse().map(e=>({e,c:calc(e.id,c.id)})).find(x=>x.c);
    return `<div class="panel"><div class="comp">${badge(c)}<div><h3>${esc(c.name)}</h3><p class="muted" style="font-size:13px">Kelas ${esc(c.kelas)}${c.peran?" · "+esc(c.peran):""}${c.sekolah?" · "+esc(c.sekolah):""}</p></div></div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div><div class="spread"><span class="label">Jadwal tuntas</span><span class="num">${done}/${days.length}</span></div><div class="bar" style="margin-top:6px"><i style="width:${days.length?done/days.length*100:0}%;background:${compColor(c)}"></i></div></div>
    <div><div class="spread"><span class="label">Gate lulus</span><span class="num">${gp}/${gates().length}</span></div><div class="bar" style="margin-top:6px"><i style="width:${gates().length?gp/gates().length*100:0}%;background:${compColor(c)}"></i></div></div></div>
    <div class="spread"><div><div class="label">Skor TO terakhir</div><div class="big num">${last?fmt(last.c.score,1):"—"}</div></div><div style="text-align:right"><div class="label">${last?esc(last.e.name):"Belum ada TO"}</div><p class="note">${last?esc(last.e.focus||""):""}</p></div></div></div>`; }).join("") : noComps();
  const nx=events().filter(e=>e.date>=t).sort((a,b)=>a.date.localeCompare(b.date))[0];
  if(!ui.quiz||ui.quiz.some(i=>i>=(A.cfg.angka||[]).length)) newQuiz();
  const qz=ui.quiz.map((i,k)=>`<div class="qrow"><span class="num muted">${k+1}</span><div><p>${esc(A.cfg.angka[i][0])}</p>${ui.quizShow?`<p class="ans">${esc(A.cfg.angka[i][1])}</p>`:""}</div></div>`).join("");
  return `<section class="panel">${today}</section>
  <section class="grid g2">${comps}</section>
  <section class="grid g2">
    <div class="panel"><div class="spread"><div class="label">Angka teknis · 1 menit</div><div class="row"><button class="btn sm" id="qShow">${ui.quizShow?"Sembunyikan":"Lihat jawaban"}</button><button class="btn sm" id="qNew">Acak lagi</button></div></div>${qz||'<p class="muted">Belum ada daftar angka teknis.</p>'}</div>
    <div class="panel"><div class="label">TO berikutnya</div>${nx?`<h3>${esc(nx.name)} · ${esc(nx.label||dlabel(nx.date,true))}</h3><p class="muted">${esc(nx.focus||"")} · ${fmt(nx.limit/60,0)} jam · kriteria ${(nx.scope||[]).join(", ")}</p>${canWrite()?`<div><a class="btn sm primary" href="#penilaian" data-ev="${nx.id}">Buka lembar penilaian</a></div>`:""}`:'<p class="muted">Tidak ada TO terjadwal berikutnya.</p>'}</div>
  </section>
  <section style="display:flex;flex-direction:column;gap:10px"><h2>Jadwal TO</h2><div class="tbl-wrap"><table><thead><tr><th>TO</th><th>Tanggal</th><th>Durasi</th><th>Kriteria</th>${A.comps.map(c=>`<th class="n">${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${events().map(e=>`<tr class="${nx&&nx.id===e.id?"today":""}"><td><b>${esc(e.name)}</b>${e.fase?`<div class="note">Fase ${esc(e.fase)}</div>`:""}</td><td style="white-space:nowrap">${esc(e.label||dlabel(e.date))}</td><td class="num">${fmt(e.limit/60,0)} jam</td><td>${(e.scope||[]).length===scheme().length?"Semua":(e.scope||[]).join(" · ")}</td>${A.comps.map(c=>{const r=calc(e.id,c.id);return `<td class="n">${r?`<b>${fmt(r.score,1)}</b>`:"—"}</td>`;}).join("")}</tr>`).join("")}</tbody></table></div></section>`;
};

/* ---------- Jadwal ---------- */
V.jadwal = () => {
  const tabs=schedTabs(); if(!tabs.length) return `<h2>Jadwal</h2><div class="empty">Belum ada jadwal. ${isAdmin()?'Isi di Pengaturan › Jadwal.':""}</div>`;
  if(!ui.jtab||!tabs.includes(ui.jtab)){ const c=currentItems()[0]; ui.jtab = c ? c.tab : tabs[0]; }
  const t=todayId(); const items=sched().filter(s=>(s.tab||"Jadwal")===ui.jtab); let lastG=null;
  const rows=items.map(s=>{ let h=""; if(s.group!==lastG){ lastG=s.group; h=`<tr class="grp"><td colspan="5">${esc(s.group)}${s.kind==="week"&&s.note?`<div class="wetask">${esc(s.note)}</div>`:""}</td></tr>`; if(s.kind==="week"&&s.note){ /* tampilkan note sekali per grup */ } }
    const now = s.date && t>=s.date && t<=(s.end||s.date);
    const ticks=A.comps.map(c=>{ const d=R("done",s.id,c.id)||{}; return `<label class="tick"><input type="checkbox" data-done="${s.id}" data-cid="${c.id}" ${d.done?"checked":""} ${canWrite()?"":"disabled"}>${esc(c.name.split(" ")[0])} ${esc(c.kelas||"")}</label>`; }).join("");
    const notes=A.comps.map(c=>{ const d=R("done",s.id,c.id)||{}; return d.note?`<div class="note">${esc(c.name.split(" ")[0])}: ${esc(d.note)}</div>`:""; }).join("");
    const title = s.kind==="weekend" ? `<ol class="tasks">${s.title.split("\n").filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join("")}</ol>` : esc(s.title);
    return h+`<tr class="${s.kind==="weekend"?"weekend":""} ${now?"today":""}"><td class="dayname" data-l="Tanggal">${s.kind==="day"?dlabel(s.date):rangeLabel(s.date,s.end)}${now?'<div><span class="chip acc">sekarang</span></div>':""}</td><td data-l="Kode"><span class="chip ${s.to?"warn":s.kind==="weekend"?"acc":""}">${esc(s.label)}</span>${s.hours&&s.kind==="week"?`<div class="note">${s.hours} jam</div>`:""}</td><td data-l="${s.kind==="week"?"Fokus latihan":s.kind==="weekend"?"Tugas mandiri":"Materi & drill"}">${title}</td><td data-l="Target">${esc(s.target)}</td><td data-l="Tuntas"><div style="display:flex;flex-direction:column;gap:6px">${ticks}${canWrite()?`<button type="button" class="btn sm" data-note-item="${s.id}">Catatan</button>`:""}${notes}</div></td></tr>`; }).join("");
  return `<div class="spread"><div><h2>Jadwal latihan</h2><p class="lead">Centang tuntas bila target tercapai. Bila belum, ulangi sebelum pindah materi.</p></div><div class="subnav">${tabs.map(x=>`<button type="button" data-jtab="${esc(x)}" aria-pressed="${x===ui.jtab}">${esc(x)}</button>`).join("")}</div></div>
  <div class="tbl-wrap"><table style="min-width:880px"><thead><tr><th>Tanggal</th><th>Kode</th><th>Materi / fokus</th><th>Target / dinilai</th><th>Tuntas</th></tr></thead><tbody>${rows}</tbody></table></div>`;
};

/* ---------- Marking scheme ---------- */
V.scheme = () => {
  const jt=c=>c.subs.filter(s=>s.t==="J").reduce((a,s)=>a+(+s.max||0),0);
  const tJ=scheme().reduce((a,c)=>a+jt(c),0), tT=schemeTotal();
  return `<div><h2>Marking scheme</h2><p class="lead">Judgement ${fmt(tJ,0)} poin · Measurement ${fmt(tT-tJ,0)} poin · total ${fmt(tT,0)}. TO yang hanya mencakup sebagian kriteria dikonversi ke skala 100.</p></div>
  <div class="tbl-wrap"><table><thead><tr><th>Kriteria</th><th class="n">J</th><th class="n">M</th><th class="n">Total</th></tr></thead><tbody>${scheme().map(c=>`<tr><td>${esc(c.id)} · ${esc(c.name)}</td><td class="n">${fmt(jt(c),0)}</td><td class="n">${fmt(critMax(c.id)-jt(c),0)}</td><td class="n"><b>${fmt(critMax(c.id),0)}</b></td></tr>`).join("")}<tr><td><b>Total</b></td><td class="n"><b>${fmt(tJ,0)}</b></td><td class="n"><b>${fmt(tT-tJ,0)}</b></td><td class="n"><b>${fmt(tT,0)}</b></td></tr></tbody></table></div>
  <div class="grid g2"><div class="panel"><div class="label">Skala judgement</div>${(A.cfg.jlabel||[]).map(l=>`<p class="num" style="font-size:13px">${esc(l)}</p>`).join("")}<p class="note">Nilai = rata-rata juri ÷ 3 × poin maksimum. Selisih antar juri maksimal 1.</p></div>
  <div class="panel"><div class="label">Aturan latihan</div><ul class="rules"><li>Bahan tambahan karena salah sendiri: −1 poin per item</li><li>Pelanggaran K3 berat: nilai 0</li><li>Lewat batas waktu: dihentikan, dinilai apa adanya</li><li>Fungsi dinilai dari attempt pertama</li></ul></div></div>
  ${scheme().map(c=>`<div class="crit"><div class="crit-h"><h3>${esc(c.id)} · ${esc(c.name)}</h3><span class="num">${fmt(critMax(c.id),0)} poin</span></div><div class="tbl-wrap" style="border:none;border-radius:0"><table><thead><tr><th>Kode</th><th>Aspek</th><th>Jenis</th><th class="n">Maks</th></tr></thead><tbody>${c.subs.map(s=>`<tr><td class="num">${esc(s.id)}</td><td>${esc(s.d)}</td><td>${s.t==="J"?"Judgement 0–3":s.t==="C"?"Measurement, hitungan "+s.n:"Measurement Y/N"}</td><td class="n">${fmt(s.max,0)}</td></tr>`).join("")}</tbody></table></div></div>`).join("")}`;
};

/* ---------- Assessment ---------- */
V.penilaian = () => {
  if(!A.comps.length) return noComps(); if(!events().length) return `<div class="empty">Belum ada TO. ${isAdmin()?"Tambahkan di Pengaturan › TO.":""}</div>`;
  if(!evById(ui.ev)) ui.ev = (events().find(e=>e.date>=todayId())||events()[0]).id; if(!compById(ui.cid)) ui.cid = A.comps[0].id;
  const ev=evById(ui.ev), cid=ui.cid, rec=R("mark",ev.id,cid)||{marks:{}}; const locked=!!R("lock",ev.id)?.locked; const dis=(locked||!canWrite())?"disabled":"";
  const c=calc(ev.id,cid), asp=scopeAsp(ev), filled=c?c.filled:0; const key=id=>ev.id+"/"+cid+"/"+id; const scope=(ev.scope||[]).map(String);
  const canPhoto=canWrite()&&(!locked||isAdmin());
  const crits=scheme().filter(cr=>scope.includes(String(cr.id))).map(cr=>{
    let lastSc=null; const subs=evSubs(ev,cr).map(s=>{ const v=rec.marks?.[s.id], pts=subPts(s,v), st=saveState[key(s.id)]; const sch=s.sc&&s.sc!==lastSc?`<div class="sc-h">${esc(s.sc)} · ${esc(s.scName||"")} <span class="muted">${fmt(evSubs(ev,cr).filter(x=>x.sc===s.sc).reduce((a,x)=>a+(+x.max||0),0))}</span></div>`:""; lastSc=s.sc;
      const sv = st==="saving"?'<span class="sv">…</span>':st==="err"?'<span class="sv bad">✗</span>':pts!==null?'<span class="sv good">✓</span>':"";
      let ctrl, hint;
      if(s.t==="M"){ hint="Y / N"; ctrl=`<input class="yn ${v===1?"y":v===0?"n":""}" type="text" maxlength="1" autocomplete="off" autocapitalize="characters" id="as-${s.id}" data-asp="${s.id}" data-kind="M" value="${v===1?"Y":v===0?"N":""}" aria-label="${esc(s.id)} Y atau N" ${dis}>`; }
      else if(s.t==="C"){ hint=`0–${s.n}`; ctrl=`<input class="nb" type="number" inputmode="numeric" min="0" max="${s.n}" id="as-${s.id}" data-asp="${s.id}" data-kind="C" value="${v??""}" aria-label="${esc(s.id)}" ${dis}>`; }
      else { hint="0–3 · selisih maks 1"; const a=Array.isArray(v)?v:[], bad=jBad[key(s.id)];
        ctrl=`<div class="jx">${[0,1,2].map(k=>`<input class="jb ${bad?"bad":""}" type="number" inputmode="numeric" min="0" max="3" id="as-${s.id}-${k}" data-asp="${s.id}" data-kind="J" data-k="${k}" value="${bad?(bad[k]??""):(a[k]??"")}" placeholder="J${k+1}" aria-label="${esc(s.id)} juri ${k+1}" ${dis}>`).join("")}<button type="button" class="q" data-desc="${s.id}" aria-label="Arti nilai">?</button></div>`; }
      return `${sch}<div class="asp">${typBadge(s)}<div class="asp-d"><span>${esc(s.d)}</span><span class="note">${esc(s.id)} · ${hint}</span>${ui.openDesc===s.id?`<div class="desc">${s.jd?[0,1,2,3].filter(k=>s.jd[k]).map(k=>`<div><b>${k}</b> ${esc(s.jd[k])}</div>`).join(""):(A.cfg.jlabel||[]).map(l=>`<div>${esc(l)}</div>`).join("")}</div>`:""}</div><div class="asp-c">${ctrl}</div><div class="asp-p num">${sv} ${pts!==null?fmt(pts):"—"}<span class="muted"> / ${fmt(s.max)}</span></div></div>`; }).join("");
    return `<div class="crit"><div class="crit-h"><h3>${esc(cr.id)} · ${esc(cr.name)}</h3><span class="num">${c?fmt(c.byCrit[cr.id]):fmt(0)} / ${fmt(evCritMax(ev,cr.id))}</span></div>${subs}${critExtras(ev,cid,String(cr.id),dis,canPhoto)}</div>`; }).join("");
  const maxScope = scope.reduce((a,i)=>a+evCritMax(ev,i),0);
  return `<div><h2>Assessment · Marking Form</h2><p class="lead">Pilih peserta lalu TO. Aspek M: ketik Y atau N lalu Enter. Aspek J: isi nilai 1–3 juri. Tersimpan otomatis.</p></div>
  <div class="panel"><div class="grid g3"><label class="f">Peserta<select id="cidSel">${A.comps.map(x=>`<option value="${x.id}" ${x.id===cid?"selected":""}>${esc(x.name)}</option>`).join("")}</select></label><label class="f">Try out<select id="evSel">${events().map(e=>`<option value="${e.id}" ${e.id===ev.id?"selected":""}>${esc(e.name)} · ${esc(e.label||dlabel(e.date))}</option>`).join("")}</select></label>
    <div><div class="label">Progress</div><div class="row" style="margin-top:6px"><span class="big num" style="font-size:30px">${filled} / ${asp.length}</span><span class="muted">aspek</span></div></div></div>
    ${ev.focus?`<p class="to-focus">${esc(ev.focus)}</p>`:""}<div class="row"><span class="chip">Batas ${fmt(ev.limit/60,0)} jam</span>${ui.upl?`<span class="chip warn">Mengunggah ${ui.upl} foto…</span>`:""}${locked?'<span class="chip bad">MARKS LOCKED</span>':'<span class="chip acc">MARKS OPEN</span>'}</div></div>
  <div style="display:flex;flex-direction:column;gap:14px">${crits||'<div class="empty">TO ini belum punya kriteria yang diujikan.</div>'}</div>
  <div class="crit"><div class="crit-h"><h3>Foto hasil kerja keseluruhan</h3><span class="num">${photosOf(ev.id,cid,"all").length} foto</span></div>${critExtras(ev,cid,"all",dis,canPhoto)}</div>
  <div class="crit"><div class="crit-h"><h3>Catatan TO & aturan</h3><span class="num ${c&&(c.k3||c.bahan)?"down":""}">${c&&c.k3?"Nilai 0":c&&c.bahan?"−"+c.bahan:"tanpa potongan"}</span></div>
    <div style="padding:14px;display:flex;flex-direction:column;gap:12px">
    <div class="grid g3"><label class="f">Waktu dipakai (menit)<input type="number" inputmode="numeric" min="0" id="x-minutes" data-extra="minutes" value="${rec.minutes??""}" ${dis}></label><label class="f">Time plan (menit)<input type="number" inputmode="numeric" min="0" id="x-plan" data-extra="plan" value="${rec.plan??""}" ${dis}></label><label class="f">Bahan tambahan (−1 poin/item)<input type="number" inputmode="numeric" min="0" id="x-bahan" data-extra="bahan" value="${rec.bahan??""}" ${dis}></label></div>
    <label class="tick"><input type="checkbox" id="x-k3" data-extra="k3" ${rec.k3?"checked":""} ${dis}>Pelanggaran K3 berat (nilai 0)</label>
    <label class="f">Catatan juri<textarea id="evNote" ${dis}>${esc(rec.note||"")}</textarea></label></div></div>
  <div class="total-bar"><div><div class="label" style="color:var(--band-muted)">${esc(cname(cid))} · ${esc(ev.name)}</div><div class="row"><span class="big num">${c?fmt(c.score,1):fmt(0,1)}</span><span style="color:var(--band-muted)">skala 100 · ${c?fmt(c.net):"0"} / ${fmt(maxScope,0)} poin · ${c&&c.complete?"COMPLETE":"PARTIAL"}</span></div></div>
  ${isAdmin()?`<div class="row"><button class="btn sm" id="lockBtn">${locked?"Buka kunci nilai":"Kunci nilai"}</button></div>`:""}</div>`;
};

/* ---------- Results ---------- */
function trendChart(cid){
  const evs=events(); const W=640,H=250,L=40,R_=20,T=24,B=40,n=evs.length; if(n<1) return "";
  const x=i=>n===1?(L+W-R_)/2:L+(W-L-R_)*(i/(n-1)), y=v=>T+(H-T-B)*(1-v/100); let g="";
  [0,25,50,75,100].forEach(v=>{ g+=`<line x1="${L}" x2="${W-R_}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">${v}</text>`; });
  const tgt=A.cfg.selection?.target; if(tgt) g+=`<line x1="${L}" x2="${W-R_}" y1="${y(tgt)}" y2="${y(tgt)}" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="${W-R_}" y="${y(tgt)-6}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">target ${tgt}</text>`;
  evs.forEach((e,i)=>{ g+=`<text x="${x(i)}" y="${H-B+22}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">${esc(e.name)}</text>`; });
  A.comps.forEach(c=>{ const on=c.id===cid, col=compColor(c); const pts=evs.map((e,i)=>{ const r=calc(e.id,c.id); return r?[x(i),y(r.score),r.score]:null; }).filter(Boolean);
    if(pts.length>1) g+=`<polyline fill="none" stroke="${col}" stroke-width="${on?3:1.5}" stroke-opacity="${on?1:.45}" points="${pts.map(p=>p[0]+","+p[1]).join(" ")}"/>`;
    pts.forEach((p,k)=>{ g+=`<circle cx="${p[0]}" cy="${p[1]}" r="${on?(k===pts.length-1?5:3.5):2.5}" fill="${col}" fill-opacity="${on?1:.5}" stroke="var(--surface)" stroke-width="1.5"/>`; if(on) g+=`<text x="${p[0]}" y="${p[1]-10}" text-anchor="middle" font-size="11" font-weight="600" fill="${col}" font-family="IBM Plex Mono,monospace">${fmt(p[2],1)}</text>`; }); });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tren skor TO" style="max-width:100%;display:block">${g}</svg>`;
}
V.hasil = () => {
  if(!A.comps.length) return noComps(); if(!compById(ui.rcid)) ui.rcid=A.comps[0].id; const cid=ui.rcid;
  const runs=events().map(e=>({e,c:calc(e.id,cid)})).filter(r=>r.c), comp=runs.filter(r=>r.c.complete);
  const avg=comp.length?comp.reduce((a,r)=>a+r.c.score,0)/comp.length:null;
  const hi=runs.length?runs.reduce((a,r)=>r.c.score>a.c.score?r:a):null, lo=runs.length?runs.reduce((a,r)=>r.c.score<a.c.score?r:a):null;
  const last=runs[runs.length-1], prev=runs[runs.length-2], delta=last&&prev?last.c.score-prev.c.score:null;
  const tile=(l,v,s)=>`<div class="tile"><div class="label">${l}</div><div class="big num">${v}</div><div class="note">${s}</div></div>`;
  const matrix=`<div class="tbl-wrap"><table><thead><tr><th>Kriteria</th>${events().map(e=>`<th class="n">${esc(e.name)}</th>`).join("")}<th class="n">Maks</th></tr></thead><tbody>${scheme().map(cr=>{ const mx=critMax(cr.id); return `<tr><td>${esc(cr.id)} · ${esc(cr.name)}</td>${events().map(e=>{ if(!(e.scope||[]).map(String).includes(String(cr.id))) return `<td class="n muted" title="tidak diujikan">·</td>`; const c=calc(e.id,cid); if(!c) return `<td class="n muted">—</td>`; const em=evCritMax(e,cr.id), v=c.byCrit[cr.id], pc=em?v/em*100:0; return `<td class="n"><span class="pc ${pctCls(pc)}">${fmt(v)}</span><div class="note">${Math.round(pc)}%</div></td>`; }).join("")}<td class="n">${fmt(mx,0)}</td></tr>`; }).join("")}
    <tr><td><b>Skor (skala 100)</b></td>${events().map(e=>{ const c=calc(e.id,cid); return `<td class="n"><b>${c?fmt(c.score,1):"—"}</b>${c&&(c.k3||c.bahan)?`<div class="note down">${c.k3?"K3":"−"+c.bahan}</div>`:""}</td>`; }).join("")}<td class="n">100</td></tr></tbody></table></div>`;
  const cards=events().map((e,i)=>{ const c=calc(e.id,cid); if(!c) return `<div class="tocard empty-card"><div class="label">${esc(e.name)}</div><p class="note">${esc(e.label||dlabel(e.date))} · belum dinilai</p></div>`;
    const pr=events().slice(0,i).map(x=>calc(x.id,cid)).filter(Boolean).pop(), d=pr?c.score-pr.score:null;
    return `<button type="button" class="tocard ${ui.detail===e.id?"sel":""}" data-detail="${e.id}"><div class="spread"><span class="label">${esc(e.name)}</span><span class="chip ${c.complete?"good":"warn"}">${c.complete?"COMPLETE":"PARTIAL"}</span></div>
    <div class="row"><span class="big num" style="font-size:32px">${fmt(c.score,1)}</span><span class="muted">/100</span>${d!==null?`<span class="${d>=0?"up":"down"} num">${d>=0?"▲":"▼"} ${fmt(Math.abs(d),1)}</span>`:""}</div>
    <div class="minibars" style="grid-template-columns:repeat(${Math.max(1,scheme().length)},1fr)">${scheme().map(cr=>{ if(!(e.scope||[]).map(String).includes(String(cr.id))) return `<div><i style="height:4px;opacity:.3"></i><span>${esc(cr.id)}</span></div>`; const pc=evCritMax(e,cr.id)?c.byCrit[cr.id]/evCritMax(e,cr.id)*100:0; return `<div><i class="${pctCls(pc)}" style="height:${Math.max(4,pc)}%"></i><span>${esc(cr.id)}</span></div>`; }).join("")}</div></button>`; }).join("");
  let detail="";
  if(ui.detail&&evById(ui.detail)){ const e=evById(ui.detail), c=calc(e.id,cid), rec=R("mark",e.id,cid);
    if(c) detail=`<div class="panel"><div class="spread"><h3>Rincian aspek · ${esc(e.name)}</h3><label class="tick"><input type="checkbox" id="lostOnly" ${ui.lostOnly?"checked":""}>Hanya nilai yang hilang</label></div>
    ${scheme().filter(cr=>(e.scope||[]).map(String).includes(String(cr.id))).map(cr=>{ const rows=evSubs(e,cr).filter(a=>!ui.lostOnly||(c.byAsp[a.id]??0)<a.max).map(a=>{ const p=c.byAsp[a.id]; return `<div class="drow">${typBadge(a)}<span>${esc(a.id)} · ${esc(a.d)}</span><span class="dot ${p===null?"":p>=a.max?"good":p>0?"warn":"bad"}"></span><span class="num">${p===null?"—":fmt(p)} / ${fmt(a.max)}</span></div>`; }).join(""); return rows?`<div><div class="dhead"><span>${esc(cr.id)} · ${esc(cr.name)}</span><span class="num">${fmt(c.byCrit[cr.id])} / ${fmt(evCritMax(e,cr.id),0)}</span></div>${rows}</div>`:""; }).join("")||'<p class="muted">Semua aspek mendapat nilai penuh.</p>'}
    <div class="row">${c.minutes?`<span class="chip">Waktu ${c.minutes} mnt${c.plan?` · plan ${c.plan} mnt (${c.minutes>c.plan?"+":""}${Math.round((c.minutes-c.plan)/c.plan*100)}%)`:""}</span>`:""}${c.bahan?`<span class="chip bad">Bahan tambahan ${c.bahan}</span>`:""}${c.k3?'<span class="chip bad">Pelanggaran K3 berat</span>':""}</div>
    ${rec?.note?`<div class="entry"><span class="label">Catatan juri</span><p>${esc(rec.note)}</p></div>`:""}</div>`; }
  const sel=A.comps.map(c=>({c,r:selection(c.id)})), w=sel[0]?.r.w||{}; const best=sel.filter(o=>o.r.idx!==null).sort((a,b)=>b.r.idx-a.r.idx)[0];
  const sc=A.cfg.selection||{};
  return `<div class="spread"><div><h2>Results</h2><p class="lead">Ringkasan, tren, dan capaian per kriteria.</p></div>${compSeg("data-rcid",cid)}</div>
  <div class="panel"><div class="label">Summary · ${esc(cname(cid))}</div><div class="tiles">${tile("TO dinilai",runs.length+" / "+events().length,`${comp.length} complete · ${runs.length-comp.length} partial`)}${tile("Rata-rata",avg===null?"—":fmt(avg,1),"dari TO complete")}${tile("Tertinggi",hi?fmt(hi.c.score,1):"—",hi?esc(hi.e.name):"—")}${tile("Terendah",lo?fmt(lo.c.score,1):"—",lo?esc(lo.e.name):"—")}${tile("Terakhir",last?fmt(last.c.score,1):"—",last?`${esc(last.e.name)}${delta!==null?` · <span class="${delta>=0?"up":"down"}">${delta>=0?"▲":"▼"} ${fmt(Math.abs(delta),1)}</span>`:""}`:"—")}</div></div>
  <div class="panel"><div class="spread"><h3>Tren skor TO</h3><div class="legend">${A.comps.map(c=>`<span><i style="background:${compColor(c)}"></i>${esc(c.name)}</span>`).join("")}</div></div>${A.comps.some(c=>events().some(e=>calc(e.id,c.id)))?trendChart(cid):'<div class="empty">Grafik muncul setelah TO pertama dinilai.</div>'}</div>
  <div style="display:flex;flex-direction:column;gap:10px"><h3>Criterion Achievement Matrix</h3>${matrix}<p class="note">Hijau ≥ 90% · kuning 65–89% · merah &lt; 65% · titik = tidak diujikan.</p></div>
  <div style="display:flex;flex-direction:column;gap:10px"><h3>Daftar TO</h3><div class="tocards">${cards}</div></div>
  ${detail}
  ${A.comps.length>1?`<div class="panel"><div class="spread"><h3>Seleksi peserta</h3><span class="chip">indikator saran</span></div><div class="tbl-wrap"><table><thead><tr><th>Pertimbangan</th><th class="n">Bobot</th>${sel.map(o=>`<th class="n">${esc(o.c.name)}</th>`).join("")}</tr></thead><tbody>
    <tr><td>Rata-rata full simulation (${(sc.full||[]).map(id=>esc(evById(id)?.name||id)).join(", ")})</td><td class="n">${w.full||0}%</td>${sel.map(o=>`<td class="n">${o.r.avgFull===null?"—":fmt(o.r.avgFull,1)}<div class="note">${o.r.nFull} dari ${o.r.nFullTotal}</div></td>`).join("")}</tr>
    <tr><td>Tren ${esc(evById(sc.trendFrom)?.name||"")} → ${esc(evById(sc.trendTo)?.name||"")}</td><td class="n">${w.trend||0}%</td>${sel.map(o=>`<td class="n">${o.r.trend===null?"—":(o.r.trend>=0?"▲ ":"▼ ")+fmt(Math.abs(o.r.trend),1)}</td>`).join("")}</tr>
    <tr><td>Gate lulus</td><td class="n">${w.gate||0}%</td>${sel.map(o=>`<td class="n">${o.r.gp} / ${o.r.gt}</td>`).join("")}</tr>
    <tr><td>Konsistensi (K3 berat, bahan tambahan)</td><td class="n">${w.kons||0}%</td>${sel.map(o=>`<td class="n">${fmt(o.r.kons,0)}<div class="note">K3 ${o.r.k3}× · bahan ${o.r.bahan}</div></td>`).join("")}</tr>
    <tr><td><b>Indeks seleksi</b></td><td class="n">100%</td>${sel.map(o=>`<td class="n"><b>${o.r.idx===null?"—":fmt(o.r.idx,1)}</b>${best&&best.c.id===o.c.id&&sel.every(z=>z.r.idx!==null)?' <span class="chip good">tertinggi</span>':""}</td>`).join("")}</tr></tbody></table></div><p class="note">Bobot diatur admin di Pengaturan › Seleksi. Keputusan akhir tetap di tangan pembina.</p></div>`:""}`;
};

/* ---------- Gate ---------- */
V.gate = () => {
  if(!A.comps.length) return noComps(); if(!gates().length) return `<h2>Gate test</h2><div class="empty">Belum ada gate. ${isAdmin()?"Tambahkan di Pengaturan › Gate.":""}</div>`;
  if(!compById(ui.gcid)) ui.gcid=A.comps[0].id; const cid=ui.gcid, c=compById(cid);
  const cards=gates().map(g=>{ const st=gateStatus(cid,g.id), r=(R("gate","all",cid)||{})[g.id]||{};
    return `<div class="panel gate ${st.done?"pass":""}"><div class="spread"><div><div class="label">${esc(g.ph||"")} ${g.phName?"· "+esc(g.phName):""}</div><h3>Gate ${esc(g.id)}</h3></div><span class="chip ${st.done?"good":st.n?"warn":""}">${st.done?"LULUS":st.n+" / "+st.total}</span></div>
    <div style="display:flex;flex-direction:column;gap:8px">${g.items.map((it,i)=>`<label class="tick" style="white-space:normal"><input type="checkbox" data-gate="${esc(g.id)}" data-gi="${i}" ${(r.items||[])[i]?"checked":""} ${canWrite()?"":"disabled"}>${esc(it)}</label>`).join("")}</div>
    ${st.done&&st.date?`<p class="note">Lulus ${dlabel(st.date,true)} ${st.date.slice(0,4)}</p>`:""}</div>`; }).join("");
  return `<div class="spread"><div><h2>Gate test</h2><p class="lead">Naik fase karena lulus gate, bukan karena kalender.</p></div>${compSeg("data-gcid",cid)}</div>
  <div class="panel"><div class="spread"><span class="label">${esc(c.name)}</span><span class="num">${gatesPassed(cid)} / ${gates().length} gate lulus</span></div><div class="bar"><i style="width:${gatesPassed(cid)/gates().length*100}%;background:${compColor(c)}"></i></div></div>
  <div class="grid g3">${cards}</div>`;
};

/* ---------- Reports ---------- */
function reportHTML(kind, eid, cid){
  const e=evById(eid); if(!e) return ""; const blank=kind==="blank"; const c=blank?null:calc(eid,cid); const p=compById(cid)||{}; const rec=blank?null:R("mark",eid,cid); const scope=(e.scope||[]).map(String);
  const head=`<div class="r-head"><div><div class="r-small">Training Information System (TIS)</div><div class="r-small">LKS SMK · Electrical Installations${CFG.SCHOOL?" · "+esc(CFG.SCHOOL):""}</div></div><div class="r-title">${kind==="summary"?"MARK SUMMARY FORM":"MARKING FORM"}</div></div>
  <table class="r-meta"><tr><td>Musim</td><td>${esc(A.season.name)}</td></tr><tr><td>Try out</td><td><b>${esc(e.name)}</b> · ${esc(e.label||dlabel(e.date))} · ${esc(e.focus||"")}</td></tr><tr><td>Peserta</td><td><b>${blank?"………………………………":esc(p.name)}</b>${!blank&&p.sekolah?" · "+esc(p.sekolah):""}</td></tr><tr><td>Batas waktu</td><td>${fmt(e.limit/60,0)} jam${c?.minutes?" · dipakai "+c.minutes+" menit":""}</td></tr></table>`;
  let body="";
  if(kind==="summary"){ body=`<table class="r-tbl"><thead><tr><th>ID</th><th>Kriteria</th><th class="r-n">Nilai</th><th class="r-n">Maks</th></tr></thead><tbody>${scheme().map(cr=>scope.includes(String(cr.id))?`<tr><td>${esc(cr.id)}</td><td>${esc(cr.name)}</td><td class="r-n">${c?fmt(c.byCrit[cr.id]):""}</td><td class="r-n">${fmt(evCritMax(e,cr.id))}</td></tr>`:`<tr><td>${esc(cr.id)}</td><td>${esc(cr.name)} <i>(tidak diujikan)</i></td><td class="r-n">–</td><td class="r-n">–</td></tr>`).join("")}
    <tr><td></td><td>Potongan bahan tambahan${c&&c.k3?" · pelanggaran K3 berat (nilai 0)":""}</td><td class="r-n">${c?(c.bahan?"−"+c.bahan:"0"):""}</td><td class="r-n"></td></tr>
    <tr class="r-tot"><td></td><td>TOTAL</td><td class="r-n">${c?fmt(c.net):""}</td><td class="r-n">${fmt(scope.reduce((a,i)=>a+evCritMax(e,i),0))}</td></tr><tr class="r-tot"><td></td><td>SKOR SKALA 100</td><td class="r-n">${c?fmt(c.score):""}</td><td class="r-n">100,00</td></tr></tbody></table>`; }
  else { body=scheme().filter(cr=>scope.includes(String(cr.id))).map(cr=>`<table class="r-tbl"><thead><tr><th colspan="2">${esc(cr.id)} · ${esc(cr.name)}</th><th>Jenis</th><th>Isian</th><th class="r-n">Nilai</th><th class="r-n">Maks</th></tr></thead><tbody>${evSubs(e,cr).map(a=>{ const v=rec?.marks?.[a.id]; let isi;
      if(!blank) isi=a.t==="M"?(v===1?"Y":v===0?"N":""):a.t==="J"?jVals(v).join(" · "):(v??""); else isi=a.t==="M"?"Y / N":a.t==="J"?"J1 __ J2 __ J3 __":`__ / ${a.n}`;
      return `<tr><td>${esc(a.id)}</td><td>${esc(a.d)}</td><td>${a.t==="J"?"J":"M"}</td><td>${isi}</td><td class="r-n">${c&&c.byAsp[a.id]!=null?fmt(c.byAsp[a.id]):""}</td><td class="r-n">${fmt(a.max)}</td></tr>`; }).join("")}</tbody></table>`).join("")
      +`<table class="r-tbl"><tbody><tr><td>Bahan tambahan (item)</td><td class="r-n">${blank?"____":c?c.bahan:""}</td></tr><tr><td>Pelanggaran K3 berat</td><td class="r-n">${blank?"Ya / Tidak":c?(c.k3?"Ya":"Tidak"):""}</td></tr><tr class="r-tot"><td>SKOR SKALA 100</td><td class="r-n">${c?fmt(c.score):""}</td></tr></tbody></table>`; }
  return `<div class="paper">${head}${body}<div class="r-sign"><div><div class="r-line"></div>Juri 1</div><div><div class="r-line"></div>Juri 2</div><div><div class="r-line"></div>Peserta</div></div><div class="r-foot">TIS ${VERSION} · dicetak ${new Date().toLocaleDateString("id-ID")}</div></div>`;
}
V.laporan = () => {
  if(!events().length) return `<div class="empty">Belum ada TO.</div>`; if(!evById(ui.pev)) ui.pev=events()[0].id; if(!compById(ui.pcid)&&A.comps.length) ui.pcid=A.comps[0].id;
  const kinds=[["lapto","Laporan hasil TO (dengan foto & catatan juri)"],["summary","Mark Summary Form"],["form","Marking Form (berisi nilai)"],["blank","Marking Form kosong"]];
  return `<div class="no-print"><h2>Reports</h2><p class="lead">Lembar bergaya CIS. Tekan Cetak lalu pilih printer atau Save as PDF, kertas A4 tegak, dan matikan Headers and footers.</p></div>
  <div class="panel no-print"><div class="grid g3"><label class="f">Dokumen<select id="rKind">${kinds.map(k=>`<option value="${k[0]}" ${k[0]===ui.pkind?"selected":""}>${k[1]}</option>`).join("")}</select></label><label class="f">Peserta<select id="rCid" ${ui.pkind==="blank"?"disabled":""}>${A.comps.map(c=>`<option value="${c.id}" ${c.id===ui.pcid?"selected":""}>${esc(c.name)}</option>`).join("")}</select></label><label class="f">Try out<select id="rEv">${events().map(e=>`<option value="${e.id}" ${e.id===ui.pev?"selected":""}>${esc(e.name)} · ${esc(e.label||dlabel(e.date))}</option>`).join("")}</select></label></div>
  <div class="row"><button class="btn primary" id="printBtn">Cetak / Simpan PDF</button>${ui.pkind==="lapto"?'<button class="btn" id="waCopy">Salin ringkasan untuk WhatsApp</button>':""}</div></div>
  <div class="paper-wrap">${ui.pkind==="lapto"?lapTO(ui.pev,ui.pcid):reportHTML(ui.pkind,ui.pev,ui.pcid)}</div>`;
};


/* ---------- Foto & laporan TO ---------- */
const photosOf=(eid,cid,crit)=>Object.values(A.rec).filter(r=>r.kind==="photo"&&r.competitor_id===cid&&r.data?.eid===eid&&(crit===undefined||r.data.crit===String(crit))).map(r=>({id:r.id,...r.data})).sort((a,b)=>(a.at||0)-(b.at||0));
function critExtras(ev,cid,crit,dis,canPhoto){
  const ph=photosOf(ev.id,cid,crit); const rec=R("mark",ev.id,cid)||{}; const note=crit==="all"?null:((rec.cnotes||{})[crit]||"");
  return `<div class="crit-x">${note!==null?`<label class="f">Catatan juri untuk bagian ini<textarea data-cnote="${esc(crit)}" rows="2" placeholder="Contoh: mitre kiri atas renggang 1,5 mm; label panel belum lengkap" ${dis}>${esc(note)}</textarea></label>`:""}
  <div class="ph-grid">${ph.map(p=>{ const u=photoUrl(p.path); return `<div class="ph">${u&&u!=="err"?`<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="Foto ${esc(crit)}" loading="lazy"></a>`:`<div class="ph-ph">${u==="err"?"✗":"…"}</div>`}${canPhoto?`<button type="button" class="ph-del" data-delphoto="${esc(p.id)}" data-path="${esc(p.path)}" aria-label="Hapus foto">✕</button>`:""}</div>`; }).join("")}
  ${canPhoto?`<label class="ph-add">📷<span>Tambah foto</span><input type="file" accept="image/*" multiple data-keepfile="ph:${esc(crit)}" style="display:none"></label>`:(ph.length?"":'<span class="note">Belum ada foto.</span>')}</div></div>`;
}
function prevScore(eid,cid){ const evs=events(); const i=evs.findIndex(e=>e.id===eid); for(let k=i-1;k>=0;k--){ const c=calc(evs[k].id,cid); if(c) return {ev:evs[k],c}; } return null; }
function lapTO(eid,cid){
  const e=evById(eid); const p=compById(cid)||{}; const c=calc(eid,cid); const rec=R("mark",eid,cid)||{}; const scope=(e.scope||[]).map(String);
  const maxScope=scope.reduce((a,i)=>a+evCritMax(e,i),0); const pv=prevScore(eid,cid);
  const rank=A.comps.map(x=>({id:x.id,s:calc(eid,x.id)?.score})).filter(x=>x.s!=null).sort((a,b)=>b.s-a.s); const pos=rank.findIndex(x=>x.id===cid);
  const by=id=>{ const q=(A.profiles||[]).find(x=>x.id===id); return q?.name||q?.email||""; };
  const cap=ph=>`${ph.name||by(ph.by)||""}${ph.at?" · "+new Date(ph.at).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):""}`;
  const phGrid=list=>list.length?`<div class="r-ph">${list.map(ph=>{ const u=photoUrl(ph.path); return `<figure>${u&&u!=="err"?`<img src="${u}" alt="Foto">`:'<div style="height:40mm;border:1px solid #999;display:grid;place-items:center">memuat foto…</div>'}<figcaption>${esc(cap(ph))}</figcaption></figure>`; }).join("")}</div>`:"";
  const lost=[]; scheme().filter(cr=>scope.includes(String(cr.id))).forEach(cr=>evSubs(e,cr).forEach(a=>{ const v=c?.byAsp?.[a.id]; if(v!=null&&a.max-v>0.009) lost.push({a,cr,l:a.max-v}); })); lost.sort((x,y)=>y.l-x.l);
  const head=`<div class="r-head"><div><div class="r-small">Training Information System (TIS)</div><div class="r-small">LKS SMK · Electrical Installations${CFG.SCHOOL?" · "+esc(CFG.SCHOOL):""}</div></div><div class="r-title">LAPORAN HASIL ${esc(e.name)}</div></div>
  <table class="r-meta"><tr><td>Peserta</td><td><b>${esc(p.name||"")}</b>${p.kelas?" · kelas "+esc(p.kelas):""}</td></tr><tr><td>Try out</td><td><b>${esc(e.name)}</b> · ${esc(e.label||dlabel(e.date))} · ${esc(e.focus||"")}</td></tr><tr><td>Musim</td><td>${esc(A.season.name)}</td></tr><tr><td>Diisi oleh</td><td>${esc(rec.by||"")}</td></tr></table>`;
  if(!c) return `<div class="paper">${head}<p>Belum ada nilai untuk peserta ini pada ${esc(e.name)}.</p></div>`;
  const tp=c.minutes&&c.plan?Math.round((c.minutes-c.plan)/c.plan*100):null;
  const score=`<div class="r-score"><div><div class="r-small">Skor skala 100</div><div class="r-big">${fmt(c.score,1)}</div></div>
   <div class="r-kv">Poin: <b>${fmt(c.net)}</b> dari ${fmt(maxScope)}${c.bahan?` (potongan bahan tambahan −${c.bahan})`:""}${c.k3?" · <b>pelanggaran K3 berat: nilai 0</b>":""}<br>
   Aspek dinilai: ${c.filled}/${c.all} ${c.complete?"(lengkap)":"(belum lengkap)"}<br>
   Waktu: ${c.minutes?c.minutes+" menit":"–"} dari batas ${fmt(e.limit,0)} menit${c.plan?` · time plan ${c.plan} menit${tp!==null?` (${tp>0?"+":""}${tp}%)`:""}`:""}<br>
   ${pv?`Dibanding ${esc(pv.ev.name)}: ${fmt(pv.c.score,1)} → ${fmt(c.score,1)} (<b>${c.score-pv.c.score>=0?"+":""}${fmt(c.score-pv.c.score,1)}</b>)`:"TO pertama peserta ini"}${rank.length>1&&pos>=0?` · peringkat ${pos+1} dari ${rank.length}`:""}</div></div>`;
  const ringkas=`<table class="r-tbl"><thead><tr><th>Bagian penilaian</th><th class="r-n">Nilai</th><th class="r-n">Maks</th><th class="r-n">%</th></tr></thead><tbody>${scheme().filter(cr=>scope.includes(String(cr.id))).map(cr=>{ const v=c.byCrit[cr.id]||0, m=evCritMax(e,cr.id); return `<tr><td>${esc(cr.id)} · ${esc(cr.name)}</td><td class="r-n">${fmt(v)}</td><td class="r-n">${fmt(m)}</td><td class="r-n">${m?fmt(v/m*100,0):"–"}</td></tr>`; }).join("")}<tr class="r-tot"><td>Total${c.bahan?" (setelah potongan)":""}</td><td class="r-n">${fmt(c.net)}</td><td class="r-n">${fmt(maxScope)}</td><td class="r-n">${fmt(c.score,0)}</td></tr></tbody></table>`;
  const prior=lost.length?`<div class="r-sec"><h4><span>Prioritas perbaikan (nilai terbanyak hilang)</span></h4><ol class="r-list">${lost.slice(0,5).map(x=>`<li>${esc(x.a.id)} ${esc(x.a.d)} — hilang ${fmt(x.l)} dari ${fmt(x.a.max)} poin</li>`).join("")}</ol></div>`:"";
  const secs=scheme().filter(cr=>scope.includes(String(cr.id))).map(cr=>{ const v=c.byCrit[cr.id]||0, m=evCritMax(e,cr.id); const note=(rec.cnotes||{})[cr.id];
    return `<div class="r-sec"><h4><span>${esc(cr.id)} · ${esc(cr.name)}</span><span class="r-n">${fmt(v)} / ${fmt(m)}</span></h4><div class="r-barw"><i style="width:${m?Math.min(100,v/m*100):0}%"></i></div>
    <table class="r-tbl"><thead><tr><th>ID</th><th>Aspek</th><th>Jenis</th><th>Isian juri</th><th class="r-n">Nilai</th><th class="r-n">Maks</th></tr></thead><tbody>${evSubs(e,cr).map(a=>{ const iv=rec.marks?.[a.id]; const isi=a.t==="M"?(iv===1?"Y":iv===0?"N":"–"):a.t==="J"?(jVals(iv).length?jVals(iv).map((x,k)=>"J"+(k+1)+"="+x).join(" · "):"–"):(iv??"–")+(a.t==="C"?" / "+a.n:"");
      return `<tr><td>${esc(a.id)}</td><td>${esc(a.d)}</td><td>${a.t}</td><td>${isi}</td><td class="r-n">${c.byAsp[a.id]!=null?fmt(c.byAsp[a.id]):"–"}</td><td class="r-n">${fmt(a.max)}</td></tr>`; }).join("")}</tbody></table>
    ${note?`<div class="r-note"><b>Catatan juri:</b> ${esc(note)}</div>`:""}${phGrid(photosOf(eid,cid,cr.id))}</div>`; }).join("");
  const all=photosOf(eid,cid,"all");
  return `<div class="paper">${head}${score}${ringkas}${rec.note?`<div class="r-note"><b>Catatan umum juri:</b> ${esc(rec.note)}</div>`:""}${prior}${secs}${all.length?`<div class="r-sec"><h4><span>Foto hasil kerja keseluruhan</span></h4>${phGrid(all)}</div>`:""}
  <div class="r-sign"><div><div class="r-line"></div>Juri 1</div><div><div class="r-line"></div>Juri 2</div><div><div class="r-line"></div>Juri 3</div><div><div class="r-line"></div>Peserta</div></div><div class="r-foot">TIS ${VERSION} · dicetak ${new Date().toLocaleDateString("id-ID")}</div></div>`;
}
function waText(eid,cid){
  const e=evById(eid), c=calc(eid,cid), rec=R("mark",eid,cid)||{}; const scope=(e.scope||[]).map(String); if(!c) return "";
  const pv=prevScore(eid,cid); const lines=[`*Laporan ${e.name} · ${cname(cid)}*`,`${e.label||dlabel(e.date)} · ${e.focus||""}`,`Skor: *${fmt(c.score,1)}* / 100 (${fmt(c.net)} dari ${fmt(scope.reduce((a,i)=>a+evCritMax(e,i),0))} poin)${pv?` · sebelumnya ${pv.ev.name} ${fmt(pv.c.score,1)}`:""}`];
  if(c.minutes) lines.push(`Waktu: ${c.minutes} menit${c.plan?` (time plan ${c.plan})`:""}`); if(c.bahan) lines.push(`Bahan tambahan: ${c.bahan} item`); if(c.k3) lines.push("Pelanggaran K3 berat: nilai 0");
  lines.push("","Per bagian:"); scheme().filter(cr=>scope.includes(String(cr.id))).forEach(cr=>{ lines.push(`- ${cr.name}: ${fmt(c.byCrit[cr.id]||0)}/${fmt(evCritMax(e,cr.id))}`); const n=(rec.cnotes||{})[cr.id]; if(n) lines.push(`  ↳ ${n}`); });
  if(rec.note) lines.push("","Catatan juri: "+rec.note);
  return lines.join("\n");
}

/* ---------- Jurnal ---------- */
V.jurnal = () => {
  if(!A.comps.length) return noComps();
  if(ui.jRep) return `<div class="row no-print" style="margin-bottom:10px"><button class="btn sm" id="jRepClose">‹ Kembali</button><button class="btn sm primary" id="jRepGo">🖨 Cetak / Simpan PDF</button><span class="note">Di jendela cetak pilih <b>Simpan sebagai PDF</b>, kertas A4.</span></div><div class="paper-wrap">${lapJurnal(ui.jRep)}</div>`;
  const all=Object.values(A.rec).filter(r=>r.kind==="journal").map(r=>({id:r.id,cid:r.competitor_id,upd:r.updated_by,...r.data})).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.at||0)-(a.at||0));
  const day=ui.jDay||todayId(), showAll=!!ui.jAll, fc=ui.jCidF||"";
  const list=all.filter(j=>(showAll||(j.date||"")===day)&&(!fc||j.cid===fc));
  const kond=["Baik","Lelah","Ada keluhan"];
  const n=v=>{ const x=parseFloat(String(v??"").replace(",",".")); return isFinite(x)?x:null; };
  const ed=ui.jEdit?all.find(j=>j.id===ui.jEdit):null; const F=ed||{};
  const items=list.length?list.map(j=>{ const w=n(j.waktu), pl=n(j.plan), dev=n(j.dev), cc=n(j.cacat), bh=n(j.bahan), td=n(j.tidur); const tp=w>0&&pl>0?Math.round((w-pl)/pl*100):null; const c=compById(j.cid);
    return `<div class="entry" style="border-left-color:${c?compColor(c):"var(--line)"}"><div class="spread"><b>${dlabel(j.date||todayId(),true)} · ${esc(cname(j.cid))}${j.drill&&j.drill!=="-"?" · "+esc(j.drill):""}</b>${canWrite()?`<span class="row no-print"><button class="btn sm" data-jedit="${esc(j.id)}">Ubah</button><button class="btn sm" data-del="${esc(j.id)}">Hapus</button></span>`:""}</div>
    <div class="note">oleh <b>${esc(j.by||((j.byId||j.upd)?pname(j.byId||j.upd):"")||"–")}</b>${j.at?" · "+new Date(j.at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):""}${j.edited?" · diubah "+new Date(j.edited).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})+(j.editedBy&&j.editedBy!==j.by?" oleh "+esc(j.editedBy):""):""}</div>
    <div class="row">${w>0?`<span class="chip">waktu ${mmss(w*60)}${pl>0?` · plan ${mmss(pl*60)}${tp!==null?` (${tp>0?"+":""}${tp}%)`:""}`:""}</span>`:""}${dev!==null&&j.dev!==""?`<span class="chip ${dev<=2?"good":"bad"}">deviasi ${fmt(dev,1)} mm</span>`:""}${cc>0?`<span class="chip warn">${fmt(cc,0)} cacat</span>`:""}${bh>0?`<span class="chip bad">${fmt(bh,0)} bahan tambahan</span>`:""}${j.kondisi?`<span class="chip ${j.kondisi==="Baik"?"good":"warn"}">${esc(j.kondisi)}${td>0?" · tidur "+fmt(td,1)+" j":""}</span>`:""}</div>
    ${j.bisa?`<p><span class="label">Sudah bisa</span><br>${esc(j.bisa).replace(/\n/g,"<br>")}</p>`:""}${j.belum?`<p><span class="label">Belum bisa</span><br>${esc(j.belum).replace(/\n/g,"<br>")}</p>`:""}</div>`; }).join("") : `<div class="empty">${showAll?"Belum ada catatan.":"Belum ada catatan pada tanggal ini."}</div>`;
  const val=k=>esc(F[k]??"");
  return `<div><h2>Jurnal latihan</h2><p class="lead">Satu catatan per siswa per drill. Untuk melengkapi catatan yang sudah ada, ketuk <b>Ubah</b>, jangan membuat catatan baru.</p></div>
  ${canWrite()?`<form class="panel no-print" id="jForm"><div class="spread"><div class="label">${ed?"Mengubah catatan "+esc(cname(ed.cid))+" · "+dlabel(ed.date,true):"Catatan baru"}</div>${ed?'<button type="button" class="btn sm" id="jCancel">Batal ubah</button>':""}</div>
  <div class="grid g3"><label class="f">Tanggal<input type="date" id="jDate" value="${esc(F.date||day)}" required></label><label class="f">Peserta<select id="jCid">${A.comps.map(c=>`<option value="${c.id}" ${(ed?ed.cid:fc)===c.id?"selected":""}>${esc(c.name)}</option>`).join("")}</select></label><label class="f">Drill / pekerjaan<input type="text" id="jDrill" value="${val("drill")}"></label></div>
  <div class="grid g3"><label class="f">Waktu (j:mm:ss)<input type="text" inputmode="decimal" id="jWaktu" placeholder="mis. 1:25:30 atau 45:10" value="${F.waktu!==undefined&&F.waktu!==""&&n(F.waktu)!==null?mmss(n(F.waktu)*60):""}"></label><label class="f">Time plan (j:mm:ss)<input type="text" inputmode="decimal" id="jPlan" placeholder="mis. 1:30:00 atau 90" value="${F.plan!==undefined&&F.plan!==""&&n(F.plan)!==null?mmss(n(F.plan)*60):""}"></label><label class="f">Deviasi maks (mm)<input type="number" inputmode="decimal" id="jDev" min="0" step="0.5" value="${val("dev")}"></label>
  <label class="f">Jumlah cacat<input type="number" inputmode="numeric" id="jCacat" min="0" value="${val("cacat")}"></label><label class="f">Bahan tambahan<input type="number" inputmode="numeric" id="jBahan" min="0" value="${val("bahan")}"></label><label class="f">Kondisi siswa<select id="jKondisi"><option value="">–</option>${kond.map(k=>`<option ${F.kondisi===k?"selected":""}>${k}</option>`).join("")}</select></label><label class="f">Tidur semalam (jam)<input type="number" inputmode="decimal" id="jTidur" min="0" max="14" step="0.5" value="${val("tidur")}"></label></div>
  <div class="grid g2"><label class="f">Sudah bisa<textarea id="jBisa">${val("bisa")}</textarea></label><label class="f">Belum bisa<textarea id="jBelum">${val("belum")}</textarea></label></div>
  <div><button class="btn primary" type="submit">${ed?"Simpan perubahan":"Simpan catatan"}</button></div></form>`:""}
  <div class="panel"><div class="row no-print">${showAll?"":`<button class="btn sm" data-jday="-1">‹</button><input type="date" id="jDay" value="${day}" style="width:auto"><button class="btn sm" data-jday="1">›</button>${day!==todayId()?'<button class="btn sm" data-jday="0">Hari ini</button>':""}`}
   <select id="jCidF" style="width:auto"><option value="">Semua peserta</option>${A.comps.map(c=>`<option value="${c.id}" ${fc===c.id?"selected":""}>${esc(c.name)}</option>`).join("")}</select>
   <label class="row" style="gap:6px"><input type="checkbox" id="jAll" ${showAll?"checked":""}> Semua tanggal</label></div>
   <div class="label">${showAll?"Semua catatan":dlabel(day,true)+" "+day.slice(0,4)} · ${list.length} catatan</div>${items}</div>
  <div class="panel no-print"><div class="label">Unduh / cetak jurnal</div>
    <div class="row"><label class="f" style="flex:1;min-width:140px">Dari<input type="date" id="jxFrom" value="${ui.jxFrom||(all.length?all[all.length-1].date:todayId())}"></label><label class="f" style="flex:1;min-width:140px">Sampai<input type="date" id="jxTo" value="${ui.jxTo||todayId()}"></label>
    <label class="f" style="flex:1;min-width:140px">Peserta<select id="jxCid"><option value="">Semua peserta</option>${A.comps.map(c=>`<option value="${c.id}" ${ui.jxCid===c.id?"selected":""}>${esc(c.name)}</option>`).join("")}</select></label></div>
    <div class="row"><button class="btn sm primary" id="jXls">Unduh Excel</button><button class="btn sm" id="jPrint">📄 Laporan PDF</button></div>
    <p class="note">Excel berisi sheet Jurnal (semua catatan) dan Ringkasan per siswa. Laporan PDF dikelompokkan per peserta (satu bagian per siswa), sesuai rentang tanggal dan peserta di atas.</p></div>`;
};
function lapJurnal(P){
  const n=v=>{ const x=parseFloat(String(v??"").replace(",",".")); return isFinite(x)?x:null; };
  const all=Object.values(A.rec).filter(r=>r.kind==="journal").map(r=>({id:r.id,cid:r.competitor_id,...r.data})).filter(j=>(j.date||"")>=P.from&&(j.date||"")<=P.to).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.at||0)-(b.at||0));
  const comps=A.comps.filter(c=>!P.cid||c.id===P.cid);
  const per=dl=>dlabel(dl,true)+" "+dl.slice(0,4);
  const pages=comps.map((c,ci)=>{ const L=all.filter(j=>j.cid===c.id);
    const tps=L.map(j=>{ const w=n(j.waktu), p=n(j.plan); return w>0&&p>0?(w-p)/p*100:null; }).filter(x=>x!==null), devs=L.map(j=>n(j.dev)).filter(x=>x!==null);
    const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null; const sum=k=>L.reduce((a,j)=>a+(n(j[k])||0),0);
    const kv=[`<b>${L.length}</b> catatan`,`<b>${new Set(L.map(j=>j.date)).size}</b> hari`,tps.length?`selisih plan rata-rata <b>${Math.round(avg(tps))>0?"+":""}${Math.round(avg(tps))}%</b>`:"",devs.length?`deviasi rata-rata <b>${fmt(avg(devs),1)} mm</b> (terbaik ${fmt(Math.min(...devs),1)})`:"",`cacat <b>${sum("cacat")}</b>`,`bahan tambahan <b>${sum("bahan")}</b>`,`kondisi tidak baik <b>${L.filter(j=>j.kondisi&&j.kondisi!=="Baik").length}×</b>`].filter(Boolean).join(" · ");
    const rows=L.map(j=>{ const w=n(j.waktu), p=n(j.plan), tp=w>0&&p>0?Math.round((w-p)/p*100):null, d=n(j.dev);
      const note=[j.bisa?`<b>Sudah bisa:</b> ${esc(j.bisa)}`:"",j.belum?`<b>Belum bisa:</b> ${esc(j.belum)}`:""].filter(Boolean).join("<br>");
      return `<tbody class="jr"><tr class="${note?"jr-has":""}"><td>${dlabel(j.date)}</td><td>${esc(j.drill||"–")}</td><td class="r-n">${w>0?mmss(w*60):"–"}</td><td class="r-n">${p>0?mmss(p*60):"–"}</td><td class="r-n">${tp===null?"–":(tp>0?"+":"")+tp+"%"}</td><td class="r-n">${d===null||j.dev===""?"–":fmt(d,1)}</td><td class="r-n">${n(j.cacat)||"–"}</td><td class="r-n">${n(j.bahan)||"–"}</td><td>${esc(j.kondisi||"–")}${n(j.tidur)>0?" · "+fmt(n(j.tidur),1)+" j":""}</td><td>${esc(j.by||"–")}</td></tr>${note?`<tr class="jr-n"><td colspan="10">${note.replace(/\n/g,"<br>")}</td></tr>`:""}</tbody>`; }).join("");
    return `<div class="${ci?"h-page":""}">${hHead("JURNAL LATIHAN",per(P.from)+" – "+per(P.to))}
      <div class="r-score"><div><div class="r-small">Peserta</div><div style="font-size:18px;font-weight:700">${esc(c.name)}</div>${c.kelas?`<div class="r-small">kelas ${esc(c.kelas)}</div>`:""}</div><div class="r-kv">${kv}</div></div>
      ${L.length?`<div class="r-sec"><h4><span>Catatan latihan</span><span>${L.length} catatan</span></h4><table class="r-tbl jr-t"><colgroup><col style="width:78px"></colgroup><thead><tr><th>Tanggal</th><th>Drill / pekerjaan</th><th class="r-n">Waktu</th><th class="r-n">Plan</th><th class="r-n">Selisih</th><th class="r-n">Dev (mm)</th><th class="r-n">Cacat</th><th class="r-n">Bahan</th><th>Kondisi</th><th>Oleh</th></tr></thead>${rows}</table>
      <div class="r-small" style="text-transform:none">Waktu dalam menit:detik atau jam:menit:detik. Selisih = waktu terhadap time plan (negatif berarti lebih cepat).</div></div>`:'<p>Tidak ada catatan pada rentang ini.</p>'}
      <div class="r-sign"><div><div class="r-line"></div>Pembina</div><div><div class="r-line"></div>Asisten</div><div><div class="r-line"></div>Peserta</div></div>${hFoot()}</div>`; }).join("");
  return `<div class="paper">${pages}</div>`;
}

/* ---------- Log harian asisten ---------- */
const pname = id => { const p=(A.profiles||[]).find(x=>x.id===id); return p?.name || p?.email || (id===A.user?.id ? (A.profile?.name||A.user?.email) : "") || "Pengguna"; };
const logsOn = date => Object.values(A.rec).filter(r=>r.kind==="log"&&r.data?.date===date).map(r=>({ id:r.id, ...r.data })).sort((a,b)=>(a.start||"").localeCompare(b.start||""));
const SESUAI = { ya:["Sesuai jadwal","good"], sebagian:["Sebagian sesuai","warn"], ganti:["Diganti materi lain","bad"] };
function actText(a){
  const ev=evById(a.ref)?.name||a.ref, c=a.competitor_id?" · "+cname(a.competitor_id):"", del=a.action==="hapus";
  if(a.kind==="mark") return (del?"Menghapus nilai ":"Mengisi nilai ")+ev+c+(a.n>1?` (${a.n}× simpan)`:"");
  if(a.kind==="lock") return "Mengunci / membuka nilai "+ev;
  if(a.kind==="done"){ const it=sched().find(s=>s.id===a.ref); return "Mencentang jadwal "+(it?(it.kind==="weekend"?"tugas mandiri "+rangeLabel(it.date,it.end):dlabel(it.date)+" ("+it.label+")"):a.ref)+c; }
  if(a.kind==="gate") return "Memperbarui gate test"+c;
  if(a.kind==="journal") return (del?"Menghapus jurnal":"Menulis jurnal latihan")+c;
  if(a.kind==="log") return del?"Menghapus log harian":"Menulis log harian";
  if(a.kind==="photo"){ const [pe,pc]=String(a.ref).split("~"); const cr=scheme().find(x=>String(x.id)===pc); return (del?"Menghapus foto ":"Menambah foto ")+(evById(pe)?.name||pe)+" · "+(pc==="all"?"keseluruhan":(cr?cr.name:pc))+c; }
  if(a.kind==="harian"){ const [sr,it,rp]=String(a.ref).split("~"); const S=A.rec[recId("harian",sr,null)]?.data; const t=S?S.title:"sesi"; if(!it) return (del?"Menghapus sesi harian ":(a.action==="buat"?"Membuat sesi harian ":"Mengubah sesi harian "))+t; const nm=(S?.items||[]).find(i=>i.id===it)?.name||it; return (del?"Menghapus hasil harian ":"Mengisi penilaian harian ")+t+" · "+nm+" P"+rp+c+(a.n>1?` (${a.n}× simpan)`:""); }
  return a.kind+" "+a.ref;
}
const hhmm = iso => { const d=new Date(iso); return String(d.getHours()).padStart(2,"0")+"."+String(d.getMinutes()).padStart(2,"0"); };
V.log = () => {
  const d=ui.logDate||todayId(); const key=A.season.id+"|"+d;
  if(ui.actFor!==key) loadAct(d);
  const it=sched().filter(s=>s.date&&d>=s.date&&d<=(s.end||s.date));
  const mine=canWrite()?(R("log",d+"~"+A.user.id)||{}):null;
  const logs=logsOn(d);
  const jadwal=it.length?it.map(s=>`<div><div class="label">${esc(s.tab)} · ${esc(s.group)} · ${esc(s.label)}</div><p>${esc(s.title).replace(/\n/g,"<br>")}</p><p class="muted" style="font-size:13px">Target: ${esc(s.target)}</p></div>`).join(""):'<p class="muted">Tidak ada jadwal latihan pada tanggal ini.</p>';
  const form=mine?`<form class="panel no-print" id="logForm"><div class="spread"><div class="label">Log saya · ${esc(A.profile?.name||A.user?.email||"")}</div>${mine.at?`<span class="chip good">tersimpan ${hhmm(new Date(mine.at).toISOString())}</span>`:'<span class="chip warn">belum diisi</span>'}</div>
    <div class="grid g3"><label class="f">Jam mulai<input type="time" id="lgStart" value="${esc(mine.start||"")}"></label><label class="f">Jam selesai<input type="time" id="lgEnd" value="${esc(mine.end||"")}"></label>
    <label class="f">Kesesuaian dengan jadwal<select id="lgSesuai">${Object.entries(SESUAI).map(([k,v])=>`<option value="${k}" ${(mine.sesuai||"ya")===k?"selected":""}>${v[0]}</option>`).join("")}</select></label></div>
    <div class="f"><span>Peserta hadir</span><div class="row">${A.comps.map(c=>`<label class="row" style="gap:6px"><input type="checkbox" data-hadir="${c.id}" ${(mine.hadir||A.comps.map(x=>x.id)).includes(c.id)?"checked":""}>${esc(c.name)}</label>`).join("")}</div></div>
    <label class="f">Kegiatan yang dilakukan hari ini<textarea id="lgKeg" rows="4" placeholder="Contoh: Demo mitre 45°, siswa drill 10 sambungan, ukur gap tiap sambungan">${esc(mine.kegiatan||"")}</textarea></label>
    <div class="grid g2"><label class="f">Capaian siswa<textarea id="lgCap" rows="3" placeholder="Siapa sudah bisa apa, angka penting (gap, deviasi, waktu)">${esc(mine.capaian||"")}</textarea></label>
    <label class="f">Kendala & tindak lanjut<textarea id="lgKen" rows="3">${esc(mine.kendala||"")}</textarea></label></div>
    <label class="f">Alat / bahan (dipakai, habis, rusak)<input type="text" id="lgBahan" value="${esc(mine.bahan||"")}"></label>
    <div><button class="btn primary" type="submit">Simpan log</button></div></form>`:"";
  const cards=logs.length?logs.map(l=>{ const s=SESUAI[l.sesuai]||SESUAI.ya;
    return `<div class="entry" style="border-left-color:var(--accent)"><div class="spread"><b>${esc(pname(l.by)||l.name)}${l.start?` · ${esc(l.start)}–${esc(l.end||"?")}`:""}</b>${isAdmin()||l.by===A.user?.id?`<button class="btn sm no-print" data-dellog="${esc(l.id)}">Hapus</button>`:""}</div>
    <div class="row"><span class="chip ${s[1]}">${s[0]}</span>${(l.hadir||[]).length<A.comps.length?A.comps.map(c=>`<span class="chip ${(l.hadir||[]).includes(c.id)?"good":"bad"}">${esc(c.name)} ${(l.hadir||[]).includes(c.id)?"hadir":"tidak hadir"}</span>`).join(""):'<span class="chip good">semua peserta hadir</span>'}</div>
    <p><span class="label">Kegiatan</span><br>${esc(l.kegiatan).replace(/\n/g,"<br>")}</p>${l.capaian?`<p><span class="label">Capaian siswa</span><br>${esc(l.capaian).replace(/\n/g,"<br>")}</p>`:""}${l.kendala?`<p><span class="label">Kendala & tindak lanjut</span><br>${esc(l.kendala).replace(/\n/g,"<br>")}</p>`:""}${l.bahan?`<p><span class="label">Alat / bahan</span><br>${esc(l.bahan)}</p>`:""}</div>`; }).join(""):'<div class="empty">Belum ada log untuk tanggal ini.</div>';
  let act;
  if(A.actErr) act=`<div class="warnbox">${isAdmin()?"Aktivitas otomatis belum aktif. Jalankan berkas <b>update-log.sql</b> sekali di Supabase (SQL Editor).":"Aktivitas otomatis belum aktif. Minta admin memperbarui database."}</div>`;
  else if(ui.actFor!==key||!A.act) act='<p class="muted">Memuat…</p>';
  else if(!A.act.length) act='<p class="muted">Tidak ada aktivitas di aplikasi pada tanggal ini.</p>';
  else { const who={}; A.act.forEach(x=>who[x.user_id]=(who[x.user_id]||0)+1); const fw=ui.actWho&&who[ui.actWho]?ui.actWho:""; const L=A.act.filter(x=>!fw||x.user_id===fw); const LIM=8; const show=ui.actAll?L:L.slice(0,LIM);
    act=`<div class="subnav no-print" style="margin-bottom:8px"><button data-actwho="" aria-pressed="${!fw}">Semua · ${A.act.length}</button>${Object.entries(who).sort((a,b)=>b[1]-a[1]).map(([u,n])=>`<button data-actwho="${esc(u)}" aria-pressed="${fw===u}">${esc(pname(u))} · ${n}</button>`).join("")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>Jam</th><th>Oleh</th><th>Kegiatan di aplikasi</th></tr></thead><tbody>${show.map(a=>`<tr><td class="num">${hhmm(a.at)}</td><td>${esc(pname(a.user_id))}</td><td>${esc(actText(a))}</td></tr>`).join("")}</tbody></table></div>
    ${L.length>LIM?`<div class="row no-print" style="margin-top:8px"><button class="btn sm" id="actMore">${ui.actAll?"Tampilkan lebih sedikit":`Tampilkan semua (${L.length})`}</button><span class="note">${ui.actAll?"":`Menampilkan ${LIM} aktivitas terbaru.`}</span></div>`:""}`; }
  const staff=(A.profiles||[]).filter(p=>p.role==="juri"||p.role==="admin");
  const days=[...new Set(sched().filter(s=>s.kind==="day"&&s.date<=todayId()).map(s=>s.date))].sort().reverse().slice(0,10);
  const rekap=staff.length&&days.length?`<div class="panel"><div class="label">Rekap pengisian log · 10 hari latihan terakhir</div><div class="tbl-wrap"><table><thead><tr><th>Tanggal</th>${staff.map(p=>`<th>${esc(p.name||p.email)}</th>`).join("")}</tr></thead><tbody>${days.map(x=>`<tr><td><a href="#log" data-logto="${x}">${dlabel(x)}</a></td>${staff.map(p=>{ const l=R("log",x+"~"+p.id); return `<td>${l?`<span class="chip good">✓ ${esc(l.start||"")}${l.end?"–"+esc(l.end):""}</span>`:'<span class="chip">–</span>'}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div></div>`:"";
  return `<div><h2>Log harian</h2><p class="print-only" style="display:none">${esc(A.season.name)} · ${dlabel(d,true)} ${d.slice(0,4)}</p><p class="lead no-print">Laporan kegiatan asisten setiap hari latihan, ditambah catatan otomatis semua yang diisi di aplikasi.</p></div>
  <div class="row no-print"><button class="btn sm" data-logday="-1">‹ Sebelumnya</button><input type="date" id="logDate" value="${d}" style="width:auto"><button class="btn sm" data-logday="1">Berikutnya ›</button>${d!==todayId()?'<button class="btn sm" data-logday="0">Hari ini</button>':""}</div>
  <div class="panel no-print"><div class="label">Unduh / cetak log</div>
    <div class="row"><label class="f" style="flex:1;min-width:140px">Dari<input type="date" id="logFrom" value="${ui.logFrom||addDays(d,-6)}"></label><label class="f" style="flex:1;min-width:140px">Sampai<input type="date" id="logTo" value="${ui.logTo||d}"></label></div>
    <div class="row"><button class="btn sm primary" id="logXls">Unduh Excel (rentang tanggal)</button><button class="btn sm" id="logPrint">Cetak / PDF hari ini</button></div>
    <p class="note">Excel berisi 3 sheet: Log asisten, Aktivitas otomatis, dan Rekap pengisian. Cetak memakai tampilan tanggal yang sedang dibuka; pilih "Simpan sebagai PDF" di jendela cetak.</p></div>
  <div class="panel"><div class="label">${dlabel(d,true)} ${d.slice(0,4)} · jadwal</div>${jadwal}</div>
  ${form}
  <div class="panel"><div class="label">Log asisten</div>${cards}</div>
  <div class="panel"><div class="spread"><div class="label">Aktivitas di aplikasi (otomatis) · hanya ${dlabel(d)}</div><button class="btn sm no-print" id="actReload">Muat ulang</button></div>${act}</div>
  ${rekap}`;
};

/* ---------- Daftar istilah ---------- */
const istilahList = () => { const base=(A.cfg.istilah&&A.cfg.istilah.length) ? A.cfg.istilah : (window.TIS_SEED?.istilah||[]); const have=new Set(base.map(x=>x.t)); return base.concat((window.TIS_ISTILAH_STD||[]).filter(x=>!have.has(x.t))); };
const hl = (txt,q) => { const e=esc(txt); if(!q) return e; const i=txt.toLowerCase().indexOf(q); if(i<0) return e; return esc(txt.slice(0,i))+"<mark>"+esc(txt.slice(i,i+q.length))+"</mark>"+esc(txt.slice(i+q.length)); };
V.istilah = () => {
  const all=istilahList(); const groups=[...new Set(all.map(x=>x.g))]; const q=(ui.istQ||"").trim().toLowerCase(); const g=ui.istG||"";
  const list=all.filter(x=>(!g||x.g===g)&&(!q||x.t.toLowerCase().includes(q)||x.a.toLowerCase().includes(q)));
  const by={}; list.forEach(x=>{ (by[x.g]=by[x.g]||[]).push(x); });
  return `<div><h2>Daftar istilah</h2><p class="lead">Istilah yang sering muncul di jobsheet, marking scheme, TIS, dan saat lomba. Ketik untuk mencari.</p></div>
  <div class="panel no-print"><input type="search" id="istQ" placeholder="Cari istilah, misalnya: garis referensi, interlock, zeroing" value="${esc(ui.istQ||"")}" autocomplete="off">
   <div class="row"><button class="btn sm ${!g?"primary":""}" data-istg="">Semua (${all.length})</button>${groups.map(x=>`<button class="btn sm ${g===x?"primary":""}" data-istg="${esc(x)}">${esc(x.replace(/^[A-Z]\.\s*/,""))}</button>`).join("")}</div>
   <div class="row"><span class="note">${list.length} istilah ditemukan</span><button class="btn sm" id="istPrint">Cetak / PDF</button></div></div>
  ${list.length?Object.entries(by).map(([gn,xs])=>`<div class="panel"><div class="label">${esc(gn)}</div><div class="ist">${xs.map(x=>`<div class="ist-r"><b>${hl(x.t,q)}</b><span>${hl(x.a,q)}</span></div>`).join("")}</div></div>`).join(""):'<div class="empty">Istilah tidak ditemukan. Coba kata lain.</div>'}`;
};

/* ---------- Peserta ---------- */
V.peserta = () => {
  const rows=A.comps.map((c,i)=>`<div class="panel"><div class="row">${badge(c)}<h3>Peserta ${i+1}</h3></div>
    <label class="f">Nama lengkap<input type="text" id="pn-${c.id}" value="${esc(c.name)}" ${isAdmin()?"":"disabled"}></label>
    <div class="grid g2"><label class="f">Kelas<input type="text" id="pk-${c.id}" value="${esc(c.kelas)}" ${isAdmin()?"":"disabled"}></label><label class="f">Peran<input type="text" id="pr-${c.id}" value="${esc(c.peran)}" ${isAdmin()?"":"disabled"}></label></div>
    <label class="f">Sekolah<input type="text" id="ps-${c.id}" value="${esc(c.sekolah)}" ${isAdmin()?"":"disabled"}></label>
    ${isAdmin()?`<div class="row"><button class="btn sm primary" data-savecomp="${c.id}">Simpan</button><button class="btn sm danger" data-delcomp="${c.id}">Hapus peserta</button></div>`:""}</div>`).join("");
  return `<div><h2>Peserta</h2><p class="lead">Peserta musim ${esc(A.season.name)}. ${isAdmin()?"Menghapus peserta juga menghapus semua nilai dan jurnalnya.":""}</p></div>
  <div class="grid g2">${rows||noComps()}</div>${isAdmin()?'<div><button class="btn" id="addComp">+ Tambah peserta</button></div>':""}`;
};

/* ---------- Profil ---------- */
V.profil = () => `<div><h2>Profil</h2></div>
  <div class="grid g2"><div class="panel"><div class="label">Akun</div>
    <label class="f">Nama tampilan<input type="text" id="prName" value="${esc(A.profile?.name||"")}"></label>
    <p class="note">E-mail: ${esc(A.user?.email||"")} · Peran: ${esc({admin:"Admin",juri:"Juri",viewer:"Pengamat"}[role()])}</p>
    <div><button class="btn sm primary" id="prSave">Simpan nama</button></div></div>
  ${DEMO?"":`<form class="panel" id="pwForm"><div class="label">Ganti kata sandi</div><label class="f">Kata sandi baru<input type="password" id="pw1" minlength="6" autocomplete="new-password" required></label><label class="f">Ulangi kata sandi<input type="password" id="pw2" minlength="6" autocomplete="new-password" required></label><div><button class="btn sm primary" type="submit">Ganti kata sandi</button></div><p class="note">Minimal 6 karakter. Hanya Anda yang bisa mengganti kata sandi ini.</p></form>`}</div>
  <div class="panel"><div class="label">Pasang di HP</div><p>Buka alamat aplikasi ini di Chrome (Android) atau Safari (iPhone), lalu pilih menu <b>Tambahkan ke layar utama</b>. Ikon TIS akan muncul seperti aplikasi.</p></div>`;
