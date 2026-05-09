interface WithStrings { strings: (1 | 2 | 3 | 4 | 5 | 6)[]; }

export function stringsRow(cfg: WithStrings): string {
  const boxes = [1, 2, 3, 4, 5, 6].map(s => {
    const checked = cfg.strings.includes(s as any) ? 'checked' : '';
    return `<label><input type="checkbox" data-s="${s}" ${checked}/> String ${s}</label>`;
  }).join(' ');
  return `<div class="row">${boxes}</div>`;
}
