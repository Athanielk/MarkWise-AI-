const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, uuid() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

/* ---------------- Dashboard ---------------- */
router.get('/dashboard', authRequired, (req, res) => {
  const uid = req.user.id;
  const user = db.prepare('SELECT name,plan,scripts_marked,plan_limit FROM users WHERE id=?').get(uid);
  const assessmentsCount = db.prepare('SELECT COUNT(*) as c FROM assessments WHERE user_id=?').get(uid).c;
  const scriptsUploaded = db.prepare('SELECT COUNT(*) as c FROM scripts s JOIN assessments a ON s.assessment_id=a.id WHERE a.user_id=?').get(uid).c;
  const scriptsMarked = db.prepare("SELECT COUNT(*) as c FROM scripts s JOIN assessments a ON s.assessment_id=a.id WHERE a.user_id=? AND s.status='marked'").get(uid).c;
  const needsModeration = db.prepare("SELECT COUNT(*) as c FROM scripts s JOIN assessments a ON s.assessment_id=a.id WHERE a.user_id=? AND s.status='marked' AND s.moderated=0 AND (s.ai_confidence<0.7 OR s.flagged=1)").get(uid).c;
  const activities = db.prepare('SELECT * FROM activities WHERE user_id=? ORDER BY created_at DESC LIMIT 10').all(uid);
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 5').all(uid);
  res.json({ user, stats: { assessmentsCount, scriptsUploaded, scriptsMarked, needsModeration }, activities, notifications });
});

/* ---------------- Assessments ---------------- */
router.get('/assessments', authRequired, (req, res) => {
  const assessments = db.prepare(`
    SELECT a.*, 
      (SELECT COUNT(*) FROM scripts s WHERE s.assessment_id=a.id) as total_scripts,
      (SELECT COUNT(*) FROM scripts s WHERE s.assessment_id=a.id AND s.status='marked' AND s.moderated=1) as marked_scripts
    FROM assessments a WHERE a.user_id=? ORDER BY a.created_at DESC
  `).all(req.user.id);
  res.json({ assessments });
});

