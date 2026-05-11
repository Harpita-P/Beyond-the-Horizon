interface TutorialPanelProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TutorialPanel({ step, onNext, onSkip }: TutorialPanelProps) {
  if (step === 0) return null;

  const tutorials = [
    {
      title: "Welcome to Beyond the Horizon!",
      message: (
        <div className="space-y-3">
          <p>Use these controls to fly across the U.S. map and explore Team USA's Olympic and Paralympic history:</p>
          <div className="flex flex-wrap gap-2 items-center justify-center">
            <kbd className="px-2 py-1 bg-[#002868] text-white rounded text-xs font-bold">W</kbd>
            <kbd className="px-2 py-1 bg-[#002868] text-white rounded text-xs font-bold">A</kbd>
            <kbd className="px-2 py-1 bg-[#002868] text-white rounded text-xs font-bold">S</kbd>
            <kbd className="px-2 py-1 bg-[#002868] text-white rounded text-xs font-bold">D</kbd>
            <span className="text-slate-500">+</span>
            <kbd className="px-2 py-1 bg-[#002868] text-white rounded text-xs font-bold">ARROWS</kbd>
          </div>
        </div>
      ),
      position: "bottom-6 left-6",
      arrow: "left",
      highlight: true
    },
    {
      title: "Discover Hometowns 🏠",
      message: "Fly close to any state label and land there to discover collective milestones and the rich history of Team USA athletes that may be connected!",
      position: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
      arrow: "none",
      highlight: false
    }
  ];

  const current = tutorials[step - 1];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" />
      
      {/* Tutorial Panel */}
      <div className={`absolute ${current.position} pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4`}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md border-2 border-[#FFB81C]">
          {/* Arrow indicator for controls */}
          {current.arrow === "left" && (
            <div className="absolute -left-4 top-1/2 -translate-y-1/2">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-[#FFB81C] animate-pulse" />
            </div>
          )}
          
          <h3 className="text-xl font-black text-[#002868] mb-3">
            {current.title}
          </h3>
          <div className="text-slate-600 mb-6 leading-relaxed">
            {current.message}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onNext}
              className="flex-1 px-4 py-2.5 bg-[#002868] text-white rounded-lg font-bold hover:bg-[#003080] transition-colors"
            >
              {step === tutorials.length ? "Let's Go!" : "Next"}
            </button>
            {step < tutorials.length && (
              <button
                onClick={onSkip}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Highlight controls panel */}
      {current.highlight && (
        <div className="absolute bottom-6 left-6 pointer-events-none">
          <div className="absolute inset-0 -m-4 border-4 border-[#FFB81C] rounded-3xl animate-pulse" />
        </div>
      )}
    </div>
  );
}
