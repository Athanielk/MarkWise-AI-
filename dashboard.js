/* MarkWise AI - Main dashboard SPA views */
(function() {
  const { api, upload, toast, showLoading, hideLoading, registerView, go, state, timeAgo, fmtPct, confClass, confLabel, confColor } = MarkWise;

  /* ========== DASHBOARD ========== */
  registerView('dashboard', async (view) => {
    const d = await api('/dashboard');
    const user = d.user;
    const pctUsed = Math.round(user.scripts_marked/user.plan_limit*100);

    view.innerHTML = `
      <div class="welcome">
        <h2>Welcome back, ${user.name} 👋</h2>
        <p>Here's what's happening today.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fa fa-folder-open"></i></div>
          <div><div class="stat-value">${d.stats.assessmentsCount}</div><div class="stat-label">Assessments</div><div class="stat-sub"><i class="fa fa-clock"></i> ${d.stats.assessmentsCount>0?'1 today':'Start now'}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fa fa-cloud-upload-alt"></i></div>
          <div><div class="stat-value">${d.stats.scriptsUploaded}</div><div class="stat-label">Scripts Uploaded</div><div class="stat-sub"><i class="fa fa-arrow-up"></i> Total</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa fa-check-circle"></i></div>
          <div><div class="stat-value">${d.stats.scriptsMarked}</div><div class="stat-label">Scripts Marked</div><div class="stat-sub"><i class="fa fa-percentage"></i> ${d.stats.scriptsUploaded?Math.round(d.stats.scriptsMarked/d.stats.scriptsUploaded*100):0}%</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="fa fa-exclamation-triangle"></i></div>
          <div><div class="stat-value">${d.stats.needsModeration}</div><div class="stat-label">Needs Moderation</div><div class="stat-sub" style="color:var(--danger)"><i class="fa fa-bell"></i> 15%</div></div>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <div class="card">
            <div class="card-title"><i class="fa fa-history"></i> Recent Activity
              <div class="card-header-actions"><a href="#" id="viewAllAct" style="font-size:12px;">View all</a></div>
            </div>
            <ul class="activity-list">
              ${d.activities.length ? d.activities.map(a => `
                <li class="activity-item">
                  <div class="activity-dot"><i class="fa ${a.icon}"></i></div>
                  <div class="activity-info">
                    <div class="activity-title">${a.title}</div>
                    <div class="activity-meta">${a.detail}</div>
                  </div>
                  <div class="activity-time">${timeAgo(a.created_at)}</div>
                </li>`).join('') : '<div class="empty-state"><p>No activity yet.</p></div>'}
            </ul>
          </div>

          <div class="card">
            <div class="card-title"><i class="fa fa-rocket"></i> Quick Actions</div>
            <div class="grid-3" style="gap:12px;">
              <button class="btn btn-outline" style="flex-direction:column;padding:20px;gap:8px;" onclick="MarkWise.Router.go('setup')">
                <i class="fa fa-plus-circle" style="font-size:24px;"></i><div>New Assessment</div>
              </button>
              <button class="btn btn-outline" style="flex-direction:column;padding:20px;gap:8px;" onclick="MarkWise.Router.go('upload')">
                <i class="fa fa-upload" style="font-size:24px;"></i><div>Upload Scripts</div>
              </button>
              <button class="btn btn-outline" style="flex-direction:column;padding:20px;gap:8px;" onclick="MarkWise.Router.go('moderation')">
                <i class="fa fa-check-double" style="font-size:24px;"></i><div>Moderate</div>
              </button>
            </div>
          </div>
        </div>

        <div>
          <div class="card sub-card">
            <div class="card-title"><i class="fa fa-crown"></i> Subscription</div>
            <div class="plan-badge">${user.plan}</div>
            <div class="sub-usage">${user.scripts_marked} / ${user.plan_limit}</div>
            <div style="font-size:12px;color:var(--grey-500);">Scripts this month</div>
            <div class="sub-bar"><div class="sub-bar-fill" style="width:${pctUsed}%"></div></div>
            <div class="sub-renew"><i class="fa fa-calendar"></i> Renewal: 15 June 2025</div>
            <button class="btn btn-primary btn-sm" style="margin-top:12px;width:100%;">Manage Plan</button>
          </div>

          <div class="card">
            <div class="card-title"><i class="fa fa-bell"></i> Notifications</div>
            <ul class="activity-list" style="list-style:none;">
              ${d.notifications.length ? d.notifications.slice(0,3).map(n => `
                <li class="activity-item">
                  <div class="activity-dot" style="background:${n.type==='warning'?'var(--warning-bg)':n.type==='success'?'var(--success-bg)':'#E3F2FD'};color:${n.type==='warning'?'var(--warning)':n.type==='success'?'var(--success)':'var(--primary)'};">
                    <i class="fa fa-bell"></i>
                  </div>
                  <div class="activity-info"><div class="activity-title">${n.message}</div></div>
                </li>`).join('') : '<div class="empty-state" style="padding:16px;"><p style="font-size:13px;">No notifications</p></div>'}
            </ul>
          </div>
        </div>
      </div>
    `;

    document.getElementById('viewAllAct')?.addEventListener('click', (e) => { e.preventDefault(); go('assessments'); });
  });

  /* ========== ASSESSMENTS LIST ========== */
  registerView('assessments', async (view) => {
    const { assessments } = await api('/assessments');
    view.innerHTML = `
      <div class="page-header">
        <div><h2>Assessments</h2><p>Manage your Mathematics assessments</p></div>
        <button class="btn btn-primary" onclick="MarkWise.Router.go('setup')"><i class="fa fa-plus"></i> New Assessment</button>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa fa-list"></i> All Assessments (${assessments.length})</div>
        ${assessments.length ? assessments.map(a => {
          const pct = a.total_scripts ? Math.round(a.marked_scripts/a.total_scripts*100) : 0;
          const statusBadge = a.status==='completed' ? `<span class="badge-pill badge-success">Completed</span>`
            : a.status==='marked' ? `<span class="badge-pill badge-warning">Needs Moderation</span>`
            : a.status==='uploaded' ? `<span class="badge-pill badge-info">Ready to Mark</span>`
            : `<span class="badge-pill badge-neutral">Setup</span>`;
          return `
          <div class="assessment-card">
            <div class="info">
              <h4><i class="fa fa-file-alt" style="color:var(--primary);margin-right:8px;"></i>${a.title}</h4>
              <div class="meta">${a.grade||''} ${a.class_name?'- '+a.class_name:''} • ${a.assessment_type||''} ${a.paper?'• '+a.paper:''} • Total: ${a.total_marks}</div>
            </div>
            <div class="progress">
              ${statusBadge}
              <div class="p-bar"><div class="p-bar-fill" style="width:${pct}%"></div></div>
              <span style="font-size:11px;color:var(--grey-500);">${a.marked_scripts}/${a.total_scripts||0}</span>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-sm btn-outline" onclick="MarkWise.openAssessment('${a.id}','upload')"><i class="fa fa-upload"></i></button>
              <button class="btn btn-sm btn-outline" onclick="MarkWise.openAssessment('${a.id}','moderation')"><i class="fa fa-check-double"></i></button>
              <button class="btn btn-sm btn-primary" onclick="MarkWise.openAssessment('${a.id}','results')"><i class="fa fa-chart-bar"></i></button>
            </div>
          </div>`;
        }).join('') : `
          <div class="empty-state">
            <i class="fa fa-folder-open"></i>
            <h4>No assessments yet</h4>
            <p>Create your first assessment to get started</p>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="MarkWise.Router.go('setup')"><i class="fa fa-plus"></i> New Assessment</button>
          </div>`}
      </div>
    `;
  });

  // Helper to set current assessment id and navigate
  MarkWise.openAssessment = (id, route) => {
    state.currentAssessment = id;
    // store in sessionStorage
    sessionStorage.setItem('currentAssessment', id);
    go(route);
  };

  /* ========== SETUP ========== */
  registerView('setup', async (view) => {
    view.innerHTML = `
      <div class="steps">
        <div class="step active"><span class="step-num">1</span> Assessment Setup</div>
        <div class="step"><span class="step-num">2</span> Upload Documents</div>
        <div class="step"><span class="step-num">3</span> AI Marking</div>
        <div class="step"><span class="step-num">4</span> Moderation</div>
        <div class="step"><span class="step-num">5</span> Results</div>
      </div>
      <div class="card setup-card">
        <div class="card-title" style="font-size:18px;"><i class="fa fa-pencil-ruler"></i> Create New Assessment</div>
        <div class="card-sub">Configure your assessment details before uploading scripts.</div>
        <form id="setupForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Grade</label>
              <select class="form-control" id="grade" required>
                <option value="">Select grade</option>
                <option>Grade 8</option><option>Grade 9</option><option selected>Grade 10</option>
                <option>Grade 11</option><option>Grade 12</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Class</label>
              <select class="form-control" id="class" required>
                <option value="">Select class</option>
                <option>10A</option><option selected>10A</option><option>10B</option><option>11A</option><option>11B</option><option>12A</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Subject</label>
              <select class="form-control" id="subject" required>
                <option>Mathematics</option><option>Mathematical Literacy</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Assessment Type</label>
              <select class="form-control" id="type" required>
                <option>Test</option><option>Assignment</option><option>Controlled Test</option><option>Examination</option><option>Project</option><option>Investigation</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Paper</label>
              <select class="form-control" id="paper">
                <option>Paper 1</option><option>Paper 2</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Total Marks</label>
              <input type="number" class="form-control" id="totalMarks" value="100" min="1" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Assessment Title (optional)</label>
            <input type="text" class="form-control" id="title" placeholder="e.g. Grade 10 Math Test - Paper 1" />
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px;"><i class="fa fa-arrow-right"></i> Continue to Upload</button>
        </form>
      </div>
    `;

    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoading('Creating assessment...');
      try {
        const body = {
          title: document.getElementById('title').value,
          grade: document.getElementById('grade').value,
          class_name: document.getElementById('class').value,
          subject: document.getElementById('subject').value,
          assessment_type: document.getElementById('type').value,
          paper: document.getElementById('paper').value,
          total_marks: parseInt(document.getElementById('totalMarks').value)
        };
        const r = await api('/assessments', { method: 'POST', body });
        state.currentAssessment = r.id;
        sessionStorage.setItem('currentAssessment', r.id);
        toast('Assessment created!', 'success');
        go('upload');
      } catch(err) { toast(err.message, 'error'); }
      finally { hideLoading(); }
    });
  });

  /* ========== UPLOAD ========== */
  registerView('upload', async (view) => {
    let aid = state.currentAssessment || sessionStorage.getItem('currentAssessment');
    if (!aid) {
      // Try to pick the most recent assessment
      const { assessments } = await api('/assessments');
      if (!assessments.length) { view.innerHTML = `<div class="card"><div class="empty-state"><i class="fa fa-exclamation-triangle"></i><h4>No assessment selected</h4><p>Please set up an assessment first.</p><button class="btn btn-primary" style="margin-top:12px;" onclick="MarkWise.Router.go('setup')">Create Assessment</button></div></div>`; return; }
      aid = assessments[0].id; state.currentAssessment = aid; sessionStorage.setItem('currentAssessment', aid);
    }
    const a = await api('/assessments/'+aid);

    view.innerHTML = `
      <div class="steps">
        <div class="step done"><span class="step-num"><i class="fa fa-check"></i></span> Assessment Setup</div>
        <div class="step active"><span class="step-num">2</span> Upload Documents</div>
        <div class="step"><span class="step-num">3</span> AI Marking</div>
        <div class="step"><span class="step-num">4</span> Moderation</div>
        <div class="step"><span class="step-num">5</span> Results</div>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa fa-upload"></i> Upload Assessment Files</div>
        <div class="card-sub" style="color:var(--grey-500);font-size:12px;margin-bottom:16px;">
          <b>${a.assessment.title}</b> — ${a.assessment.grade||''} ${a.assessment.class_name||''} • ${a.assessment.assessment_type||''} ${a.assessment.paper||''}
        </div>

        <div class="form-group">
          <label class="form-label">Memorandum (PDF or image)</label>
          <div class="upload-zone" id="memoZone">
            <i class="fa fa-file-contract"></i>
            <p>Click to upload or drag and drop</p>
            <small>PDF, JPG, PNG • Answer key with all solutions</small>
            <input type="file" id="memoInput" accept=".pdf,image/*" hidden />
            <div id="memoChip" class="file-chip" style="display:none;"></div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Question Paper (PDF or image)</label>
          <div class="upload-zone" id="qpZone">
            <i class="fa fa-file-alt"></i>
            <p>Click to upload or drag and drop</p>
            <small>PDF, JPG, PNG • The question paper given to learners</small>
            <input type="file" id="qpInput" accept=".pdf,image/*" hidden />
            <div id="qpChip" class="file-chip" style="display:none;"></div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Learner Scripts <span style="color:var(--grey-500);font-weight:400;">(images or PDF; multiple allowed)</span></label>
          <div class="upload-zone" id="scriptsZone">
            <i class="fa fa-copy"></i>
            <p>Click to upload or drag and drop multiple files</p>
            <small>Supports smartphone scans and document scanners</small>
            <input type="file" id="scriptsInput" accept=".pdf,image/*" multiple hidden />
            <div id="scriptsChip" class="file-chip" style="display:none;"></div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Teacher Instructions <span style="color:var(--grey-500);font-weight:400;">(optional)</span></label>
          <textarea class="form-control" id="teacherInstr" placeholder="e.g. Accept alternative methods.&#10;Award follow-through marks.&#10;Ignore crossed-out work.&#10;Apply special moderation rules.">${a.assessment.teacher_instructions||'Accept alternative methods.\nAward follow-through marks.\nIgnore crossed-out work.'}</textarea>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
          <button class="btn btn-light" onclick="MarkWise.Router.go('setup')"><i class="fa fa-arrow-left"></i> Back</button>
          <button class="btn btn-primary" id="startMarkBtn"><i class="fa fa-robot"></i> Start AI Marking</button>
        </div>
      </div>
    `;

    // Wire upload zones
    function bindZone(zoneId, inputId, chipId, cb) {
      const zone = document.getElementById(zoneId);
      const input = document.getElementById(inputId);
      const chip = document.getElementById(chipId);
      zone.addEventListener('click', () => input.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault(); zone.classList.remove('drag');
        const files = e.dataTransfer.files;
        if (files.length) cb(files);
      });
      input.addEventListener('change', () => { if (input.files.length) cb(input.files); });
    }
    let memoFile = null, qpFile = null, scriptFiles = [];

    bindZone('memoZone','memoInput','memoChip', async (files) => {
      memoFile = files[0];
      try {
        const r = await upload(`/assessments/${aid}/upload/memo`, memoFile, 'file');
        document.getElementById('memoChip').style.display='inline-flex';
        document.getElementById('memoChip').innerHTML = `<i class="fa fa-check-circle"></i> ${memoFile.name} • ${(memoFile.size/1024).toFixed(0)} KB`;
        toast('Memorandum uploaded', 'success');
      } catch(e) { toast(e.message,'error'); }
    });
    bindZone('qpZone','qpInput','qpChip', async (files) => {
      qpFile = files[0];
      try {
        const r = await upload(`/assessments/${aid}/upload/question`, qpFile, 'file');
        document.getElementById('qpChip').style.display='inline-flex';
        document.getElementById('qpChip').innerHTML = `<i class="fa fa-check-circle"></i> ${qpFile.name} • ${(qpFile.size/1024).toFixed(0)} KB`;
        toast('Question paper uploaded', 'success');
      } catch(e) { toast(e.message,'error'); }
    });
    bindZone('scriptsZone','scriptsInput','scriptsChip', async (files) => {
      try {
        const r = await upload(`/assessments/${aid}/upload/scripts`, Array.from(files), 'files');
        scriptFiles = scriptFiles.concat(Array.from(files));
        document.getElementById('scriptsChip').style.display='inline-flex';
        document.getElementById('scriptsChip').innerHTML = `<i class="fa fa-check-circle"></i> ${scriptFiles.length} files uploaded • ${(scriptFiles.reduce((s,f)=>s+f.size,0)/1024).toFixed(0)} KB`;
        toast(`${r.count} scripts uploaded`, 'success');
      } catch(e) { toast(e.message,'error'); }
    });

    // Seed demo scripts if none uploaded
    async function seedDemoScripts() {
      // Generate fake files in memory? Simpler: create 48 script entries without real files via API call... but our endpoint requires uploads.
      // Instead, simulate by calling a small helper endpoint? We'll simulate on client by POSTing an array via existing endpoint using empty blobs.
      const fakeFiles = [];
      for (let i=0;i<48;i++) {
        fakeFiles.push(new File(['simulated'], `learner_${i+1}.jpg`, { type:'image/jpeg' }));
      }
      await upload(`/assessments/${aid}/upload/scripts`, fakeFiles, 'files');
    }

    document.getElementById('startMarkBtn').addEventListener('click', async () => {
      // Save instructions
      const instr = document.getElementById('teacherInstr').value;
      await api(`/assessments/${aid}`, { method:'PUT', body:{ teacher_instructions: instr } });

      // If no scripts uploaded, seed demo scripts for the MVP flow
      const scriptsCheck = await api(`/assessments/${aid}/scripts`).catch(()=>({scripts:[]}));
      showLoading('AI is marking scripts...', 'Processing');
      try {
        if (!scriptsCheck.scripts.length) {
          await seedDemoScripts();
        }
        await api(`/assessments/${aid}/mark`, { method: 'POST' });
        hideLoading();
        toast('AI marking complete! Review moderation.', 'success');
        go('moderation');
      } catch(err) { hideLoading(); toast(err.message, 'error'); }
    });
  });

  /* ========== MODERATION ========== */
  registerView('moderation', async (view) => {
    const aid = state.currentAssessment || sessionStorage.getItem('currentAssessment');
    if (!aid) { view.innerHTML = `<div class="card"><div class="empty-state"><i class="fa fa-exclamation-triangle"></i><h4>No assessment in progress</h4><button class="btn btn-primary" style="margin-top:12px;" onclick="MarkWise.Router.go('setup')">Start new assessment</button></div></div>`; return; }
    const a = await api('/assessments/'+aid);
    const { scripts } = await api(`/assessments/${aid}/scripts`);
    const sugg = await api(`/assessments/${aid}/moderation/suggested`);
    if (!scripts.length) { view.innerHTML = `<div class="card"><div class="empty-state"><i class="fa fa-upload"></i><h4>No scripts uploaded</h4><p>Upload learner scripts to begin moderation.</p><button class="btn btn-primary" style="margin-top:12px;" onclick="MarkWise.Router.go('upload')">Go to Upload</button></div></div>`; return; }

    const allScripts = scripts;
    let currentScript = sugg.lowConfidence[0] || sugg.highest || scripts[0];

    view.innerHTML = `
      <div class="steps">
        <div class="step done"><span class="step-num"><i class="fa fa-check"></i></span> Setup</div>
        <div class="step done"><span class="step-num"><i class="fa fa-check"></i></span> Upload</div>
        <div class="step done"><span class="step-num"><i class="fa fa-check"></i></span> AI Marking</div>
        <div class="step active"><span class="step-num">4</span> Moderation / Review</div>
        <div class="step"><span class="step-num">5</span> Results</div>
      </div>
      <div class="page-header">
        <div><h2>Moderation</h2><p>${a.assessment.title} — <span id="reviewedCount">${scripts.filter(s=>s.moderated).length}</span> of ${scripts.length} reviewed</p></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-light btn-sm" onclick="MarkWise.Router.go('upload')"><i class="fa fa-arrow-left"></i> Back</button>
          <button class="btn btn-success btn-sm" id="finalizeBtn"><i class="fa fa-check-circle"></i> Finalize & View Results</button>
        </div>
      </div>
      <div class="moderation-wrap">
        <div class="script-list" id="scriptList"></div>
        <div id="moderationDetail"><div class="spinner"></div></div>
      </div>
    `;

    function renderList() {
      const html = `
        <div style="padding:8px 12px;font-size:13px;font-weight:600;color:var(--grey-700);display:flex;justify-content:space-between;align-items:center;">
          <span><i class="fa fa-robot" style="color:var(--primary);margin-right:6px;"></i>AI suggests ${(sugg.lowConfidence?.length||0)+2} scripts</span>
          <button class="btn btn-sm btn-light" id="addScriptBtn" title="Add script"><i class="fa fa-plus"></i></button>
        </div>
        <div class="suggested-group" style="color:var(--success);">Highest Mark</div>
        ${sugg.highest ? scriptItem(sugg.highest, currentScript.id) : ''}
        <div class="suggested-group" style="color:var(--danger);">Lowest Mark</div>
        ${sugg.lowest ? scriptItem(sugg.lowest, currentScript.id) : ''}
        <div class="suggested-group" style="color:var(--warning);">Low Confidence</div>
        ${(sugg.lowConfidence||[]).map(s => scriptItem(s, currentScript.id)).join('')}
        <div class="suggested-group">Random Pick</div>
        ${sugg.random ? scriptItem(sugg.random, currentScript.id) : ''}
        <div class="suggested-group">All Scripts (${allScripts.length})</div>
        ${allScripts.map(s => scriptItem(s, currentScript.id)).join('')}
      `;
      document.getElementById('scriptList').innerHTML = html;
      document.querySelectorAll('.script-list-item').forEach(el => el.addEventListener('click', () => {
        const id = el.dataset.id;
        currentScript = allScripts.find(x => x.id === id);
        renderList(); renderDetail();
      }));
      document.getElementById('addScriptBtn')?.addEventListener('click', () => {
        const notIn = allScripts.find(s => !document.querySelector(`.script-list-item[data-id="${s.id}"]`) || true);
        toast('You can select any script from the list below to add.', 'info');
      });
    }

    function scriptItem(s, curId) {
      const isActive = s.id === curId;
      const status = s.moderated ? `<span class="badge-pill badge-success"><i class="fa fa-check"></i></span>` : s.flagged ? `<span class="badge-pill badge-danger"><i class="fa fa-flag"></i></span>` : '';
      return `<div class="script-list-item ${isActive?'active':''}" data-id="${s.id}">
        <span><i class="fa fa-file-alt" style="margin-right:6px;opacity:.6;"></i>${s.learner_name} <small style="opacity:.7;">• ${s.marks}/${a.assessment.total_marks}</small></span>
        <span style="display:flex;gap:6px;align-items:center;">
          <span class="script-conf ${confClass(s.ai_confidence)}">${confLabel(s.ai_confidence)}</span>
          ${status}
        </span>
      </div>`;
    }

    async function renderDetail() {
      const full = await api(`/scripts/${currentScript.id}`);
      const s = full.script;
      const memoLines = [
        'Q1: x = 5 (3 marks)',
        'Q2: y = 12; perimeter = 34 (4 marks)',
        'Q3: Gradient m = 2/3 (3 marks)',
        'Q4: Area = 48.5 cm² (5 marks)',
        'Q5: Factors (x-2)(x+3) (4 marks)',
        'Q6: θ = 60° (5 marks)',
        'Q7: Proof: SAS congruency (6 marks)',
        'Q8: Sequence nth term Tn = 3n+2 (5 marks)',
        'Q9: Probability = 5/18 (4 marks)',
        'Q10: Graph sketch shown (6 marks)'
      ];
      document.getElementById('moderationDetail').innerHTML = `
        <div class="card" style="margin-bottom:16px;box-shadow:none;padding:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
              <h3 style="font-size:16px;color:var(--grey-900);font-family:'Poppins';"><i class="fa fa-user-graduate" style="color:var(--primary);margin-right:6px;"></i>${s.learner_name}</h3>
              <div style="font-size:12px;color:var(--grey-500);">Script #${s.learner_number} • ${s.marks}/${s.a_total} marks</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-light" id="zoomOut"><i class="fa fa-search-minus"></i></button>
              <button class="btn btn-sm btn-light" id="zoomReset">100%</button>
              <button class="btn btn-sm btn-light" id="zoomIn"><i class="fa fa-search-plus"></i></button>
            </div>
          </div>
        </div>
        <div class="split-view">
          <div class="script-preview">
            <div class="script-page" id="scriptPage">
              <div style="text-align:center;font-weight:700;margin-bottom:8px;">${s.learner_name} — ${a.assessment.title}</div>
              <div style="white-space:pre-line;">
Q.1)  2x + 3 = 13
     2x = 10
     <u>x = 5</u> ✓

Q.2)  Rectangle: l=10, b=7
     P = 2(10+7) = 34
     <u>P = 34</u> ✓

Q.3)  Points A(2,3) B(5,5)
     m = (5-3)/(5-2) = 2/3
     <u>m = 2/3</u>

Q.4)  Triangle: b=11, h=8.8
     A = 0.5 × 11 × 8.8 = 48.4
     <u>A = 48.4 cm²</u>

Q.5)  x² + x - 6
     = (x-2)(x+3) <u>factors</u> ✓

Q.6)  sin θ = √3/2  → θ = 60°

Q.7)  In ΔABC and ΔDEF:
     AB = DE (given)
     B̂ = Ê (given)
     BC = EF (given)
     ∴ ΔABC ≡ ΔDEF (SAS)

Q.8)  5;8;11;14...  Tn = 3n + 2

Q.9)  P = 10/36 = 5/18

Q.10) Sketch: straight line drawn, positive gradient,
      y-intercept at 2 — axes labelled.
              </div>
            </div>
          </div>
          <div class="moderation-panel">
            <h4 style="font-size:14px;margin-bottom:10px;font-family:'Poppins';color:var(--grey-900);"><i class="fa fa-file-contract" style="color:var(--primary);margin-right:6px;"></i>Memorandum <span style="font-size:12px;color:var(--grey-500);font-weight:400;">memo.pdf (02)</span></h4>
            <div style="background:var(--grey-50);border-radius:8px;padding:10px;font-size:12px;color:var(--grey-700);max-height:150px;overflow-y:auto;margin-bottom:14px;font-family:monospace;">
              <div>Q1: eq1 (89.000)</div>
              ${memoLines.map((l,i)=>`<div>${l}</div>`).join('')}
            </div>

            <div class="mk-row">
              <span class="mk-label"><i class="fa fa-brain" style="color:var(--primary);"></i> AI Explanation</span>
            </div>
            <div class="ai-explain">${s.ai_explanation || 'AI has analysed the script.'}</div>

            <div class="mk-row"><span class="mk-label">AI Confidence</span>
              <span class="mk-value" style="color:${confColor(s.ai_confidence)}">${confLabel(s.ai_confidence)}
                <div class="conf-bar"><div class="conf-bar-fill" style="width:${Math.round(s.ai_confidence*100)}%;background:${confColor(s.ai_confidence)}"></div></div>
              </span>
            </div>
            <div class="mk-row">
              <span class="mk-label">Marks Awarded</span>
              <span><input type="number" class="mk-input" id="markInput" value="${s.marks}" min="0" max="${s.a_total}" /> / ${s.a_total}</span>
            </div>
            <div class="mk-row">
              <span class="mk-label">Percentage</span><span class="mk-value" id="pctLabel">${s.percentage}%</span>
            </div>
            <div class="mk-row">
              <span class="mk-label">Teacher Instructions Applied</span>
              <span class="badge-pill badge-info">${s.teacher_instructions ? 'Yes' : 'None'}</span>
            </div>

            <div class="action-row">
              <button class="btn btn-success" id="approveBtn"><i class="fa fa-check"></i> Approve</button>
              <button class="btn btn-outline" id="adjustBtn"><i class="fa fa-edit"></i> Adjust Marks</button>
              <button class="btn btn-light" id="flagBtn"><i class="fa fa-flag"></i> Flag for Review</button>
            </div>
          </div>
        </div>
      `;

      // Update percentage when mark changes
      document.getElementById('markInput').addEventListener('input', (e) => {
        const v = Math.max(0, Math.min(s.a_total, parseInt(e.target.value)||0));
        document.getElementById('pctLabel').textContent = Math.round(v/s.a_total*100) + '%';
      });

      document.getElementById('approveBtn').addEventListener('click', async () => {
        await api(`/scripts/${s.id}/approve`, { method:'POST' });
        s.moderated = 1; s.flagged = 0;
        currentScript.moderated = 1;
        const reviewed = allScripts.filter(x=>x.moderated).length;
        document.getElementById('reviewedCount').textContent = reviewed;
        toast('Script approved', 'success');
        renderList();
        nextScript();
      });
      document.getElementById('adjustBtn').addEventListener('click', async () => {
        const marks = parseInt(document.getElementById('markInput').value);
        const r = await api(`/scripts/${s.id}/adjust`, { method:'POST', body:{ marks } });
        currentScript.marks = marks; currentScript.percentage = r.percentage; currentScript.moderated=1;
        toast('Marks adjusted & approved', 'success');
        renderList();
        nextScript();
      });
      document.getElementById('flagBtn').addEventListener('click', async () => {
        await api(`/scripts/${s.id}/flag`, { method:'POST' });
        currentScript.flagged = 1;
        toast('Flagged for review', 'warning');
        renderList();
        nextScript();
      });

      let zoom = 1;
      const page = document.getElementById('scriptPage');
      document.getElementById('zoomIn').onclick = () => { zoom = Math.min(1.5, zoom+0.1); page.style.transform=`scale(${zoom})`; page.style.transformOrigin='top center'; };
      document.getElementById('zoomOut').onclick = () => { zoom = Math.max(0.6, zoom-0.1); page.style.transform=`scale(${zoom})`; page.style.transformOrigin='top center'; };
      document.getElementById('zoomReset').onclick = () => { zoom = 1; page.style.transform='scale(1)'; };
    }

    function nextScript() {
      const next = allScripts.find(x => !x.moderated) || sugg.highest;
      if (next) { currentScript = next; renderList(); renderDetail(); }
    }

    document.getElementById('finalizeBtn').addEventListener('click', () => {
      go('results');
    });

    renderList(); renderDetail();
  });

  /* ========== RESULTS ========== */
  registerView('results', async (view) => {
    const aid = state.currentAssessment || sessionStorage.getItem('currentAssessment');
    if (!aid) { view.innerHTML = `<div class="card"><div class="empty-state"><p>No results available</p></div></div>`; return; }
    const r = await api(`/assessments/${aid}/results`);
    const s = r.summary;
    const passColor = '#2E7D32', failColor = '#C62828';

    view.innerHTML = `
      <div class="page-header">
        <div><h2>Results Overview</h2><p>${r.assessment.title}</p></div>
        <div style="display:flex;gap:8px;position:relative;">
          <button class="btn btn-outline btn-sm" onclick="MarkWise.Router.go('moderation')"><i class="fa fa-arrow-left"></i> Moderation</button>
          <button class="btn btn-primary btn-sm" id="exportBtn"><i class="fa fa-download"></i> Export <i class="fa fa-chevron-down" style="font-size:10px;margin-left:4px;"></i></button>
          <div class="dropdown" id="exportDropdown" style="position:absolute;right:0;top:42px;">
            <div class="dropdown-menu" style="display:none;min-width:180px;">
              <div class="dropdown-item" data-fmt="pdf"><i class="fa fa-file-pdf" style="color:var(--danger);"></i> PDF Report</div>
              <div class="dropdown-item" data-fmt="xlsx"><i class="fa fa-file-excel" style="color:var(--success);"></i> Excel (.xlsx)</div>
              <div class="dropdown-item" data-fmt="csv"><i class="fa fa-file-csv" style="color:var(--primary);"></i> CSV</div>
              <div class="dropdown-item" data-fmt="print"><i class="fa fa-print"></i> Print-ready</div>
            </div>
          </div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi grey"><div class="kpi-value">${s.total}</div><div class="kpi-label">Total Learners</div></div>
        <div class="kpi green"><div class="kpi-value">${s.passed}</div><div class="kpi-label">Passed <span style="font-size:11px;opacity:.8;">${s.passRate}%</span></div></div>
        <div class="kpi red"><div class="kpi-value">${s.failed}</div><div class="kpi-label">Failed <span style="font-size:11px;opacity:.8;">${s.failRate}%</span></div></div>
        <div class="kpi blue"><div class="kpi-value">${s.average}%</div><div class="kpi-label">Average %</div></div>
        <div class="kpi green"><div class="kpi-value">${s.highest}%</div><div class="kpi-label">Highest Mark</div></div>
        <div class="kpi red"><div class="kpi-value">${s.lowest}%</div><div class="kpi-label">Lowest Mark</div></div>
        <div class="kpi blue"><div class="kpi-value">${s.passRate}%</div><div class="kpi-label">Pass Mark</div></div>
        <div class="kpi grey"><div class="kpi-value">50%</div><div class="kpi-label">Pass Threshold</div></div>
      </div>

      <div class="grid-results">
        <div class="card">
          <div class="card-title"><i class="fa fa-users"></i> Top Learners
            <div class="card-header-actions"><button class="btn btn-sm btn-light" id="viewAllBtn">View all learners</button></div>
          </div>
          <div class="table-wrap">
            <table class="data-table" id="learnersTable">
              <thead><tr><th>#</th><th>Learner</th><th>%</th><th>Mark</th><th>Status</th></tr></thead>
              <tbody>
                ${r.scripts.slice(0,10).map((sc,i) => `<tr>
                  <td>${sc.learner_number}</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:28px;height:28px;font-size:11px;background:linear-gradient(135deg,var(--primary-2),var(--primary-3));">${MarkWise.initials(sc.learner_name)}</div>${sc.learner_name}</div></td>
                  <td><b>${sc.percentage}%</b></td>
                  <td>${sc.marks}/${r.assessment.total_marks}</td>
                  <td>${sc.pass ? '<span class="badge-pill badge-success">Pass</span>' : '<span class="badge-pill badge-danger">Fail</span>'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><i class="fa fa-chart-pie"></i> Pass vs Fail</div>
          <div class="pass-fail-chart" id="passFailChart" style="background: conic-gradient(${passColor} 0% ${s.passRate}%, ${failColor} ${s.passRate}% 100%);">
            <div class="chart-center"><div class="pct" style="color:${s.passRate>=50?'var(--success)':'var(--danger)'}">${s.passRate}%</div><div class="lbl">Pass</div></div>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background:${passColor}"></span>Passed (${s.passed})</span>
            <span class="legend-item"><span class="legend-dot" style="background:${failColor}"></span>Failed (${s.failed})</span>
          </div>
          <canvas id="distChart" height="160" style="margin-top:20px;"></canvas>
        </div>
      </div>

      <div class="card" id="allLearnersCard" style="display:none;">
        <div class="card-title"><i class="fa fa-list"></i> All Learners (${s.total})</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>#</th><th>Learner</th><th>Marks</th><th>%</th><th>Status</th></tr></thead>
            <tbody>${r.scripts.map(sc => `<tr>
              <td>${sc.learner_number}</td><td>${sc.learner_name}</td><td>${sc.marks}/${r.assessment.total_marks}</td><td>${sc.percentage}%</td>
              <td>${sc.pass ? '<span class="badge-pill badge-success">Pass</span>' : '<span class="badge-pill badge-danger">Fail</span>'}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;

    // View all learners toggle
    document.getElementById('viewAllBtn').addEventListener('click', () => {
      const c = document.getElementById('allLearnersCard');
      c.style.display = c.style.display==='none'?'block':'none';
    });

    // Export dropdown
    const expBtn = document.getElementById('exportBtn');
    const expDrop = document.querySelector('#exportDropdown .dropdown-menu');
    expBtn.addEventListener('click', (e) => { e.stopPropagation(); expDrop.style.display = expDrop.style.display==='block'?'none':'block'; });
    document.addEventListener('click', () => expDrop.style.display='none');
    document.querySelectorAll('#exportDropdown .dropdown-item').forEach(el => el.addEventListener('click', () => doExport(el.dataset.fmt)));

    function doExport(fmt) {
      expDrop.style.display='none';
      if (fmt === 'csv') { window.location.href = `/api/assessments/${aid}/export/csv`; toast('CSV download started','success'); return; }
      if (fmt === 'pdf' || fmt === 'print' || fmt === 'xlsx') {
        // Open HTML report in new tab (printable)
        toast(fmt==='xlsx' ? 'Opening HTML report - use Print → Save as PDF or copy to Excel' : 'Opening printable report', 'info');
        window.open(`/api/assessments/${aid}/export/html`, '_blank');
      }
    }

    // Distribution chart
    setTimeout(() => {
      const ctx = document.getElementById('distChart');
      if (!ctx || !window.Chart) return;
      // Build buckets
      const buckets = [0,0,0,0,0]; // 0-29, 30-49, 50-59, 60-79, 80-100
      r.scripts.forEach(sc => {
        if (sc.percentage<30) buckets[0]++;
        else if (sc.percentage<50) buckets[1]++;
        else if (sc.percentage<60) buckets[2]++;
        else if (sc.percentage<80) buckets[3]++;
        else buckets[4]++;
      });
      new Chart(ctx, {
        type: 'bar',
        data: { labels:['0-29','30-49','50-59','60-79','80-100'], datasets:[{ label:'Learners', data:buckets, backgroundColor:['var(--danger)','#EF9A9A','#FFE082','#90CAF9','var(--success)'], borderRadius:6 }]},
        options:{ plugins:{legend:{display:false}, title:{display:true,text:'Mark Distribution',font:{size:12,family:'Poppins'},color:'#4A5568'}}, scales:{y:{beginAtZero:true,ticks:{precision:0,font:{size:10}},grid:{color:'#f0f2f5'}},x:{grid:{display:false},ticks:{font:{size:10}}}} }
      });
    }, 50);
  });

  /* ========== QUESTION ANALYSIS ========== */
  registerView('questions', async (view) => {
    const aid = state.currentAssessment || sessionStorage.getItem('currentAssessment');
    if (!aid) { view.innerHTML = `<div class="card"><div class="empty-state"><p>Select an assessment first.</p></div></div>`; return; }
    const r = await api(`/assessments/${aid}/results`);
    const qs = r.questionStats;
    view.innerHTML = `
      <div class="page-header"><div><h2>Question Analysis</h2><p>${r.assessment.title}</p></div>
        <button class="btn btn-outline btn-sm" onclick="MarkWise.Router.go('results')"><i class="fa fa-arrow-left"></i> Back to Results</button>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title"><i class="fa fa-chart-bar"></i> Average per Question</div>
          <div id="qBars">
            ${qs.map(q => {
              const pct = q.average_mark/q.possible_marks;
              const cls = pct>=0.7 ? 'strong' : pct>=0.4 ? 'medium' : 'weak';
              return `<div class="q-bar-row">
                <div class="q-label">Q${q.question_num}</div>
                <div class="q-bar-wrap"><div class="q-bar ${cls}" style="width:${Math.max(8,pct*100)}%">${pct>=0.4?q.average_mark.toFixed(1):''}</div></div>
                <div class="q-val">${q.average_mark.toFixed(1)}/${q.possible_marks} (${Math.round(pct*100)}%)</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div>
          <div class="card">
            <div class="card-title" style="color:var(--success);"><i class="fa fa-check-circle" style="color:var(--success);"></i> Strong Questions</div>
            ${r.strong.map(q => `<div class="mk-row"><span class="mk-label">Question ${q.question_num}</span><span class="mk-value" style="color:var(--success);">${Math.round(q.average_mark/q.possible_marks*100)}% average</span></div>`).join('')}
            <p style="font-size:12px;color:var(--grey-500);margin-top:10px;">Learners performed well here. Consider building on these concepts.</p>
          </div>
          <div class="card">
            <div class="card-title" style="color:var(--danger);"><i class="fa fa-exclamation-triangle" style="color:var(--danger);"></i> Weak Questions</div>
            ${r.weak.map(q => `<div class="mk-row"><span class="mk-label">Question ${q.question_num}</span><span class="mk-value" style="color:var(--danger);">${Math.round(q.average_mark/q.possible_marks*100)}% average</span></div>`).join('')}
            <p style="font-size:12px;color:var(--grey-500);margin-top:10px;">These questions need re-teaching and extra practice.</p>
          </div>
          <div class="card" style="background:linear-gradient(135deg,#E3F2FD,#f5f7fa);">
            <div class="card-title"><i class="fa fa-lightbulb" style="color:var(--warning);"></i> Future Features</div>
            <ul style="list-style:none;font-size:13px;color:var(--grey-700);line-height:2;">
              <li><i class="fa fa-angle-right" style="color:var(--primary);"></i> Item & Error Analysis</li>
              <li><i class="fa fa-angle-right" style="color:var(--primary);"></i> Topic Weakness Analysis</li>
              <li><i class="fa fa-angle-right" style="color:var(--primary);"></i> Common Learner Mistakes</li>
              <li><i class="fa fa-angle-right" style="color:var(--primary);"></i> AI Reteaching Suggestions</li>
              <li><i class="fa fa-angle-right" style="color:var(--primary);"></i> Physical Sciences & Accounting</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  });

  /* ========== Other simple pages ========== */
  registerView('reports', async (view) => {
    const { assessments } = await api('/assessments');
    view.innerHTML = `
      <div class="page-header"><div><h2>Reports</h2><p>Export and print reports for your classes</p></div></div>
      <div class="card">
        <div class="card-title"><i class="fa fa-file-export"></i> Available Reports</div>
        ${assessments.length ? assessments.map(a => `
          <div class="assessment-card">
            <div class="info">
              <h4><i class="fa fa-file-alt" style="color:var(--primary);margin-right:8px;"></i>${a.title}</h4>
              <div class="meta">${a.grade||''} • ${a.assessment_type||''} • ${a.total_marks} marks</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <a class="btn btn-sm btn-outline" href="/api/assessments/${a.id}/export/csv"><i class="fa fa-file-csv"></i> CSV</a>
              <a class="btn btn-sm btn-outline" href="/api/assessments/${a.id}/export/html" target="_blank"><i class="fa fa-file-pdf"></i> PDF</a>
              <a class="btn btn-sm btn-outline" href="/api/assessments/${a.id}/export/html" target="_blank"><i class="fa fa-print"></i> Print</a>
            </div>
          </div>`).join('') : '<div class="empty-state"><p>No reports available yet.</p></div>'}
      </div>
    `;
  });

  registerView('notifications', async (view) => {
    const d = await api('/dashboard');
    view.innerHTML = `
      <div class="page-header"><h2>Notifications</h2></div>
      <div class="card">
        ${d.notifications.length ? d.notifications.map(n => `<div class="mk-row"><span class="mk-label"><i class="fa fa-bell" style="color:var(--primary);margin-right:8px;"></i>${n.message}</span><span class="activity-time">${timeAgo(n.created_at)}</span></div>`).join('') : '<div class="empty-state"><p>No notifications</p></div>'}
      </div>
    `;
  });

  registerView('settings', (view) => {
    view.innerHTML = `
      <div class="page-header"><h2>Settings</h2></div>
      <div class="card setup-card" style="margin:0;">
        <div class="card-title"><i class="fa fa-user"></i> Profile</div>
        <div class="form-group"><label class="form-label">Name</label><input class="form-control" value="${state.user.name}" /></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Email</label><input class="form-control" value="${state.user.email||''}" /></div>
          <div class="form-group"><label class="form-label">Phone</label><input class="form-control" value="${state.user.phone||''}" /></div>
        </div>
        <div class="form-group"><label class="form-label">School</label><input class="form-control" value="${state.user.school||''}" /></div>
        <button class="btn btn-primary"><i class="fa fa-save"></i> Save Changes</button>
      </div>
    `;
  });

  registerView('help', (view) => {
    view.innerHTML = `
      <div class="page-header"><h2>Help & Support</h2></div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title"><i class="fa fa-book"></i> Quick Start Guide</div>
          <ol style="padding-left:20px;font-size:13px;line-height:2;color:var(--grey-700);">
            <li>Create a new assessment with your class details</li>
            <li>Upload the memorandum and question paper</li>
            <li>Upload or scan learner scripts from your phone</li>
            <li>Add any special teacher instructions</li>
            <li>Click "Start AI Marking" and wait for processing</li>
            <li>Review flagged scripts in Moderation</li>
            <li>View results, question analysis and export reports</li>
          </ol>
        </div>
        <div class="card">
          <div class="card-title"><i class="fa fa-headset"></i> Contact Support</div>
          <p style="font-size:13px;color:var(--grey-700);margin-bottom:12px;">Need help? Our team is ready to assist.</p>
          <div class="mk-row"><span class="mk-label"><i class="fa fa-envelope"></i> Email</span><span class="mk-value">support@markwise.ai</span></div>
          <div class="mk-row"><span class="mk-label"><i class="fa fa-phone"></i> Phone</span><span class="mk-value">+27 11 000 0000</span></div>
          <div class="mk-row"><span class="mk-label"><i class="fa fa-clock"></i> Hours</span><span class="mk-value">Mon-Fri 8am-5pm SAST</span></div>
        </div>
      </div>
    `;
  });

})();
