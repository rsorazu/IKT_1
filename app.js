// IKT Programazioa — app.js v3 (CMS-driven)
// Loads all content from /content/*.json and renders units dynamically

// ── Navigation order ────────────────────────────────────────────
const UNITS = ['intro','t1','t2','t3a','p1','t3b','p2','t3c','p3','p4','glossari'];
const CONTENT_FILES = ['t1','t2','t3a','p1','t3b','p2','t3c','p3','p4'];

// ── State ────────────────────────────────────────────────────────
const DATA = {};
// Progress tracking removed

// ── Load all JSON content ────────────────────────────────────────
async function loadAllContent() {
  const promises = ['site','glossary',...CONTENT_FILES,'help_p1','help_p2','help_p3','help_p4'].map(f =>
    fetch(`content/${f}.json`)
      .then(r => r.json())
      .then(d => { DATA[f] = d; })
      .catch(() => { DATA[f] = null; })
  );
  await Promise.all(promises);
}

// ── Render helpers ───────────────────────────────────────────────
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function photoPlaceholder(photo) {
  if (!photo) return '';
  const src = photo.image || '';
  if (src && src.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
    return `<img src="${src}" alt="${photo.description||''}"
      style="width:100%;border-radius:10px;margin:16px 0;display:block;border:0.5px solid var(--border)">`;
  }
  const desc = photo.description || '';
  if (!desc) return '';
  return `<div class="photo-placeholder">
    <div class="photo-ph-icon">📷</div>
    <div class="photo-ph-text">
      <strong>Argazki proposamena</strong>
      <p>${desc}</p>
    </div>
  </div>`;
}
function infoBoxHTML(box) {
  if (!box) return '';
  return `<div class="info-box" style="--box-color:${box.color||'#2E7DD1'}">
    <div class="info-box-icon">${box.icon||'💡'}</div>
    <div><strong>${box.title}</strong><p>${box.text}</p></div>
  </div>`;
}
function summaryCard(summary, nextUnitId) {
  if (!summary) return '';
  const points = (summary.points||[]).map(p => `<li>${p}</li>`).join('');
  return `<div class="summary-card">
    <h2>🏁 ${summary.heading}</h2>
    <p class="summary-intro">${summary.intro}</p>
    <ul class="summary-points">${points}</ul>
    ${summary.next ? `<button class="summary-next" onclick="goToUnit('${nextUnitId}')">
      ${summary.next} →
    </button>` : ''}
  </div>`;
}
function quizHTML(questions, containerId) {
  if (!questions || !questions.length) return '';
  return `<div id="${containerId}"></div>`;
}
function objListHTML(items) {
  return `<ul class="obj-list">${(items||[]).map(i=>`<li>${i}</li>`).join('')}</ul>`;
}

// ── Render site globals ──────────────────────────────────────────
function isUnlocked(unitId) {
  if (!DATA.site || !DATA.site.unlocked) return true; // default open
  if (unitId === 'intro' || unitId === 'glossari') return true; // always open
  return DATA.site.unlocked[unitId] === true;
}

function renderLockedUnit(unitId) {
  const section = document.getElementById(`unit-${unitId}`);
  if (!section) return;
  section.innerHTML = `
    <div class="locked-screen">
      <div class="locked-icon">🔒</div>
      <h2 class="locked-title">Bloke hau oraindik ez da ireki</h2>
      <p class="locked-desc">Irakasleak bloke hau desblokeatu arte itxaron. Aurrerago irekiko da.</p>
    </div>`;
}

function renderSite() {
  const s = DATA.site;
  if (!s) return;
  document.title = `${s.title} — ${s.subtitle}`;

  // Update hero subtitle if overridden in site.json
  const es = document.getElementById('heroSub');
  if (es && s.hero_subtitle) es.textContent = s.hero_subtitle;

  // Announcement bar + card
  if (s.announcement_active && s.announcement) {
    const bar = document.getElementById('announcementBar');
    const card = document.getElementById('announcementCard');
    if (bar) { bar.textContent = '📢 ' + s.announcement; bar.classList.add('show'); }
    if (card) { card.textContent = '📢 ' + s.announcement; card.style.display = 'block'; }
  }

  // Hero image — if site.json has an intro_image, show it
  if (s.intro_image) {
    const ph = document.getElementById('introImgPlaceholder');
    if (ph) {
      ph.outerHTML = `<img src="${s.intro_image}" alt="Portu adimenduna" class="intro-img-real">`;
    }
  }
}

// ── Render glossary ──────────────────────────────────────────────
function renderGlossary(filter = '') {
  const grid = document.getElementById('glossaryGrid');
  if (!grid || !DATA.glossary) return;
  const entries = DATA.glossary.entries || [];
  const filtered = entries.filter(g =>
    g.term.toLowerCase().includes(filter.toLowerCase()) ||
    g.definition.toLowerCase().includes(filter.toLowerCase())
  );
  grid.innerHTML = filtered.length
    ? filtered.map(g => `
      <div class="glossary-card">
        <span class="glossary-tag" style="background:color-mix(in srgb,${g.color} 20%,transparent);color:${g.color}">${g.tag}</span>
        <h4>${g.term}</h4>
        <p>${g.definition}</p>
      </div>`).join('')
    : '<p style="color:var(--text-dim);padding:20px">Ez da bilaketa-emaitzarik aurkitu.</p>';
}

