import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Target, User, Star, FileText, Trash2 } from 'lucide-react';
import { 
  StoredSession, 
  getStoredSessions, 
  formatSessionTimestamp, 
  getSessionSummary,
  deleteSession 
} from '@/lib/sessionStorage';
import { toast } from 'sonner';

interface SessionHistoryProps {
  onSelectSession: (sessionId: string) => void;
  onBackToScenarioSelection: () => void;
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
};

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  onSelectSession,
  onBackToScenarioSelection
}) => {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    setIsLoading(true);
    try {
      const storedSessions = getStoredSessions();
      setSessions(storedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load session history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the card click
    
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        deleteSession(sessionId);
        setSessions(sessions.filter(session => session.id !== sessionId));
        toast.success('Session deleted successfully');
      } catch (error) {
        console.error('Error deleting session:', error);
        toast.error('Failed to delete session');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-6">
        <p className="text-lg text-gray-400 animate-pulse">Loading session history...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          onClick={onBackToScenarioSelection}
          className="flex items-center gap-2 bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/20 hover:border-white/40 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back</span>
        </Button>
        
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">Session History</h2>
          <p className="text-sm text-gray-400">
            {sessions.length === 0 ? 'No sessions found' : `${sessions.length} session${sessions.length === 1 ? '' : 's'}`}
          </p>
        </div>
        
        <div className="w-20"></div> {/* Spacer for center alignment */}
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card className="bg-gradient-to-r from-[#002B49]/60 to-[#001425]/70 border border-white/10">
          <CardContent className="p-6 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Sessions Yet</h3>
            <p className="text-base text-gray-400 mb-4">
              Complete your first training session to see it appear here.
            </p>
            <Button
              onClick={onBackToScenarioSelection}
              className="bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-[#FFB800]/50 hover:border-[#FFB800]/80 text-white font-medium py-2 px-4 rounded-lg transition-all hover:scale-105"
            >
              Start Your First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card 
                  className="bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-lg"
                  onClick={() => onSelectSession(session.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-6">
                        <h3 className="text-lg font-medium text-white mb-2">
                          {session.scenario.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{formatSessionTimestamp(session.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{formatDuration(session.callDuration)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            <span>{session.persona.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {session.evaluationData.evaluationSummary.domainSpecificOutcome && (
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              session.evaluationData.evaluationSummary.domainSpecificOutcome.answer === 'Yes'
                                ? 'bg-green-500/20 text-green-400'
                                : session.evaluationData.evaluationSummary.domainSpecificOutcome.answer === 'Partially'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {session.evaluationData.evaluationSummary.domainSpecificOutcome.answer}
                            </span>
                          )}
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-400 capitalize">{session.difficulty} difficulty</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Score Display */}
                        <div className="text-right">
                          {(() => {
                            const scorePercent = Math.round((session.evaluationData.evaluationSummary.totalScore / session.evaluationData.evaluationSummary.maxPossibleScore) * 100);
                            const scoreColor = 
                              scorePercent <= 30 ? 'text-red-400' : 
                              scorePercent <= 50 ? 'text-yellow-400' : 
                              'text-green-400';
                            
                            return (
                              <div className="flex items-center justify-end gap-1">
                                <Star size={16} className={scoreColor} />
                                <span className={`font-semibold text-lg ${scoreColor}`}>
                                  {scorePercent}%
                                </span>
                              </div>
                            );
                          })()} 
                        </div>
                        
                        {/* Delete Button */}
                        <Button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 hover:border-red-500/60 rounded transition-all duration-200"
                          aria-label="Delete session"
                        >
                          <Trash2 size={16} className="text-red-400 hover:text-red-300" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};