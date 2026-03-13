/**
 * XML Visualizer — Adapts fast-xml-parser's JSON output into a clean
 * XML-aware node graph, then delegates rendering to json-visualizer.js.
 *
 * XML-specific display:
 *   - Element nodes show the tag name as a header
 *   - Attributes (prefixed @_) shown as "attr = value" rows with a distinct color
 *   - Text content (#text) shown inline
 *   - Repeated elements (arrays) expand into separate child nodes
 */
(function () {
  'use strict';

  /**
   * Transform fast-xml-parser output into a JSON structure that
   * json-visualizer.js renders well, with XML semantics visible.
   *
   * Strategy: walk the parsed-XML object and produce a new object where:
   *   - Each element becomes { __tag: "tagName", @attr: val, ... , childTag: {...} }
   *   - Arrays of repeated elements are preserved
   *   - #text and __cdata become readable fields
   */
  function transformXmlJson(obj, tagName) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(function (item, i) {
        return transformXmlJson(item, tagName || ('[' + i + ']'));
      });
    }

    var result = {};
    var entries = Object.entries(obj);

    // Separate attributes, text, and child elements
    var attrs = [];
    var children = [];
    var textVal = null;

    entries.forEach(function (pair) {
      var key = pair[0];
      var val = pair[1];
      if (key.startsWith('@_')) {
        attrs.push({ key: key.substring(2), value: val });
      } else if (key === '#text') {
        textVal = val;
      } else if (key === '__cdata') {
        textVal = '[CDATA] ' + String(val);
      } else if (key === '__comment') {
        textVal = '<!-- ' + String(val) + ' -->';
      } else {
        children.push({ key: key, value: val });
      }
    });

    // Build a clean object for visualization
    // Attributes as "@ key" entries
    attrs.forEach(function (a) {
      result['@' + a.key] = a.value;
    });

    // Text content
    if (textVal !== null && textVal !== undefined) {
      result['#text'] = textVal;
    }

    // Child elements
    children.forEach(function (c) {
      if (Array.isArray(c.value)) {
        result[c.key] = c.value.map(function (item) {
          return transformXmlJson(item, c.key);
        });
      } else if (c.value !== null && typeof c.value === 'object') {
        result[c.key] = transformXmlJson(c.value, c.key);
      } else {
        result[c.key] = c.value;
      }
    });

    // If the object has only text and no children/attrs, simplify
    if (Object.keys(result).length === 0 && textVal !== null) {
      return textVal;
    }

    return result;
  }

  /**
   * Initialize the XML visualizer — transforms XML-JSON and calls
   * the shared json-visualizer.
   */
  window.initXmlVisualizer = function (canvasEl, xmlJsonData) {
    // Transform the fast-xml-parser output into a cleaner structure
    var cleaned = transformXmlJson(xmlJsonData);
    // Delegate to the JSON visualizer
    return window.initJsonVisualizer(canvasEl, cleaned);
  };
})();