// ── Generic unit renderer ────────────────────────────────────────
function renderUnit(id) {
  const d = DATA[id];
  const section = document.getElementById(`unit-${id}`);
  if (!d || !section) return;

  const nextIdx = UNITS.indexOf(id) + 1;
  const nextId = UNITS[nextIdx] || 'glossari';

  // Build tabs
  const tabs = d.tabs || [];
  const tabButtons = tabs.map((t,i) =>
    `<button class="tab${i===0?' active':''}" data-tab="${t.id}">${t.label}</button>`
  ).join('');

  // Build tab contents
  let tabContents = tabs.map((t,i) => {
    let inner = '';

    if (t.id === 'exercicis') {
      inner = `<h2>${t.heading||'Ariketak'}</h2>`;
      // Sort exercise
      if (d.sort_exercise) inner += `<div id="sort-${id}" class="exercise-block"></div>`;
      // Classify exercise
      if (d.classify_items) inner += `<div id="classify-${id}" class="exercise-block" style="margin-top:16px"></div>`;
      // Block match
      if (d.block_match_pairs) inner += `<div id="blockmatch-${id}" class="exercise-block" style="margin-top:16px"></div>`;
      // Quiz
      if (d.quiz) inner += `<div id="quiz-${id}" style="margin-top:${d.sort_exercise||d.classify_items||d.block_match_pairs?'24px':'0'}"></div>`;
      // Summary
      inner += summaryCard(d.summary, nextId);
      return `<div class="tab-content${i===0?' active':''}" data-content="${t.id}">${inner}</div>`;
    }

    // Context / main tabs — render based on data fields
    if (d.context_paragraphs && t.id === 'context') {
      inner += `<h2>${d.context_heading||d.title}</h2>`;
      (d.context_paragraphs||[]).forEach(p => { inner += `<p>${p}</p>`; });
      if (d.research_question) inner += `<div class="question-box"><span class="question-icon">?</span><div><strong>Ikerketa-galdera</strong><p>${d.research_question}</p></div></div>`;
      if (d.objectives) { inner += `<h3>Helburuak</h3>${objListHTML(d.objectives)}`; }
    }

    // Render summary also on last non-exercise tab for units without exercise tab
    return `<div class="tab-content${i===0?' active':''}" data-content="${t.id}">${inner || `<h2>${t.label}</h2><p>...</p>`}</div>`;
  }).join('');

  section.innerHTML = `
    <div class="unit-header" style="--accent:${d.accent||'#8B7355'}">
      <span class="unit-eyebrow">${d.eyebrow}</span>
      <h1>${d.title}</h1>
      <p class="unit-desc">${d.description}</p>
      <div class="unit-chips">${(d.chips||[]).map(c=>`<span class="chip">${c}</span>`).join('')}</div>
    </div>
    <div class="tabs" id="tabs-${id}">${tabButtons}</div>
    ${tabContents}
  `;

  // Wire tabs
  const tabGroup = section.querySelector(`.tabs`);
  if (tabGroup) {
    tabGroup.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabGroup.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        section.querySelectorAll('.tab-content').forEach(c =>
          c.classList.toggle('active', c.dataset.content === tab.dataset.tab)
        );
      });
    });
  }

  // Build exercises
  if (d.sort_exercise) buildSortExercise(`sort-${id}`, d.sort_exercise);
  if (d.classify_items) buildDragClassify(`classify-${id}`, d.classify_items, [
    { id:'sentsore', label:'👁️ Sentsorea (sarrera)', color:'#2E7DD1' },
    { id:'eragile',  label:'⚡ Eragilea (irteera)',   color:'#D94060' },
  ]);
  if (d.block_match_pairs) buildBlockMatch(`blockmatch-${id}`, d.block_match_pairs);
  if (d.quiz) buildQuiz(`quiz-${id}`, d.quiz);
}

// ── Render all theory units with full content ────────────────────
function renderT1() {
  const d = DATA.t1;
  const section = document.getElementById('unit-t1');
  if (!d || !section) return;

  const pillarsHTML = (d.pillars||[]).map(p => `
    <div class="theory-card" style="--tc:${p.color}">
      <div class="theory-card-icon">${p.icon}</div>
      <h3>${p.title}</h3>
      <p>${p.text}</p>
    </div>`).join('');

  const sortEx = d.sort_exercise ? `<div id="sort-t1" class="exercise-block"></div>` : '';
  const nextId = UNITS[UNITS.indexOf('t1')+1];

  section.innerHTML = `
    <div class="unit-header" style="--accent:#8B7355">
      <span class="unit-eyebrow">${d.eyebrow}</span>
      <h1>${d.title}</h1>
      <p class="unit-desc">${d.description}</p>
      <div class="unit-chips">${(d.chips||[]).map(c=>`<span class="chip">${c}</span>`).join('')}</div>
    </div>
    <div class="tabs" id="tabs-t1">
      <button class="tab active" data-tab="zer">Zer da?</button>
      <button class="tab" data-tab="algo">Algoritmoak</button>
      <button class="tab" data-tab="deskomposa">Deskonposaketa</button>
      <button class="tab" data-tab="exercicis">Ariketak</button>
    </div>
    <div class="tab-content active" data-content="zer">
      <h2>${d.tabs[0].heading}</h2>
      ${(d.tabs[0].paragraphs||[]).map(p=>`<p>${p}</p>`).join('')}
      <div class="theory-cards">${pillarsHTML}</div>
      ${photoPlaceholder(d.tabs[0].photo)}
    </div>
    <div class="tab-content" data-content="algo">
      <h2>${d.tabs[1].heading}</h2>
      ${(d.tabs[1].paragraphs||[]).map(p=>`<p>${p}</p>`).join('')}
      ${objListHTML(d.tabs[1].obj_list)}
      <h3>${d.tabs[1].example_title||''}</h3>
      <p>${d.tabs[1].example_intro||''}</p>
      <div class="algo-steps" id="t1-algo-display"></div>
      ${infoBoxHTML(d.tabs[1].info_box)}
      ${photoPlaceholder(d.tabs[1].photo)}
      <p>${d.tabs[1].closing||''}</p>
    </div>
    <div class="tab-content" data-content="deskomposa">
      <h2>${d.tabs[2].heading}</h2>
      ${(d.tabs[2].paragraphs||[]).map(p=>`<p>${p}</p>`).join('')}
      <div class="decomp-tree">
        <div class="decomp-root">Robot esploratzaile bat eraiki</div>
        <div class="decomp-children">
          <div class="decomp-branch"><div class="decomp-node">Txasisa eraiki</div><div class="decomp-leaves"><span>Gurpilak</span><span>Motorrak</span><span>Hubaren kokapena</span></div></div>
          <div class="decomp-branch"><div class="decomp-node">Sentsoreak konektatu</div><div class="decomp-leaves"><span>Distantzia-sentsorea</span><span>Atakak hautatu</span><span>Kableak</span></div></div>
          <div class="decomp-branch"><div class="decomp-node">Programa idatzi</div><div class="decomp-leaves"><span>Mugimendua</span><span>Oztopoak</span><span>Begiztak</span></div></div>
        </div>
      </div>
      ${infoBoxHTML(d.tabs[2].info_box)}
      ${photoPlaceholder(d.tabs[2].photo)}
    </div>
    <div class="tab-content" data-content="exercicis">
      <h2>Ariketak</h2>
      ${sortEx}
      <div id="quiz-t1" style="margin-top:${sortEx?'24px':'0'}"></div>
      ${summaryCard(d.summary, nextId)}
    </div>
  `;

  // Display algo steps statically
  const stepsContainer = section.querySelector('#t1-algo-display');
  if (stepsContainer && d.sort_exercise) {
    d.sort_exercise.items.forEach((item,i) => {
      const s = document.createElement('div');
      s.className = 'algo-step';
      s.style.cursor = 'default';
      s.innerHTML = `<span class="step-num">${i+1}</span><span>${item.text}</span>`;
      stepsContainer.appendChild(s);
    });
  }

  wireTabs(section);
  if (d.sort_exercise) buildSortExercise('sort-t1', d.sort_exercise);
  if (d.quiz) buildQuiz('quiz-t1', d.quiz);
  // Summary next button
  section.querySelectorAll('.summary-next').forEach(btn => btn.onclick = () => goToUnit(nextId));
}

