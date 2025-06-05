import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface EvaluationDisplayProps {
  evaluationText: string;
  isLoading: boolean;
  error: string | null;
  onRestartSession: () => void;
}

export const EvaluationDisplay: React.FC<EvaluationDisplayProps> = ({
  evaluationText,
  isLoading,
  error,
  onRestartSession,
}) => {
  if (isLoading) {
    return (
      <div className="text-center p-4">
        <p className="text-lg text-gray-300 animate-pulse">Loading Evaluation Results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-4 bg-gradient-to-br from-red-900/60 to-red-950/50 border border-red-700/70 text-red-200 rounded-xl shadow-lg backdrop-blur-md"
      >
        <CardHeader className="p-2 pb-1">
          <CardTitle className="text-lg font-semibold text-red-100">Evaluation Error</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <p className="text-sm">{error}</p>
          <Button onClick={onRestartSession} className='mt-4 w-full bg-red-500 hover:bg-red-600 text-white'>
            Try Again or Restart
          </Button>
        </CardContent>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto my-6"
    >
      <Card className="bg-gradient-to-br from-[#0A3A5A]/90 to-[#001F35]/95 border border-blue-400/30 shadow-xl backdrop-blur-lg">
        <CardHeader className="p-6 pb-3">
          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-400 to-cyan-400 text-center">
            Evaluation Results
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {evaluationText ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-200 leading-relaxed bg-black/30 p-4 rounded-lg shadow-inner max-h-[60vh] overflow-y-auto">
              {evaluationText}
            </pre>
          ) : (
            <p className="text-center text-gray-400">No evaluation results to display.</p>
          )}
          <Button 
            onClick={onRestartSession} 
            className='mt-8 w-full bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105'
          >
            Start New Session
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
