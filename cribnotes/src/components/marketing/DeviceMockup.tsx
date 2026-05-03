export function DeviceMockup() {
  return (
    <div className="relative">
      <div className="w-[280px] h-[580px] bg-surface rounded-[3rem] border-[3px] border-border shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-surface rounded-b-2xl border border-border border-t-0 z-10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary/30 mt-0.5" />
        </div>

        <div className="absolute inset-0 rounded-[3rem] overflow-hidden pt-12 pb-0">
          <div className="w-full h-full bg-base flex flex-col">
            <div className="px-3 py-2 flex items-center justify-between border-b border-border/50 shrink-0">
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded-full bg-primary/20" />
                <span className="font-display text-[10px] font-bold text-primary">CribNotes</span>
              </div>
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
              </div>
            </div>

            <div className="px-2 py-1.5 flex gap-1.5 overflow-x-auto border-b border-border/50 shrink-0">
              {["Emma 3 mo", "+"].map((label, i) => (
                <div
                  key={label}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-medium ${
                    i === 0 ? "bg-primary/10 text-primary border border-primary/20" : "text-text-muted border border-border"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="flex-1 px-2.5 py-2 space-y-2 overflow-hidden">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { emoji: "☀️", label: "Woke Up", color: "bg-warning/10 border-warning/30", text: "text-warning" },
                  { emoji: "🌙", label: "Asleep", color: "bg-secondary/10 border-secondary/30", text: "text-secondary" },
                  { emoji: "🍼", label: "Fed", color: "bg-primary/10 border-primary/30", text: "text-primary" },
                  { emoji: "💧", label: "Diaper", color: "bg-secondary/10 border-secondary/30", text: "text-secondary" },
                  { emoji: "💗", label: "Nursed", color: "bg-warning/10 border-warning/30", text: "text-warning" },
                  { emoji: "🥛", label: "Pumped", color: "bg-secondary/10 border-secondary/30", text: "text-secondary" },
                ].map((btn) => (
                  <div
                    key={btn.label}
                    className={`h-[46px] rounded-2xl border ${btn.color} flex items-center justify-center gap-1.5`}
                  >
                    <span className="text-sm">{btn.emoji}</span>
                    <span className={`text-[10px] font-semibold ${btn.text}`}>{btn.label}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-surface border border-border/50 p-2.5">
                <div className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Today&apos;s Stats
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px]">
                  <span className="text-text-muted"><span className="text-primary font-semibold">4</span> feeds &middot; <span className="text-primary font-semibold">14.5 oz</span></span>
                  <span className="text-text-muted"><span className="text-secondary font-semibold">6</span> diapers &middot; <span className="text-warning font-semibold">2h 10m</span> sleep</span>
                </div>
              </div>

              <div className="text-[9px] text-text-muted space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">🍼</span>
                  <span>3 min ago</span>
                  <span className="bg-primary/10 text-primary px-1 rounded text-[8px] font-medium">Feed</span>
                  <span className="ml-auto font-semibold text-text-secondary">4 oz</span>
                  <span className="text-text-muted/50 text-[8px]">Undo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">💧</span>
                  <span>20 min ago</span>
                  <span className="bg-secondary/10 text-secondary px-1 rounded text-[8px] font-medium">Diaper</span>
                  <span className="ml-auto font-semibold text-text-secondary">Both</span>
                  <span className="text-text-muted/50 text-[8px]">Undo</span>
                </div>
              </div>
            </div>

            <div className="flex justify-around py-1.5 border-t border-border/50 bg-surface shrink-0">
              {["🏠", "🕐", "💬", "📊", "⚙️"].map((icon, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-0.5 ${i === 0 ? "text-primary" : "text-text-muted/60"}`}
                >
                  <span className="text-xs">{icon}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