function renderT2() {
  const d = DATA.t2;
  const section = document.getElementById('unit-t2');
  if (!d || !section) return;
  const nextId = UNITS[UNITS.indexOf('t2')+1];

  const spikeHTML = (d.spike_components||[]).map(c => `
    <div class="spike-item ${c.type}">
      <div class="spike-badge${c.type==='actuator'?' act':c.type==='both'?' both':''}">${c.type==='sensor'?'Sentsorea':c.type==='actuator'?'Eragilea':'Biak'}</div>
      <h4>${c.icon} ${c.name}</h4>
      <p>${c.description}</p>
    </div>`).join('');

  const realExamples = (d.real_examples||[]).map(e => `
    <div class="example-card">
      <div class="example-title">${e.title}</div>
      <div class="example-row"><span class="ex-label in">Sarrera</span><span>${e.input}</span></div>
      <div class="example-row"><span class="ex-label out">Irteera</span><span>${e.output}</span></div>
    </div>`).join('');

  section.innerHTML = `
    <div class="unit-header" style="--accent:#8B7355">
      <span class="unit-eyebrow">${d.eyebrow}</span>
      <h1>${d.title}</h1>
      <p class="unit-desc">${d.description}</p>
      <div class="unit-chips">${(d.chips||[]).map(c=>`<span class="chip">${c}</span>`).join('')}</div>
    </div>
    <div class="tabs" id="tabs-t2">
      <button class="tab active" data-tab="sarirte">Sarrerak eta Irteerak</button>
      <button class="tab" data-tab="spike">SPIKE Prime</button>
      <button class="tab" data-tab="exercicis">Ariketak</button>
    </div>
    <div class="tab-content active" data-content="sarirte">
      <h2>Sistemak ingurunearekin nola komunikatzen dira</h2>
      <p>Sistema informatiko orok bi gauza egin behar ditu: <strong>informazioa jaso</strong> ingurunetik, eta <strong>erantzun</strong> ingurunera.</p>
      <div class="two-col-concept">
        <div class="concept-half" style="--hc:#2E7DD1">
          <div class="concept-half-header"><span class="concept-half-icon">👁️</span><h3>${d.sensor_heading}</h3></div>
          <p>${d.sensor_description}</p>
          <ul>${(d.sensor_examples||[]).map(e=>`<li>${e}</li>`).join('')}</ul>
          ${photoPlaceholder(d.sensor_photo)}
        </div>
        <div class="concept-half" style="--hc:#D94060">
          <div class="concept-half-header"><span class="concept-half-icon">⚡</span><h3>${d.actuator_heading}</h3></div>
          <p>${d.actuator_description}</p>
          <ul>${(d.actuator_examples||[]).map(e=>`<li>${e}</li>`).join('')}</ul>
          ${photoPlaceholder(d.actuator_photo)}
        </div>
      </div>
      <h3>Adibide errealak</h3>
      <div class="examples-grid">${realExamples}</div>
    </div>
    <div class="tab-content" data-content="spike">
      <h2>LEGO SPIKE Prime: zure kit-aren osagaiak</h2>
      ${photoPlaceholder(d.spike_photo_top)}
      <div class="spike-grid">${spikeHTML}</div>
      ${photoPlaceholder(d.spike_photo_bottom)}
    </div>
    <div class="tab-content" data-content="exercicis">
      <h2>Ariketak</h2>
      <div id="classify-t2" class="exercise-block"></div>
      <div id="quiz-t2" style="margin-top:24px"></div>
      ${summaryCard(d.summary, nextId)}
    </div>
  `;

  wireTabs(section);
  if (d.classify_items) buildDragClassify('classify-t2', d.classify_items, [
    { id:'sentsore', label:'👁️ Sentsorea (sarrera)', color:'#2E7DD1' },
    { id:'eragile',  label:'⚡ Eragilea (irteera)',   color:'#D94060' },
  ]);
  if (d.quiz) buildQuiz('quiz-t2', d.quiz);
  section.querySelectorAll('.summary-next').forEach(btn => btn.onclick = () => goToUnit(nextId));
}

