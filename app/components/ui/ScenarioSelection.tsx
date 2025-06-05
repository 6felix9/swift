import React from 'react';
import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming these are aliased correctly
import { CheckCircle2 } from 'lucide-react';
import { ScenarioDefinition } from '@/lib/scenarios'; // Ensure this path is correct

interface ScenarioSelectionProps {
  scenarioDefinitions: ScenarioDefinition[];
  selectedScenarioId: string | null;
  onSelectScenarioAndPersona: (scenarioId: string, defaultPersonaId: string) => void;
}

export const ScenarioSelection: React.FC<ScenarioSelectionProps> = ({ 
  scenarioDefinitions, 
  selectedScenarioId, 
  onSelectScenarioAndPersona 
}) => {
  return (
    <>
      {/* Step 1: Scenario Selection */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-center mb-1 text-white">Step 1: Select a Training Scenario</h2>
        <p className="text-sm text-center mb-4 text-gray-400">What scenario would you like to practice?</p>
        <div className="space-y-3">
          {scenarioDefinitions.map(scenarioDef => (
            <Card 
              key={scenarioDef.id}
              className={clsx(
                "transition-all duration-300 cursor-pointer hover:shadow-lg",
                selectedScenarioId === scenarioDef.id
                  ? "bg-gradient-to-r from-[#002B49]/90 to-[#001425]/95 border-2 border-[#FFB800]/80 shadow-[0_0_20px_rgba(255,184,0,0.4)] scale-105"
                  : "bg-gradient-to-r from-[#002B49]/60 to-[#001425]/70 border border-white/10 hover:border-white/30 hover:scale-[1.02]"
              )}
              onClick={() => {
                onSelectScenarioAndPersona(scenarioDef.id, scenarioDef.defaultPersonaId);
              }}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className={clsx(
                    "text-lg font-medium transition-colors",
                    selectedScenarioId === scenarioDef.id
                      ? "text-[#FFB800]"
                      : "text-white"
                  )}>
                    {scenarioDef.name}
                  </CardTitle>
                  {selectedScenarioId === scenarioDef.id && (
                    <CheckCircle2 className="w-5 h-5 text-[#FFB800]" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-white">{scenarioDef.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};