import React from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { SearchSuggestion } from './hooks/useMapAdvanced';

interface SearchBarProps {
  searchQuery: string;
  searchSuggestions: SearchSuggestion[];
  isSearching: boolean;
  onSearchChange: (query: string) => void;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  searchSuggestions,
  isSearching,
  onSearchChange,
  onSuggestionSelect
}) => {
  return (
    <div className="relative w-full max-w-md z-[500]">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search for a location..."
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {searchSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {searchSuggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              onClick={() => onSuggestionSelect(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center space-x-2"
            >
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-900 truncate">
                {suggestion.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
