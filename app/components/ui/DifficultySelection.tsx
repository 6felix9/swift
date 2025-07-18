import React from 'react';
import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { ScenarioDefinition } from '@/lib/scenarios';
import { Persona } from '@/lib/personas';
import { Difficulty } from '@/lib/difficultyTypes';
import { getDifficultyDescriptions } from '@/lib/scenarios';
import { motion } from 'framer-motion';

interface DifficultySelectionProps {
  selectedScenario: ScenarioDefinition | undefined;
  selectedPersona: Persona | null;
  selectedDifficulty: Difficulty | null;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onChangeScenario: () => void;
  onChangePersona: () => void;
  onNextToSummary: () => void;
}

// Legacy export for backward compatibility - now dynamically generated
export const difficulties: { id: Difficulty; title: string; description: string }[] = [];

export const DifficultySelection: React.FC<DifficultySelectionProps> = ({
  selectedScenario,
  selectedPersona,
  selectedDifficulty,
  onSelectDifficulty,
  onChangeScenario,
  onChangePersona,
  onNextToSummary,
}) => {
  if (!selectedScenario || !selectedPersona) {
    return <p className="text-center text-red-500">
      Error: Scenario or persona is missing. Please go back.
    </p>;
  }

  // Get scenario-specific difficulty descriptions
  const scenarioDifficulties = getDifficultyDescriptions(selectedScenario.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Persona recap */}
      <motion.div 
        className="mb-4 p-3 border border-white/20 rounded-lg bg-white/5 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <p className="text-xs text-gray-400 mb-0.5">Selected Persona:</p>
        <h3 className="text-md font-semibold text-[#FFD700]">
          {selectedPersona.name}
        </h3>
      </motion.div>

      {/* Difficulty cards */}
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-center mb-1 text-white">
            Step 3: Select Difficulty
          </h2>
          <p className="text-sm text-center mb-4 text-gray-400">
            How challenging should the customer be to convince?
          </p>
        </motion.div>
        <div className="space-y-3">
          {scenarioDifficulties.map((diff, index) => (
            <motion.div
              key={diff.id}
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
                  'transition-all duration-200 cursor-pointer hover:shadow-lg p-4',
                  selectedDifficulty === diff.id
                    ? 'bg-gradient-to-r from-[#003B6F]/90 to-[#001F3A]/95 border-2 border-[#60A5FA]/80 shadow-[0_0_20px_rgba(96,165,250,0.4)] scale-105'
                    : 'bg-gradient-to-r from-[#002B49]/60 to-[#001425]/70 border border-white/10 hover:border-white/30 hover:scale-[1.02]'
                )}
                onClick={() => onSelectDifficulty(diff.id)}
              >
                <CardHeader className="p-0 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className={clsx(
                      'text-lg font-medium transition-colors',
                      selectedDifficulty === diff.id ? 'text-[#60A5FA]' : 'text-white'
                    )}>
                      {diff.title}
                    </CardTitle>
                    {selectedDifficulty === diff.id && (
                      <CheckCircle2 className="w-5 h-5 text-[#60A5FA]" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm text-gray-300 truncate">
                    {diff.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <motion.div 
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <div className="flex gap-3">
            <Button
            variant="outline"
            onClick={onChangeScenario}
            className="w-full text-sm text-gray-300 hover:text-white border-gray-600 hover:border-gray-400 bg-transparent hover:bg-white/10 py-2.5 rounded-lg"
            >
            &larr; Change Scenario
            </Button>
            <Button
            variant="outline"
            onClick={onChangePersona}
            className="w-full text-sm text-gray-300 hover:text-white border-gray-600 hover:border-gray-400 bg-transparent hover:bg-white/10 py-2.5 rounded-lg"
            >
            &larr; Change Persona
            </Button>
        </div>
        <Button
            onClick={onNextToSummary}
            disabled={!selectedDifficulty}
            className="w-full px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50"
        >
            Next: Confirm Details &rarr;
        </Button>
      </motion.div>
    </motion.div>
  );
};
