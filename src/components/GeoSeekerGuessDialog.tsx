import { Check, X } from 'lucide-react';
import { STATE_NAMES } from '../services/geoSeekerService';

interface GeoSeekerGuessDialogProps {
  nearbyState: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GeoSeekerGuessDialog({ nearbyState, onConfirm, onCancel }: GeoSeekerGuessDialogProps) {
  const stateName = STATE_NAMES[nearbyState] || nearbyState;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4 animate-in zoom-in-95 slide-in-from-bottom-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#002868] to-[#BF0A30] rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-[#002868] mb-2">
            Lock In Your Guess?
          </h2>
          <p className="text-slate-600">
            You're near <span className="font-bold text-[#BF0A30]">{stateName}</span>
          </p>
        </div>

        {/* Message */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-900 text-center leading-relaxed">
            Is this your final answer? Gemini will reveal how close you are to the hidden location!
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Keep Looking
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#BF0A30] to-[#D91E3E] hover:from-[#A00828] hover:to-[#BF0A30] text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Lock It In!
          </button>
        </div>
      </div>
    </div>
  );
}
