/**
 * JSON Visualizer — jsoncrack-style graph on HTML5 Canvas.
 *
 * Interaction model:
 *   - Each node has a title bar showing its name/key from the parent edge.
 *   - Only the root node is expanded by default; everything else collapsed.
 *   - Left-click the TITLE to expand/collapse ALL immediate children.
 *   - Left-click a specific FIELD row to expand/collapse only that field's child.
 *   - Right-click the TITLE to copy the entire node + all children as JSON.
 *   - Right-click a FIELD row to copy that field + its child subtree as JSON.
 *   - ⌘C / Ctrl+C copies the focused node's full JSON.
 *   - Scroll to zoom, drag to pan.
 */
(function () {
  'use strict';

  var TITLE_HEIGHT = 30;
  var ROW_HEIGHT = 28;
  var NODE_PADDING_X = 16;
  var NODE_PADDING_Y = 10;
  var NODE_GAP_X = 120;
  var NODE_GAP_Y = 20;
  var FONT = '12px ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
  var FONT_BOLD = 'bold 12px ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
  var FONT_SMALL = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  var FONT_TITLE = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  var BORDER_RADIUS = 10;
  var MAX_VALUE_LEN = 48;
  var CONNECTOR_DOT = 5;

  var COLORS = {
    bg: '#f7f8f9',
    nodeBg: '#ffffff',
    nodeBorder: '#e3e8ee',
    focusBorder: '#635BFF',
    titleBg: '#f8f7ff',
    titleText: '#1a1f36',
    titleBorder: '#ebe8ff',
    key: '#635BFF',
    string: '#1a1f36',
    number: '#c77d0a',
    boolean: '#0d7d4d',
    null: '#939598',
    arrayBadge: '#7c3aed',
    objectBadge: '#635BFF',
    edge: '#c1c9d2',
    edgeHighlight: '#635BFF',
    hoverRow: 'rgba(99, 91, 255, 0.05)',
    hoverTitle: 'rgba(99, 91, 255, 0.08)',
    shadow: 'rgba(0,0,0,0.06)',
    expandBtn: '#635BFF',
    expandBtnBg: '#f6f4ff',
    collapsedHint: '#a3acb9',
    toast: '#1a1f36',
    searchMatch: 'rgba(255, 179, 0, 0.18)',
    searchMatchBorder: '#f59e0b',
    searchActive: 'rgba(255, 120, 0, 0.28)',
    searchActiveBorder: '#ea580c',
  };

  // ── Graph Builder ──────────────────────────────────────────
  function buildGraph(json) {
    var nodes = [];
    var edges = [];
    var nid = 0;
    var eid = 0;
    var nodeMap = {};

    function truncate(v) {
      var s = String(v);
      return s.length > MAX_VALUE_LEN ? s.substring(0, MAX_VALUE_LEN) + '…' : s;
    }

    function makeNode(title, rows, rawValue) {
      var id = nid++;
      var node = { id: id, title: title, rows: rows, children: [], childEdges: [], rawValue: rawValue };
      nodes.push(node);
      nodeMap[id] = node;
      return id;
    }

    function traverse(value, parentId, edgeLabel, parentRowIndex) {
      if (Array.isArray(value)) {
        var arrTitle = edgeLabel !== undefined ? edgeLabel : 'Array';
        var arrId = makeNode(
          arrTitle + ' [' + value.length + ']',
          [],
          value
        );
        if (parentId !== undefined) {
          var e = { id: eid++, from: parentId, to: arrId, label: edgeLabel, fromRowIndex: parentRowIndex };
          edges.push(e);
          nodeMap[parentId].childEdges.push(e);
        }
        value.forEach(function (item, i) {
          var cid = traverse(item, arrId, String(i), i);
          nodeMap[arrId].children.push(cid);
        });
        // For arrays, each item is a "row" in layout terms but we use virtual rows
        // Build rows for primitive array items inline
        value.forEach(function (item, i) {
          if (item === null || typeof item !== 'object') {
            var t = item === null ? 'null' : typeof item;
            nodeMap[arrId].rows.push({ key: String(i), value: truncate(item), type: t, rawValue: item });
          } else {
            var badge = Array.isArray(item)
              ? '[' + item.length + ' items]'
              : '{' + Object.keys(item).length + ' keys}';
            nodeMap[arrId].rows.push({ key: String(i), value: badge, type: Array.isArray(item) ? 'array' : 'object', isLink: true });
          }
        });
        return arrId;

      } else if (value !== null && typeof value === 'object') {
        var objTitle = edgeLabel !== undefined ? edgeLabel : 'Object';
        var rows = [];
        var nested = [];

        Object.keys(value).forEach(function (k) {
          var v = value[k];
          if (v !== null && typeof v === 'object') {
            var badge = Array.isArray(v)
              ? '[' + v.length + ' items]'
              : '{' + Object.keys(v).length + ' keys}';
            var rowIdx = rows.length;
            rows.push({ key: k, value: badge, type: Array.isArray(v) ? 'array' : 'object', isLink: true });
            nested.push({ key: k, val: v, rowIndex: rowIdx });
          } else {
            rows.push({ key: k, value: truncate(v), type: v === null ? 'null' : typeof v, rawValue: v });
          }
        });

        if (rows.length === 0) {
          rows.push({ key: null, value: '{}', type: 'object' });
        }

        var objId = makeNode(objTitle, rows, value);

        if (parentId !== undefined) {
          var e2 = { id: eid++, from: parentId, to: objId, label: edgeLabel, fromRowIndex: parentRowIndex };
          edges.push(e2);
          nodeMap[parentId].childEdges.push(e2);
        }

        nested.forEach(function (entry) {
          var cid = traverse(entry.val, objId, entry.key, entry.rowIndex);
          nodeMap[objId].children.push(cid);
        });

        return objId;

      } else {
        var t = value === null ? 'null' : typeof value;
        var primTitle = edgeLabel !== undefined ? edgeLabel : String(value);
        var primId = makeNode(
          primTitle,
          [{ key: null, value: truncate(value), type: t, rawValue: value }],
          value
        );
        if (parentId !== undefined) {
          var e3 = { id: eid++, from: parentId, to: primId, label: edgeLabel, fromRowIndex: parentRowIndex };
          edges.push(e3);
          nodeMap[parentId].childEdges.push(e3);
        }
        return primId;
      }
    }

    var rootId = traverse(json, undefined, undefined, undefined);
    // Give root a meaningful title
    var rootNode = nodeMap[rootId];
    if (rootNode) {
      if (Array.isArray(json)) {
        rootNode.title = 'Root [' + json.length + ']';
      } else if (json !== null && typeof json === 'object') {
        rootNode.title = 'Root {' + Object.keys(json).length + '}';
      } else {
        rootNode.title = 'Root';
      }
    }
    return { nodes: nodes, edges: edges, rootId: rootId, nodeMap: nodeMap };
  }

  // ── Visibility ─────────────────────────────────────────────
  // Field-level expansion: expandedFields["nodeId:rowIndex"] = true
  // Node-level expansion: expanded[nodeId] = true (expands ALL children)
  // A child is visible if either:
  //   - Its parent node is fully expanded (expanded[parentId])
  //   - The specific field linking to it is expanded (expandedFields["parentId:rowIndex"])
  function computeVisible(graph, expanded, expandedFields) {
    var visible = {};

    function walk(nid) {
      visible[nid] = true;
      var node = graph.nodeMap[nid];
      if (!node) return;

      // Find edges from this node
      graph.edges.forEach(function (e) {
        if (e.from !== nid) return;
        var fieldKey = nid + ':' + e.fromRowIndex;
        if (expanded[nid] || expandedFields[fieldKey]) {
          walk(e.to);
        }
      });
    }
    walk(graph.rootId);
    return visible;
  }

  // ── Parent Map ──────────────────────────────────────────────
  // Build a map: childNodeId → { parentId, fromRowIndex }
  function buildParentMap(graph) {
    var parentMap = {};
    graph.edges.forEach(function (e) {
      parentMap[e.to] = { parentId: e.from, fromRowIndex: e.fromRowIndex };
    });
    return parentMap;
  }

  // ── Search ────────────────────────────────────────────────
  // Returns array of { nodeId, rowIndex (-1 = title match) } for all matches.
  function searchGraph(graph, query) {
    if (!query) return [];
    var q = query.toLowerCase();
    var results = [];

    graph.nodes.forEach(function (node) {
      // Search title
      if (node.title && node.title.toLowerCase().indexOf(q) !== -1) {
        results.push({ nodeId: node.id, rowIndex: -1 });
      }
      // Search rows
      node.rows.forEach(function (row, i) {
        var keyMatch = row.key !== null && String(row.key).toLowerCase().indexOf(q) !== -1;
        var valStr = row.rawValue !== undefined ? String(row.rawValue) : String(row.value);
        var valMatch = valStr.toLowerCase().indexOf(q) !== -1;
        if (keyMatch || valMatch) {
          results.push({ nodeId: node.id, rowIndex: i });
        }
      });
    });

    return results;
  }

  // Ensure a node is visible by expanding all ancestors along the path from root.
  function expandAncestors(nodeId, parentMap, expanded, expandedFields) {
    var path = [];
    var cur = nodeId;
    while (parentMap[cur]) {
      path.push(parentMap[cur]);
      cur = parentMap[cur].parentId;
    }
    // Walk from root down, expanding each ancestor
    for (var i = path.length - 1; i >= 0; i--) {
      var step = path[i];
      // Use full-node expand for simplicity (expand all children of each ancestor)
      expanded[step.parentId] = true;
    }
  }

  // ── Measurement ────────────────────────────────────────────
  function measureNodes(ctx, nodes) {
    nodes.forEach(function (node) {
      var maxWidth = 0;
      // Measure title
      ctx.font = FONT_TITLE;
      var titleW = ctx.measureText(node.title || '').width;
      if (titleW > maxWidth) maxWidth = titleW;

      ctx.font = FONT;
      node.rows.forEach(function (row) {
        var text = row.key !== null
          ? row.key + ':  ' + String(row.value === null ? 'null' : row.value)
          : String(row.value === null ? 'null' : row.value);
        var w = ctx.measureText(text).width;
        if (w > maxWidth) maxWidth = w;
      });
      node.width = Math.min(Math.max(maxWidth + NODE_PADDING_X * 2 + 20, 140), 420);
      node.height = TITLE_HEIGHT + node.rows.length * ROW_HEIGHT + NODE_PADDING_Y * 2;
    });
  }

  // ── Layout (only visible nodes) ────────────────────────────
  function layoutVisible(graph, visible) {
    var nodeMap = graph.nodeMap;
    var childrenMap = {};
    graph.nodes.forEach(function (n) { childrenMap[n.id] = []; });
    graph.edges.forEach(function (e) {
      if (visible[e.from] && visible[e.to]) childrenMap[e.from].push(e.to);
    });

    graph.nodes.forEach(function (n) { n.x = undefined; n.y = undefined; });

    var root = nodeMap[graph.rootId];
    if (!root) return;

    var depths = {};
    depths[root.id] = 0;
    var queue = [root.id];
    var vis2 = {};
    vis2[root.id] = true;
    while (queue.length > 0) {
      var cur = queue.shift();
      (childrenMap[cur] || []).forEach(function (cid) {
        if (!vis2[cid]) {
          vis2[cid] = true;
          depths[cid] = depths[cur] + 1;
          queue.push(cid);
        }
      });
    }

    var layers = {};
    var maxDepth = 0;
    graph.nodes.forEach(function (n) {
      if (!visible[n.id]) return;
      var d = depths[n.id] !== undefined ? depths[n.id] : 0;
      if (!layers[d]) layers[d] = [];
      layers[d].push(n);
      if (d > maxDepth) maxDepth = d;
    });

    var layerX = {};
    var x = 40;
    for (var d = 0; d <= maxDepth; d++) {
      layerX[d] = x;
      var maxW = 0;
      (layers[d] || []).forEach(function (n) { if (n.width > maxW) maxW = n.width; });
      x += maxW + NODE_GAP_X;
    }

    function subtreeH(nid) {
      var node = nodeMap[nid];
      if (!node || !visible[nid]) return 0;
      var ch = childrenMap[nid] || [];
      if (ch.length === 0) return node.height;
      var total = 0;
      ch.forEach(function (c) { total += subtreeH(c); });
      total += (ch.length - 1) * NODE_GAP_Y;
      return Math.max(total, node.height);
    }

    function positionSub(nid, yStart) {
      var node = nodeMap[nid];
      if (!node || !visible[nid]) return;
      node.x = layerX[depths[nid] !== undefined ? depths[nid] : 0];
      var ch = childrenMap[nid] || [];
      if (ch.length === 0) { node.y = yStart; return; }
      var y = yStart;
      ch.forEach(function (c) {
        positionSub(c, y);
        y += subtreeH(c) + NODE_GAP_Y;
      });
      var fc = nodeMap[ch[0]];
      var lc = nodeMap[ch[ch.length - 1]];
      if (fc && lc && fc.y !== undefined && lc.y !== undefined) {
        node.y = (fc.y + fc.height / 2 + lc.y + lc.height / 2) / 2 - node.height / 2;
      } else {
        node.y = yStart;
      }
    }

    positionSub(root.id, 40);
  }

  // ── Helpers ────────────────────────────────────────────────
  function rowYCenter(node, rowIndex) {
    return node.y + TITLE_HEIGHT + NODE_PADDING_Y + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
  }

  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Top-rounded rect for title area
  function drawTopRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function getValueColor(type) {
    if (type === 'string') return COLORS.string;
    if (type === 'number') return COLORS.number;
    if (type === 'boolean') return COLORS.boolean;
    if (type === 'null') return COLORS.null;
    if (type === 'array') return COLORS.arrayBadge;
    if (type === 'object') return COLORS.objectBadge;
    return COLORS.string;
  }

  // ── Render ─────────────────────────────────────────────────
  function render(ctx, graph, transform, state, visible) {
    var canvas = ctx.canvas;
    var dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(transform.x * dpr, transform.y * dpr);
    ctx.scale(transform.scale * dpr, transform.scale * dpr);

    // Dot grid
    var dotSpacing = 24;
    var vl = -transform.x / transform.scale;
    var vt = -transform.y / transform.scale;
    var vr = vl + canvas.width / dpr / transform.scale;
    var vb = vt + canvas.height / dpr / transform.scale;
    ctx.fillStyle = '#d8dee4';
    for (var dx = Math.floor(vl / dotSpacing) * dotSpacing; dx < vr; dx += dotSpacing) {
      for (var dy = Math.floor(vt / dotSpacing) * dotSpacing; dy < vb; dy += dotSpacing) {
        ctx.fillRect(dx, dy, 1.2, 1.2);
      }
    }

    var nodeMap = graph.nodeMap;

    // ── Edges (only between visible nodes) ───────────────────
    graph.edges.forEach(function (edge) {
      if (!visible[edge.from] || !visible[edge.to]) return;
      var fromNode = nodeMap[edge.from];
      var toNode = nodeMap[edge.to];
      if (!fromNode || !toNode || fromNode.x === undefined || toNode.x === undefined) return;

      var fromRowIdx = edge.fromRowIndex !== undefined ? edge.fromRowIndex : 0;
      var x1 = fromNode.x + fromNode.width;
      var y1 = rowYCenter(fromNode, fromRowIdx);
      var x2 = toNode.x;
      var y2 = toNode.y + toNode.height / 2;

      var isFocused = (state.focusedNodeId === edge.from || state.focusedNodeId === edge.to);
      var edgeColor = isFocused ? COLORS.edgeHighlight : COLORS.edge;
      var edgeWidth = isFocused ? 2 : 1.5;
      var cpOffset = Math.min(Math.abs(x2 - x1) * 0.45, 60);

      ctx.beginPath();
      ctx.arc(x1, y1, CONNECTOR_DOT / 2, 0, Math.PI * 2);
      ctx.fillStyle = edgeColor;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1 + cpOffset, y1, x2 - cpOffset, y2, x2, y2);
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = edgeWidth;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 7, y2 - 3);
      ctx.lineTo(x2 - 7, y2 + 3);
      ctx.closePath();
      ctx.fillStyle = edgeColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x2, y2, CONNECTOR_DOT / 2, 0, Math.PI * 2);
      ctx.fillStyle = edgeColor;
      ctx.fill();
    });

    // ── Nodes ────────────────────────────────────────────────
    graph.nodes.forEach(function (node) {
      if (!visible[node.id] || node.x === undefined || node.y === undefined) return;

      var isFocused = state.focusedNodeId === node.id;
      var hasChildren = node.children.length > 0;

      // Shadow
      ctx.shadowColor = isFocused ? 'rgba(99,91,255,0.18)' : COLORS.shadow;
      ctx.shadowBlur = isFocused ? 14 : 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      drawRoundRect(ctx, node.x, node.y, node.width, node.height, BORDER_RADIUS);
      ctx.fillStyle = COLORS.nodeBg;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Search highlight — glow behind the node if it's a match
      var isSearchMatch = state.searchMatchNodeIds && state.searchMatchNodeIds[node.id];
      var isSearchActive = state.searchActiveNodeId === node.id;

      // Border
      drawRoundRect(ctx, node.x, node.y, node.width, node.height, BORDER_RADIUS);
      if (isSearchActive) {
        ctx.strokeStyle = COLORS.searchActiveBorder;
        ctx.lineWidth = 2.5;
      } else if (isSearchMatch) {
        ctx.strokeStyle = COLORS.searchMatchBorder;
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = isFocused ? COLORS.focusBorder : COLORS.nodeBorder;
        ctx.lineWidth = isFocused ? 2 : 1;
      }
      ctx.stroke();

      // Search match background overlay
      if (isSearchActive) {
        drawRoundRect(ctx, node.x, node.y, node.width, node.height, BORDER_RADIUS);
        ctx.fillStyle = COLORS.searchActive;
        ctx.fill();
      } else if (isSearchMatch) {
        drawRoundRect(ctx, node.x, node.y, node.width, node.height, BORDER_RADIUS);
        ctx.fillStyle = COLORS.searchMatch;
        ctx.fill();
      }

      // ── Title bar ─────────────────────────────────────────
      drawTopRoundRect(ctx, node.x + 1, node.y + 1, node.width - 2, TITLE_HEIGHT - 1, BORDER_RADIUS - 1);
      // Hover highlight on title
      if (state.hoverNodeId === node.id && state.hoverRowIndex === -1) {
        ctx.fillStyle = COLORS.hoverTitle;
      } else {
        ctx.fillStyle = COLORS.titleBg;
      }
      ctx.fill();

      // Title separator
      ctx.beginPath();
      ctx.moveTo(node.x, node.y + TITLE_HEIGHT);
      ctx.lineTo(node.x + node.width, node.y + TITLE_HEIGHT);
      ctx.strokeStyle = COLORS.titleBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Title text
      ctx.font = FONT_TITLE;
      ctx.fillStyle = COLORS.titleText;
      var titleStr = node.title || '';
      var maxTitleW = node.width - NODE_PADDING_X * 2 - (hasChildren ? 30 : 0);
      // Truncate title if needed
      if (ctx.measureText(titleStr).width > maxTitleW) {
        while (titleStr.length > 1 && ctx.measureText(titleStr + '…').width > maxTitleW) {
          titleStr = titleStr.substring(0, titleStr.length - 1);
        }
        titleStr += '…';
      }
      ctx.fillText(titleStr, node.x + NODE_PADDING_X, node.y + TITLE_HEIGHT * 0.68);

      // Expand/collapse icon on title for nodes with children
      if (hasChildren) {
        var anyExpanded = !!state.expanded[node.id];
        // Also check field-level
        if (!anyExpanded) {
          for (var fi = 0; fi < node.rows.length; fi++) {
            if (state.expandedFields[node.id + ':' + fi]) { anyExpanded = true; break; }
          }
        }
        var iconX = node.x + node.width - NODE_PADDING_X - 10;
        var iconY = node.y + TITLE_HEIGHT / 2;
        ctx.beginPath();
        ctx.arc(iconX, iconY, 9, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.expandBtnBg;
        ctx.fill();
        ctx.strokeStyle = COLORS.expandBtn;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = COLORS.expandBtn;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(anyExpanded ? '−' : '+', iconX, iconY);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      // ── Rows ──────────────────────────────────────────────
      node.rows.forEach(function (row, i) {
        var ry = node.y + TITLE_HEIGHT + NODE_PADDING_Y + i * ROW_HEIGHT;
        var textY = ry + ROW_HEIGHT * 0.65;
        var rowX = node.x + NODE_PADDING_X;

        // Hover highlight
        if (state.hoverNodeId === node.id && state.hoverRowIndex === i) {
          ctx.fillStyle = COLORS.hoverRow;
          ctx.fillRect(node.x + 2, ry, node.width - 4, ROW_HEIGHT);
        }

        // Field-level expand indicator for link rows
        if (row.isLink) {
          var fieldKey = node.id + ':' + i;
          var fieldExpanded = !!state.expandedFields[fieldKey] || !!state.expanded[node.id];
          // Small expand dot
          var dotX = node.x + node.width - 14;
          var dotY = ry + ROW_HEIGHT / 2;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
          ctx.fillStyle = fieldExpanded ? COLORS.expandBtn : COLORS.expandBtnBg;
          ctx.fill();
          ctx.strokeStyle = COLORS.expandBtn;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.fillStyle = fieldExpanded ? '#ffffff' : COLORS.expandBtn;
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fieldExpanded ? '−' : '+', dotX, dotY);
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }

        if (row.key !== null) {
          ctx.font = FONT_BOLD;
          ctx.fillStyle = COLORS.key;
          ctx.fillText(row.key, rowX, textY);
          var keyW = ctx.measureText(row.key + ':  ').width;

          ctx.font = FONT;
          if (row.type === 'array' || row.type === 'object') {
            var badgeText = String(row.value);
            var badgeW = ctx.measureText(badgeText).width + 12;
            var badgeH = 18;
            var badgeX = rowX + keyW;
            var badgeY = textY - 12;
            drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
            ctx.fillStyle = row.type === 'array' ? '#f3e8ff' : '#f6f4ff';
            ctx.fill();
            ctx.fillStyle = row.type === 'array' ? COLORS.arrayBadge : COLORS.objectBadge;
            ctx.font = FONT_SMALL;
            ctx.fillText(badgeText, badgeX + 6, badgeY + 13);
          } else {
            ctx.fillStyle = getValueColor(row.type);
            var displayVal = row.value === null ? 'null' : String(row.value);
            if (row.type === 'string') displayVal = '"' + displayVal + '"';
            ctx.fillText(displayVal, rowX + keyW, textY);
          }
        } else {
          if (row.type === 'array' || row.type === 'object') {
            ctx.font = FONT_BOLD;
            ctx.fillStyle = row.type === 'array' ? COLORS.arrayBadge : COLORS.objectBadge;
          } else {
            ctx.font = FONT;
            ctx.fillStyle = getValueColor(row.type);
          }
          var val = row.value === null ? 'null' : String(row.value);
          if (row.type === 'string') val = '"' + val + '"';
          ctx.fillText(val, rowX, textY);
        }

        // Row separator
        if (i < node.rows.length - 1) {
          var sepY = node.y + TITLE_HEIGHT + NODE_PADDING_Y + (i + 1) * ROW_HEIGHT;
          ctx.beginPath();
          ctx.moveTo(node.x + 8, sepY);
          ctx.lineTo(node.x + node.width - 8, sepY);
          ctx.strokeStyle = '#f0f2f4';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Collapsed children count badge (when nothing is expanded)
      if (hasChildren) {
        var isFullyCollapsed = !state.expanded[node.id];
        if (isFullyCollapsed) {
          // Check field-level too
          var anyFieldExpanded = false;
          for (var k = 0; k < node.rows.length; k++) {
            if (state.expandedFields[node.id + ':' + k]) { anyFieldExpanded = true; break; }
          }
          if (!anyFieldExpanded) {
            var countText = String(node.children.length);
            ctx.font = FONT_SMALL;
            var cw = ctx.measureText(countText).width + 8;
            var cx = node.x + node.width + 6;
            var cy = node.y + node.height / 2 - 8;
            drawRoundRect(ctx, cx, cy, cw, 16, 8);
            ctx.fillStyle = COLORS.expandBtnBg;
            ctx.fill();
            ctx.strokeStyle = COLORS.expandBtn;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = COLORS.expandBtn;
            ctx.fillText(countText, cx + 4, cy + 12);
          }
        }
      }
    });

    ctx.restore();

    // ── Toast ────────────────────────────────────────────────
    if (state.toast && state.toastAlpha > 0) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.globalAlpha = state.toastAlpha;
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      var tw = ctx.measureText(state.toast).width + 32;
      var th = 32;
      var tx = canvas.width / dpr / 2 - tw / 2;
      var ty = canvas.height / dpr - 60;
      drawRoundRect(ctx, tx, ty, tw, th, 8);
      ctx.fillStyle = COLORS.toast;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(state.toast, tx + tw / 2, ty + 20);
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ── Bounding box ───────────────────────────────────────────
  function getBoundingBox(nodes, visible) {
    var ps = nodes.filter(function (n) { return visible[n.id] && n.x !== undefined; });
    if (ps.length === 0) return { minX: 0, minY: 0, maxX: 200, maxY: 200 };
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ps.forEach(function (n) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  // ── Hit Testing ────────────────────────────────────────────
  // Returns { nodeId, rowIndex } where rowIndex = -1 means the title bar
  function hitTest(graph, visible, worldX, worldY) {
    for (var i = graph.nodes.length - 1; i >= 0; i--) {
      var node = graph.nodes[i];
      if (!visible[node.id] || node.x === undefined) continue;
      if (worldX >= node.x && worldX <= node.x + node.width &&
          worldY >= node.y && worldY <= node.y + node.height) {
        // Check if in title area
        if (worldY < node.y + TITLE_HEIGHT) {
          return { nodeId: node.id, rowIndex: -1 };
        }
        var localY = worldY - node.y - TITLE_HEIGHT - NODE_PADDING_Y;
        var rowIndex = Math.floor(localY / ROW_HEIGHT);
        if (rowIndex < 0) rowIndex = 0;
        if (rowIndex >= node.rows.length) rowIndex = node.rows.length - 1;
        return { nodeId: node.id, rowIndex: rowIndex };
      }
    }
    return null;
  }

  function screenToWorld(e, canvasEl, transform) {
    var rect = canvasEl.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.x) / transform.scale,
      y: (e.clientY - rect.top - transform.y) / transform.scale
    };
  }

  // ── Copy helpers ───────────────────────────────────────────
  // Get the raw value for a specific field row, including child subtree
  function getFieldRawValue(graph, node, rowIndex) {
    var row = node.rows[rowIndex];
    if (!row) return undefined;
    // If it's a link row, find the child node's raw value
    if (row.isLink) {
      // Find the edge from this node at this rowIndex
      for (var i = 0; i < graph.edges.length; i++) {
        var e = graph.edges[i];
        if (e.from === node.id && e.fromRowIndex === rowIndex) {
          var childNode = graph.nodeMap[e.to];
          if (childNode) return childNode.rawValue;
        }
      }
    }
    return row.rawValue;
  }

  function getRowCopyText(graph, node, rowIndex) {
    var row = node.rows[rowIndex];
    if (!row) return '';
    var val = getFieldRawValue(graph, node, rowIndex);
    if (row.key !== null) {
      if (val !== undefined && typeof val === 'object') {
        try { return '"' + row.key + '": ' + JSON.stringify(val, null, 2); } catch (e) { /* fall through */ }
      }
      if (typeof val === 'string') return '"' + row.key + '": "' + val + '"';
      return '"' + row.key + '": ' + String(val);
    }
    if (val !== undefined && typeof val === 'object') {
      try { return JSON.stringify(val, null, 2); } catch (e) { /* fall through */ }
    }
    return String(val !== undefined ? val : row.value);
  }

  function getNodeCopyText(node) {
    if (node.rawValue !== undefined) {
      try { return JSON.stringify(node.rawValue, null, 2); } catch (e) { /* fall through */ }
    }
    return node.rows.map(function (row) {
      if (row.key !== null) {
        var val = row.rawValue !== undefined ? row.rawValue : row.value;
        return row.key + ': ' + (typeof val === 'string' ? '"' + val + '"' : String(val));
      }
      return String(row.rawValue !== undefined ? row.rawValue : row.value);
    }).join('\n');
  }

  // ── Toast ──────────────────────────────────────────────────
  function showToast(state, message, drawFn) {
    state.toast = message;
    state.toastAlpha = 1;
    clearTimeout(state.toastTimer);
    clearInterval(state.fadeInterval);
    drawFn();
    state.toastTimer = setTimeout(function () {
      state.fadeInterval = setInterval(function () {
        state.toastAlpha -= 0.1;
        if (state.toastAlpha <= 0) {
          state.toastAlpha = 0;
          state.toast = null;
          clearInterval(state.fadeInterval);
        }
        drawFn();
      }, 30);
    }, 1200);
  }

  // ── Fit transform to visible ───────────────────────────────
  function fitTransform(canvasEl, graph, visible) {
    var dpr = window.devicePixelRatio || 1;
    var bbox = getBoundingBox(graph.nodes, visible);
    var pad = 60;
    var gw = bbox.maxX - bbox.minX + pad * 2;
    var gh = bbox.maxY - bbox.minY + pad * 2;
    var cw = canvasEl.width / dpr;
    var ch = canvasEl.height / dpr;
    var s = Math.min(cw / gw, ch / gh, 1.2);
    return {
      x: -bbox.minX * s + (cw - gw * s) / 2 + pad * s,
      y: -bbox.minY * s + (ch - gh * s) / 2 + pad * s,
      scale: s,
    };
  }

  // ── Main Initialize ────────────────────────────────────────
  window.initJsonVisualizer = function (canvasEl, jsonData) {
    var ctx = canvasEl.getContext('2d');
    var dpr = window.devicePixelRatio || 1;

    var callbacks = { onFocusChange: null };

    var state = {
      focusedNodeId: null,
      focusedRowIndex: -1,      // -1 = title/whole node, 0+ = specific field
      hoverNodeId: null,
      hoverRowIndex: null,      // -1 = title, 0+ = field row
      expanded: {},              // nodeId → true (all children expanded)
      expandedFields: {},        // "nodeId:rowIndex" → true (single field expanded)
      toast: null,
      toastAlpha: 0,
      toastTimer: null,
      fadeInterval: null,
      // Search state
      searchResults: [],         // array of { nodeId, rowIndex }
      searchIndex: -1,           // current active match index
      searchMatchNodeIds: null,  // { nodeId: true } for all matches (for rendering)
      searchActiveNodeId: null,  // currently active match node (for rendering)
    };

    function resizeCanvas() {
      var rect = canvasEl.parentElement.getBoundingClientRect();
      canvasEl.width = rect.width * dpr;
      canvasEl.height = rect.height * dpr;
      canvasEl.style.width = rect.width + 'px';
      canvasEl.style.height = rect.height + 'px';
    }

    resizeCanvas();

    var graph = buildGraph(jsonData);
    measureNodes(ctx, graph.nodes);
    var parentMap = buildParentMap(graph);

    // Only root is expanded by default
    state.expanded[graph.rootId] = true;

    var visible = computeVisible(graph, state.expanded, state.expandedFields);
    layoutVisible(graph, visible);

    var transform = fitTransform(canvasEl, graph, visible);

    function relayout() {
      visible = computeVisible(graph, state.expanded, state.expandedFields);
      layoutVisible(graph, visible);
    }

    function draw() {
      render(ctx, graph, transform, state, visible);
    }

    draw();

    // ── Collapse helpers ────────────────────────────────────
    function collapseDescendants(nid) {
      delete state.expanded[nid];
      var node = graph.nodeMap[nid];
      if (!node) return;
      // Clear field-level expansions
      for (var r = 0; r < node.rows.length; r++) {
        delete state.expandedFields[nid + ':' + r];
      }
      (node.children || []).forEach(collapseDescendants);
    }

    // ── Pan ──────────────────────────────────────────────────
    var isPanning = false;
    var didDrag = false;
    var panStart = { x: 0, y: 0 };
    var mouseDownPos = { x: 0, y: 0 };

    function onMouseDown(e) {
      if (e.button !== 0) return;
      isPanning = true;
      didDrag = false;
      panStart.x = e.clientX - transform.x;
      panStart.y = e.clientY - transform.y;
      mouseDownPos.x = e.clientX;
      mouseDownPos.y = e.clientY;
    }
    canvasEl.addEventListener('mousedown', onMouseDown);

    function onMouseMove(e) {
      if (isPanning) {
        var mdx = e.clientX - mouseDownPos.x;
        var mdy = e.clientY - mouseDownPos.y;
        if (Math.abs(mdx) > 3 || Math.abs(mdy) > 3) didDrag = true;
        transform.x = e.clientX - panStart.x;
        transform.y = e.clientY - panStart.y;
        if (didDrag) canvasEl.style.cursor = 'grabbing';
        draw();
        return;
      }

      // Hover
      var w = screenToWorld(e, canvasEl, transform);
      var hit = hitTest(graph, visible, w.x, w.y);
      if (hit) {
        state.hoverNodeId = hit.nodeId;
        state.hoverRowIndex = hit.rowIndex;
        canvasEl.style.cursor = 'pointer';
      } else {
        state.hoverNodeId = null;
        state.hoverRowIndex = null;
        canvasEl.style.cursor = 'grab';
      }
      draw();
    }
    window.addEventListener('mousemove', onMouseMove);

    function onMouseUp(e) {
      if (e.button !== 0) { return; }
      if (isPanning && !didDrag) {
        var w = screenToWorld(e, canvasEl, transform);
        var hit = hitTest(graph, visible, w.x, w.y);
        if (hit) {
          var node = graph.nodeMap[hit.nodeId];
          state.focusedNodeId = hit.nodeId;
          state.focusedRowIndex = hit.rowIndex;

          if (hit.rowIndex === -1) {
            // ── Left-click TITLE: expand/collapse ALL children ──
            if (node && node.children.length > 0) {
              if (state.expanded[node.id]) {
                // Collapse all
                collapseDescendants(node.id);
              } else {
                // Expand all children: set node as expanded, clear field-level
                state.expanded[node.id] = true;
                for (var r = 0; r < node.rows.length; r++) {
                  delete state.expandedFields[node.id + ':' + r];
                }
              }
              relayout();
            }
          } else {
            // ── Left-click FIELD: toggle that field's child only ──
            var row = node.rows[hit.rowIndex];
            if (row && row.isLink) {
              var fieldKey = node.id + ':' + hit.rowIndex;
              if (state.expanded[node.id]) {
                // Currently fully expanded → switch to field-level:
                // collapse the full expand, then expand all fields EXCEPT this one
                delete state.expanded[node.id];
                for (var j = 0; j < node.rows.length; j++) {
                  if (node.rows[j].isLink && j !== hit.rowIndex) {
                    state.expandedFields[node.id + ':' + j] = true;
                  }
                }
                // Collapse descendants of the toggled field's child
                graph.edges.forEach(function (edge) {
                  if (edge.from === node.id && edge.fromRowIndex === hit.rowIndex) {
                    collapseDescendants(edge.to);
                  }
                });
              } else if (state.expandedFields[fieldKey]) {
                // This field is expanded → collapse it and its descendants
                delete state.expandedFields[fieldKey];
                graph.edges.forEach(function (edge) {
                  if (edge.from === node.id && edge.fromRowIndex === hit.rowIndex) {
                    collapseDescendants(edge.to);
                  }
                });
              } else {
                // This field is collapsed → expand it
                state.expandedFields[fieldKey] = true;
              }
              // Check if all link fields are now expanded → promote to full expand
              var allExpanded = true;
              for (var k = 0; k < node.rows.length; k++) {
                if (node.rows[k].isLink && !state.expandedFields[node.id + ':' + k]) {
                  allExpanded = false;
                  break;
                }
              }
              if (allExpanded && node.rows.some(function (r) { return r.isLink; })) {
                state.expanded[node.id] = true;
                for (var m = 0; m < node.rows.length; m++) {
                  delete state.expandedFields[node.id + ':' + m];
                }
              }
              relayout();
            }
          }
        } else {
          state.focusedNodeId = null;
          state.focusedRowIndex = -1;
        }
        draw();
        // Dispatch focus change callback
        if (typeof callbacks.onFocusChange === 'function') {
          var info = null;
          if (state.focusedNodeId !== null) {
            var fNode = graph.nodeMap[state.focusedNodeId];
            var fRow = (fNode && state.focusedRowIndex >= 0) ? fNode.rows[state.focusedRowIndex] : null;
            var fPath = getNodePath(state.focusedNodeId);
            if (fRow && fRow.key !== null) fPath += '.' + fRow.key;
            info = {
              nodeId: state.focusedNodeId,
              rowIndex: state.focusedRowIndex,
              title: fNode ? fNode.title : '',
              path: fPath,
              fieldKey: fRow ? (fRow.key || '') : '',
            };
          }
          callbacks.onFocusChange(info);
        }
      }
      isPanning = false;
      didDrag = false;
      canvasEl.style.cursor = state.hoverNodeId !== null ? 'pointer' : 'grab';
    }
    window.addEventListener('mouseup', onMouseUp);

    // ── Right-click ─────────────────────────────────────────
    function onContextMenu(e) {
      e.preventDefault();
      var w = screenToWorld(e, canvasEl, transform);
      var hit = hitTest(graph, visible, w.x, w.y);
      if (!hit) return;

      var node = graph.nodeMap[hit.nodeId];
      if (!node) return;

      state.focusedNodeId = hit.nodeId;

      if (hit.rowIndex === -1) {
        // ── Right-click TITLE: copy entire node + all children ──
        var copyText = getNodeCopyText(node);
        navigator.clipboard.writeText(copyText).then(function () {
          showToast(state, '✓ Node copied (' + copyText.length + ' chars)', draw);
        }).catch(function () {});
      } else {
        // ── Right-click FIELD: copy that field + its children ──
        var rowText = getRowCopyText(graph, node, hit.rowIndex);
        navigator.clipboard.writeText(rowText).then(function () {
          showToast(state, '✓ Copied: ' + (rowText.length > 35 ? rowText.substring(0, 35) + '…' : rowText), draw);
        }).catch(function () {});
      }
      draw();
    }
    canvasEl.addEventListener('contextmenu', onContextMenu);

    // ── ⌘C / Ctrl+C: copy focused node ──────────────────────
    function onKeyCopy(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && state.focusedNodeId !== null) {
        var node = graph.nodeMap[state.focusedNodeId];
        if (!node) return;
        e.preventDefault();
        var copyText = getNodeCopyText(node);
        navigator.clipboard.writeText(copyText).then(function () {
          showToast(state, '✓ Node JSON copied (' + copyText.length + ' chars)', draw);
        }).catch(function () {});
      }
    }
    document.addEventListener('keydown', onKeyCopy);

    // ── Zoom ─────────────────────────────────────────────────
    function onWheel(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.92 : 1.08;
      var newScale = transform.scale * delta;
      if (newScale < 0.05 || newScale > 5) return;
      var rect = canvasEl.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      transform.x = mx - (mx - transform.x) * delta;
      transform.y = my - (my - transform.y) * delta;
      transform.scale = newScale;
      draw();
    }
    canvasEl.addEventListener('wheel', onWheel, { passive: false });

    // ── Resize ───────────────────────────────────────────────
    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resizeCanvas(); draw(); }, 100);
    }
    window.addEventListener('resize', onResize);

    // ── Controls API ─────────────────────────────────────────
    function zoomTo(delta) {
      var vcw = canvasEl.width / dpr;
      var vch = canvasEl.height / dpr;
      var cx = vcw / 2, cy = vch / 2;
      transform.x = cx - (cx - transform.x) * delta;
      transform.y = cy - (cy - transform.y) * delta;
      transform.scale *= delta;
      draw();
    }

    // ── Search helpers ──────────────────────────────────────
    function navigateToMatch(index) {
      if (state.searchResults.length === 0) return;
      state.searchIndex = index;
      var match = state.searchResults[index];
      var node = graph.nodeMap[match.nodeId];
      if (!node) return;

      // Expand all ancestors so the node becomes visible
      expandAncestors(match.nodeId, parentMap, state.expanded, state.expandedFields);
      relayout();

      // Center the view on the matched node
      state.focusedNodeId = match.nodeId;
      state.searchActiveNodeId = match.nodeId;

      var cw = canvasEl.width / dpr;
      var ch = canvasEl.height / dpr;
      var targetScale = Math.max(transform.scale, 0.8);
      transform.scale = targetScale;
      transform.x = cw / 2 - (node.x + node.width / 2) * targetScale;
      transform.y = ch / 2 - (node.y + node.height / 2) * targetScale;
      draw();
    }

    // ── Node path builder ──────────────────────────────────
    function getNodePath(nodeId) {
      var segments = [];
      var cur = nodeId;
      while (cur !== undefined && cur !== null) {
        var node = graph.nodeMap[cur];
        if (!node) break;
        // Find edge label that leads to this node
        var p = parentMap[cur];
        if (p) {
          var edge = null;
          graph.edges.forEach(function (e) {
            if (e.from === p.parentId && e.to === cur) edge = e;
          });
          segments.unshift(edge && edge.label !== undefined ? edge.label : node.title);
          cur = p.parentId;
        } else {
          segments.unshift('$');
          break;
        }
      }
      return segments.join('.');
    }

    return {
      zoomIn: function () { zoomTo(1.25); },
      zoomOut: function () { zoomTo(0.8); },
      fitToView: function () {
        resizeCanvas();
        var t = fitTransform(canvasEl, graph, visible);
        transform.x = t.x; transform.y = t.y; transform.scale = t.scale;
        draw();
      },
      destroy: function () {
        clearTimeout(state.toastTimer);
        clearInterval(state.fadeInterval);
        clearTimeout(resizeTimer);
        callbacks.onFocusChange = null;
        canvasEl.removeEventListener('mousedown', onMouseDown);
        canvasEl.removeEventListener('contextmenu', onContextMenu);
        canvasEl.removeEventListener('wheel', onWheel);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('keydown', onKeyCopy);
      },
      getFocusedInfo: function () {
        if (state.focusedNodeId === null) return null;
        var node = graph.nodeMap[state.focusedNodeId];
        if (!node) return null;
        var row = (state.focusedRowIndex >= 0) ? node.rows[state.focusedRowIndex] : null;
        var p = getNodePath(state.focusedNodeId);
        if (row && row.key !== null) p += '.' + row.key;
        return {
          nodeId: state.focusedNodeId,
          rowIndex: state.focusedRowIndex,
          title: node.title,
          path: p,
          fieldKey: row ? (row.key || '') : '',
        };
      },
      focusOnNode: function (nodeId, rowIndex) {
        var node = graph.nodeMap[nodeId];
        if (!node) return;
        expandAncestors(nodeId, parentMap, state.expanded, state.expandedFields);
        relayout();
        state.focusedNodeId = nodeId;
        state.focusedRowIndex = rowIndex !== undefined ? rowIndex : -1;
        var cw = canvasEl.width / dpr;
        var ch = canvasEl.height / dpr;
        var targetScale = Math.max(transform.scale, 0.8);
        transform.scale = targetScale;
        transform.x = cw / 2 - (node.x + node.width / 2) * targetScale;
        transform.y = ch / 2 - (node.y + node.height / 2) * targetScale;
        draw();
      },
      set onFocusChange(fn) { callbacks.onFocusChange = fn; },
      get onFocusChange() { return callbacks.onFocusChange; },
      search: function (query) {
        state.searchResults = searchGraph(graph, query);
        state.searchIndex = -1;
        state.searchActiveNodeId = null;
        // Build set of matched node IDs for rendering
        if (state.searchResults.length > 0) {
          state.searchMatchNodeIds = {};
          state.searchResults.forEach(function (r) {
            state.searchMatchNodeIds[r.nodeId] = true;
          });
        } else {
          state.searchMatchNodeIds = null;
        }
        draw();
        return state.searchResults.length;
      },
      searchNext: function () {
        if (state.searchResults.length === 0) return { index: -1, total: 0 };
        var next = state.searchIndex + 1;
        if (next >= state.searchResults.length) next = 0;
        navigateToMatch(next);
        return { index: next, total: state.searchResults.length };
      },
      searchPrev: function () {
        if (state.searchResults.length === 0) return { index: -1, total: 0 };
        var prev = state.searchIndex - 1;
        if (prev < 0) prev = state.searchResults.length - 1;
        navigateToMatch(prev);
        return { index: prev, total: state.searchResults.length };
      },
      clearSearch: function () {
        state.searchResults = [];
        state.searchIndex = -1;
        state.searchMatchNodeIds = null;
        state.searchActiveNodeId = null;
        draw();
      },
    };
  };
})();