function renderProjectUnit(id) {
  const d = DATA[id];
  const section = document.getElementById(`unit-${id}`);
  if (!d || !section) return;
  const nextId = UNITS[UNITS.indexOf(id)+1] || 'glossari';

  const phasesHTML = (d.phases||[]).map(p => {
    let challengesHTML = '';
    if (p.challenges) {
      challengesHTML = `<div class="reto-grid">${p.challenges.map(c=>`
        <div class="reto-item"><span class="reto-star">${c.stars}</span><strong>${c.title}:</strong> ${c.text}</div>`).join('')}</div>`;
    }
    const checkHTML = p.checkpoint ? `<div class="checkpoint"><strong>✓ Kontrol-puntua</strong><ul>${p.checkpoint.map(c=>`<li>${c}</li>`).join('')}</ul></div>` : '';
    const reflectHTML = p.reflection ? `<div class="reflect-box"><strong>💭 Hausnarketa</strong><ul>${p.reflection.map(r=>`<li>${r}</li>`).join('')}</ul></div>` : '';
    return `
      <div class="fase">
        <div class="fase-num" style="--fc:${d.accent||'#2E7DD1'}">${p.num}</div>
        <div class="fase-body">
          <h3>${p.title} <span class="fase-session">${p.session||''}</span></h3>
          ${p.content ? `<p>${p.content}</p>` : ''}
          ${challengesHTML}${checkHTML}${reflectHTML}
        </div>
      </div>`;
  }).join('');

  const materialHTML = (d.material||[]).map(m =>
    `<div class="material-item"><div class="material-icon">${m.icon}</div><span>${m.name}</span><span class="material-qty">${m.qty}</span></div>`
  ).join('');

  const proofHTML = d.proof_items ? `
    <div class="tab-content" data-content="proves">
      <h2>Proba-taula</h2>
      <p>Aurkezpena egin aurretik, proba hauek egin eta emaitzak apuntatu.</p>
      <div class="proof-table" id="proof-${id}"></div>
    </div>` : '';

  section.innerHTML = `
    <div class="unit-header" style="--accent:${d.accent||'#2E7DD1'}">
      <span class="unit-eyebrow">${d.eyebrow}</span>
      <h1>${d.title}</h1>
      <p class="unit-desc">${d.description}</p>
      <div class="unit-chips">${(d.chips||[]).map(c=>`<span class="chip">${c}</span>`).join('')}</div>
    </div>
    <div class="tabs" id="tabs-${id}">
      <button class="tab active" data-tab="context">Testuingurua</button>
      <button class="tab" data-tab="material">Materiala</button>
      <button class="tab" data-tab="fases">Faseak</button>
      ${d.proof_items ? '<button class="tab" data-tab="proves">Probak</button>' : ''}
      <button class="tab" data-tab="exercicis">Ariketak</button>
      ${DATA.site && DATA.site['delivery'+id.replace('p','')] ? '<button class="tab" data-tab="delivery">📋 Entrega</button>' : ''}
      ${DATA['help_'+id] ? '<button class="tab" data-tab="help">🆘 Zerbait ez dabil?</button>' : ''}
    </div>
    <div class="tab-content active" data-content="context">
      <h2>${d.context_heading||d.title}</h2>
      ${(d.context_paragraphs||[]).map(p=>`<p>${p}</p>`).join('')}
      ${d.research_question ? `<div class="question-box"><span class="question-icon">?</span><div><strong>Ikerketa-galdera</strong><p>${d.research_question}</p></div></div>` : ''}
      ${d.objectives ? `<h3>Helburuak</h3>${objListHTML(d.objectives)}` : ''}
    </div>
    <div class="tab-content" data-content="material">
      <h2>Beharrezko materiala</h2>
      <div class="material-grid">${materialHTML}</div>
      ${d.material_tip ? infoBoxHTML(d.material_tip) : ''}
    </div>
    <div class="tab-content" data-content="fases">
      <h2>Proiektuaren faseak</h2>
      <div class="fase-list">${phasesHTML}</div>
    </div>
    ${proofHTML}
    <div class="tab-content" data-content="exercicis">
      <h2>Ariketak</h2>
      <div id="quiz-${id}"></div>
      ${summaryCard(d.summary, nextId)}
    </div>
    ${(()=>{ const del = DATA.site && DATA.site['delivery'+id.replace('p','')]; return del ? `
    <div class="tab-content" data-content="delivery">
      <h2>${del.heading}</h2>
      <p style="color:var(--text-muted);margin-bottom:20px">${del.intro}</p>
      <div class="delivery-sections">
        ${(del.sections||[]).map(s => `
          <div class="delivery-section">
            <div class="delivery-num">${s.num}</div>
            <div class="delivery-body">
              <strong>${s.title}</strong>
              <p>${s.content}</p>
            </div>
          </div>`).join('')}
      </div>
      <div class="delivery-format">
        <strong>📄 Formatua eta aholkuak</strong>
        <ul>${(del.format_tips||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>
      <div class="delivery-deadline">
        <span>⏰</span> ${del.deadline}
      </div>
    </div>` : ''; })()}
    ${(()=>{
      const help = DATA['help_'+id];
      if (!help) return '';
      const stepsHTML = (help.protocol.steps||[]).map(s =>
        '<div class="help-step"><div class="help-step-num">' + s.num + '</div><div class="help-step-body"><strong>' + s.title + '</strong><p>' + s.text + '</p></div></div>'
      ).join('');
      const problemsHTML = (help.problems||[]).map(p => {
        const causesHTML = (p.causes||[]).map(c => '<li>' + c + '</li>').join('');
        return '<div class="help-problem"><div class="help-symptom">⚠️ ' + p.symptom + '</div><div class="help-detail"><div class="help-causes"><strong>Zergatik?</strong><ul>' + causesHTML + '</ul></div><div class="help-solution"><strong>✓ Konponbidea</strong><p>' + p.solution + '</p></div></div></div>';
      }).join('');
      return '<div class="tab-content" data-content="help"><h2>' + help.protocol.heading + '</h2><p style="color:var(--text-muted);margin-bottom:20px">' + help.protocol.intro + '</p><div class="help-protocol">' + stepsHTML + '</div><h3 style="margin:28px 0 16px;font-size:1rem">Arazo ohikoak</h3><div class="help-problems">' + problemsHTML + '</div></div>';
    })()}
  `;

  wireTabs(section);
  if (d.quiz) buildQuiz(`quiz-${id}`, d.quiz);
  if (d.proof_items) buildProofTable(`proof-${id}`, d.proof_items);
  section.querySelectorAll('.summary-next').forEach(btn => btn.onclick = () => goToUnit(nextId));
}

function renderT3a() {
  const d = DATA.t3a;
  const section = document.getElementById('unit-t3a');
  if (!d || !section) return;
  const nextId = UNITS[UNITS.indexOf('t3a')+1];

  const varBoxes = (d.variable_examples||[]).map(v =>
    `<div class="var-box"><div class="var-name">${v.name}</div><div class="var-value">${v.value}</div></div>`
  ).join('');

  section.innerHTML = `
    <div class="unit-header" style="--accent:#8B7355">
      <span class="unit-eyebrow">${d.eyebrow}</span>
      <h1>${d.title}</h1>
      <p class="unit-desc">${d.description}</p>
      <div class="unit-chips">${(d.chips||[]).map(c=>`<span class="chip">${c}</span>`).join('')}</div>
    </div>
    <div class="tabs" id="tabs-t3a">
      <button class="tab active" data-tab="baldintzak">Baldintzak</button>
      <button class="tab" data-tab="aldagaiak">Aldagaiak</button>
      <button class="tab" data-tab="exercicis">Ariketak</button>
    </div>
    <div class="tab-content active" data-content="baldintzak">
      <h2>${d.baldintzak_heading}</h2>
      <p>${d.baldintzak_intro}</p>
      <div class="analogy-box">
        <div class="analogy-real">
          <h4>🧠 ${d.analogy_real_title||'Gizakiok horrela pentsatzen dugu:'}</h4>
          <div class="analogy-flow">
            <div class="af-cond">${d.analogy_condition}</div>
            <div class="af-split">
              <div class="af-yes"><span class="af-label yes">BAI</span>${d.analogy_yes}</div>
              <div class="af-no"><span class="af-label no">EZ</span>${d.analogy_no}</div>
            </div>
          </div>
        </div>
        <div class="analogy-code">
          <h4>💻 Programak horrela idazten da:</h4>
          <div class="block-diagram">
            <div class="bd-block if">${d.analogy_condition}<div class="bd-block looks">${d.analogy_yes}</div></div>
            <div class="bd-block if">bestela →<div class="bd-block looks">${d.analogy_no}</div></div>
          </div>
        </div>
      </div>
      ${photoPlaceholder(d.baldintzak_photo)}
    </div>
    <div class="tab-content" data-content="aldagaiak">
      <h2>${d.aldagaiak_heading}</h2>
      <p>${d.aldagaiak_intro}</p>
      <div class="variable-visual">${varBoxes}</div>
      <div class="info-box" style="--box-color:#D4880A">
        <div class="info-box-icon">⚠️</div>
        <div><strong>Akats ohikoena</strong><p>${d.aldagaiak_warning}</p></div>
      </div>
      ${photoPlaceholder(d.aldagaiak_photo)}
    </div>
    <div class="tab-content" data-content="exercicis">
      <h2>Ariketak</h2>
      <div id="blockmatch-t3a" class="exercise-block"></div>
      <div id="quiz-t3a" style="margin-top:24px"></div>
      ${summaryCard(d.summary, nextId)}
    </div>
  `;

  wireTabs(section);
  if (d.block_match_pairs) buildBlockMatch('blockmatch-t3a', d.block_match_pairs);
  if (d.quiz) buildQuiz('quiz-t3a', d.quiz);
  section.querySelectorAll('.summary-next').forEach(btn => btn.onclick = () => goToUnit(nextId));
}

function renderT3b() {
  const d = DATA.t3b;
  const section = document.getElementById('unit-t3b');
  if (!d || !section) return;
  const nextId = UNITS[UNITS.indexOf('t3b')+1];

  const compareRows = (d.compare_rows||[]).map(r =>
    `<div class="ct-row"><span>${r.for}</span><span>${r.while}</span></div>`
  ).join('');

  section.innerHTML = `
    <div class="unit-header" style="--accent:#8B7355">
      <span class="unit-eyebrow">${d.eyebrow}</span>
      <h1>${d.title}</h1>
      <p class="unit-desc">${d.description}</p>
      <div class="unit-chips">${(d.chips||[]).map(c=>`<span class="chip">${c}</span>`).join('')}</div>
    </div>
    <div class="tabs" id="tabs-t3b">
      <button class="tab active" data-tab="zergatik">Zergatik begiztak?</button>
      <button class="tab" data-tab="for">FOR begiztа</button>
      <button class="tab" data-tab="while">WHILE begiztа</button>
      <button class="tab" data-tab="exercicis">Ariketak</button>
    </div>
    <div class="tab-content active" data-content="zergatik">
      <h2>${d.zergatik_heading}</h2>
      <p>${d.zergatik_intro}</p>
      <div class="bad-example"><div class="bad-label">✗ Horrela EZ</div><div class="block-diagram compact"><div class="bd-block motion">motor A 360° biratu</div><div class="bd-block motion">motor A 360° biratu</div><div class="bd-block motion">... (10 aldiz)</div></div></div>
      <div class="good-example"><div class="good-label">✓ Horrela BAI</div><div class="block-diagram compact"><div class="bd-block control">10 aldiz errepikatu 🔁<div class="bd-block motion">motor A 360° biratu</div></div></div></div>
      ${photoPlaceholder(d.zergatik_photo)}
    </div>
    <div class="tab-content" data-content="for">
      <h2>${d.for_heading}</h2>
      <p>${d.for_intro}</p>
      <div class="analogy-box">
        <div class="analogy-real">
          <h4>🧠 Bizitzan:</h4>
          <ul>${(d.for_real_examples||[]).map(e=>`<li>${e}</li>`).join('')}</ul>
          <p>${d.for_real_note||''}</p>
        </div>
        <div class="analogy-code">
          <h4>💻 Programan:</h4>
          <div class="block-diagram"><div class="bd-block control">4 aldiz errepikatu 🔁<div class="bd-block motion">aurrera joan</div><div class="bd-block motion">90° eskuinera biratu</div></div></div>
        </div>
      </div>
      ${infoBoxHTML(d.for_info)}
    </div>
    <div class="tab-content" data-content="while">
      <h2>${d.while_heading}</h2>
      <p>${d.while_intro}</p>
      <div class="analogy-box">
        <div class="analogy-real">
          <h4>🧠 Bizitzan:</h4>
          <ul>${(d.while_real_examples||[]).map(e=>`<li>${e}</li>`).join('')}</ul>
          <p>${d.while_real_note||''}</p>
        </div>
        <div class="analogy-code">
          <h4>💻 Programan:</h4>
          <div class="block-diagram"><div class="bd-block control">distantzia &gt; 20 cm arte errepikatu 🔁<div class="bd-block motion">motor A aurrera</div><div class="bd-block motion">motor B aurrera</div></div><div class="bd-block motion">motorrak gelditu</div></div>
        </div>
      </div>
      <div class="compare-table">
        <div class="ct-header"><span>FOR</span><span>WHILE</span></div>
        ${compareRows}
      </div>
      ${infoBoxHTML(d.while_warning)}
      ${photoPlaceholder(d.while_photo)}
    </div>
    <div class="tab-content" data-content="exercicis">
      <h2>Ariketak</h2>
      <div id="sort-t3b" class="exercise-block"></div>
      <div id="quiz-t3b" style="margin-top:24px"></div>
      ${summaryCard(d.summary, nextId)}
    </div>
  `;

  wireTabs(section);
  if (d.sort_exercise) buildSortExercise('sort-t3b', d.sort_exercise);
  if (d.quiz) buildQuiz('quiz-t3b', d.quiz);
  section.querySelectorAll('.summary-next').forEach(btn => btn.onclick = () => goToUnit(nextId));
}

function renderT3c() {
  const d = DATA.t3c;
  const section = document.getElementById('unit-t3c');
  if (!d || !section) return;
  const nextId = UNITS[UNITS.indexOf('t3c')+1];

  section.innerHTML = `
    <div class="unit-header" style="--accent:#8B7355">
      <span class="unit-eyebrow">${d.eyebrow}</span>
      <h1>${d.title}</h1>
      <p class="unit-desc">${d.description}</p>
      <div class="unit-chips">${(d.chips||[]).map(c=>`<span class="chip">${c}</span>`).join('')}</div>
    </div>
    <div class="tabs" id="tabs-t3c">
      <button class="tab active" data-tab="gertaerak">Gertaerak</button>
      <button class="tab" data-tab="egoerak">Egoerak</button>
      <button class="tab" data-tab="exercicis">Ariketak</button>
    </div>
    <div class="tab-content active" data-content="gertaerak">
      <h2>${d.gertaerak_heading}</h2>
      <p>${d.gertaerak_intro}</p>
      <div class="analogy-box">
        <div class="analogy-real">
          <h4>🧠 Bizitzan:</h4>
          <ul>${(d.gertaerak_real||[]).map(e=>`<li>${e}</li>`).join('')}</ul>
          <p>${d.gertaerak_note||''}</p>
        </div>
        <div class="analogy-code">
          <h4>💻 SPIKE-n:</h4>
          <div class="block-diagram"><div class="bd-hat event">ezkerreko botoia sakatzean 🔘</div><div class="bd-block variable">egoera aldatu</div><div class="bd-block myblock">bistaratzea eguneratu</div></div>
        </div>
      </div>
      ${photoPlaceholder(d.gertaerak_photo)}
    </div>
    <div class="tab-content" data-content="egoerak">
      <h2>${d.egoerak_heading}</h2>
      <p>${d.egoerak_intro}</p>
      <div class="analogy-box">
        <div class="analogy-real">
          <h4>🧠 Adibideak bizitzan:</h4>
          <ul>${(d.egoerak_real||[]).map(e=>`<li>${e}</li>`).join('')}</ul>
        </div>
        <div class="analogy-code">
          <h4>💻 Programan:</h4>
          <div class="block-diagram compact">
            <div class="bd-block variable">egoera = 0 ← desermatuta</div>
            <div class="bd-block variable">egoera = 1 ← armatuta</div>
            <div class="bd-block variable">egoera = 2 ← alarman</div>
          </div>
        </div>
      </div>
      <div class="states-diagram">
        <div class="state-node" style="--sc:#3A8C3A"><div class="state-name">DESARMATUA<br><small>(0)</small></div><div class="state-desc">LED berdea</div></div>
        <div class="state-arrow"><div class="arrow-label">Botoia →</div><div class="arrow-line">──────►</div><div class="arrow-label back">← Botoia</div></div>
        <div class="state-node" style="--sc:#2E7DD1"><div class="state-name">ARMATUA<br><small>(1)</small></div><div class="state-desc">LED urdina</div></div>
        <div class="state-arrow"><div class="arrow-label">Mugimendua →</div><div class="arrow-line">──────►</div></div>
        <div class="state-node" style="--sc:#D94060"><div class="state-name">ALARMAN<br><small>(2)</small></div><div class="state-desc">LED gorria</div></div>
      </div>
      ${infoBoxHTML(d.egoerak_key_info)}
      ${photoPlaceholder(d.egoerak_photo)}
    </div>
    <div class="tab-content" data-content="exercicis">
      <h2>Ariketak</h2>
      <div id="quiz-t3c"></div>
      ${summaryCard(d.summary, nextId)}
    </div>
  `;

  wireTabs(section);
  if (d.quiz) buildQuiz('quiz-t3c', d.quiz);
  section.querySelectorAll('.summary-next').forEach(btn => btn.onclick = () => goToUnit(nextId));
}

// ── Wire tabs helper ──────────────────────────────────────────────
function wireTabs(section) {
  const tabGroup = section.querySelector('.tabs');
  if (!tabGroup) return;
  tabGroup.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabGroup.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      section.querySelectorAll('.tab-content').forEach(c =>
        c.classList.toggle('active', c.dataset.content === tab.dataset.tab)
      );
    });
  });
}

