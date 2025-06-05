import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScenarioDefinition } from '@/lib/scenarios';
import { Persona } from '@/lib/personas';
import { toast } from 'sonner'; // Assuming toast is used for error notifications

interface SummaryDisplayProps {
  currentScenario: ScenarioDefinition | undefined;
  currentPersona: Persona | undefined;
  onStartSession: () => void;
  onChangePersona: () => void;
  onChangeScenario: () => void;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({
  currentScenario,
  currentPersona,
  onStartSession,
  onChangePersona,
  onChangeScenario,
}) => {
  if (!currentScenario || !currentPersona) {
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
    <>
      {/* Selected Scenario Display */}
      <Card className="mb-3 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 shadow-md">
        <CardHeader className="p-4 pb-2">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Scenario</p>
          <CardTitle className="text-lg font-medium text-[#FFD700]">
            {currentScenario.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-gray-300 mb-1">{currentScenario.description}</p>
          <p className="text-xs text-gray-400">Your Role: {currentScenario.userRole}</p>
        </CardContent>
      </Card>

      {/* Selected Persona Display */}
      <Card className="mb-6 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 shadow-md">
        <CardHeader className="p-4 pb-2">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Selected Persona</p>
          <CardTitle className="text-lg font-medium text-[#60A5FA]">
            {currentPersona.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm font-semibold text-gray-200 mb-1">Profile Details:</p>
          <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto p-3 bg-black/25 rounded-md">
            {currentPersona.profileDetails}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3 mt-8">
        <Button
          onClick={onStartSession}
          className="w-full bg-gradient-to-r from-[#FFB800] to-[#FFCC40] hover:from-[#EAA900] hover:to-[#FFB800] text-[#001425] font-semibold transition-all duration-300 shadow-lg hover:shadow-xl py-3 text-lg rounded-xl"
        >
          Start Session
        </Button>
        <div className="flex gap-3">
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
      </div>
    </>
  );
};