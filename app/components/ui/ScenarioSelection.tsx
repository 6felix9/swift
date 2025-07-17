import React from 'react';
import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming these are aliased correctly
import { CheckCircle2, History } from 'lucide-react';
import { ScenarioDefinition } from '@/lib/scenarios'; // Ensure this path is correct
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ScenarioSelectionProps {
  scenarioDefinitions: ScenarioDefinition[];
  selectedScenarioId: string | null;
  onSelectScenarioAndPersona: (scenarioId: string, defaultPersonaId: string) => void;
  onShowSessionHistory: () => void;
}

export const ScenarioSelection: React.FC<ScenarioSelectionProps> = ({ 
  scenarioDefinitions, 
  selectedScenarioId, 
  onSelectScenarioAndPersona,
  onShowSessionHistory 
}) => {
  return (
    <>
      {/* Step 1: Scenario Selection */}
      <div className="mb-6">
        <div className="relative flex justify-center items-center mb-4">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold text-center mb-1 text-white">Step 1: Select a Training Scenario</h2>
            <p className="text-sm text-center text-gray-400">What scenario would you like to practice?</p>
          </div>
          <Button
            onClick={onShowSessionHistory}
            className="absolute right-0 flex items-center gap-2 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 hover:border-white/40 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-[#002B49]/90 hover:to-[#001425]/95"
          >
            <History size={16} />
            <span className="text-sm">Session History</span>
          </Button>
        </div>
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
                onSelectScenarioAndPersona(scenarioDef.id, scenarioDef.personas[0]);
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