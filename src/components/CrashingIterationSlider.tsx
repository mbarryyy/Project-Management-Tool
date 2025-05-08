import React from 'react';
import {
  Slider,
  Typography,
  Box,
  Paper,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useProjectCrashing } from '../hooks/ProjectCrashingContext';

interface CrashingIterationSliderProps {
  autoPlayEnabled?: boolean;
}

// Project Crashing迭代滑块组件 - 允许用户在不同迭代之间切换
const CrashingIterationSlider: React.FC<CrashingIterationSliderProps> = ({ autoPlayEnabled = false }) => {
  const { 
    isCrashed, 
    currentIteration, 
    setCurrentIteration, 
    totalIterations,
    costAnalysis
  } = useProjectCrashing();
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(false);

  // 如果项目未压缩，不显示滑块
  if (!isCrashed || totalIterations === 0) {
    return null;
  }

  // 处理滑块值变化
  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setCurrentIteration(newValue as number);
  };

  // 切换到上一个迭代
  const handlePrevious = () => {
    if (currentIteration > 0) {
      setCurrentIteration(currentIteration - 1);
    }
  };

  // 切换到下一个迭代
  const handleNext = () => {
    if (currentIteration < totalIterations) {
      setCurrentIteration(currentIteration + 1);
    }
  };

  // 重置到初始状态
  const handleReset = () => {
    setCurrentIteration(0);
    setIsAutoPlaying(false);
  };

  // 自动播放功能
  const handleAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      return;
    }

    setIsAutoPlaying(true);
    let current = currentIteration;

    const interval = setInterval(() => {
      if (current < totalIterations) {
        current += 1;
        setCurrentIteration(current);
      } else {
        clearInterval(interval);
        setIsAutoPlaying(false);
      }
    }, 1500); // 每1.5秒前进一步

    // 当组件卸载时清除计时器
    return () => clearInterval(interval);
  };

  // 获取当前迭代的状态文本
  const getStatusText = () => {
    const currentResult = costAnalysis[currentIteration];
    if (currentIteration === 0) {
      return "Initial state (before crashing)";
    } else if (currentResult.isOptimum) {
      return `Iteration ${currentIteration}: Optimum Point (Minimum Total Cost)`;
    } else if (currentResult.isCrashPoint) {
      return `Iteration ${currentIteration}: Crash Point (Cannot crash further)`;
    } else {
      return `Iteration ${currentIteration} of ${totalIterations}`;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Crashing Timeline
      </Typography>
      
      <Box sx={{ width: '100%', px: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Slider
              value={currentIteration}
              onChange={handleSliderChange}
              step={1}
              marks
              min={0}
              max={totalIterations}
              valueLabelDisplay="auto"
              aria-labelledby="iteration-slider"
            />
          </Grid>
          
          <Grid item container xs={12} alignItems="center">
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Reset to initial state">
                <IconButton onClick={handleReset} size="small">
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Previous iteration">
                <span>
                  <IconButton 
                    onClick={handlePrevious} 
                    size="small" 
                    disabled={currentIteration === 0}
                  >
                    <SkipPreviousIcon />
                  </IconButton>
                </span>
              </Tooltip>
              
              {autoPlayEnabled && (
                <Tooltip title={isAutoPlaying ? "Pause" : "Auto play"}>
                  <IconButton onClick={handleAutoPlay} size="small" color={isAutoPlaying ? "secondary" : "default"}>
                    <PlayArrowIcon />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Next iteration">
                <span>
                  <IconButton 
                    onClick={handleNext} 
                    size="small" 
                    disabled={currentIteration === totalIterations}
                  >
                    <SkipNextIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ 
                height: '40px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end'
              }}>
                <Typography variant="body2" noWrap>
                  {getStatusText()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default CrashingIterationSlider; 