// ── Navigation ────────────────────────────────────────────────────
const navItems   = document.querySelectorAll('.nav-item[data-unit]');
const units      = document.querySelectorAll('.unit');
const sidebar    = document.getElementById('sidebar');
const overlay    = document.getElementById('overlay');
const menuBtn    = document.getElementById('menuBtn');
const sidebarClose = document.getElementById('sidebarClose');
const topbarTitle  = document.getElementById('topbarTitle');

function goToUnit(unitId) {
  // If locked, show locked screen but still navigate (visual only)
  units.forEach(u => u.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));
  const unit = document.getElementById('unit-' + unitId);
  const nav  = document.querySelector(`.nav-item[data-unit="${unitId}"]`);
  if (unit) unit.classList.add('active');
  if (nav)  { nav.classList.add('active'); updateProgress(unitId); }
  const title = nav?.querySelector('.nav-title')?.textContent || 'IKT Programazioa';
  topbarTitle.textContent = title;
  if (window.innerWidth < 768) closeSidebar();
  window.scrollTo(0, 0);
}

function updateProgress(unitId) {
  // Progress tracking removed — web is a support tool, not a course
}

navItems.forEach(item => item.addEventListener('click', () => goToUnit(item.dataset.unit)));

function openSidebar()  { sidebar.classList.add('open');    overlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }
menuBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// ── Exercise builders ─────────────────────────────────────────────

