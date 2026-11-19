import React from 'react';
import { Globe2, ArrowRight } from 'lucide-react';
import { WORLD_COUNTRY_PRESETS, WorldCountryPreset } from '../data/curatedTracks';

interface CountriesPageProps {
  onSelectCountry: (country: WorldCountryPreset) => void;
}

export const CountriesPage: React.FC<CountriesPageProps> = ({ onSelectCountry }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[#FF443A] flex items-center gap-1.5 mb-1">
            <Globe2 className="w-3.5 h-3.5" />
            <span>Global Destinations</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explore by Country
          </h1>
          <p className="text-xs sm:text-sm text-[#A39E9F] mt-1">
            Pick any country to open its live scene and top releases
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-[#FF443A]">
          {WORLD_COUNTRY_PRESETS.length} countries
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {WORLD_COUNTRY_PRESETS.map((country) => (
          <button
            type="button"
            key={country.id}
            onClick={() => onSelectCountry(country)}
            className="card-interactive group text-left p-4 rounded-2xl bg-[#110E0F] hover:bg-[#171213] border border-white/[0.08] hover:border-[#EF2323]/45 cursor-pointer flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#FF443A] capitalize">
                {country.region}
              </div>
              <div className="font-display font-bold text-base text-white truncate mt-0.5">
                {country.name}
              </div>
              <div className="text-xs text-[#A39E9F] truncate mt-1">
                {country.styleHint}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] group-hover:bg-[#EF2323] text-[#FF443A] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CountriesPage;
