import { useEffect, useRef } from 'react';
import { Trophy, Target, RotateCcw, MapPin } from 'lucide-react';
import { STATE_NAMES, getStateCentroid } from '../services/geoSeekerService';

interface GeoSeekerResultDialogProps {
  guessedState: string;
  hiddenState: string;
  distance: number;
  isCorrect: boolean;
  score: number;
  onPlayAgain: () => void;
  onClose: () => void;
}

export function GeoSeekerResultDialog({
  guessedState,
  hiddenState,
  distance,
  isCorrect,
  score,
  onPlayAgain,
  onClose
}: GeoSeekerResultDialogProps) {
  const guessedStateName = STATE_NAMES[guessedState] || guessedState;
  const hiddenStateName = STATE_NAMES[hiddenState] || hiddenState;
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const guessedCoords = getStateCentroid(guessedState);
    const hiddenCoords = getStateCentroid(hiddenState);

    if (!guessedCoords || !hiddenCoords) return;

    // Initialize Google Map
    const map = new google.maps.Map(mapRef.current, {
      center: {
        lat: (guessedCoords.lat + hiddenCoords.lat) / 2,
        lng: (guessedCoords.lng + hiddenCoords.lng) / 2
      },
      zoom: 4,
      mapTypeId: 'terrain',
      disableDefaultUI: true,
      zoomControl: false,
      styles: [
        {
          featureType: 'all',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    // Add marker for your guess (blue)
    new google.maps.Marker({
      position: { lat: guessedCoords.lat, lng: guessedCoords.lng },
      map: map,
      title: `Your Guess: ${guessedStateName}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#002868',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });

    // Add marker for Gemini location (red)
    new google.maps.Marker({
      position: { lat: hiddenCoords.lat, lng: hiddenCoords.lng },
      map: map,
      title: `Gemini Was In: ${hiddenStateName}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#BF0A30',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });

    // Draw flight path line
    new google.maps.Polyline({
      path: [
        { lat: guessedCoords.lat, lng: guessedCoords.lng },
        { lat: hiddenCoords.lat, lng: hiddenCoords.lng }
      ],
      geodesic: true,
      strokeColor: '#FFB81C',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: map
    });

    // Fit bounds to show both markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: guessedCoords.lat, lng: guessedCoords.lng });
    bounds.extend({ lat: hiddenCoords.lat, lng: hiddenCoords.lng });
    map.fitBounds(bounds);
  }, [guessedState, hiddenState, guessedStateName, hiddenStateName]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg mx-4 animate-in zoom-in-95 slide-in-from-bottom-4">
        {/* Result Icon */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          isCorrect 
            ? 'bg-gradient-to-br from-green-400 to-green-600' 
            : 'bg-gradient-to-br from-orange-400 to-orange-600'
        }`}>
          {isCorrect ? (
            <Trophy className="w-10 h-10 text-white" />
          ) : (
            <span className="text-5xl">🌎</span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black text-center mb-2">
          {isCorrect ? (
            <span className="text-green-600">🎉 You Found Gemini!</span>
          ) : (
            <span className="text-orange-600">Not Quite!</span>
          )}
        </h2>

        {/* Score */}
        {isCorrect && (
          <div className="text-center mb-6">
            <p className="text-5xl font-black text-[#FFB81C] mb-1">{score}</p>
            <p className="text-sm text-slate-600 font-bold uppercase tracking-wider">Points</p>
          </div>
        )}

        {/* Google Maps Visualization */}
        <div className="bg-slate-100 rounded-xl overflow-hidden mb-4 border-2 border-slate-200">
          <div ref={mapRef} className="w-full h-48"></div>
        </div>

        {/* Details */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Your Guess:</span>
            <span className="text-lg font-black text-[#002868]">{guessedStateName}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Gemini Was In:</span>
            <span className="text-lg font-black text-[#BF0A30]">{hiddenStateName}</span>
          </div>

          <div className="border-t border-slate-200 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">Distance:</span>
              <span className="text-2xl font-black text-slate-800">{Math.round(distance)} mi</span>
            </div>
          </div>
        </div>

        {/* Fun Fact */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-900 leading-relaxed">
            {isCorrect ? (
              <>
                <span className="font-bold">Amazing!</span> You successfully located Gemini's hiding spot in {hiddenStateName}. 
                This state has contributed to Team USA's collective hometown story!
              </>
            ) : (
              <>
                <span className="font-bold">Close one!</span> Gemini was hiding in {hiddenStateName}, 
                about {Math.round(distance)} miles from your guess. Better luck next time!
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
          >
            Close
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#002868] to-[#BF0A30] hover:from-[#001a4d] hover:to-[#A00828] text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
