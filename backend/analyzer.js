// analyzer.js
(function () {
  const doc = window.document;

  // Lorem Ipsum Generator
  const LOREM_SOURCE = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");

  function generateLorem(wordCount) {
    return Array.from({ length: wordCount }, (_, i) => LOREM_SOURCE[i % LOREM_SOURCE.length]).join(" ");
  }

  // Text manipulation
  function sanitizeDOM(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    if (el.classList.contains("placeholder-media")) return;

    const tag = el.tagName.toUpperCase();

    // Handling <a> text so it won't be analyzed again
    if (tag === "A") {
      const children = Array.from(el.children);
      const isImageLink = children.length === 1 && children[0].tagName === "IMG";

      if (isImageLink) {
        // <a><img></a> = underlined IMAGE
        const span = document.createElement("span");
        span.textContent = "IMAGE";
        span.style.textDecoration = "underline";
        el.replaceWith(span);
      } else {
        // normal link = clickable "Link", no underline
        el.textContent = "Link";
        el.setAttribute("href", "");
        // keep href so it's clickable
        el.style.setProperty("text-decoration", "none", "important");
        el.removeAttribute("onclick");
        el.removeAttribute("onerror");
      }
      return;
    }

    // Set placeholder text IMAGE for <img> or <video>
    if (tag === "IMG" || tag === "VIDEO") {
      const span = document.createElement("span");
      span.textContent = "IMAGE";
      el.replaceWith(span);
      return;
    }

    // Normalize text formatting on non-heading elements
    if (!/^H[1-6]$/.test(tag)) {
      el.style.setProperty("font-style", "normal", "important");
      el.style.setProperty("font-weight", "normal", "important");
      el.style.setProperty("text-decoration", "none", "important");
    }

    // Remove any inline background images
    if (el.style && el.style.backgroundImage) {
      el.style.backgroundImage = "none";
    }

    // Recurse into children, handling text nodes
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const raw = node.textContent.trim();
        if (!raw) return;
        const cleaned = raw.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
        if (!cleaned) {
          node.textContent = "";
          return;
        }
        const words = cleaned.split(/\s+/);
        node.textContent = (words.length <= 2 ? "Text" : generateLorem(words.length)) + " ";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        sanitizeDOM(node);
      }
    });
  }

  // Remove scripts and placeholder all media + bg-images
  function cleanDOM() {
    // Remove scripts
    doc.querySelectorAll("script").forEach((el) => el.remove());

    // Gather media tags
    const mediaTags = ["img", "video", "svg", "canvas", "picture", "embed", "object", "iframe", "audio"];
    const mediaSet = new Set(doc.querySelectorAll(mediaTags.join(",")));

    // Gather any element with background image
    Array.from(doc.querySelectorAll("*")).forEach((el) => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== "none" && /url\(/.test(bg)) {
        mediaSet.add(el);
      }
    });

    // Replace each with placeholder
    mediaSet.forEach((node) => {
      const { width, height } = node.getBoundingClientRect();
      const ph = doc.createElement("div");
      ph.textContent = "IMAGE";
      ph.classList.add("placeholder-media");
      ph.style.setProperty("width", `${width}px`, "important");
      ph.style.setProperty("height", `${height}px`, "important");
      ph.style.setProperty("display", "flex", "important");
      ph.style.setProperty("align-items", "center", "important");
      ph.style.setProperty("justify-content", "center", "important");
      ph.style.setProperty("background", "#888", "important");
      ph.style.setProperty("color", "#fff", "important");
      ph.style.setProperty("font-size", "0.9em", "important");
      node.parentNode.replaceChild(ph, node);
    });
  }

  // Segment definitions
  const SEGMENT_CONFIG = [
    { role: "HEADER", selector: 'header, [role="banner"]' },
    { role: "NAVBAR", selector: 'nav, [role="navigation"]' },
    { role: "SIDEBAR", selector: 'aside, [role="complementary"]' },
    { role: "MAIN", selector: 'main, [role="main"]' },
    { role: "GALLERY", selector: '.gallery, [aria-label*="gallery"]' },
    { role: "FOOTER", selector: 'footer, [role="contentinfo"]' },
  ];

  // Find segments by selector
  function detectSegments() {
    return SEGMENT_CONFIG.flatMap(({ role, selector }) => Array.from(doc.querySelectorAll(selector)).map((el) => ({ role, el })));
  }

  // Ensure a MAIN fallback if none found
  function addFallbacks(segments) {
    if (!segments.some((s) => s.role === "MAIN")) {
      const best = Array.from(doc.body.querySelectorAll("div"))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { el, area: r.width * r.height };
        })
        .sort((a, b) => b.area - a.area)[0];
      if (best && best.el) {
        segments.push({ role: "MAIN", el: best.el });
      }
    }
    return segments;
  }

  // Inline all computed styles
  function inlineAllComputed(el) {
    const cs = window.getComputedStyle(el);
    let cssText = "";
    for (let i = 0; i < cs.length; i++) {
      const prop = cs.item(i);
      const val = cs.getPropertyValue(prop);
      if (!/url\(/.test(val)) {
        cssText += `${prop}:${val};`;
      }
    }
    el.setAttribute("style", cssText);
    Array.from(el.children).forEach(inlineAllComputed);
  }

  // Annotate, transform, and build payload
  function annotateSegments(segments) {
    return segments.map(({ role, el, original }) => {
      sanitizeDOM(el);

      const kids = Array.from(el.querySelectorAll(".placeholder-media"));
      let collided = false;
      for (let i = 0; i < kids.length && !collided; i++) {
        const r1 = kids[i].getBoundingClientRect();
        for (let j = i + 1; j < kids.length; j++) {
          const r2 = kids[j].getBoundingClientRect();
          if (r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top) {
            collided = true;
            break;
          }
        }
      }
      if (collided) {
        kids.forEach((node) => {
          if (node.textContent.trim() === "IMAGE") node.textContent = "I";
        });
      }

      inlineAllComputed(el);

      el.style.setProperty("background-color", "#fff", "important");
      el.style.setProperty("box-sizing", "border-box", "important");

      const rect = (original || el).getBoundingClientRect();
      el.classList.add(`segment-${role.toLowerCase()}`);

      return {
        role,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        html: el.outerHTML,
      };
    });
  }

  // Main pipeline
  function runSegmentation() {
    cleanDOM();
    let segments = detectSegments();
    segments = addFallbacks(segments);
    const payload = annotateSegments(segments);
    window.postMessage({ type: "segments", payload }, "*");
  }

  runSegmentation();
})();
