import React, { useState, useEffect } from "react";
import axios from "axios";
import Home from "./pages/Home";
import Breadcrumbs from "./pages/Breadcrumbs";

// Available template options
const TEMPLATE_OPTIONS = [
  { id: "classic", label: "Klasični", slots: ["header", "main", "footer"] },
  { id: "classicNavbar", label: "Prošireni klasični 1", slots: ["header", "navbar", "main", "footer"] },
  { id: "classicExpanded", label: "Prošireni klasični 2", slots: ["header", "navbar", "main", "sidebar", "footer"] },
  { id: "twoColumn", label: "Dvije kolone 1", slots: ["header", "navbar", "sidebar", "main", "footer"] },
  { id: "twoColumnInverse", label: "Dvije kolone 2", slots: ["header", "navbar", "sidebar", "main", "footer"] },
  { id: "threeColumn", label: "Tri kolone", slots: ["header", "navbar", "sidebar", "main", "sidebar", "footer"] },
];

const SCALE = 1.0;
const PAD = 40;

export default function App() {
  // Wizard state
  const [step, setStep] = useState(0);
  const stepsLabels = ["Segmentacija", "Odabir layouta", "Popunjavanje slotova", "Pregled i preuzimanje"];

  // Segmentation inputs & results
  const [urls, setUrls] = useState(["https://www.gnu.org/", "https://www.w3.org/"]);
  const [layoutParts, setLayoutParts] = useState([]);

  // Template choice & assignments
  const [chosenTemplate, setChosenTemplate] = useState(null);
  const [assignedParts, setAssignedParts] = useState({});

  useEffect(() => {
    if (layoutParts.length) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [layoutParts]);

  // Color map for borders and labels
  const getColor = (role) => {
    switch (role) {
      case "header":
        return "red";
      case "navbar":
        return "orange";
      case "main":
        return "green";
      case "sidebar":
        return "purple";
      case "gallery":
        return "cyan";
      case "footer":
        return "blue";
      default:
        return "#999";
    }
  };

  // Segment extraction from each URL
  const extract = async () => {
    const parts = [];
    for (let url of urls) {
      try {
        const res = await axios.post("http://localhost:5000/segment", { url });
        parts.push({ url, segments: res.data.segments || [] });
      } catch (err) {
        console.error(`Extraction failed for ${url}`, err);
        parts.push({ url, segments: [] });
      }
    }
    setLayoutParts(parts);
  };

  // Segment assignation for template slot
  const assign = (slot, page, seg) => {
    setAssignedParts((prev) => ({ ...prev, [slot]: { pageUrl: page.url, seg } }));
  };

  // Generate and download combined HTML
  const downloadHtml = () => {
    const template = TEMPLATE_OPTIONS.find((t) => t.id === chosenTemplate);
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Combined Layout</title></head>
<body>
  ${template.slots
    .map((slot) => {
      const a = assignedParts[slot];
      return a ? a.seg.html : `<div style="border:2px dashed #999; padding:20px; margin:10px 0;">Slot ${slot} nije dodijeljen</div>`;
    })
    .join("\n  ")}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "combined-layout.html";
    link.click();
  };

  // Check if all slots have assignments
  const allAssigned = () => {
    const template = TEMPLATE_OPTIONS.find((t) => t.id === chosenTemplate);
    return template.slots.every((slot) => !!assignedParts[slot]);
  };

  const availableSlots = chosenTemplate ? TEMPLATE_OPTIONS.find((t) => t.id === chosenTemplate).slots.filter((slot) => layoutParts.some((page) => page.segments.some((seg) => seg.role === slot))) : [];

  return (
    <>
      {/* Home screen */}
      {step === 0 ? (
        <Home onStart={() => setStep(1)} />
      ) : (
        <div style={{ minHeight: "100vh", background: "#111", color: "#fff", padding: 20 }}>
          <Breadcrumbs steps={stepsLabels} current={step} onSelect={(newStep) => setStep(newStep)} />

          {/* Segmentation UI (Original version) */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: 20 }}>
                <h2>Unesite URL-ove web stranica:</h2>
                {urls.map((u, i) => (
                  <input
                    key={`url-input-${i}`}
                    value={u}
                    onChange={(e) => setUrls((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder="https://..."
                    style={{
                      width: "100%",
                      padding: 10,
                      marginBottom: 10,
                      borderRadius: 4,
                      border: "1px solid #444",
                      background: "#222",
                      color: "#fff",
                      boxSizing: "border-box",
                    }}
                  />
                ))}
                <button onClick={() => setUrls((arr) => [...arr, ""])} style={{ marginRight: 10 }}>
                  Dodaj URL
                </button>
                <button onClick={extract}>Izvuci layout</button>
              </div>

              {/* Segments display with overlays */}
              {layoutParts.map((page, pi) => (
                <div
                  key={`page-${pi}`}
                  style={{
                    padding: 20,
                    background: "#222",
                    borderRadius: 6,
                    marginBottom: 40,
                  }}
                >
                  <h3 style={{ marginBottom: 10 }}>URL: {page.url}</h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {(() => {
                      const counts = page.segments.reduce((acc, seg) => {
                        acc[seg.role] = (acc[seg.role] || 0) + 1;
                        return acc;
                      }, {});
                      const indexMap = {};

                      return page.segments.map((seg, si) => {
                        indexMap[seg.role] = (indexMap[seg.role] || 0) + 1;
                        let label = seg.role.toUpperCase();
                        if (counts[seg.role] > 1 && ["navbar", "sidebar", "gallery"].includes(seg.role)) {
                          label += ` ${indexMap[seg.role]}`;
                        }
                        const w = seg.rect.width * SCALE;
                        const h = seg.rect.height * SCALE;

                        return (
                          <div key={`seg-${pi}-${seg.role}-${si}`} onClick={() => assign(seg.role, page, seg)} style={{ cursor: "pointer" }}>
                            {/* Dynamic label */}
                            <div
                              style={{
                                marginBottom: 4,
                                color: getColor(seg.role),
                                fontSize: 14,
                                fontWeight: "bold",
                              }}
                            >
                              {label}
                            </div>

                            {/* Wireframe box */}
                            <div
                              style={{
                                position: "relative",
                                width: w,
                                height: h,
                                backgroundColor: "#fff",
                                border: `3px solid ${getColor(seg.role)}`,
                                overflow: "hidden",
                                padding: "40px",
                              }}
                            >
                              <div
                                dangerouslySetInnerHTML={{ __html: seg.html }}
                                style={{
                                  transform: `scale(${SCALE})`,
                                  transformOrigin: "0 0",
                                  width: `${100 / SCALE}%`,
                                  height: `${100 / SCALE}%`,
                                  pointerEvents: "none",
                                }}
                              />

                              {seg.role === "main" &&
                                (() => {
                                  const children = page.segments.filter((s) => s.role !== "main" && s.rect.x < seg.rect.x + seg.rect.width && s.rect.x + s.rect.width > seg.rect.x && s.rect.y < seg.rect.y + seg.rect.height && s.rect.y + s.rect.height > seg.rect.y);

                                  return children.map((child, ci) => {
                                    const top = (child.rect.y - seg.rect.y) * SCALE + PAD;
                                    const left = (child.rect.x - seg.rect.x) * SCALE + PAD;
                                    const width = child.rect.width * SCALE;
                                    const height = child.rect.height * SCALE;

                                    return (
                                      <div
                                        key={`child-${ci}`}
                                        style={{
                                          position: "absolute",
                                          top,
                                          left,
                                          width,
                                          height,
                                          border: `2px dashed ${getColor(child.role)}`,
                                          pointerEvents: "none",
                                        }}
                                      />
                                    );
                                  });
                                })()}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ))}

              {layoutParts.length > 0 && <button onClick={() => setStep(2)}>Odaberi vrstu layouta</button>}
            </>
          )}

          {/* Template Selection */}
          {step === 2 && (
            <div>
              <h2>Odaberite vrstu layouta:</h2>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {/* Classic single-column */}
                <div
                  onClick={() => setChosenTemplate("classic")}
                  style={{
                    cursor: "pointer",
                    border: chosenTemplate === "classic" ? "3px solid #646cff" : "2px solid #444",
                    borderRadius: 6,
                    padding: 10,
                    width: 100,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: "1fr 3fr 1fr",
                      height: 150,
                      gap: 2,
                      background: "#222",
                    }}
                  >
                    <div style={{ background: "#444" }} /> {/* HEADER */}
                    <div style={{ background: "#666" }} /> {/* MAIN */}
                    <div style={{ background: "#444" }} /> {/* FOOTER */}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>Klasični</div>
                  <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "#ccc" }}>Header, Main, Footer</div>
                </div>

                {/* Single-column with navbar */}
                <div
                  onClick={() => setChosenTemplate("classicNavbar")}
                  style={{
                    cursor: "pointer",
                    border: chosenTemplate === "classicNavbar" ? "3px solid #646cff" : "2px solid #444",
                    borderRadius: 6,
                    padding: 10,
                    width: 100,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: "1fr 1fr 3fr 1fr",
                      height: 150,
                      gap: 2,
                      background: "#222",
                    }}
                  >
                    <div style={{ background: "#444" }} /> {/* HEADER */}
                    <div style={{ background: "#555" }} /> {/* NAV */}
                    <div style={{ background: "#666" }} /> {/* MAIN */}
                    <div style={{ background: "#444" }} /> {/* FOOTER */}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>Prošireni klasični 1</div>
                  <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "#ccc" }}>Header, Navbar, Main, Footer</div>
                </div>

                {/* Single-column with navbar and sidebar */}
                <div
                  onClick={() => setChosenTemplate("classicExpanded")}
                  style={{
                    cursor: "pointer",
                    border: chosenTemplate === "classicExpanded" ? "3px solid #646cff" : "2px solid #444",
                    borderRadius: 6,
                    padding: 10,
                    width: 100,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: "1fr 1fr 3fr 1fr 1fr",
                      height: 150,
                      gap: 2,
                      background: "#222",
                    }}
                  >
                    <div style={{ background: "#444" }} /> {/* HEADER */}
                    <div style={{ background: "#555" }} /> {/* NAV */}
                    <div style={{ background: "#666" }} /> {/* MAIN */}
                    <div style={{ background: "#555" }} /> {/* SIDEBAR */}
                    <div style={{ background: "#444" }} /> {/* FOOTER */}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>Prošireni klasični 2</div>
                  <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "#ccc" }}>Header, Navbar, Main, Sidebar, Footer</div>
                </div>

                {/* Two-column */}
                <div
                  onClick={() => setChosenTemplate("twoColumn")}
                  style={{
                    cursor: "pointer",
                    border: chosenTemplate === "twoColumn" ? "3px solid #646cff" : "2px solid #444",
                    borderRadius: 6,
                    padding: 10,
                    width: 120,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: "1fr 1fr 3fr 1fr",
                      gridTemplateColumns: "1fr 2fr",
                      height: 150,
                      gap: 2,
                      background: "#222",
                    }}
                  >
                    <div style={{ gridColumn: "1/3", background: "#444" }} /> {/* HEADER */}
                    <div style={{ gridColumn: "1/3", background: "#555" }} /> {/* NAV */}
                    <div style={{ background: "#777" }} /> {/* SIDEBAR */}
                    <div style={{ background: "#666" }} /> {/* MAIN */}
                    <div style={{ gridColumn: "1/3", background: "#444" }} /> {/* FOOTER */}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>Dvije kolone 1</div>
                  <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "#ccc" }}>Header, Navbar, Sidebar+Main, Footer</div>
                </div>

                {/* Two-column Inverse*/}
                <div
                  onClick={() => setChosenTemplate("twoColumnInverse")}
                  style={{
                    cursor: "pointer",
                    border: chosenTemplate === "twoColumnInverse" ? "3px solid #646cff" : "2px solid #444",
                    borderRadius: 6,
                    padding: 10,
                    width: 120,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: "1fr 1fr 3fr 1fr",
                      gridTemplateColumns: "2fr 1fr",
                      height: 150,
                      gap: 2,
                      background: "#222",
                    }}
                  >
                    <div style={{ gridColumn: "1/3", background: "#444" }} /> {/* HEADER */}
                    <div style={{ gridColumn: "1/3", background: "#555" }} /> {/* NAV */}
                    <div style={{ background: "#666" }} /> {/* MAIN */}
                    <div style={{ background: "#777" }} /> {/* SIDEBAR */}
                    <div style={{ gridColumn: "1/3", background: "#444" }} /> {/* FOOTER */}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>Dvije kolone 2</div>
                  <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "#ccc" }}>Header, Navbar, Main+Sidebar, Footer</div>
                </div>

                {/* Three-column */}
                <div
                  onClick={() => setChosenTemplate("threeColumn")}
                  style={{
                    cursor: "pointer",
                    border: chosenTemplate === "threeColumn" ? "3px solid #646cff" : "2px solid #444",
                    borderRadius: 6,
                    padding: 10,
                    width: 140,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: "1fr 1fr 3fr 1fr",
                      gridTemplateColumns: "1fr 2fr 1fr",
                      height: 150,
                      gap: 2,
                      background: "#222",
                    }}
                  >
                    <div style={{ gridColumn: "1/4", background: "#444" }} /> {/* HEADER */}
                    <div style={{ gridColumn: "1/4", background: "#555" }} /> {/* NAV */}
                    <div style={{ background: "#777" }} /> {/* SIDEBAR */}
                    <div style={{ background: "#666" }} /> {/* MAIN */}
                    <div style={{ background: "#777" }} /> {/* SIDEBAR */}
                    <div style={{ gridColumn: "1/4", background: "#444" }} /> {/* FOOTER */}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>Tri kolone</div>
                  <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "#ccc" }}>Header, Navbar, Sidebar+Main+Sidebar, Footer</div>
                </div>
              </div>
              <button onClick={() => setStep(1)} style={{ marginRight: 12 }}>
                Nazad
              </button>

              <button onClick={() => setStep(3)} disabled={!chosenTemplate} style={{ marginTop: 20 }}>
                Nastavi
              </button>
            </div>
          )}

          {/* Slot Filling */}
          {step === 3 && (
            <div>
              <h2>Popunite slotove za odabrani layout:</h2>

              {TEMPLATE_OPTIONS.find((t) => t.id === chosenTemplate).slots.map((slot) => {
                // get all segment combos for this slot
                const options = layoutParts.flatMap((page, pi) => page.segments.filter((seg) => seg.role === slot).map((seg, si) => ({ page, seg, pi, si })));
                if (options.length === 0) return null;

                return (
                  <div key={slot} style={{ marginBottom: 24 }}>
                    <h3 style={{ color: getColor(slot) }}>{slot.toUpperCase()}</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                      {options.map(({ page, seg }, idx) => {
                        const w = seg.rect.width * SCALE;
                        const h = seg.rect.height * SCALE;
                        const isSelected = assignedParts[slot]?.seg === seg;
                        return (
                          <div key={`${slot}-${idx}`} onClick={() => assign(slot, page, seg)} style={{ cursor: "pointer", textAlign: "center" }}>
                            <div
                              style={{
                                marginBottom: 4,
                                fontSize: 14,
                                fontWeight: "bold",
                                color: "#fff",
                              }}
                            >
                              Opcija {idx + 1}
                            </div>

                            {/* Wireframe box with white glow on select */}
                            <div
                              style={{
                                position: "relative",
                                width: w,
                                height: h,
                                backgroundColor: "#fff",
                                border: `3px solid ${getColor(slot)}`,
                                boxShadow: isSelected ? `0 0 0 4px #fff` : "none",
                                overflow: "hidden",
                                padding: "40px",
                              }}
                            >
                              <div
                                dangerouslySetInnerHTML={{ __html: seg.html }}
                                style={{
                                  transform: `scale(${SCALE})`,
                                  transformOrigin: "0 0",
                                  width: `${100 / SCALE}%`,
                                  height: `${100 / SCALE}%`,
                                  pointerEvents: "none",
                                }}
                              />
                              {seg.role === "main" &&
                                page.segments
                                  .filter((s) => s.role !== "main" && s.rect.x < seg.rect.x + seg.rect.width && s.rect.x + s.rect.width > seg.rect.x && s.rect.y < seg.rect.y + seg.rect.height && s.rect.y + s.rect.height > seg.rect.y)
                                  .map((child, ci) => {
                                    const top = (child.rect.y - seg.rect.y) * SCALE + PAD;
                                    const left = (child.rect.x - seg.rect.x) * SCALE + PAD;
                                    return (
                                      <div
                                        key={ci}
                                        style={{
                                          position: "absolute",
                                          top,
                                          left,
                                          width: child.rect.width * SCALE,
                                          height: child.rect.height * SCALE,
                                          border: `2px dashed ${getColor(child.role)}`,
                                          pointerEvents: "none",
                                        }}
                                      />
                                    );
                                  })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button onClick={() => setStep(2)} style={{ marginRight: 12 }}>
                Nazad
              </button>
              <button onClick={() => setStep(4)} disabled={!TEMPLATE_OPTIONS.find((t) => t.id === chosenTemplate).slots.every((slot) => assignedParts[slot])} style={{ marginTop: 20 }}>
                Nastavi
              </button>
            </div>
          )}

          {/* Final preview and download */}
          {step === 4 &&
            (() => {
              // Find the widest original segment width
              const maxSegWidth = Math.max(...Object.values(assignedParts).map((a) => a.seg.rect.width)) * SCALE;
              const renderSlot = (slot, widthPx, noPad = false) => {
                const a = assignedParts[slot];
                if (!a) return null;
                const contentH = a.seg.rect.height * SCALE;
                const outerH = noPad ? contentH : contentH + 80;
                return (
                  <div
                    key={slot}
                    style={{
                      backgroundColor: "#fff",
                      border: `3px solid ${getColor(slot)}`,
                      boxSizing: "border-box",
                      overflow: "hidden",
                      padding: noPad ? 0 : 40,
                      width: widthPx,
                      height: outerH,
                      margin: 0,
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: a.seg.html }}
                      style={{
                        transform: `scale(${SCALE})`,
                        transformOrigin: "0 0",
                        width: `${100 / SCALE}%`,
                        height: `${100 / SCALE}%`,
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                );
              };

              //Branch by the chosen template
              switch (chosenTemplate) {
                // Classic single-column
                case "classic":
                  return (
                    <div>
                      <h2>Pregled kombinovanog layouta:</h2>
                      <div
                        style={{
                          background: "#fff",
                          padding: 20,
                          borderRadius: 6,
                          display: "inline-block",
                          margin: "0 auto",
                        }}
                      >
                        {renderSlot("header", maxSegWidth)}
                        {renderSlot("main", maxSegWidth)}
                        {renderSlot("footer", maxSegWidth)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
                        <button onClick={() => setStep(3)}>Nazad</button>
                        <button onClick={downloadHtml} disabled={!allAssigned()}>
                          Preuzmi HTML
                        </button>
                      </div>
                    </div>
                  );

                // Classic + Navbar
                case "classicNavbar":
                  return (
                    <div>
                      <h2>Pregled kombinovanog layouta:</h2>
                      <div
                        style={{
                          background: "#fff",
                          padding: 20,
                          borderRadius: 6,
                          display: "inline-block",
                          margin: "0 auto",
                        }}
                      >
                        {renderSlot("header", maxSegWidth)}
                        {renderSlot("navbar", maxSegWidth)}
                        {renderSlot("main", maxSegWidth)}
                        {renderSlot("footer", maxSegWidth)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
                        <button onClick={() => setStep(3)}>Nazad</button>
                        <button onClick={downloadHtml} disabled={!allAssigned()}>
                          Preuzmi HTML
                        </button>
                      </div>
                    </div>
                  );

                // Classic + Navbar + Sidebar
                case "classicExpanded": {
                  const sbW = assignedParts.sidebar.seg.rect.width * SCALE;
                  const mW = maxSegWidth - sbW;
                  return (
                    <div>
                      <h2>Pregled kombinovanog layouta:</h2>
                      <div
                        style={{
                          background: "#fff",
                          padding: 20,
                          borderRadius: 6,
                          display: "inline-block",
                          margin: "0 auto",
                        }}
                      >
                        {renderSlot("header", maxSegWidth)}
                        {renderSlot("navbar", maxSegWidth)}
                        <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
                          {renderSlot("main", mW, true)}
                          {renderSlot("sidebar", sbW, true)}
                        </div>
                        {renderSlot("footer", maxSegWidth)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
                        <button onClick={() => setStep(3)}>Nazad</button>
                        <button onClick={downloadHtml} disabled={!allAssigned()}>
                          Preuzmi HTML
                        </button>
                      </div>
                    </div>
                  );
                }

                // Two columns (sidebar left)
                case "twoColumn": {
                  const sbW = assignedParts.sidebar.seg.rect.width * SCALE;
                  const mW = maxSegWidth - sbW;
                  return (
                    <div>
                      <h2>Pregled kombinovanog layouta:</h2>
                      <div
                        style={{
                          background: "#fff",
                          padding: 20,
                          borderRadius: 6,
                          display: "inline-block",
                          margin: "0 auto",
                        }}
                      >
                        {renderSlot("header", maxSegWidth)}
                        {renderSlot("navbar", maxSegWidth)}
                        <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
                          {renderSlot("sidebar", sbW, true)}
                          {renderSlot("main", mW, true)}
                        </div>
                        {renderSlot("footer", maxSegWidth)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
                        <button onClick={() => setStep(3)}>Nazad</button>
                        <button onClick={downloadHtml} disabled={!allAssigned()}>
                          Preuzmi HTML
                        </button>
                      </div>
                    </div>
                  );
                }

                // Two columns inverse (sidebar right)
                case "twoColumnInverse": {
                  const sbW = assignedParts.sidebar.seg.rect.width * SCALE;
                  const mW = maxSegWidth - sbW;
                  return (
                    <div>
                      <h2>Pregled kombinovanog layouta:</h2>
                      <div
                        style={{
                          background: "#fff",
                          padding: 20,
                          borderRadius: 6,
                          display: "inline-block",
                          margin: "0 auto",
                        }}
                      >
                        {renderSlot("header", maxSegWidth)}
                        {renderSlot("navbar", maxSegWidth)}

                        <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
                          {renderSlot("main", mW, true)}
                          {renderSlot("sidebar", sbW, true)}
                        </div>

                        {renderSlot("footer", maxSegWidth)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
                        <button onClick={() => setStep(3)}>Nazad</button>
                        <button onClick={downloadHtml} disabled={!allAssigned()}>
                          Preuzmi HTML
                        </button>
                      </div>
                    </div>
                  );
                }

                // Three columns
                case "threeColumn": {
                  const lW = assignedParts.sidebar.seg.rect.width * SCALE;
                  const rW = assignedParts.sidebar.seg.rect.width * SCALE;
                  const mW = maxSegWidth - lW - rW;
                  return (
                    <div>
                      <h2>Pregled kombinovanog layouta:</h2>
                      <div
                        style={{
                          background: "#fff",
                          padding: 20,
                          borderRadius: 6,
                          display: "inline-block",
                          margin: "0 auto",
                        }}
                      >
                        {renderSlot("header", maxSegWidth)}
                        {renderSlot("navbar", maxSegWidth)}

                        <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
                          {renderSlot("sidebar", lW, true)}
                          {renderSlot("main", mW, true)}
                          {renderSlot("sidebar", rW, true)}
                        </div>

                        {renderSlot("footer", maxSegWidth)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
                        <button onClick={() => setStep(3)}>Nazad</button>
                        <button onClick={downloadHtml} disabled={!allAssigned()}>
                          Preuzmi HTML
                        </button>
                      </div>
                    </div>
                  );
                }

                default:
                  return null;
              }
            })()}
        </div>
      )}
    </>
  );
}
