/// <reference types="google.maps" />

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, MapPin, Sparkles, Trophy, Target, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  generateGeoSeekerLocations, 
  calculateDistance, 
  calculateScore,
  type GeoSeekerLocation 
} from '../services/geoSeekerService';

interface GeoSeekerProps {
  onClose: () => void;
  geminiApiKey?: string;
}

export function GeoSeeker({ onClose, geminiApiKey }: GeoSeekerProps) {
  const [locations, setLocations] = useState<GeoSeekerLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GeoSeekerLocation | null>(null);
  const [guesses, setGuesses] = useState<number>(5);
  const [cluesRevealed, setCluesRevealed] = useState<number>(1);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guessInput, setGuessInput] = useState('');
  const [lastDistance, setLastDistance] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [guessHistory, setGuessHistory] = useState<Array<{ guess: string; distance: number }>>([]);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    loadGoogleMapsScript();
    loadGame();
  }, []);

  const loadGoogleMapsScript = () => {
    if (window.google && window.google.maps) {
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.error('Google Maps API key not set. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  };

  useEffect(() => {
    if (currentLocation && mapRef.current && !googleMapRef.current) {
      initializeMap();
    }
  }, [currentLocation]);

  const loadGame = async () => {
    try {
      const locs = await generateGeoSeekerLocations();
      setLocations(locs);
      
      if (locs.length > 0) {
        const randomLocation = locs[Math.floor(Math.random() * locs.length)];
        setCurrentLocation(randomLocation);
        setGameState('playing');
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || !currentLocation) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    googleMapRef.current = map;
  };

  const handleGuess = useCallback(() => {
    if (!currentLocation || !guessInput.trim() || guesses <= 0) return;

    const input = guessInput.trim().toLowerCase();
    const targetCity = currentLocation.city.toLowerCase();
    const targetState = currentLocation.state.toLowerCase();

    const isCorrect = 
      input.includes(targetCity) || 
      input.includes(targetState) ||
      input === targetState;

    if (isCorrect) {
      const finalScore = calculateScore(0, 6 - guesses, cluesRevealed);
      setScore(finalScore);
      setGameState('won');
      setFeedback(`🎉 Correct! Gemini was hiding in ${currentLocation.city}, ${currentLocation.state}!`);
      
      if (googleMapRef.current && markerRef.current) {
        markerRef.current.setMap(null);
      }
      
      if (googleMapRef.current) {
        const marker = new google.maps.Marker({
          position: { lat: currentLocation.lat, lng: currentLocation.lng },
          map: googleMapRef.current,
          title: `${currentLocation.city}, ${currentLocation.state}`,
          animation: google.maps.Animation.DROP,
        });
        markerRef.current = marker;
        
        googleMapRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
        googleMapRef.current.setZoom(12);
      }
      
      return;
    }

    const distance = calculateDistance(
      39.8283, -98.5795,
      currentLocation.lat, currentLocation.lng
    );

    const newGuesses = guesses - 1;
    setGuesses(newGuesses);
    setGuessHistory([...guessHistory, { guess: guessInput, distance }]);

    if (lastDistance !== null) {
      if (distance < lastDistance) {
        setFeedback(`🔥 Warmer! You're ${Math.round(distance)} miles away.`);
      } else {
        setFeedback(`❄️ Colder! You're ${Math.round(distance)} miles away.`);
      }
    } else {
      setFeedback(`📍 You're ${Math.round(distance)} miles away from Gemini's hiding spot.`);
    }

    setLastDistance(distance);

    if (newGuesses === 0) {
      setGameState('lost');
      setFeedback(`😔 Out of guesses! Gemini was hiding in ${currentLocation.city}, ${currentLocation.state}.`);
      
      if (googleMapRef.current) {
        const marker = new google.maps.Marker({
          position: { lat: currentLocation.lat, lng: currentLocation.lng },
          map: googleMapRef.current,
          title: `${currentLocation.city}, ${currentLocation.state}`,
        });
        markerRef.current = marker;
        
        googleMapRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
        googleMapRef.current.setZoom(12);
      }
    }

    setGuessInput('');
  }, [currentLocation, guessInput, guesses, lastDistance, cluesRevealed, guessHistory]);

  const revealNextClue = () => {
    if (currentLocation && cluesRevealed < currentLocation.clue_facts.length) {
      setCluesRevealed(cluesRevealed + 1);
    }
  };

  const playAgain = () => {
    if (locations.length > 0) {
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      setCurrentLocation(randomLocation);
      setGuesses(5);
      setCluesRevealed(1);
      setGameState('playing');
      setGuessInput('');
      setLastDistance(null);
      setScore(0);
      setFeedback('');
      setGuessHistory([]);
      
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      
      if (googleMapRef.current) {
        googleMapRef.current.setCenter({ lat: 39.8283, lng: -98.5795 });
        googleMapRef.current.setZoom(4);
      }
    }
  };

  if (gameState === 'loading' || !currentLocation) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#002868] to-[#BF0A30] z-50 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          <Sparkles className="w-12 h-12 mx-auto mb-4 animate-spin" />
          Gemini is finding a hiding spot...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#002868] to-[#BF0A30] text-white p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6" />
          <h1 className="text-xl font-black uppercase tracking-wider">GeoSeeker Mode</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
            <Navigation className="w-4 h-4" />
            <span className="font-bold">{guesses} Guesses Left</span>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Clues */}
        <div className="w-96 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="p-6 bg-white border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#FFB81C]" />
              <h2 className="text-lg font-bold text-[#002868]">Gemini's Clues</h2>
            </div>
            <p className="text-sm text-slate-600">
              I'm hiding somewhere connected to Team USA's hometown story...
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {currentLocation.clue_facts.slice(0, cluesRevealed).map((clue, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-xl border-2 border-[#002868]/10 shadow-sm animate-in fade-in slide-in-from-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#BF0A30] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{clue}</p>
                </div>
              </div>
            ))}

            {cluesRevealed < currentLocation.clue_facts.length && gameState === 'playing' && (
              <button
                onClick={revealNextClue}
                className="w-full bg-gradient-to-r from-[#FFB81C] to-[#FFA500] text-[#002868] font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Reveal Next Clue (-30 points)
              </button>
            )}
          </div>

          {/* Guess History */}
          {guessHistory.length > 0 && (
            <div className="p-4 bg-white border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Previous Guesses
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {guessHistory.map((item, index) => (
                  <div key={index} className="text-xs text-slate-600 flex justify-between">
                    <span>{item.guess}</span>
                    <span className="text-[#BF0A30] font-bold">{Math.round(item.distance)}mi</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 flex flex-col">
          <div ref={mapRef} className="flex-1" />

          {/* Bottom Bar - Guess Input */}
          <div className="bg-white border-t-2 border-slate-200 p-6 shadow-2xl">
            {feedback && (
              <div className={cn(
                "mb-4 p-4 rounded-xl font-bold text-center animate-in fade-in slide-in-from-bottom",
                gameState === 'won' ? "bg-green-100 text-green-800" :
                gameState === 'lost' ? "bg-red-100 text-red-800" :
                "bg-blue-100 text-blue-800"
              )}>
                {feedback}
              </div>
            )}

            {gameState === 'playing' ? (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGuess()}
                  placeholder="Enter city and state (e.g., Denver, Colorado)"
                  className="flex-1 px-6 py-4 rounded-xl border-2 border-slate-300 focus:border-[#BF0A30] focus:outline-none text-lg font-medium"
                />
                <button
                  onClick={handleGuess}
                  disabled={!guessInput.trim() || guesses <= 0}
                  className="px-8 py-4 bg-gradient-to-r from-[#BF0A30] to-[#D91E3E] text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  Guess
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {gameState === 'won' && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                      <Trophy className="w-8 h-8 text-[#FFB81C]" />
                      <h3 className="text-2xl font-black text-[#002868]">You Found Gemini!</h3>
                    </div>
                    <p className="text-lg font-bold text-[#BF0A30] mb-2">Score: {score} points</p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {currentLocation.city}, {currentLocation.state} connects to Team USA's broader hometown story. 
                      This state shows {currentLocation.paralympic_count_state} Paralympic athletes across sports like {currentLocation.sports_represented.join(', ')}.
                    </p>
                  </div>
                )}

                {gameState === 'lost' && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border-2 border-red-200">
                    <h3 className="text-xl font-black text-[#002868] mb-2">Better Luck Next Time!</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Gemini was hiding in {currentLocation.city}, {currentLocation.state}. 
                      This location represents {currentLocation.paralympic_count_state} Team USA athletes from the {currentLocation.region} region.
                    </p>
                  </div>
                )}

                <button
                  onClick={playAgain}
                  className="w-full px-8 py-4 bg-gradient-to-r from-[#002868] to-[#BF0A30] text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
