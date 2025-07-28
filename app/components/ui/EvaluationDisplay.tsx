import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { EvaluationResponse } from '@/lib/evaluationTypes';
import { Difficulty } from '@/lib/difficultyTypes';
import { GraduationCap, FileText, ArrowLeft } from 'lucide-react';
import { Message } from '@/lib/types';
import { Persona } from '@/lib/personas';
import { ScenarioDefinition } from '@/lib/scenarios';
import { formatSessionTimestamp } from '@/lib/sessionStorage';
import { ChartLineLinear } from '@/components/ui/chart-line-linear';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface ActionButton {
  label: string;
  onClick: () => void;
  className?: string;
}

interface EvaluationDisplayProps {
  difficulty: Difficulty | null;
  evaluationData: EvaluationResponse | null;
  isLoading: boolean;
  error: string | null;
  transcript: Message[];
  persona: Persona | null;
  scenario: ScenarioDefinition | undefined;
  callDuration: number;
  mode?: 'live' | 'historical';
  sessionTimestamp?: Date;
  primaryAction: ActionButton;
  secondaryAction?: ActionButton;
  conversationScores?: Array<{
    turn: number;
    score: number;
    timestamp: number;
  }>;
}

// Utility function to format duration in MM:SS or HH:MM:SS format
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
};

