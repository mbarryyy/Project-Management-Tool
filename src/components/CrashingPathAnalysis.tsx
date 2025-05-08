import React, { useMemo } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useProjectCrashing } from '../hooks/ProjectCrashingContext';

// Project Crashing路径分析组件 - 显示项目中的所有路径及其在各个迭代中的持续时间
const CrashingPathAnalysis: React.FC = () => {
  const { 
    crashPaths, 
    isCrashed, 
    currentIteration, 
    totalIterations, 
    projectDuration 
  } = useProjectCrashing();

  // 计算每个迭代中的最大持续时间 - 移到条件检查之前
  const maxDurationsByIteration = useMemo(() => {
    const result: number[] = [];
    
    // 对于每个迭代，找出所有路径中的最大持续时间
    for (let i = 0; i <= totalIterations; i++) {
      let maxDuration = 0;
      
      crashPaths.forEach(path => {
        if (path.durations[i] !== undefined && path.durations[i] > maxDuration) {
          maxDuration = path.durations[i];
        }
      });
      
      result[i] = maxDuration;
    }
    
    return result;
  }, [crashPaths, totalIterations]);

  if (!isCrashed) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Path Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Click "Crashing Project" to perform project crashing analysis and view all paths through the network.
        </Typography>
      </Paper>
    );
  }

  // 生成表头（显示所有可能的迭代）
  const iterationHeaders = [];
  for (let i = 0; i <= totalIterations; i++) {
    iterationHeaders.push(
      <TableCell key={`iteration-${i}`} align="right">
        I{i}
      </TableCell>
    );
  }

  // 将任务ID列表转换为路径文本
  const getPathText = (taskIds: string[]): string => {
    return taskIds.join(' → ');
  };

  // 判断某个路径在某个迭代是否是关键路径
  const isCriticalInIteration = (path: typeof crashPaths[0], iteration: number): boolean => {
    return path.durations[iteration] !== undefined && 
           path.durations[iteration] === maxDurationsByIteration[iteration] &&
           maxDurationsByIteration[iteration] > 0; // 防止所有路径持续时间都是0
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Path Analysis
        </Typography>
        <Tooltip 
          title={
            <React.Fragment>
              <Typography variant="body2" color="inherit">
                I0 represents the initial path durations before crashing, I1 is the first iteration, and so on.
                The paths with the longest duration at each iteration (highlighted in red) determine the project duration.
                Slide the iteration slider to see how paths change with each crash.
              </Typography>
            </React.Fragment>
          }
          arrow
          placement="right"
        >
          <IconButton size="small" color="info" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          Project Duration: {projectDuration} days
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentIteration > 0 
            ? `Iteration ${currentIteration} of ${totalIterations}` 
            : 'Initial state (before crashing)'}
        </Typography>
      </Box>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Path</TableCell>
              {iterationHeaders}
            </TableRow>
          </TableHead>
          <TableBody>
            {crashPaths.map((path, index) => (
              <TableRow key={index}>
                <TableCell>{getPathText(path.tasks)}</TableCell>
                {/* 显示所有迭代列，但只有当前迭代及之前的有实际数据 */}
                {Array.from({ length: totalIterations + 1 }, (_, i) => {
                  // 判断是否应该高亮显示（是关键路径且不超过当前迭代）
                  const shouldHighlight = i <= currentIteration && isCriticalInIteration(path, i);
                  
                  return (
                    <TableCell 
                      key={`duration-${i}`} 
                      align="right"
                      sx={{ 
                        color: shouldHighlight ? 'error.main' : 'inherit',
                        fontWeight: shouldHighlight ? 'bold' : 'normal'
                      }}
                    >
                      {i <= currentIteration && path.durations[i] !== undefined ? path.durations[i] : '-'}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default CrashingPathAnalysis; 