function buildQuiz(containerId, questions) {
  const container = document.getElementById(containerId);
  if (!container || !questions) return;
  questions.forEach((q, qi) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    const opts = (q.options||q.opts||[]).map((opt, oi) =>
      `<button class="quiz-opt" data-idx="${oi}">${opt}</button>`
    ).join('');
    card.innerHTML = `
      <div class="quiz-num">${qi + 1}. galdera ${questions.length}-tik</div>
      <div class="quiz-q">${q.question||q.q}</div>
      <div class="quiz-options">${opts}</div>
      <div class="quiz-feedback"></div>`;
    const btns     = card.querySelectorAll('.quiz-opt');
    const feedback = card.querySelector('.quiz-feedback');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const chosen = parseInt(btn.dataset.idx);
        const isCorrect = chosen === q.correct;
        btns.forEach((b, bi) => {
          b.classList.add('disabled');
          if (bi === q.correct) b.classList.add('correct');
          else if (bi === chosen && !isCorrect) b.classList.add('wrong');
        });
        feedback.className = `quiz-feedback show ${isCorrect ? 'ok' : 'bad'}`;
        feedback.textContent = isCorrect ? '✓ ' + q.feedback : '✗ Erantzun okerra. ' + q.feedback;
      });
    });
    container.appendChild(card);
  });
}

