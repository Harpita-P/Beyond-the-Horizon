/// <reference types="google.maps" />

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, MapPin, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface GeoSeekerPanelProps {
  hiddenState: string;
  hiddenLat: number;
  hiddenLng: number;
  onClose: () => void;
  onGuessLocked: (guessedState: string) => void;
  clues: string[];
  currentRound: number;
  totalScore: number;
  roundsWon: number;
}

export function GeoSeekerPanel({
  hiddenState,
  hiddenLat,
  hiddenLng,
  onClose,
  onGuessLocked,
  clues,
  currentRound,
  totalScore,
  roundsWon
}: GeoSeekerPanelProps) {
  const streetViewRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);

  const handlePreviousHint = () => {
    setCurrentHintIndex((prev) => (prev > 0 ? prev - 1 : clues.length - 1));
  };

  const handleNextHint = () => {
    setCurrentHintIndex((prev) => (prev < clues.length - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (window.google && window.google.maps && streetViewRef.current) {
      initializeStreetView();
    }
  }, [hiddenLat, hiddenLng]);

  const loadGoogleMapsScript = () => {
    if (window.google && window.google.maps) {
      setTimeout(() => initializeStreetView(), 100);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.error('Google Maps API key not set. Please add VITE_GOOGLE_MAPS_API_KEY to .env');
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setTimeout(() => initializeStreetView(), 100);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setTimeout(() => initializeStreetView(), 100);
    };
    document.head.appendChild(script);
  };

  const initializeStreetView = () => {
    if (!streetViewRef.current) {
      console.log('❌ Street View ref not ready');
      return;
    }

    if (!window.google || !window.google.maps) {
      console.error('❌ Google Maps API not loaded. Check your API key in .env');
      console.log('Current API key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'SET' : 'NOT SET');
      return;
    }

    if (panoramaRef.current) {
      console.log('🔄 Updating Street View position');
      findStreetViewLocation();
      return;
    }

    try {
      console.log(`🗺️ Finding Street View in state near: ${hiddenLat}, ${hiddenLng}`);
      findStreetViewLocation();
    } catch (error) {
      console.error('❌ Failed to initialize Street View:', error);
      console.log('📋 Checklist:');
      console.log('  1. Maps JavaScript API enabled?');
      console.log('  2. API key in .env file?');
      console.log('  3. Dev server restarted after adding .env?');
      console.log('  4. API key has no restrictions OR includes Maps JavaScript API?');
    }
  };

  const findStreetViewLocation = (attempt: number = 0) => {
    if (attempt >= 5) {
      console.error('❌ Could not find Street View after 5 attempts');
      if (streetViewRef.current) {
        streetViewRef.current.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full text-white text-center p-4">
            <div class="text-4xl mb-2">🗺️</div>
            <p class="font-bold mb-1">No Street View Available</p>
            <p class="text-sm opacity-75">This area doesn't have Street View coverage</p>
          </div>
        `;
      }
      return;
    }

    const streetViewService = new google.maps.StreetViewService();
    
    // Generate random offset within ~100km radius to find different locations
    const latOffset = (Math.random() - 0.5) * 2; // ~220km range
    const lngOffset = (Math.random() - 0.5) * 2;
    const searchLat = hiddenLat + latOffset;
    const searchLng = hiddenLng + lngOffset;
    
    console.log(`🔍 Attempt ${attempt + 1}: Searching at ${searchLat.toFixed(4)}, ${searchLng.toFixed(4)}`);
    
    // Search with 100km radius
    streetViewService.getPanorama(
      { 
        location: { lat: searchLat, lng: searchLng }, 
        radius: 100000, // 100km radius
        source: google.maps.StreetViewSource.OUTDOOR,
        preference: google.maps.StreetViewPreference.NEAREST
      },
      (data, status) => {
        if (status === google.maps.StreetViewStatus.OK && data && data.location) {
          console.log('✅ Found Street View location!');
          console.log(`📍 Location: ${data.location.latLng?.lat()}, ${data.location.latLng?.lng()}`);
          
          if (panoramaRef.current) {
            panoramaRef.current.setPosition(data.location.latLng!);
          } else {
            const panorama = new google.maps.StreetViewPanorama(streetViewRef.current!, {
              position: data.location.latLng!,
              pov: { 
                heading: Math.random() * 360, // Random direction
                pitch: 0
              },
              zoom: 1,
              visible: true,
              addressControl: false,
              linksControl: true,
              panControl: true,
              enableCloseButton: false,
              zoomControl: true,
              fullscreenControl: true,
              motionTracking: false,
              motionTrackingControl: false,
              showRoadLabels: false,
              clickToGo: true,
              disableDefaultUI: false,
            });
            panoramaRef.current = panorama;
          }
          console.log('✅ Street View initialized successfully!');
        } else {
          console.log(`⚠️ Attempt ${attempt + 1} failed, trying again...`);
          findStreetViewLocation(attempt + 1);
        }
      }
    );
  };

  return (
    <>
      {/* Score Badge - Sleek and Small */}
      <div className="fixed top-2 right-24 z-[101] animate-in fade-in slide-in-from-top">
        <div className="bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 px-3 py-1.5 rounded-full shadow-lg border-2 border-white/30 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-xs font-black">🎯 Round {currentRound}/3</span>
          </div>
          <div className="h-3 w-px bg-white/30" />
          <div className="flex items-center gap-1">
            <span className="text-white text-xs font-black">⭐ {totalScore}</span>
          </div>
          <div className="h-3 w-px bg-white/30" />
          <div className="flex items-center gap-1">
            <span className="text-white text-xs font-black">{roundsWon}W</span>
          </div>
        </div>
      </div>

      {/* Challenge Banner - Above Street View */}
      <div className="fixed top-11 right-24 z-[100] animate-in fade-in slide-in-from-top">
        <div className="bg-gradient-to-r from-[#002868] to-[#BF0A30] px-4 py-3 rounded-t-xl shadow-lg w-64">
          <p className="text-white text-xs font-bold uppercase tracking-wide text-center leading-relaxed">
            Challenge: Guess What Hometown Gemini Is Hiding In
          </p>
        </div>
      </div>

      {/* Street View Panel - Below Banner */}
      <div className="fixed top-[7rem] right-24 z-[100] animate-in fade-in slide-in-from-right">
        <div className="bg-white rounded-b-xl shadow-2xl border-2 border-t-0 border-[#002868]/20 overflow-hidden relative">
          {/* Close Button - Overlay */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-10 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            aria-label="Close GeoSeeker"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Street View Container - Square */}
          <div 
            ref={streetViewRef} 
            className="w-64 h-64 bg-slate-900 relative"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm gap-2 pointer-events-none">
              <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full"></div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gemini Clue Dialog - Below Street View */}
      <div className="fixed top-[25rem] right-24 z-[100] animate-in fade-in slide-in-from-right delay-150 w-64">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl p-4 relative">
          {/* Hint Icon */}
          <div className="absolute -top-3 -left-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-blue-500">
            <span className="text-xl">💡</span>
          </div>

          {/* Clue Header with Navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={handlePreviousHint}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Previous hint"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            
            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">
              Hint {currentHintIndex + 1}/{clues.length}
            </p>
            
            <button
              onClick={handleNextHint}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Next hint"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Clue Text */}
          <div className="bg-amber-50 rounded-xl p-3 mb-2">
            <p className="text-amber-900 text-sm leading-relaxed font-medium">
              {clues[currentHintIndex]}
            </p>
          </div>

          {/* Instructions */}
          <div className="text-white text-xs">
            <p className="opacity-90">
              <MapPin className="w-3 h-3 inline mr-1" />
              Fly close to a state to make your guess!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