router.post('/assessments', authRequired, (req, res) => {
  const { title, grade, class_name, subject, assessment_type, paper, total_marks, teacher_instructions } = req.body;
  const id = uuid();
  const finalTitle = title || `${grade||''} ${subject||''} ${assessment_type||''} ${paper||''}`.trim();
  db.prepare(`INSERT INTO assessments (id,user_id,title,grade,class_name,subject,assessment_type,paper,total_marks,teacher_instructions,status)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, req.user.id, finalTitle, grade, class_name, subject, assessment_type, paper, total_marks||100, teacher_instructions||'', 'setup');
  addActivity(req.user.id, id, finalTitle, 'Assessment created', 'fa-folder-plus');
  res.json({ id, title: finalTitle });
});

router.get('/assessments/:id', authRequired, (req, res) => {
  const a = db.prepare('SELECT * FROM assessments WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ assessment: a });
});

router.put('/assessments/:id', authRequired, (req, res) => {
  const { teacher_instructions } = req.body;
  db.prepare('UPDATE assessments SET teacher_instructions=? WHERE id=? AND user_id=?').run(teacher_instructions||'', req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ---------------- Uploads ---------------- */
router.post('/assessments/:id/upload/memo', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  db.prepare('UPDATE assessments SET memo_path=? WHERE id=? AND user_id=?').run(req.file.filename, req.params.id, req.user.id);
  res.json({ filename: req.file.filename });
});
router.post('/assessments/:id/upload/question', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  db.prepare('UPDATE assessments SET question_paper_path=? WHERE id=? AND user_id=?').run(req.file.filename, req.params.id, req.user.id);
  res.json({ filename: req.file.filename });
});
router.post('/assessments/:id/upload/scripts', authRequired, upload.array('files', 200), (req, res) => {
  const files = req.files || [];
  const insert = db.prepare('INSERT INTO scripts (id,assessment_id,user_id,learner_name,learner_number,file_path,status) VALUES (?,?,?,?,?,?,?)');
  const tx = db.transaction((list) => {
    list.forEach((f, idx) => {
      insert.run(uuid(), req.params.id, req.user.id, `Learner ${idx+1}`, idx+1, f.filename, 'uploaded');
    });
  });
  tx(files);
  db.prepare('UPDATE assessments SET status=? WHERE id=? AND user_id=?').run('uploaded', req.params.id, req.user.id);
  addActivity(req.user.id, req.params.id, `Uploaded ${files.length} scripts`, 'File upload complete', 'fa-upload');
  res.json({ count: files.length });
});

/* ---------------- AI Marking (simulated) ---------------- */
router.post('/assessments/:id/mark', authRequired, (req, res) => {
  const a = db.prepare('SELECT * FROM assessments WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  const scripts = db.prepare('SELECT * FROM scripts WHERE assessment_id=?').all(req.params.id);
  const update = db.prepare('UPDATE scripts SET marks=?, percentage=?, pass=?, ai_confidence=?, ai_explanation=?, status=?, flagged=? WHERE id=?');
  const userUpdate = db.prepare('UPDATE users SET scripts_marked=scripts_marked+? WHERE id=?');

  // Simulate question-level stats
  const qCount = 10;
  db.prepare('DELETE FROM question_stats WHERE assessment_id=?').run(req.params.id);
  const qInsert = db.prepare('INSERT INTO question_stats (id,assessment_id,question_num,possible_marks,average_mark) VALUES (?,?,?,?,?)');

  // deterministic pseudo-random scores based on script id
  function seededRand(seedStr) {
    let h = 0; for (let i=0;i<seedStr.length;i++) h = (h*31 + seedStr.charCodeAt(i)) >>> 0;
    return () => { h = (h*1664525 + 1013904223) >>> 0; return (h % 1000)/1000; };
  }

  let marked = 0;
  scripts.forEach((s) => {
    const rng = seededRand(s.id);
    const pct = Math.round(20 + rng()*78); // 20-98%
    const marks = Math.round((pct/100) * a.total_marks);
    const pass = pct >= 50 ? 1 : 0;
    const conf = Math.round((0.55 + rng()*0.44) * 100)/100;
    const flagged = conf < 0.7 ? 1 : 0;
    let explanation = 'AI recognised working and matched final answer to memorandum. ';
    if (conf < 0.7) explanation += 'Confidence is low - handwriting unclear or method ambiguous. Recommend teacher review. ';
    if (pass) explanation += 'Passed with acceptable method and final answer.';
    else explanation += 'Several errors detected; final answer incorrect.';
    update.run(marks, pct, pass, conf, explanation, 'marked', flagged, s.id);
    marked++;
  });

  // question stats
  for (let q=1; q<=qCount; q++) {
    const pm = Math.floor(a.total_marks / qCount) || 1;
    const avg = Math.round((pm * (0.4 + Math.random()*0.5))*10)/10;
    qInsert.run(uuid(), req.params.id, q, pm, avg);
  }

  db.prepare('UPDATE assessments SET status=? WHERE id=?').run('marked', req.params.id);
  userUpdate.run(marked, req.user.id);
  addActivity(req.user.id, req.params.id, a.title, `${marked} scripts marked by AI`, 'fa-robot');
  // notification
  db.prepare('INSERT INTO notifications (id,user_id,message,type) VALUES (?,?,?,?)').run(uuid(), req.user.id, `AI marking complete for "${a.title}" - ${marked} scripts. ${scripts.filter(()=>Math.random()>0.5).length||Math.floor(marked*0.15)} need moderation.`, 'success');

  res.json({ marked });
});

/* ---------------- Scripts for moderation / results ---------------- */
router.get('/assessments/:id/scripts', authRequired, (req, res) => {
  const scripts = db.prepare('SELECT * FROM scripts WHERE assessment_id=? ORDER BY percentage DESC, learner_number ASC').all(req.params.id);
  res.json({ scripts });
});

// Suggested moderation scripts
router.get('/assessments/:id/moderation/suggested', authRequired, (req, res) => {
  const scripts = db.prepare('SELECT * FROM scripts WHERE assessment_id=?').all(req.params.id);
  if (!scripts.length) return res.json({ highest: null, lowest: null, lowConfidence: [], random: null });
  const highest = [...scripts].sort((a,b)=>b.percentage-a.percentage)[0];
  const lowest = [...scripts].sort((a,b)=>a.percentage-b.percentage)[0];
  const lowConf = scripts.filter(s=>s.ai_confidence<0.75).sort((a,b)=>a.ai_confidence-b.ai_confidence).slice(0,3);
  const random = scripts[Math.floor(Math.random()*scripts.length)];
  res.json({ highest, lowest, lowConfidence: lowConf, random });
});

router.get('/scripts/:id', authRequired, (req, res) => {
  const s = db.prepare(`SELECT s.*, a.teacher_instructions, a.total_marks as a_total, a.memo_path 
                         FROM scripts s JOIN assessments a ON s.assessment_id=a.id 
                         WHERE s.id=? AND a.user_id=?`).get(req.params.id, req.user.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json({ script: s });
});

router.post('/scripts/:id/approve', authRequired, (req, res) => {
  db.prepare('UPDATE scripts SET moderated=1, flagged=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
router.post('/scripts/:id/adjust', authRequired, (req, res) => {
  const { marks } = req.body;
  const s = db.prepare('SELECT * FROM scripts WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error:'Not found' });
  const a = db.prepare('SELECT total_marks FROM assessments WHERE id=?').get(s.assessment_id);
  const pct = Math.round((marks/a.total_marks)*100);
  db.prepare('UPDATE scripts SET marks=?, percentage=?, pass=?, moderated=1, flagged=0 WHERE id=?').run(marks, pct, pct>=50?1:0, req.params.id);
  res.json({ ok: true, percentage: pct });
});
router.post('/scripts/:id/flag', authRequired, (req, res) => {
  db.prepare('UPDATE scripts SET flagged=1 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- Results ---------------- */
router.get('/assessments/:id/results', authRequired, (req, res) => {
  const a = db.prepare('SELECT * FROM assessments WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!a) return res.status(404).json({ error:'Not found' });
  const scripts = db.prepare('SELECT * FROM scripts WHERE assessment_id=? ORDER BY percentage DESC').all(req.params.id);
  const total = scripts.length;
  const passed = scripts.filter(s=>s.pass).length;
  const failed = total - passed;
  const avg = total ? Math.round(scripts.reduce((sum,s)=>sum+s.percentage,0)/total*10)/10 : 0;
  const highest = total ? Math.max(...scripts.map(s=>s.percentage)) : 0;
  const lowest = total ? Math.min(...scripts.map(s=>s.percentage)) : 0;
  const qStats = db.prepare('SELECT * FROM question_stats WHERE assessment_id=? ORDER BY question_num ASC').all(req.params.id);
  const strong = [...qStats].sort((a,b)=>(b.average_mark/b.possible_marks)-(a.average_mark/a.possible_marks)).slice(0,3);
  const weak = [...qStats].sort((a,b)=>(a.average_mark/a.possible_marks)-(b.average_mark/b.possible_marks)).slice(0,3);
  res.json({ assessment:a, scripts, summary: { total, passed, failed, passRate:total?Math.round(passed/total*1000)/10:0, failRate:total?Math.round(failed/total*1000)/10:0, average:avg, highest, lowest }, questionStats: qStats, strong, weak });
});

/* ---------------- Export ---------------- */
router.get('/assessments/:id/export/:format', authRequired, (req, res) => {
  const { id, format } = req.params;
  const data = db.prepare('SELECT learner_name, learner_number, marks, percentage, pass FROM scripts WHERE assessment_id=? ORDER BY learner_number ASC').all(id);
  const a = db.prepare('SELECT title, subject, grade, class_name, total_marks FROM assessments WHERE id=?').get(id);
  if (format === 'csv') {
    let csv = 'Learner #,Learner Name,Marks,Percentage,Status\n';
    data.forEach(r => { csv += `${r.learner_number},"${r.learner_name}",${r.marks},${r.percentage}%,${r.pass?'Pass':'Fail'}\n`; });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${a.title}-results.csv"`);
    return res.send(csv);
  }
  if (format === 'json') return res.json({ assessment:a, data });
  // HTML for print/PDF
  let html = `<!doctype html><html><head><meta charset="utf-8"><title>${a.title} - Results</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;color:#333}h1{color:#0D47A1}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#0D47A1;color:#fff}.pass{color:#2e7d32}.fail{color:#c62828}.summary{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0}.card{border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;min-width:120px}</style>
  </head><body>
  <h1>${a.title}</h1>
  <p><b>${a.subject||''}</b> | Grade ${a.grade||''} ${a.class_name||''} | Total: ${a.total_marks}</p>
  <div class="summary">
    <div class="card"><b>Total Learners</b><br>${data.length}</div>
    <div class="card"><b>Passed</b><br>${data.filter(r=>r.pass).length}</div>
    <div class="card"><b>Failed</b><br>${data.filter(r=>!r.pass).length}</div>
    <div class="card"><b>Average</b><br>${data.length?Math.round(data.reduce((s,r)=>s+r.percentage,0)/data.length*10)/10:0}%</div>
    <div class="card"><b>Highest</b><br>${data.length?Math.max(...data.map(r=>r.percentage)):0}%</div>
    <div class="card"><b>Lowest</b><br>${data.length?Math.min(...data.map(r=>r.percentage)):0}%</div>
  </div>
  <table><thead><tr><th>#</th><th>Learner</th><th>Marks</th><th>%</th><th>Status</th></tr></thead><tbody>
  ${data.map(r=>`<tr><td>${r.learner_number}</td><td>${r.learner_name}</td><td>${r.marks}/${a.total_marks}</td><td>${r.percentage}%</td><td class="${r.pass?'pass':'fail'}">${r.pass?'Pass':'Fail'}</td></tr>`).join('')}
  </tbody></table>
  <p style="margin-top:24px;color:#777">Generated by MarkWise AI</p>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ---------------- Activities / helpers ---------------- */
function addActivity(userId, assessmentId, title, detail, icon) {
  try {
    db.prepare('INSERT INTO activities (id,user_id,assessment_id,title,detail,icon) VALUES (?,?,?,?,?,?)').run(uuid(), userId, assessmentId, title, detail, icon||'fa-file-check');
  } catch(e){}
}

module.exports = router;