function buildSortExercise(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container || !data) return;
  const shuffled = [...data.items].sort(() => Math.random() - 0.5);
  container.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-num">Ariketa — Ordenatu urratsak</div>
      <div class="quiz-q">${data.title}</div>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">Arrastatu urratsak orden egokian jartzeko:</p>
      <div class="algo-steps" id="${containerId}-list"></div>
      <button class="ex-check-btn" onclick="checkSort('${containerId}',${JSON.stringify(data.correct_order||data.correctOrder||[])})">Egiaztatu ordena</button>
      <div class="ex-result" id="${containerId}-result"></div>
    </div>`;
  const list = document.getElementById(`${containerId}-list`);
  shuffled.forEach((item, i) => {
    const step = document.createElement('div');
    step.className = 'algo-step';
    step.draggable = true;
    step.dataset.id = item.id;
    step.innerHTML = `<span class="step-num">${i+1}</span><span>${item.text}</span>`;
    addDragSort(step, list);
    list.appendChild(step);
  });
  const btn = document.getElementById(`${containerId}-btn`);
  if (btn) btn.addEventListener('click', () => {
    checkSort(containerId, data.correct_order || data.correctOrder || []);
  });
}
function addDragSort(el, container) {
  el.addEventListener('dragstart', () => el.classList.add('dragging'));
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    container.querySelectorAll('.algo-step').forEach((s,i) => s.querySelector('.step-num').textContent = i+1);
  });
  el.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = container.querySelector('.dragging');
    if (dragging && dragging !== el) {
      const mid = el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
      if (e.clientY < mid) container.insertBefore(dragging, el);
      else container.insertBefore(dragging, el.nextSibling);
    }
  });
}
window.checkSort = function(containerId, correctOrder) {
  const list = document.getElementById(`${containerId}-list`);
  const result = document.getElementById(`${containerId}-result`);
  const current = [...list.querySelectorAll('.algo-step')].map(s => s.dataset.id);
  const isCorrect = JSON.stringify(current) === JSON.stringify(correctOrder);
  result.className = `ex-result show ${isCorrect ? 'ok' : 'bad'}`;
  result.textContent = isCorrect ? '✓ Ezin hobeto! Urrats guztiak orden egokian daude.' : '✗ Hurrenkera ez da zuzena. Saiatu berriro.';
};

function buildDragClassify(containerId, items, zones) {
  const container = document.getElementById(containerId);
  if (!container || !items) return;
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const zonesHTML = zones.map(z => [
    '<div class="drag-zone-wrap">',
    '<div class="drag-zone-label" style="color:' + z.color + ';border-color:' + z.color + '">' + z.label + '</div>',
    '<div class="ex-drop-zone" id="' + containerId + '-zone-' + z.id + '" data-zone="' + z.id + '"',
    ' ondragover="event.preventDefault();this.classList.add(\'drag-active\')"',
    ' ondragleave="this.classList.remove(\'drag-active\')"',
    ' ondrop="handleDrop(event,\'' + containerId + '\'">',
    '<span style="font-size:0.8rem;color:var(--text-dim);align-self:center;padding:4px">Arrastatu hona</span>',
    '</div></div>'
  ].join('')).join('');
  const itemsHTML = shuffled.map(item => [
    '<div class="ex-drag-item" draggable="true"',
    ' data-correct="' + item.correct + '"',
    ' data-label="' + item.label + '">',
    item.label,
    '</div>'
  ].join('')).join('');
  container.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-num">Ariketa — Sailkatu elementuak</div>
      <div class="quiz-q">Arrastatu osagai bakoitza bere kategorian:</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;padding:12px;background:var(--bg3);border-radius:var(--radius)" id="${containerId}-pool">${itemsHTML}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">${zonesHTML}</div>
      <button class="ex-check-btn" onclick="checkClassify('${containerId}')">Egiaztatu</button>
      <div class="ex-result" id="${containerId}-result"></div>
    </div>`;
  container.querySelectorAll('.ex-drag-item').forEach(item => {
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragstart', e => {
      item.classList.add('dragging');
      e.dataTransfer.setData('text/plain', item.dataset.label + '|||' + containerId);
    });
  });
}
window.handleDrop = function(event, containerId) {
  event.preventDefault();
  const zone = event.currentTarget;
  zone.classList.remove('drag-active');
  const data = event.dataTransfer.getData('text/plain');
  if (!data) return;
  const [label, src] = data.split('|||');
  if (src !== containerId) return;
  const item = document.querySelector(`[data-label="${label}"][data-correct]`);
  if (!item) return;
  zone.querySelectorAll('span').forEach(s => s.remove());
  zone.appendChild(item);
};
window.checkClassify = function(containerId) {
  const result = document.getElementById(`${containerId}-result`);
  const allItems = document.querySelectorAll(`#${containerId} .ex-drag-item`);
  let correct = 0, total = 0;
  allItems.forEach(item => {
    const zone = item.closest('.ex-drop-zone');
    if (!zone) return;
    total++;
    if (zone.dataset.zone === item.dataset.correct) correct++;
  });
  const isAll = correct === total && total > 0;
  result.className = `ex-result show ${isAll ? 'ok' : 'bad'}`;
  result.textContent = isAll ? `✓ Perfektua! ${correct}/${total} ondo sailkatuta.` : `${correct}/${total} ondo. Begiratu oker daudenak.`;
};

