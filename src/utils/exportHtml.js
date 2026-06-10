const esc = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const mdToHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<span class="lore-link">$2</span>')
    .replace(/\n/g, '<br>');
};

const renderJournalHtml = (entries, depth = 0) => {
  if (!entries || entries.length === 0) return '';
  return entries.map(entry => `
    <div class="journal-entry" id="journal-${esc(entry.id)}">
      <h${Math.min(depth + 3, 6)}>${esc(entry.title || 'Untitled')}</h${Math.min(depth + 3, 6)}>
      <div class="entry-content">${mdToHtml(entry.content || '')}</div>
      ${entry.children && entry.children.length > 0 ? renderJournalHtml(entry.children, depth + 1) : ''}
    </div>`).join('\n');
};

export const generateHtml = (planeName, records, journalEntries) => {
  const nonFolders = (records || []).filter(r => !r.isFolder);
  const byType = {};
  const typeLabels = { region: 'Regions', landmark: 'Landmarks', character: 'Characters & Key Figures' };
  nonFolders.forEach(r => {
    const key = r.subdivision || r.type || 'region';
    if (!byType[key]) byType[key] = [];
    byType[key].push(r);
  });

  const navSections = Object.entries(byType).map(([type, entries]) => `
    <div class="nav-section">
      <div class="nav-section-title">${esc(typeLabels[type] || type)}</div>
      ${entries.map(e => `<a href="#" class="nav-link" onclick="showEntry('entry-${e.id}');return false;">${esc(e.name || 'Unnamed')}</a>`).join('\n')}
    </div>`).join('\n');

  const journalNav = journalEntries && journalEntries.length > 0 ? `
    <div class="nav-section">
      <div class="nav-section-title">Journal</div>
      ${(journalEntries || []).map(e => `<a href="#" class="nav-link" onclick="showEntry('journal-${e.id}');return false;">${esc(e.title || 'Untitled')}</a>`).join('\n')}
    </div>` : '';

  const recordDivs = nonFolders.map(entry => `
    <div class="record-entry" id="entry-${entry.id}" style="display:none;">
      <div class="entry-header" style="border-left: 3px solid ${esc(entry.color || '#c9a84c')};">
        <div class="entry-type">${esc(typeLabels[entry.subdivision || entry.type] || entry.type || 'Record')}</div>
        <h1>${esc(entry.name || 'Unnamed')}</h1>
        ${entry.summary ? `<p class="entry-summary">${esc(entry.summary)}</p>` : ''}
      </div>
      ${entry.lore ? `<div class="entry-section"><h2>Lore</h2><div class="prose">${mdToHtml(entry.lore)}</div></div>` : ''}
      ${entry.characters ? `<div class="entry-section"><h2>Key Figures</h2><div class="prose">${mdToHtml(entry.characters)}</div></div>` : ''}
    </div>`).join('\n');

  const journalDivs = journalEntries && journalEntries.length > 0 ? `
    <div class="record-entry" id="journal-root" style="display:none;">
      <h1>Journal</h1>
      ${renderJournalHtml(journalEntries)}
    </div>` : '';

  const firstId = nonFolders.length > 0 ? `entry-${nonFolders[0].id}` : 'journal-root';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(planeName)} — Arcanum Archive</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{--gold:#c9a84c;--bg:#050508;--surface:#0b0b10;}
  body{background:var(--bg);color:#d1cfc8;font-family:'Cormorant Garamond',serif;display:flex;min-height:100vh;}
  nav{width:240px;min-height:100vh;background:var(--surface);border-right:1px solid rgba(201,168,76,.12);padding:24px 0;overflow-y:auto;flex-shrink:0;}
  .nav-title{font-family:'Cinzel',serif;font-size:13px;letter-spacing:.4em;color:var(--gold);padding:0 20px 20px;border-bottom:1px solid rgba(201,168,76,.1);margin-bottom:12px;}
  .nav-section{margin-bottom:16px;padding:0 12px;}
  .nav-section-title{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.28em;color:rgba(201,168,76,.45);text-transform:uppercase;padding:4px 8px;margin-bottom:4px;}
  .nav-link{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#4b5563;padding:5px 8px;border-radius:2px;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .2s,background .2s;}
  .nav-link:hover,.nav-link.active{color:var(--gold);background:rgba(201,168,76,.06);}
  main{flex:1;padding:40px 60px;max-width:900px;overflow-y:auto;}
  .record-entry{animation:fadeIn .3s ease;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .entry-header{padding:0 0 24px 20px;margin-bottom:30px;border-bottom:1px solid rgba(201,168,76,.1);}
  .entry-type{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.28em;color:rgba(201,168,76,.45);text-transform:uppercase;margin-bottom:8px;}
  h1{font-family:'Cinzel',serif;font-size:28px;letter-spacing:.1em;color:var(--gold);text-transform:uppercase;margin-bottom:10px;}
  h2{font-family:'Cinzel',serif;font-size:14px;letter-spacing:.18em;color:rgba(201,168,76,.8);text-transform:uppercase;margin-bottom:12px;}
  h3,h4,h5,h6{font-family:'Cinzel',serif;color:rgba(201,168,76,.7);margin:16px 0 8px;}
  .entry-summary{font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7280;line-height:1.6;font-style:italic;}
  .entry-section{margin-bottom:30px;}
  .prose{font-size:15px;line-height:1.7;color:#9ca3af;}
  .prose strong{color:#d1cfc8;}
  .prose em{color:rgba(201,168,76,.75);}
  .prose h1,.prose h2,.prose h3,.prose h4{font-family:'Cinzel',serif;color:rgba(201,168,76,.7);margin:16px 0 8px;}
  .prose blockquote{border-left:2px solid rgba(201,168,76,.3);padding-left:16px;color:#6b7280;font-style:italic;margin:12px 0;}
  .prose hr{border:none;border-top:1px solid rgba(201,168,76,.1);margin:20px 0;}
  .lore-link{color:var(--gold);text-decoration:underline;text-decoration-style:dashed;}
  .journal-entry{margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid rgba(201,168,76,.06);}
  .journal-entry h3,.journal-entry h4{color:rgba(201,168,76,.7);font-family:'Cinzel',serif;margin-bottom:8px;}
  .entry-content{font-size:14px;line-height:1.7;color:#9ca3af;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:var(--bg);} ::-webkit-scrollbar-thumb{background:rgba(201,168,76,.2);border-radius:2px;}
</style>
</head>
<body>
<nav>
  <div class="nav-title">${esc(planeName)}</div>
  ${navSections}
  ${journalNav}
</nav>
<main id="main-content">
  ${recordDivs}
  ${journalDivs}
  <div id="placeholder" style="display:flex;align-items:center;justify-content:center;height:60vh;color:#2d2d35;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.3em;text-transform:uppercase;">Select an entry from the archive</div>
</main>
<script>
  function showEntry(id) {
    document.querySelectorAll('.record-entry').forEach(e => e.style.display = 'none');
    const placeholder = document.getElementById('placeholder');
    if (placeholder) placeholder.style.display = 'none';
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
    const link = document.querySelector('[onclick*="' + id + '"]');
    if (link) link.classList.add('active');
    document.getElementById('main-content').scrollTop = 0;
  }
  // Show first entry on load
  const first = document.querySelector('.record-entry');
  if (first) { first.style.display = 'block'; const placeholder = document.getElementById('placeholder'); if(placeholder) placeholder.style.display = 'none'; }
</script>
</body>
</html>`;
};
