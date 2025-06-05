import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { EvaluationResponse, DetailedEvaluationCategory, CriterionEvaluation } from '@/lib/evaluationTypes';

interface EvaluationDisplayProps {
  evaluationData: EvaluationResponse | null;
  isLoading: boolean;
  error: string | null;
  onRestartSession: () => void;
}

export const EvaluationDisplay: React.FC<EvaluationDisplayProps> = ({
  evaluationData,
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
        <CardContent className="p-6 pt-2 text-gray-200 max-h-[70vh] overflow-y-auto">
          {evaluationData ? (
            <div className="space-y-6">
              {/* Evaluation Summary Section */}
              <div className="bg-black/30 p-4 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-sky-300 mb-3">Evaluation Summary</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Overall Score:</strong> {evaluationData?.evaluationSummary?.totalScore} / {evaluationData?.evaluationSummary?.maxPossibleScore}</p>
                  <div><strong>Key Strengths:</strong> <div className="prose prose-sm prose-invert max-w-none inline"><ReactMarkdown>{evaluationData?.evaluationSummary?.keyStrengths}</ReactMarkdown></div></div>
                  <div><strong>Key Areas for Improvement:</strong> <div className="prose prose-sm prose-invert max-w-none inline"><ReactMarkdown>{evaluationData?.evaluationSummary?.keyAreasForImprovement}</ReactMarkdown></div></div>
                  <div>
                    <strong>Referral Context Successfully Created:</strong> {evaluationData?.evaluationSummary?.referralContextSuccessfullyCreated?.answer}
                    <div className="prose prose-sm prose-invert max-w-none text-xs text-gray-400 ml-1"><ReactMarkdown>{evaluationData?.evaluationSummary?.referralContextSuccessfullyCreated?.justification}</ReactMarkdown></div>
                  </div>
                </div>
              </div>

              {/* Detailed Evaluation Section */}
              <div>
                <h3 className="text-xl font-semibold text-sky-300 mb-3 mt-6">Detailed Evaluation</h3>
                {evaluationData?.detailedEvaluation?.map((category: DetailedEvaluationCategory, catIndex: number) => (
                  <div key={catIndex} className="mb-6 bg-black/40 p-4 rounded-lg shadow-md">
                    <h4 className="text-lg font-medium text-blue-300 mb-1">{category?.categoryName} (Subtotal: {category?.subtotal})</h4>
                    {category?.redFlagCheck?.raised && (
                      <p className="text-xs text-red-400 mb-2"><strong>Red Flag:</strong> {category?.redFlagCheck?.comment}</p>
                    )}
                    <ul className="space-y-3 list-inside pl-2">
                      {category?.criteria?.map((criterion: CriterionEvaluation, critIndex: number) => (
                        <li key={critIndex} className="text-sm border-l-2 border-sky-700 pl-3 py-1">
                          <p className="font-semibold">{criterion.criterionId}. {criterion.criterionText} <span className="text-blue-400">(Score: {criterion.score}/5)</span></p>
                          <div className="text-xs text-gray-300 mt-1 prose prose-xs prose-invert max-w-none">
                            <ReactMarkdown>{criterion?.commentsAndExamples}</ReactMarkdown>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">No evaluation results to display.</p>
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
