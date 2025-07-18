import React from 'react';
import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { ScenarioDefinition } from '@/lib/scenarios';
import { Persona } from '@/lib/personas';
import { motion } from 'framer-motion';

interface PersonaSelectionProps {
  personas: Persona[];
  selectedPersonaId: string | null;
  currentScenario: ScenarioDefinition | undefined; // Can be undefined if ID is invalid
  onSelectPersona: (personaId: string) => void;
  onBackToScenarioSelection: () => void;
  onNextToDifficulty: () => void;
}

export const PersonaSelection: React.FC<PersonaSelectionProps> = ({
  personas,
  selectedPersonaId,
  currentScenario,
  onSelectPersona,
  onBackToScenarioSelection,
  onNextToDifficulty,
}) => {
  if (!currentScenario) {
    // Handle case where scenario might not be found (e.g., bad ID)
    // Optionally, you could redirect or show a more specific error
    return <p className="text-center text-red-500">Error: Selected scenario details are missing. Please go back.</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <motion.div 
        className="mb-4 p-3 border border-white/20 rounded-lg bg-white/5 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <p className="text-xs text-gray-400 mb-0.5">Selected Scenario:</p>
        <h3 className="text-md font-semibold text-[#FFD700]">{currentScenario.name}</h3>
      </motion.div>

      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-center mb-1 text-white">Step 2: Select a Persona</h2>
          <p className="text-sm text-center mb-4 text-gray-400">
            Confirm or choose a different persona for the &quot;{currentScenario.name}&quot; scenario.
          </p>
        </motion.div>
        <div className="space-y-3">
          {personas.map((persona, index) => (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: 0.3 + index * 0.1,
                ease: "easeOut"
              }}
            >
              <Card
                className={clsx(
                  "transition-all duration-200 cursor-pointer hover:shadow-lg p-4",
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
                  <p className="text-sm text-gray-300 truncate">{persona.profileDetails}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <motion.div 
        className="mt-6 flex flex-col sm:flex-row gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Button
          variant="outline"
          onClick={onBackToScenarioSelection}
          className="w-full text-sm text-gray-300 hover:text-white border-gray-600 hover:border-gray-400 bg-transparent hover:bg-white/10 py-2.5 rounded-lg"
        >
          &larr; Change Scenario
        </Button>
        <Button
          onClick={onNextToDifficulty}
          disabled={!selectedPersonaId}
          className="w-full px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50"
        >
          Next: Confirm Details &rarr;
        </Button>
      </motion.div>
    </motion.div>
  );
};