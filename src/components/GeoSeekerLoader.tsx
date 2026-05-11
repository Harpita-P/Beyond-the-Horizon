export function GeoSeekerLoader() {
  return (
    <div className="fixed top-11 right-24 z-[100] animate-in fade-in slide-in-from-right">
      <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-8 w-80">
        {/* Animated World Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 rounded-full animate-ping absolute"></div>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center relative">
              <span className="text-3xl animate-bounce">🌎</span>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-3">
          <h3 className="text-white text-lg font-black uppercase tracking-wide">
            Hidden Hometowns
          </h3>
          <p className="text-purple-100 text-sm font-medium leading-relaxed">
            Gemini is selecting a hometown to hide in and crafting clever hints for you!
          </p>
        </div>

        {/* Loading Bar */}
        <div className="mt-6 bg-white/20 rounded-full h-2 overflow-hidden">
          <div className="bg-white h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>

        {/* Loading Dots */}
        <div className="flex justify-center gap-2 mt-4">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