function buildBlockMatch(containerId, pairs) {
  const container = document.getElementById(containerId);
  if (!container || !pairs) return;
  const shuffledBlocks = [...pairs].sort(() => Math.random() - 0.5);
  const rowsHTML = pairs.map(p => `
    <div class="bm-row">
      <div class="bm-situation">${p.situation}</div>
      <div class="bm-arrow">→</div>
      <select class="bm-select" data-correct="${p.correct}">
        <option value="">— Aukeratu —</option>
        ${shuffledBlocks.map(b=>`<option value="${b.correct}">${b.correct}</option>`).join('')}
      </select>
    </div>`).join('');
  container.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-num">Ariketa — Bloke egokia aukeratu</div>
      <div class="quiz-q">Egoera bakoitzarentzat bloke egokia hautatu:</div>
      <div class="bm-table" style="margin:14px 0">${rowsHTML}</div>
      <button class="ex-check-btn" onclick="checkBlockMatch('${containerId}')">Egiaztatu</button>
      <div class="ex-result" id="${containerId}-result"></div>
    </div>`;
}
window.checkBlockMatch = function(containerId) {
  const result = document.getElementById(`${containerId}-result`);
  const selects = document.querySelectorAll(`#${containerId} .bm-select`);
  let correct = 0;
  selects.forEach(sel => {
    if (sel.value === sel.dataset.correct) { correct++; sel.style.borderColor = '#3A8C3A'; }
    else sel.style.borderColor = '#D94060';
  });
  const isAll = correct === selects.length;
  result.className = `ex-result show ${isAll ? 'ok' : 'bad'}`;
  result.textContent = isAll ? '✓ Guztiak ondo!' : `${correct}/${selects.length} ondo. Gorriz markatutakoak berrikusi.`;
};

function buildProofTable(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container || !items) return;
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'proof-item';
    row.innerHTML = `
      <div class="proof-num">${item.num}</div>
      <div><div class="proof-desc">${item.desc}</div><div class="proof-expected">${item.expected}</div></div>
      <div class="proof-btns">
        <button class="proof-btn" data-result="ok" title="Proba gainditu">✓</button>
        <button class="proof-btn" data-result="fail" title="Proba huts egin">✗</button>
      </div>`;
    row.querySelectorAll('.proof-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        row.querySelectorAll('.proof-btn').forEach(b => b.classList.remove('ok','fail'));
        btn.classList.add(btn.dataset.result);
        row.classList.remove('passed','failed');
        row.classList.add(btn.dataset.result === 'ok' ? 'passed' : 'failed');
      });
    });
    container.appendChild(row);
  });
}

// ── Add bm-select styles ──────────────────────────────────────────
const bmStyle = document.createElement('style');
bmStyle.textContent = `.bm-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap}.bm-situation{flex:1;min-width:180px;font-size:.85rem;color:var(--text);padding:8px 12px;background:var(--bg3);border-radius:var(--radius);border:1px solid var(--border)}.bm-arrow{color:var(--text-dim);font-weight:700}.bm-select{padding:8px 12px;border-radius:var(--radius);border:1px solid var(--border);background:#fff;font-family:var(--font-body);font-size:.85rem;color:var(--text);cursor:pointer;transition:border-color .2s}.bm-select:focus{outline:none;border-color:var(--spike-blue)}.unit-loading{padding:60px 48px;color:var(--text-dim);font-style:italic}`;
document.head.appendChild(bmStyle);

// ── Bootstrap ────────────────────────────────────────────────────
function renderLocks() {
  const unlocked = DATA.site && DATA.site.unlocked || {};
  navItems.forEach(nav => {
    const unitId = nav.dataset.unit;
    if (!unitId || unitId === 'intro' || unitId === 'glossari') return;
    const locked = unlocked[unitId] !== true;
    // Update nav appearance
    nav.classList.toggle('nav-locked', locked);
    // Add/remove lock icon
    const existing = nav.querySelector('.nav-lock-icon');
    if (locked && !existing) {
      const icon = document.createElement('span');
      icon.className = 'nav-lock-icon';
      icon.textContent = '🔒';
      nav.appendChild(icon);
    } else if (!locked && existing) {
      existing.remove();
    }
    // Replace unit content with locked screen if locked
    if (locked) {
      renderLockedUnit(unitId);
    }
  });
}

async function init() {
  await loadAllContent();

  renderSite();
  renderT1();
  renderT2();
  renderT3a();
  renderT3b();
  renderT3c();
  ['p1','p2','p3','p4'].forEach(renderProjectUnit);
  renderGlossary();

  // Glossary search
  document.getElementById('glossarySearch')?.addEventListener('input', e => renderGlossary(e.target.value));

  // Apply lock state to nav and units
  renderLocks();

  // Hide loading screen
  const ls = document.getElementById('loadingScreen');
  if (ls) { ls.classList.add('hidden'); setTimeout(() => ls.remove(), 500); }
}

init();
