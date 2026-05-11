import { useState, useEffect, memo } from 'react';
import { cn } from '../lib/utils';
import { Sparkles, X, ChevronRight, Award, Trophy, Medal, Clock } from 'lucide-react';

interface Story {
  title: string;
  slides: { text: string; image: string }[];
  milestones: string[];
  highlightedStates: string[];
}

interface StoryPanelProps {
  story: Story | null;
  onClose: () => void;
  isLoading: boolean;
}

export const StoryPanel = memo(function StoryPanel({ story, onClose, isLoading }: StoryPanelProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const nextSlide = () => {
    if (story && story.slides.length > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % story.slides.length);
        setIsFlipping(false);
      }, 300);
    }
  };

  const prevSlide = () => {
    if (story && story.slides.length > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev - 1 + story.slides.length) % story.slides.length);
        setIsFlipping(false);
      }, 300);
    }
  };

  useEffect(() => {
    if (story && story.slides && story.slides.length > 0) {
      setCurrentSlide(0);
      const interval = setInterval(() => {
        nextSlide();
      }, 6000); // 6 seconds per slide
      return () => clearInterval(interval);
    }
  }, [story]);

  if (!story && !isLoading) return null;

  const slides = story?.slides || [];
  const slideTexts = slides.map(s => typeof s === 'string' ? s : s.text);

  return (
    <div 
      className={cn(
        "fixed inset-y-0 right-0 w-[600px] bg-white/95 backdrop-blur-md border-l border-[#002868]/20 transition-all duration-500 ease-out shadow-2xl flex flex-col z-[2100]",
        (story || isLoading) ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      )}
    >
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#FFB81C]/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-[#FFB81C]" />
            </div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#BF0A30]">Inspiring Legacy</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-[#002868]/10 border-t-[#002868] rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500 animate-pulse font-serif italic">
              Gemini is crafting a story...
            </p>
          </div>
        ) : story ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            <div>
              <h2 className="text-3xl font-serif italic text-[#002868] leading-tight mb-4">
                {story.title}
              </h2>
              <div className="w-12 h-1 bg-[#BF0A30] mb-8" />
            </div>

            {/* Slides Content - Book-like Page Flip Style */}
            <div className="relative mb-6">
              {/* Part Badge */}
              <div className="absolute -top-3 left-6 z-20">
                <div className="bg-[#BF0A30] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg tracking-widest uppercase">
                  Page {currentSlide + 1} of {slides.length}
                </div>
              </div>

              {/* Book Container */}
              <div className="relative bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-lg p-8 pt-12 border-2 border-amber-200 min-h-[480px] shadow-2xl overflow-hidden">
                {/* Book spine effect */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-amber-200 to-amber-100 shadow-inner"></div>

                {/* Page content with flip animation */}
                <div className="relative pl-8">
                  {slides.map((slide, idx) => {
                    const slideText = typeof slide === 'string' ? slide : slide.text;
                    const slideImage = typeof slide === 'string' ? '' : slide.image;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "absolute inset-0 transition-all duration-700 ease-in-out",
                          idx === currentSlide
                            ? "opacity-100 rotate-y-0"
                            : idx === (currentSlide - 1 + slides.length) % slides.length
                            ? "opacity-0 rotate-y-90 -translate-x-full"
                            : "opacity-0 rotate-y-90 translate-x-full",
                          isFlipping ? "scale-95" : "scale-100"
                        )}
                        style={{
                          transformOrigin: "left center",
                          backfaceVisibility: "hidden"
                        }}
                      >
                        <div className="bg-white/80 backdrop-blur-sm rounded-r-lg p-6 shadow-inner border-r border-b border-amber-100 min-h-[400px]">
                          {slideImage && (
                            <div className="mb-4">
                              <img
                                src={slideImage}
                                alt={`Slide ${idx + 1}`}
                                className="w-full h-48 object-cover rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <p className="text-xl leading-relaxed text-slate-800 font-serif">
                            {slideText.replace(/^(Part|Slide)\s*\d+:\s*/i, '')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Page navigation buttons */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    onClick={prevSlide}
                    disabled={isFlipping}
                    className="p-2 bg-white/80 hover:bg-white rounded-full shadow-md border border-amber-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5 text-[#002868] rotate-180" />
                  </button>
                  <button
                    onClick={nextSlide}
                    disabled={isFlipping}
                    className="p-2 bg-white/80 hover:bg-white rounded-full shadow-md border border-amber-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5 text-[#002868]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Slide Indicators */}
            <div className="flex items-center gap-2 py-4 mb-8">
              {slides.map((_, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    idx === currentSlide ? "w-10 bg-[#002868]" : "w-1.5 bg-slate-200"
                  )}
                />
              ))}
              <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                <span>Auto-Progress</span>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#002868] border-b border-slate-100 pb-2">
                Collective Milestones
              </h3>
              <div className="space-y-4">
                {story.milestones.map((milestone, idx) => (
                  <div key={idx} className="flex gap-4 items-start group p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="mt-0.5 p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg group-hover:border-[#FFB81C]/30 transition-colors">
                      {idx === 0 ? <Trophy className="w-4 h-4 text-[#FFB81C]" /> : 
                       idx === 1 ? <Medal className="w-4 h-4 text-[#BF0A30]" /> : 
                       <Award className="w-4 h-4 text-[#002868]" />}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors font-medium">
                      {milestone}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-4 bg-[#002868] text-white text-xs font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-[#001d4d] transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              Finish story experience
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
});