export const EvaluationDisplay: React.FC<EvaluationDisplayProps> = ({
  difficulty,
  evaluationData,
  isLoading,
  error,
  transcript,
  persona,
  scenario,
  callDuration,
  mode = 'live',
  sessionTimestamp,
  primaryAction,
  secondaryAction,
  conversationScores,
}) => {

  const onDownloadTranscript = () => {
    if (!transcript || transcript.length === 0) {
      toast('No transcript data to download.');
      return;
    }
  
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;
  
    // Header Section
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text('Conversation Transcript', margin, currentY);
    currentY += 15;
  
    // Session Information Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60); // Dark gray
    doc.text('Session Details', margin, currentY);
    currentY += 10;
  
    // Client Profile Header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185); // Blue
    doc.text('Client Profile', margin, currentY);
    currentY += 8;
  
    // Client Name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(46, 125, 50); // Green
    doc.text('Name:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(persona?.name || 'Not specified', margin + 25, currentY);
    currentY += 8;
  
    // Profile Details
    if (persona?.profileDetails) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 125, 50);
      doc.text('Profile:', margin, currentY);
      currentY += 6;
  
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      
      // Parse and format profile details nicely
      const profileLines = persona.profileDetails
        .split('\n')
        .filter(line => line.trim()) // Remove empty lines
        .map(line => line.trim());
      
      profileLines.forEach(line => {
        // Check if we need a new page
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = margin;
        }
        
        // Style key-value pairs differently
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          
          // Key in bold, value in normal
          doc.setFont('helvetica', 'bold');
          const keyText = `• ${key.trim()}:`;
          doc.text(keyText, margin + 5, currentY);
          
          const keyWidth = doc.getTextWidth(keyText);
          doc.setFont('helvetica', 'normal');
          
          // Handle long values with word wrapping
          const remainingWidth = contentWidth - keyWidth - 10;
          if (doc.getTextWidth(value) > remainingWidth) {
            const valueLines = doc.splitTextToSize(value, remainingWidth);
            doc.text(valueLines[0], margin + 5 + keyWidth + 2, currentY);
            currentY += 5;
            
            // Continue with remaining lines if any
            for (let i = 1; i < valueLines.length; i++) {
              doc.text(valueLines[i], margin + 5 + keyWidth + 2, currentY);
              currentY += 5;
            }
          } else {
            doc.text(value, margin + 5 + keyWidth + 2, currentY);
            currentY += 5;
          }
        } else {
          // Regular line
          doc.text(`• ${line}`, margin + 5, currentY);
          currentY += 5;
        }
      });
      
      currentY += 5; // Extra spacing after profile
      doc.setFontSize(10); // Reset font size
    }
  
    // Scenario Information
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185); // Blue
    doc.text('Scenario Information', margin, currentY);
    currentY += 8;
  
    // Scenario Name
    if (scenario?.name) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 125, 50); // Green
      doc.text('Scenario:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(scenario.name, margin + 30, currentY);
      currentY += 8;
    }
  
    // Scenario Description
    if (scenario?.description) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 125, 50); // Green
      doc.text('Description:', margin, currentY);
      currentY += 6;
  
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const descriptionLines = doc.splitTextToSize(scenario.description, contentWidth - 10);
      doc.text(descriptionLines, margin + 5, currentY);
      currentY += (descriptionLines.length * 5) + 8;
    }
  
    // Generation metadata
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(128, 128, 128); // Gray color
    if (mode === 'historical' && sessionTimestamp) {
      doc.text('Session Date:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatSessionTimestamp(sessionTimestamp), margin + 35, currentY);
    } else {
      doc.text('Generated:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(currentDate, margin + 30, currentY);
    }
    currentY += 8;
  
    doc.setFont('helvetica', 'bold');
    doc.text('Call Duration:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDuration(callDuration), margin + 35, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Messages:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${transcript.length} total exchanges`, margin + 30, currentY);
    currentY += 15;
  
    // Add a separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 15;
  
    // Process each message
    transcript.forEach((msg, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
      }
  
      // Speaker name styling
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      
      // Role colors
      doc.setTextColor(52, 152, 219); // Blue
  
      const speakerName = `${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}:`;
      doc.text(speakerName, margin, currentY);
      currentY += 8;
  
      // Message content styling
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60); // Dark gray for content
  
      // Split text to fit within margins with proper word wrapping
      const lines = doc.splitTextToSize(msg.content, contentWidth - 10);
      
      // Check if content fits on current page
      const contentHeight = lines.length * 5;
      if (currentY + contentHeight > pageHeight - 20) {
        doc.addPage();
        currentY = margin;
        
        // Repeat speaker name on new page if message continues
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 152, 219);
        doc.text(`${speakerName} (continued)`, margin, currentY);
        currentY += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
      }
  
      // Add the message content with left margin for better readability
      doc.text(lines, margin + 5, currentY);
      currentY += contentHeight;
  
      // Add spacing between messages
      currentY += 8;
  
      // Add a subtle separator line between messages (except for the last one)
      if (index < transcript.length - 1) {
        doc.setDrawColor(240, 240, 240);
        doc.line(margin + 5, currentY, pageWidth - margin - 5, currentY);
        currentY += 8;
      }
    });
  
    // Footer on each page
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
      doc.text(`${persona?.name || 'Client'} - Conversation Transcript`, margin, pageHeight - 10);
    }
  
    // Generate filename with persona name and timestamp
    const timestampForFile = mode === 'historical' && sessionTimestamp 
      ? sessionTimestamp.toISOString().slice(0, 19).replace(/[:.]/g, '-')
      : new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const sanitizedPersonaName = (persona?.name || 'Unknown')
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase();
    const filename = `transcript-${sanitizedPersonaName}-${timestampForFile}.pdf`;
    
    doc.save(filename);
  };

  const onDownloadEvaluation = () => {
    if (!evaluationData) {
      toast('No evaluation data to download.');
      return;
    }
  
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;
  
    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace = 20) => {
      if (currentY + requiredSpace > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };
  
    // Header Section
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text('Performance Evaluation Report', margin, currentY);
    currentY += 20;
  
    // Session Information Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Session Details', margin, currentY);
    currentY += 10;
  
    // Client Information
    if (persona) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 128, 185);
      doc.text('Client Information', margin, currentY);
      currentY += 8;
  
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 125, 50);
      doc.text('Name:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(persona.name, margin + 25, currentY);
      currentY += 8;
    }
  
    // Scenario Information
    if (scenario) {
      checkPageBreak(30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 128, 185);
      doc.text('Scenario Information', margin, currentY);
      currentY += 8;
  
      if (scenario.name) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(46, 125, 50);
        doc.text('Scenario:', margin, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(scenario.name, margin + 30, currentY);
        currentY += 8;
      }
  
      if (scenario.description) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(46, 125, 50);
        doc.text('Description:', margin, currentY);
        currentY += 6;
  
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const descriptionLines = doc.splitTextToSize(scenario.description, contentWidth - 10);
        doc.text(descriptionLines, margin + 5, currentY);
        currentY += (descriptionLines.length * 5) + 5;
      }
  
      if (scenario.scenarioContext) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(46, 125, 50);
        doc.text('Context:', margin, currentY);
        currentY += 6;
  
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const contextLines = doc.splitTextToSize(scenario.scenarioContext, contentWidth - 10);
        doc.text(contextLines, margin + 5, currentY);
        currentY += (contextLines.length * 5) + 10;
      }
    }
  
    // Difficulty and generation info
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(128, 128, 128);
    doc.text('Difficulty:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'N/A', margin + 30, currentY);
    currentY += 8;
  
    doc.setFont('helvetica', 'bold');
    doc.text('Call Duration:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDuration(callDuration), margin + 35, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    if (mode === 'historical' && sessionTimestamp) {
      doc.text('Session Date:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatSessionTimestamp(sessionTimestamp), margin + 35, currentY);
    } else {
      doc.text('Generated:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(currentDate, margin + 30, currentY);
    }
    currentY += 20;
  
    // Add separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 15;
  
    // EVALUATION SUMMARY SECTION
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Evaluation Summary', margin, currentY);
    currentY += 15;
  
    // Overall Score
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(46, 125, 50);
    doc.text('Overall Performance', margin, currentY);
    currentY += 10;
  
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    const scoreText = `${evaluationData.evaluationSummary.totalScore} / ${evaluationData.evaluationSummary.maxPossibleScore}`;
    doc.text(scoreText, margin, currentY);
    
    // Calculate percentage
    const percentage = Math.round((evaluationData.evaluationSummary.totalScore / evaluationData.evaluationSummary.maxPossibleScore) * 100);
    doc.setFontSize(12);
    doc.setTextColor(128, 128, 128);
    doc.text(`(${percentage}%)`, margin + doc.getTextWidth(scoreText) + 15, currentY);
    currentY += 20;
  
    // Domain Specific Outcome
    if (evaluationData.evaluationSummary.domainSpecificOutcome) {
      checkPageBreak(25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 125, 50);
      doc.text('Outcome:', margin, currentY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(evaluationData.evaluationSummary.domainSpecificOutcome.answer, margin + 45, currentY);
      currentY += 8;
  
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const justificationLines = doc.splitTextToSize(
        evaluationData.evaluationSummary.domainSpecificOutcome.justification,
        contentWidth - 10
      );
      doc.text(justificationLines, margin + 5, currentY);
      currentY += (justificationLines.length * 5) + 10;
    }
  
    // Key Strengths
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(46, 125, 50);
    doc.text('Key Strengths', margin, currentY);
    currentY += 8;
  
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const strengthsLines = doc.splitTextToSize(evaluationData.evaluationSummary.keyStrengths, contentWidth - 10);
    doc.text(strengthsLines, margin + 5, currentY);
    currentY += (strengthsLines.length * 5) + 10;
  
    // Areas for Improvement
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69); // Red color for improvements
    doc.text('Areas for Improvement', margin, currentY);
    currentY += 8;
  
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const improvementLines = doc.splitTextToSize(evaluationData.evaluationSummary.keyAreasForImprovement, contentWidth - 10);
    doc.text(improvementLines, margin + 5, currentY);
    currentY += (improvementLines.length * 5) + 10;
  
    // Where You Could Have Said Better
    if (evaluationData.evaluationSummary.whereYouCouldHaveSaidBetter) {
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 152, 0); // Orange color
      doc.text('Communication Suggestions', margin, currentY);
      currentY += 8;
  
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const suggestionLines = doc.splitTextToSize(evaluationData.evaluationSummary.whereYouCouldHaveSaidBetter, contentWidth - 10);
      doc.text(suggestionLines, margin + 5, currentY);
      currentY += (suggestionLines.length * 5) + 15;
    }
  
    // DETAILED EVALUATION SECTION
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Detailed Evaluation', margin, currentY);
    currentY += 15;
  
    // Process each category
    evaluationData.detailedEvaluation.forEach((category, categoryIndex) => {
      checkPageBreak(50);
      
      // Category header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 125, 50);
      doc.text(`${categoryIndex + 1}. ${category.categoryName}`, margin, currentY);
      
      // Category subtotal
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(`Subtotal: ${category.subtotal}`, pageWidth - margin - 40, currentY);
      currentY += 12;
  
      // Red flag check
      if (category.redFlagCheck.raised && category.redFlagCheck.comment) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 53, 69);
        doc.setCharSpace(0); // Fix for character spacing issue
        doc.text('Red Flag:', margin + 5, currentY);
        currentY += 6; // Move to next line for the comment

        doc.setFont('helvetica', 'normal');
        const redFlagLines = doc.splitTextToSize(category.redFlagCheck.comment, contentWidth - 30);
        doc.text(redFlagLines, margin + 10, currentY); // Draw comment on the new line with a smaller indent
        currentY += (redFlagLines.length * 5) + 8;
      }
  
      // Process criteria
      category.criteria.forEach((criterion) => {
        checkPageBreak(25);
        
        // Criterion header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text(`${criterion.criterionId}. ${criterion.criterionText}`, margin + 10, currentY);
        
        // Score
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(`${criterion.score}/5`, pageWidth - margin - 20, currentY);
        currentY += 8;
  
        // Comments
        if (criterion.commentsAndExamples) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          const commentLines = doc.splitTextToSize(criterion.commentsAndExamples, contentWidth - 20);
          doc.text(commentLines, margin + 15, currentY);
          currentY += (commentLines.length * 4) + 5;
        }
        
        currentY += 3; // Space between criteria
      });
      
      currentY += 8; // Space between categories
    });
  
    // Footer on each page
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
      doc.text(`${persona?.name || 'Client'} - Evaluation Report`, margin, pageHeight - 10);
    }
  
    // Generate filename
    const timestampForFile = mode === 'historical' && sessionTimestamp 
      ? sessionTimestamp.toISOString().slice(0, 19).replace(/[:.]/g, '-')
      : new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const sanitizedPersonaName = (persona?.name || 'Unknown')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const filename = `evaluation-${sanitizedPersonaName}-${timestampForFile}.pdf`;
    
    doc.save(filename);
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="text-center p-6"
      >
        <p className="text-lg text-gray-400 animate-pulse">Loading Evaluation Results…</p>
      </motion.div>
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
            onClick={primaryAction.onClick} 
            className={primaryAction.className || "mt-4 w-full bg-red-600 hover:bg-red-700 text-white"}
          >
            {primaryAction.label}
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
      {/* Header with Back Button for Historical Mode */}
      {mode === 'historical' && sessionTimestamp && (
        <div className="relative flex justify-center items-center mb-6">
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              className="absolute left-0 flex items-center gap-2 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 hover:border-white/40 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">{secondaryAction.label}</span>
            </Button>
          )}
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white">Session from {formatSessionTimestamp(sessionTimestamp)}</h2>
          </div>
        </div>
      )}
      {/* SUMMARY */}
      <Card className="bg-gradient-to-br from-[#0A3A5A]/80 to-[#001F35]/90 border border-blue-600/30 shadow-xl">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400">
            Evaluation Results
          </CardTitle>
          <div className="flex justify-center space-x-4">
            <p className="mt-1 text-sm text-gray-300 text-center">
              Difficulty:{' '}
              <span className="font-semibold text-white">
                {difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'N/A'}
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-300 text-center">
              Call Duration:{' '}
              <span className="font-semibold text-white">
                {formatDuration(callDuration)}
              </span>
            </p>
          </div>
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
            {evaluationData!.evaluationSummary.domainSpecificOutcome && (
              <div>
                <span className="text-sm font-medium text-gray-300">Outcome:</span>
                <span className="block mt-1 text-white">
                  {evaluationData!.evaluationSummary.domainSpecificOutcome.answer}
                </span>
                <p className="mt-1 text-xs text-gray-400">
                  {evaluationData!.evaluationSummary.domainSpecificOutcome.justification}
                </p>
              </div>
            )}
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

          {/* Primary action button integrated into summary card */}
          <div className="pt-4 border-t border-blue-500/30">
            <Button
              onClick={primaryAction.onClick}
              className={mode === 'historical' 
                ? "w-full bg-gray-600/50 text-gray-300 font-semibold py-3 rounded-lg cursor-default" 
                : (primaryAction.className || "w-full bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white font-semibold py-3 rounded-lg shadow-md transition-transform hover:scale-105")}
              disabled={mode === 'historical'}
            >
              {primaryAction.label}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CONVERSATION PROGRESS CHART */}
      {conversationScores && conversationScores.length > 0 && (
        <Card className="bg-gradient-to-br from-[#0A3A5A]/80 to-[#001F35]/90 border border-blue-600/30 shadow-xl">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-xl font-semibold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400">
              Your Conversation Performance Over Time
            </CardTitle>
            <p className="text-center text-sm text-gray-300 mt-2">
              Track how your effectiveness evolved throughout the conversation
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="mb-4">
              <ChartLineLinear 
                className="bg-transparent border-none shadow-none"
                data={conversationScores.map(score => ({
                  turn: score.turn,
                  score: score.score
                }))}
              />
            </div>
            
            {/* Chart Summary Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-500/30">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Average Score</p>
                <p className="text-lg font-semibold text-white">
                  {Math.round(conversationScores.reduce((sum, score) => sum + score.score, 0) / conversationScores.length)}/100
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Peak Performance</p>
                <p className="text-lg font-semibold text-white">
                  {Math.max(...conversationScores.map(s => s.score))}/100
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Total Turns</p>
                <p className="text-lg font-semibold text-white">
                  {conversationScores.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DETAILED EVALUATION */}
      <div className="space-y-4">
        {evaluationData?.detailedEvaluation.map((cat, i) => (
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
            <CardContent className="p-5 space-y-4">
              {cat.criteria.map((cr, j) => (
                <div key={j} className="border-l-2 border-sky-600 pl-4 py-2">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-semibold text-white">
                      {cr.criterionId}. {cr.criterionText}
                    </p>
                    <span className="text-sm text-blue-400 font-medium">
                      {cr.score}/5
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-300 prose prose-sm prose-invert max-w-none leading-relaxed">
                    <ReactMarkdown>{cr.commentsAndExamples}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Download buttons section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onDownloadTranscript}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-medium py-2.5 px-4 rounded-lg shadow-md transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            Download Transcript
          </Button>
          <Button
            onClick={onDownloadEvaluation}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-medium py-2.5 px-4 rounded-lg shadow-md transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
          >
            <GraduationCap size={18} />
            Download Evaluation
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
