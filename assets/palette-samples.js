(() => {
  const IMAGE_SIZE = { width: 1481, height: 1481 };
  const PALETTE = [
    {
      name: "Zeus",
      hex: "#211f1c",
      source: { x: 540, y: 940 }
    },
    {
      name: "Moss Green",
      hex: "#6f8143",
      source: { x: 1235, y: 670 }
    },
    {
      name: "Coffee",
      hex: "#745238",
      source: { x: 300, y: 1260 }
    },
    {
      name: "Roof Terracotta",
      hex: "#a94442",
      source: { x: 1260, y: 1370 }
    },
    {
      name: "Rocket Metallic",
      hex: "#8a8175",
      source: { x: 700, y: 1080 }
    },
    {
      name: "Smooth Velvety Cream",
      hex: "#f4efe8",
      source: { x: 900, y: 210 }
    }
  ];

  const portrait = document.querySelector("[data-palette-portrait]");
  const portraitImage = portrait?.querySelector("img");

  if (!portrait || !portraitImage) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "palette-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  let active = false;
  let frame = 0;

  function parsePosition(value, axis) {
    const fallback = 50;
    const parts = value.trim().split(/\s+/);
    const raw = parts[axis === "x" ? 0 : 1] || `${fallback}%`;

    if (raw.endsWith("%")) {
      return Number.parseFloat(raw) / 100;
    }

    if (raw === "left" || raw === "top") {
      return 0;
    }

    if (raw === "right" || raw === "bottom") {
      return 1;
    }

    return fallback / 100;
  }

  function imagePoint(source) {
    const rect = portraitImage.getBoundingClientRect();
    const style = getComputedStyle(portraitImage);
    const scale = Math.max(rect.width / IMAGE_SIZE.width, rect.height / IMAGE_SIZE.height);
    const renderedWidth = IMAGE_SIZE.width * scale;
    const renderedHeight = IMAGE_SIZE.height * scale;
    const positionX = parsePosition(style.objectPosition, "x");
    const positionY = parsePosition(style.objectPosition, "y");
    const offsetX = (rect.width - renderedWidth) * positionX;
    const offsetY = (rect.height - renderedHeight) * positionY;

    return {
      x: rect.left + offsetX + source.x * scale,
      y: rect.top + offsetY + source.y * scale
    };
  }

  function pointInsidePortrait(event) {
    const rect = portraitImage.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }

  function contrastColor(hex) {
    const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
    const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
    const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    return luminance > 0.58 ? "#211f1c" : "#f4efe8";
  }

  function draw() {
    overlay.innerHTML = "";

    PALETTE.forEach((item) => {
      const point = imagePoint(item.source);
      const sample = document.createElement("div");
      sample.className = "palette-sample";
      sample.setAttribute("tabindex", "0");
      sample.setAttribute("aria-label", `${item.name}, ${item.hex}`);
      sample.style.setProperty("--palette-color", item.hex);
      sample.style.setProperty("--palette-ink", contrastColor(item.hex));
      sample.style.left = `${point.x}px`;
      sample.style.top = `${point.y}px`;

      const dot = document.createElement("span");
      dot.className = "palette-dot";
      const label = document.createElement("div");
      label.className = "palette-label";
      label.innerHTML = `<span>${item.name}</span><code>${item.hex}</code>`;
      sample.append(dot, label);
      overlay.appendChild(sample);
    });
  }

  function scheduleDraw() {
    if (!active || frame) {
      return;
    }

    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  function show() {
    if (active) {
      return;
    }

    active = true;
    draw();
    overlay.classList.add("is-visible");
  }

  function hide() {
    active = false;
    overlay.classList.remove("is-visible");
  }

  document.addEventListener("pointermove", (event) => {
    if (pointInsidePortrait(event)) {
      show();
    } else {
      hide();
    }
  });

  portrait.addEventListener("focus", show);
  portrait.addEventListener("blur", hide);

  window.addEventListener("scroll", scheduleDraw, { passive: true });
  window.addEventListener("resize", scheduleDraw);
})();
