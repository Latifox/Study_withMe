
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSegmentProgress = (nodeId: string | undefined, numericLectureId: number | null, sequenceNumber: number | null) => {
  const [segmentScores, setSegmentScores] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (nodeId) {
      setSegmentScores(prev => ({
        ...prev,
        [nodeId]: 0
      }));
    }
  }, [nodeId]);

  useEffect(() => {
    const fetchExistingProgress = async () => {
      if (!sequenceNumber || !numericLectureId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progress } = await supabase
        .from('user_progress')
        .select('score, completed_at')
        .eq('segment_number', sequenceNumber)
        .eq('lecture_id', numericLectureId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (progress?.completed_at) {
        setSegmentScores(prev => ({
          ...prev,
          [nodeId || '']: progress.score || 0
        }));
      }
    };

    fetchExistingProgress();
  }, [nodeId, numericLectureId, sequenceNumber]);

  return { segmentScores, setSegmentScores };
};
