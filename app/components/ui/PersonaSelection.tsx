import React from 'react';
import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { ScenarioDefinition } from '@/lib/scenarios';
import { Persona } from '@/lib/personas';

interface PersonaSelectionProps {
  personas: Persona[];
  selectedPersonaId: string | null;
  currentScenario: ScenarioDefinition | undefined; // Can be undefined if ID is invalid
  onSelectPersona: (personaId: string) => void;
  onBackToScenarioSelection: () => void;
  onNextToSummary: () => void;
}

export const PersonaSelection: React.FC<PersonaSelectionProps> = ({
  personas,
  selectedPersonaId,
  currentScenario,
  onSelectPersona,
  onBackToScenarioSelection,
  onNextToSummary,
}) => {
  if (!currentScenario) {
    // Handle case where scenario might not be found (e.g., bad ID)
    // Optionally, you could redirect or show a more specific error
    return <p className="text-center text-red-500">Error: Selected scenario details are missing. Please go back.</p>;
  }

  return (
    <>
      <div className="mb-4 p-3 border border-white/20 rounded-lg bg-white/5 shadow-sm">
        <p className="text-xs text-gray-400 mb-0.5">Selected Scenario:</p>
        <h3 className="text-md font-semibold text-[#FFD700]">{currentScenario.name}</h3>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-center mb-1 text-white">Step 2: Select a Persona</h2>
        <p className="text-sm text-center mb-4 text-gray-400">
          Confirm or choose a different persona for the &quot;{currentScenario.name}&quot; scenario.
        </p>
        <div className="space-y-3">
          {personas.map(persona => (
            <Card
              key={persona.id}
              className={clsx(
                "transition-all duration-300 cursor-pointer hover:shadow-lg p-4",
                selectedPersonaId === persona.id
                  ? "bg-gradient-to-r from-[#003B6F]/90 to-[#001F3A]/95 border-2 border-[#60A5FA]/80 shadow-[0_0_20px_rgba(96,165,250,0.4)] scale-105"
                  : "bg-gradient-to-r from-[#002B49]/60 to-[#001425]/70 border border-white/10 hover:border-white/30 hover:scale-[1.02]"
              )}
              onClick={() => {
                onSelectPersona(persona.id);
              }}
            >
              <CardHeader className="p-0 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className={clsx(
                    "text-lg font-medium transition-colors",
                    selectedPersonaId === persona.id
                      ? "text-[#60A5FA]"
                      : "text-white"
                  )}>
                    {persona.name}
                  </CardTitle>
                  {selectedPersonaId === persona.id && (
                    <CheckCircle2 className="w-5 h-5 text-[#60A5FA]" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-sm text-gray-300 truncate">{persona.profileDetails.substring(0, 100)}...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={onBackToScenarioSelection}
          className="w-full text-sm text-gray-300 hover:text-white border-gray-600 hover:border-gray-400 bg-transparent hover:bg-white/10 py-2.5 rounded-lg"
        >
          &larr; Change Scenario
        </Button>
        <Button
          onClick={onNextToSummary}
          disabled={!selectedPersonaId}
          className="w-full px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300 disabled:opacity-50"
        >
          Next: Confirm Details &rarr;
        </Button>
      </div>
    </>
  );
};