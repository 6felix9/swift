import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { EvaluationResponse, DetailedEvaluationCategory, CriterionEvaluation } from '@/lib/evaluationTypes';
import { Difficulty } from '@/lib/difficultyTypes';

interface EvaluationDisplayProps {
  difficulty: Difficulty | null;
  evaluationData: EvaluationResponse | null;
  isLoading: boolean;
  error: string | null;
  onRestartSession: () => void;
}

export const EvaluationDisplay: React.FC<EvaluationDisplayProps> = ({
  difficulty,
  evaluationData,
  isLoading,
  error,
  onRestartSession,
}) => {
  if (isLoading) {
    return (
      <div className="text-center p-6">
        <p className="text-lg text-gray-400 animate-pulse">Loading Evaluation Results…</p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 p-4 bg-red-900/70 border border-red-700 rounded-lg shadow-lg"
      >
        <CardHeader className="p-2 pb-1">
          <CardTitle className="text-lg font-semibold text-red-100">Evaluation Error</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <p className="text-sm text-red-200">{error}</p>
          <Button 
            onClick={onRestartSession} 
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Try Again
          </Button>
        </CardContent>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto my-8 space-y-6"
    >
      {/* SUMMARY */}
      <Card className="bg-gradient-to-br from-[#0A3A5A]/80 to-[#001F35]/90 border border-blue-600/30 shadow-xl">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400">
            Evaluation Results
          </CardTitle>
          <p className="mt-1 text-sm text-gray-300 text-center">
            Difficulty:{' '}
            <span className="font-semibold text-white">
              {difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'N/A'}
            </span>
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-baseline space-x-2">
            <span className="text-sm font-medium text-gray-300">Overall Score:</span>
            <span className="text-4xl font-extrabold text-white">{
              evaluationData!.evaluationSummary.totalScore
            }</span>
            <span className="text-lg font-semibold text-gray-200">/ {evaluationData!.evaluationSummary.maxPossibleScore}</span>
          </div>
            <div>
              <span className="text-sm font-medium text-gray-300">Referral Context:</span>
              <span className="block mt-1 text-white">
                {evaluationData!.evaluationSummary.referralContextSuccessfullyCreated.answer}
              </span>
              <p className="mt-1 text-xs text-gray-400">
                {evaluationData!.evaluationSummary.referralContextSuccessfullyCreated.justification}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-200 text-sm">
            <div>
              <h4 className="font-semibold text-sky-300 mb-1">Key Strengths</h4>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>
                  {evaluationData!.evaluationSummary.keyStrengths}
                </ReactMarkdown>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sky-300 mb-1">Areas to Improve</h4>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>
                  {evaluationData!.evaluationSummary.keyAreasForImprovement}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAILED EVALUATION */}
      <div className="space-y-4">
        {evaluationData?.detailedEvaluation.map((cat: DetailedEvaluationCategory, i: number) => (
          <Card key={i} className="bg-black/20 border border-blue-500/20 shadow-inner">
            <CardHeader className="px-4 py-3 border-b border-blue-500/30">
              <div className="flex justify-between items-center">
                <h5 className="text-lg font-medium text-blue-300">{cat.categoryName}</h5>
                <span className="text-base font-semibold text-white">Subtotal: {cat.subtotal}</span>
              </div>
              {cat.redFlagCheck.raised && (
                <p className="mt-1 text-xs text-red-400">
                  <strong>Red Flag:</strong> {cat.redFlagCheck.comment}
                </p>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {cat.criteria.map((cr: CriterionEvaluation, j: number) => (
                <div key={j} className="border-l-2 border-sky-600 pl-3">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-white">
                      {cr.criterionId}. {cr.criterionText}
                    </p>
                    <span className="text-sm text-blue-400">
                      {cr.score}/5
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-300 prose prose-xs prose-invert max-w-none">
                    <ReactMarkdown>{cr.commentsAndExamples}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={onRestartSession}
        className="w-full bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white font-semibold py-3 rounded-lg shadow-md transition-transform hover:scale-105"
      >
        Start New Session
      </Button>
    </motion.div>
  );
};
