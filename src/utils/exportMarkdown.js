const flattenJournal = (entries, depth = 0) => {
  if (!entries || entries.length === 0) return [];
  return entries.flatMap(entry => {
    const hashes = '#'.repeat(Math.min(depth + 3, 6));
    const lines = [
      `${hashes} ${entry.title || 'Untitled'}`,
      '',
      entry.content || '_No content._',
    ];
    if (entry.children && entry.children.length > 0) {
      lines.push('', ...flattenJournal(entry.children, depth + 1));
    }
    return lines;
  });
};

export const generateMarkdown = (planeName, records, journalEntries) => {
  const nonFolders = (records || []).filter(r => !r.isFolder);
  const byType = { region: [], landmark: [], character: [] };
  const typeOrder = ['region', 'landmark', 'character'];
  nonFolders.forEach(r => {
    const key = r.subdivision || r.type || 'region';
    if (!byType[key]) byType[key] = [];
    byType[key].push(r);
  });

  const typeLabels = {
    region: 'Regions',
    landmark: 'Landmarks',
    character: 'Characters & Key Figures',
  };

  const lines = [
    `# ${planeName} — Chronicle`,
    '',
    `*Exported from Arcanum Builder*`,
    '',
    '---',
    '',
  ];

  const usedTypes = typeOrder.filter(t => byType[t] && byType[t].length > 0);
  // Extra custom types not in typeOrder
  const extraTypes = Object.keys(byType).filter(t => !typeOrder.includes(t) && byType[t]?.length > 0);

  [...usedTypes, ...extraTypes].forEach(type => {
    const entries = byType[type];
    if (!entries || entries.length === 0) return;
    lines.push(`## ${typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1)}`);
    lines.push('');
    entries.forEach(entry => {
      lines.push(`### ${entry.name || 'Unnamed'}`);
      lines.push('');
      if (entry.summary) {
        lines.push(`> ${entry.summary}`);
        lines.push('');
      }
      if (entry.lore && entry.lore.trim()) {
        lines.push('**Lore:**', '', entry.lore.trim(), '');
      }
      if (entry.characters && entry.characters.trim()) {
        lines.push('**Key Figures:**', '', entry.characters.trim(), '');
      }
      lines.push('---', '');
    });
  });

  if (journalEntries && journalEntries.length > 0) {
    lines.push('## Journal', '');
    lines.push(...flattenJournal(journalEntries));
    lines.push('');
  }

  return lines.join('\n');
};
