// ═══════════════════════════════════════════════════════
// ERYN DIAGRAMS — AI-powered SVG diagram generator
// ═══════════════════════════════════════════════════════

window.ErynnDiagrams = (function () {

  // ── Ask AI to generate diagram JSON ──
  async function generateDiagramData(topic) {
    const groq   = localStorage.getItem('eryn_groq');
    const gemini = localStorage.getItem('eryn_gemini');

    const prompt = `Generate a diagram for: "${topic}"

Return ONLY valid JSON, no markdown, no explanation. Format:
{
  "title": "short title",
  "type": "flowchart|mindmap|architecture|sequence|process",
  "nodes": [
    { "id": "n1", "label": "Node Name", "sublabel": "brief description", "type": "start|process|decision|end|data|external|group" }
  ],
  "edges": [
    { "from": "n1", "to": "n2", "label": "optional edge label" }
  ]
}

Rules:
- 5-12 nodes maximum
- Make nodes specific to the topic, not generic placeholders
- type "decision" gets a diamond shape
- type "start"/"end" gets rounded pill shape
- type "data" gets a parallelogram
- All other types get rounded rectangles
- Edges should form a logical flow
- Labels should be concise (2-4 words max)`;

    if (groq) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${groq}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 800
          })
        });
        const j = await r.json();
        if (r.ok) {
          const text = j.choices?.[0]?.message?.content?.trim();
          return parseJSON(text);
        }
      } catch {}
    }

    if (gemini) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(gemini)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
            })
          }
        );
        const j = await r.json();
        if (r.ok) {
          const text = j.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          return parseJSON(text);
        }
      } catch {}
    }

    // Fallback — static layout based on topic
    return fallbackDiagram(topic);
  }

  function parseJSON(text) {
    if (!text) return null;
    // Strip markdown fences
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    try { return JSON.parse(clean); } catch { return null; }
  }

  // ── Fallback diagram (no AI key) ──
  function fallbackDiagram(topic) {
    return {
      title: topic,
      type: 'flowchart',
      nodes: [
        { id: 'n0', label: 'Start',       sublabel: 'Entry point',     type: 'start' },
        { id: 'n1', label: 'Input',        sublabel: 'Receive data',    type: 'data' },
        { id: 'n2', label: 'Process',      sublabel: 'Core logic',      type: 'process' },
        { id: 'n3', label: 'Decision',     sublabel: 'Check condition', type: 'decision' },
        { id: 'n4', label: 'Success Path', sublabel: 'On true',         type: 'process' },
        { id: 'n5', label: 'Error Path',   sublabel: 'On false',        type: 'process' },
        { id: 'n6', label: 'Output',       sublabel: 'Result',          type: 'data' },
        { id: 'n7', label: 'End',          sublabel: 'Complete',        type: 'end' },
      ],
      edges: [
        { from: 'n0', to: 'n1' },
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4', label: 'Yes' },
        { from: 'n3', to: 'n5', label: 'No' },
        { from: 'n4', to: 'n6' },
        { from: 'n5', to: 'n6' },
        { from: 'n6', to: 'n7' },
      ]
    };
  }

  // ── Layout engine — Sugiyama-lite (layer-based) ──
  function layoutNodes(nodes, edges) {
    // Assign layers via longest path from roots
    const inDegree = {};
    nodes.forEach(n => inDegree[n.id] = 0);
    edges.forEach(e => { if (inDegree[e.to] !== undefined) inDegree[e.to]++; });

    const layers = {};
    const queue  = nodes.filter(n => inDegree[n.id] === 0).map(n => ({ id: n.id, layer: 0 }));
    const visited = new Set();

    while (queue.length) {
      const { id, layer } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      layers[id] = Math.max(layers[id] || 0, layer);
      edges.filter(e => e.from === id).forEach(e => {
        queue.push({ id: e.to, layer: layer + 1 });
      });
    }

    // Group by layer
    const byLayer = {};
    nodes.forEach(n => {
      const l = layers[n.id] || 0;
      if (!byLayer[l]) byLayer[l] = [];
      byLayer[l].push(n.id);
    });

    const W = 800, H = 520;
    const numLayers = Object.keys(byLayer).length;
    const layerH    = Math.min(130, (H - 80) / Math.max(1, numLayers - 1));

    const positioned = {};
    Object.entries(byLayer).forEach(([layer, ids]) => {
      const y   = 60 + Number(layer) * layerH;
      const cnt = ids.length;
      ids.forEach((id, i) => {
        positioned[id] = {
          x: (W / (cnt + 1)) * (i + 1),
          y
        };
      });
    });

    return positioned;
  }

  // ── SVG renderer ──
  function renderSVG(data) {
    if (!data || !data.nodes) return '<div style="color:#ff6b6b;padding:20px;">Failed to parse diagram.</div>';

    const W = 800, H = 540;
    const positions = layoutNodes(data.nodes, data.edges);

    const NODE_COLORS = {
      start:    { fill: 'rgba(45,212,168,0.25)', stroke: '#2DD4A8' },
      end:      { fill: 'rgba(45,212,168,0.25)', stroke: '#2DD4A8' },
      process:  { fill: 'rgba(22,30,55,0.9)',    stroke: 'rgba(45,212,168,0.4)' },
      decision: { fill: 'rgba(80,50,120,0.85)',  stroke: 'rgba(150,100,255,0.6)' },
      data:     { fill: 'rgba(20,40,60,0.9)',    stroke: 'rgba(45,212,168,0.3)' },
      external: { fill: 'rgba(40,20,20,0.9)',    stroke: 'rgba(255,100,100,0.4)' },
      group:    { fill: 'rgba(15,20,35,0.7)',    stroke: 'rgba(255,255,255,0.1)' },
    };

    function nodeShape(node, x, y) {
      const col = NODE_COLORS[node.type] || NODE_COLORS.process;
      const lbl = esc(node.label);
      const sub = esc(node.sublabel || '');

      if (node.type === 'start' || node.type === 'end') {
        return `
          <g>
            <rect x="${x-70}" y="${y-22}" width="140" height="44" rx="22"
                  fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.5"/>
            <text x="${x}" y="${y+5}" text-anchor="middle" fill="#eef4f8"
                  font-size="13" font-family="DM Sans,Arial,sans-serif" font-weight="700">${lbl}</text>
          </g>`;
      }

      if (node.type === 'decision') {
        const hw = 78, hh = 34;
        return `
          <g>
            <polygon points="${x},${y-hh} ${x+hw},${y} ${x},${y+hh} ${x-hw},${y}"
                     fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.5"/>
            <text x="${x}" y="${y-4}" text-anchor="middle" fill="#eef4f8"
                  font-size="11" font-family="DM Sans,Arial,sans-serif" font-weight="700">${lbl}</text>
            ${sub ? `<text x="${x}" y="${y+10}" text-anchor="middle" fill="rgba(255,255,255,0.45)"
                  font-size="9" font-family="DM Sans,Arial,sans-serif">${sub}</text>` : ''}
          </g>`;
      }

      if (node.type === 'data') {
        const skew = 12;
        return `
          <g>
            <polygon points="${x-80+skew},${y-24} ${x+80+skew},${y-24} ${x+80-skew},${y+24} ${x-80-skew},${y+24}"
                     fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.5"/>
            <text x="${x}" y="${y-4}" text-anchor="middle" fill="#eef4f8"
                  font-size="12" font-family="DM Sans,Arial,sans-serif" font-weight="700">${lbl}</text>
            ${sub ? `<text x="${x}" y="${y+10}" text-anchor="middle" fill="rgba(255,255,255,0.45)"
                  font-size="9" font-family="DM Sans,Arial,sans-serif">${sub}</text>` : ''}
          </g>`;
      }

      // Default: rounded rect
      return `
        <g>
          <rect x="${x-82}" y="${y-26}" width="164" height="52" rx="10"
                fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.5"/>
          <text x="${x}" y="${y-6}" text-anchor="middle" fill="#eef4f8"
                font-size="12" font-family="DM Sans,Arial,sans-serif" font-weight="700">${lbl}</text>
          ${sub ? `<text x="${x}" y="${y+10}" text-anchor="middle" fill="rgba(255,255,255,0.45)"
                font-size="9.5" font-family="DM Sans,Arial,sans-serif">${sub}</text>` : ''}
        </g>`;
    }

    // Edge paths
    function edgePath(edge) {
      const from = positions[edge.from];
      const to   = positions[edge.to];
      if (!from || !to) return '';

      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;

      // Bezier control point slightly offset
      const cx = mx + (dy !== 0 ? dx * 0.1 : 0);
      const cy = my + 10;

      const lbl = edge.label ? esc(edge.label) : '';

      return `
        <g>
          <path d="M ${from.x} ${from.y+26} Q ${cx} ${cy} ${to.x} ${to.y-26}"
                fill="none" stroke="rgba(45,212,168,0.35)" stroke-width="1.5"
                marker-end="url(#arr)"/>
          ${lbl ? `<text x="${cx}" y="${cy-6}" text-anchor="middle"
                fill="rgba(45,212,168,0.7)" font-size="9" font-family="DM Sans,Arial,sans-serif">${lbl}</text>` : ''}
        </g>`;
    }

    const edgesSvg = data.edges.map(edgePath).join('');
    const nodesSvg = data.nodes.map(n => {
      const pos = positions[n.id];
      return pos ? nodeShape(n, pos.x, pos.y) : '';
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
              role="img" aria-label="Diagram: ${esc(data.title || '')}">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(45,212,168,0.7)"/>
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="${W}" height="${H}" fill="#0E0F13"/>
      <text x="20" y="32" fill="#eef4f8" font-size="17"
            font-family="Space Mono,monospace" font-weight="700">${esc(data.title || 'Diagram')}</text>
      <text x="20" y="50" fill="rgba(45,212,168,0.55)" font-size="10"
            font-family="DM Sans,Arial,sans-serif">Generated by Eryn · ${data.type || 'diagram'}</text>
      ${edgesSvg}
      ${nodesSvg}
    </svg>`;
  }

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[c]);
  }

  async function make(topic) {
    const data = await generateDiagramData(topic);
    return { svg: renderSVG(data), title: data?.title || topic, data };
  }

  return { make };
})();
