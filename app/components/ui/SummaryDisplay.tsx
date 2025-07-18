import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScenarioDefinition } from '@/lib/scenarios';
import { Persona } from '@/lib/personas';
import { toast } from 'sonner'; // Assuming toast is used for error notifications
import { getDifficultyDescriptions } from '@/lib/scenarios';
import { motion } from 'framer-motion';

interface SummaryDisplayProps {
  selectedScenario: ScenarioDefinition | undefined;
  selectedPersona: Persona | null;
  selectedDifficulty?: string;
  isStartingSession?: boolean;
  onStartSession: () => void;
  onChangeDifficulty: () => void;
  onChangePersona: () => void;
  onChangeScenario: () => void;
  loading?: boolean;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({
  selectedScenario,
  selectedPersona,
  selectedDifficulty,
  isStartingSession,
  onStartSession,
  onChangeDifficulty,
  onChangePersona,
  onChangeScenario,
  loading,
}) => {
  if (!selectedScenario || !selectedPersona) {
    // This case should ideally be handled before rendering SummaryDisplay,
    // but as a fallback:
    toast.error("Error: Scenario or Persona details missing in Summary. Please go back.");
    return (
      <div className="text-center p-4">
        <p className="text-red-500">Error: Critical information missing.</p>
        <Button onClick={onChangeScenario} className='mt-2'>
          Go Back to Scenario Selection
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <motion.div 
        className="flex gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Selected Scenario Display */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex-1/2"
        >
          <Card className="mb-3 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 shadow-md">
            <CardHeader className="p-4 pb-2">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Scenario</p>
              <CardTitle className="text-lg font-medium text-[#FFD700]">
                {selectedScenario.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-300 mb-1">{selectedScenario.description}</p>
              <p className="text-sm text-gray-400">Your Role: {selectedScenario.userRole}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Selected Difficulty Display */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex-1/2"
        >
          <Card className="mb-3 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 shadow-md">
            <CardHeader className="p-4 pb-2">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Difficulty</p>
              <CardTitle className="text-lg font-medium text-[#FFD700]">
                {selectedDifficulty && (() => {
                  // Capitalize first letter
                  const label = selectedDifficulty[0].toUpperCase() + selectedDifficulty.slice(1);
                  // 1 star for easy, 2 for medium, 3 for hard
                  const count = selectedDifficulty === 'easy'
                    ? 1
                    : selectedDifficulty === 'medium'
                      ? 2
                      : 3;
                  return `${label} ${'⭐'.repeat(count)}`;
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-300 mb-1">{getDifficultyDescriptions(selectedScenario.id).find(difficulty => difficulty.id === selectedDifficulty)?.description}</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Selected Persona Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="mb-6 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 shadow-md">
          <CardHeader className="p-4 pb-2">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Selected Persona</p>
            <CardTitle className="text-lg font-medium text-[#60A5FA]">
              {selectedPersona.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm font-semibold text-gray-200 mb-1">Profile Details:</p>
            <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto p-3 bg-black/25 rounded-md">
              {selectedPersona.profileDetails}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        className="space-y-3 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Button
          onClick={onStartSession}
          disabled={isStartingSession || loading}
          className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-opacity-50 text-lg flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isStartingSession || loading ? (
            <span>Starting Session...</span>
          ) : (
            <span>Start Session</span>
          )}
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onChangeDifficulty}
            className="w-full text-sm text-gray-300 hover:text-white border-gray-600 hover:border-gray-400 bg-transparent hover:bg-white/10 py-2.5 rounded-lg"
          >
            &larr; Change Difficulty
          </Button>
          <Button
            variant="outline"
            onClick={onChangePersona}
            className="w-full text-sm text-gray-300 hover:text-white border-gray-600 hover:border-gray-400 bg-transparent hover:bg-white/10 py-2.5 rounded-lg"
          >
            &larr; Change Persona
          </Button>
          <Button
            variant="outline"
            onClick={onChangeScenario}
            className="w-full text-sm text-gray-300 hover:text-white border-gray-600 hover:border-gray-400 bg-transparent hover:bg-white/10 py-2.5 rounded-lg"
          >
            &larr; Change Scenario
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};