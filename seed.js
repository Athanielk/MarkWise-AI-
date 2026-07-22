// Seed demo data
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('./db');

// Reset tables for clean demo
db.exec(`
DELETE FROM question_stats;
DELETE FROM scripts;
DELETE FROM activities;
DELETE FROM notifications;
DELETE FROM assessments;
DELETE FROM users;
`);

function daysAgo(n) {
  const d = new Date(Date.now() - n*24*60*60*1000);
  return d.toISOString().replace('T',' ').substring(0,19);
}

// Create demo teacher
const teacherId = uuid();
const hash = bcrypt.hashSync('password123', 10);
db.prepare('INSERT INTO users (id,name,email,phone,password,role,school,plan,scripts_marked,plan_limit) VALUES (?,?,?,?,?,?,?,?,?,?)')
  .run(teacherId, 'Mr. Dlamini', 'teacher@demo.com', '+27821234567', hash, 'teacher', 'Sunnydale High', 'Pro Plan', 248, 1000);

const assessments = [
  { title: 'Grade 10 Math Test - Paper 1', grade:'Grade 10', cls:'10A', subj:'Mathematics', type:'Test', paper:'Paper 1', tm:100, status:'completed', scripts:48, daysAgo:2 },
  { title: 'Grade 11 Assignment', grade:'Grade 11', cls:'11B', subj:'Mathematics', type:'Assignment', paper:'Paper 1', tm:60, status:'completed', scripts:32, daysAgo:14 },
  { title: 'Grade 9 Test - Paper 2', grade:'Grade 9', cls:'9A', subj:'Mathematics', type:'Test', paper:'Paper 2', tm:75, status:'marked', scripts:56, daysAgo:20 },
];

const asmtInsert = db.prepare('INSERT INTO assessments (id,user_id,title,grade,class_name,subject,assessment_type,paper,total_marks,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
const scriptInsert = db.prepare('INSERT INTO scripts (id,assessment_id,user_id,learner_name,learner_number,marks,percentage,pass,ai_confidence,ai_explanation,status,moderated,flagged) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
const notifInsert = db.prepare('INSERT INTO notifications (id,user_id,message,type,created_at) VALUES (?,?,?,?,?)');
const actInsert = db.prepare('INSERT INTO activities (id,user_id,assessment_id,title,detail,icon,created_at) VALUES (?,?,?,?,?,?,?)');
const qInsert = db.prepare('INSERT INTO question_stats (id,assessment_id,question_num,possible_marks,average_mark) VALUES (?,?,?,?,?)');

const names = ['Thabo M.','Aisha K.','Sipho D.','Lerato P.','Naledi R.','Johan V.','Zanele N.','Pieter W.','Nomsa M.','Wayne J.','Fatima B.','Kagiso L.','Lindiwe T.','Rashid K.','Bongi S.','Ella M.','Tumi R.','Karabo P.','Devon C.','Samantha L.'];

assessments.forEach(a => {
  const aid = uuid();
  asmtInsert.run(aid, teacherId, a.title, a.grade, a.cls, a.subj, a.type, a.paper, a.tm, a.status, daysAgo(a.daysAgo));
  for (let i=0; i<a.scripts; i++) {
    const pct = Math.round(20 + Math.random()*78);
    const marks = Math.round(pct*a.tm/100);
    const pass = pct>=50?1:0;
    const conf = Math.round((0.6+Math.random()*0.38)*100)/100;
    const sid = uuid();
    scriptInsert.run(sid, aid, teacherId, names[i%names.length] + (i>=names.length?` ${Math.floor(i/names.length)+1}`:''), i+1, marks, pct, pass, conf,
      pct>=50 ? 'AI recognised working and matched answer to memo.' : 'Several errors detected; recommend review.',
      'marked',
      a.status==='completed'?1:0,
      conf<0.7?1:0);
  }
  for (let q=1; q<=10; q++) {
    const pm = Math.floor(a.tm/10);
    qInsert.run(uuid(), aid, q, pm, Math.round(pm*(0.4+Math.random()*0.5)*10)/10);
  }
  actInsert.run(uuid(), teacherId, aid, a.title, `${a.scripts} scripts ${a.status==='completed'?'marked':'uploaded'}`, a.status==='completed'?'fa-check-circle':'fa-upload', daysAgo(a.daysAgo));
});

notifInsert.run(uuid(), teacherId, 'AI marking complete for "Grade 9 Test - Paper 2" - 8 scripts need moderation.', 'warning', daysAgo(0));
notifInsert.run(uuid(), teacherId, 'Subscription renewal: 15 June 2025', 'info', daysAgo(2));
notifInsert.run(uuid(), teacherId, 'New feature: Question Analysis now available!', 'success', daysAgo(5));

console.log('✅ Seed complete.');
console.log('   Login: teacher@demo.com / password123');
