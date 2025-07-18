import React from 'react';
import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming these are aliased correctly
import { CheckCircle2, History, Briefcase, Heart, Headphones } from 'lucide-react';
import { ScenarioDefinition } from '@/lib/scenarios'; // Ensure this path is correct
import { TrainingDomain } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ScenarioSelectionProps {
  scenarioDefinitions: ScenarioDefinition[];
  selectedScenarioId: string | null;
  selectedDomain: TrainingDomain;
  onSelectScenarioAndPersona: (scenarioId: string, defaultPersonaId: string) => void;
  onShowSessionHistory: () => void;
  onDomainChange: (domain: TrainingDomain) => void;
}

const domainConfig = {
  'financial-advisor': {
    label: 'Financial Advisor',
    icon: Briefcase,
    description: 'Practice client interactions and referral skills'
  },
  'healthcare': {
    label: 'Healthcare',
    icon: Heart,
    description: 'Practice patient care and medical communication'
  },
  'customer-service': {
    label: 'Customer Service',
    icon: Headphones,
    description: 'Practice support interactions and issue resolution'
  }
};

export const ScenarioSelection: React.FC<ScenarioSelectionProps> = ({ 
  scenarioDefinitions, 
  selectedScenarioId, 
  selectedDomain,
  onSelectScenarioAndPersona,
  onShowSessionHistory,
  onDomainChange
}) => {
  // Filter scenarios by selected domain
  const filteredScenarios = scenarioDefinitions.filter(scenario => scenario.domain === selectedDomain);

  return (
    <>
      {/* Step 1: Scenario Selection */}
      <div className="mb-6">
        <div className="relative flex justify-center items-center mb-6">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold text-center mb-1 text-white">Step 1: Select a Training Scenario</h2>
            <p className="text-sm text-center text-gray-400">Choose your sector and practice scenario</p>
          </div>
          <Button
            onClick={onShowSessionHistory}
            className="absolute right-0 flex items-center gap-2 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 hover:border-white/40 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-all duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-[#002B49]/90 hover:to-[#001425]/95"
          >
            <History size={16} />
            <span className="text-sm">Session History</span>
          </Button>
        </div>

        {/* Domain Selection Tabs */}
        <div className="mb-6">
          <div className="flex justify-center gap-3 mb-4">
            {Object.entries(domainConfig).map(([domain, config]) => {
              const IconComponent = config.icon;
              const isSelected = selectedDomain === domain;
              return (
                <Button
                  key={domain}
                  onClick={() => onDomainChange(domain as TrainingDomain)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 border-2",
                    isSelected
                      ? "bg-gradient-to-r from-[#002B49]/90 to-[#001425]/95 border-[#FFB800]/80 text-[#FFB800] shadow-[0_0_15px_rgba(255,184,0,0.3)] scale-105"
                      : "bg-gradient-to-r from-[#002B49]/60 to-[#001425]/70 border-white/10 text-white hover:border-white/30 hover:scale-[1.02]"
                  )}
                >
                  <IconComponent size={18} />
                  <span>{config.label}</span>
                </Button>
              );
            })}
          </div>
          <p className="text-center text-sm text-gray-400">
            {domainConfig[selectedDomain].description}
          </p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedDomain}
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {filteredScenarios.map((scenarioDef, index) => (
              <motion.div
                key={scenarioDef.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
              >
                <Card 
                  className={clsx(
                    "transition-all duration-200 cursor-pointer hover:shadow-lg",
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
                    <p className="text-sm text-white mb-2">{scenarioDef.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Role:</span>
                      <span className="text-xs text-[#FFB800] font-medium">{scenarioDef.userRole}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
};