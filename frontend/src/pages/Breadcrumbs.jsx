export default function Breadcrumbs({ steps, current, onSelect }) {
  return (
    <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isPast = stepNum < current;
        return (
          <div
            key={label}
            onClick={() => isPast && onSelect(stepNum)}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              background: isActive ? "#646cff" : "#444",
              color: isActive ? "#fff" : isPast ? "#ddd" : "#777",
              fontWeight: isActive ? "bold" : "normal",
              cursor: isPast ? "pointer" : "default",
              opacity: isPast ? 1 : isActive ? 1 : 0.6,
            }}
          >
            {label}
          </div>
        );
      })}
    </nav>
  );
}
