import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box
} from '@mui/material';
import { useProject } from '../hooks/ProjectContext';

// 路径分析组件 - 显示所有可能路径，标识关键路径
const PathAnalysis: React.FC = () => {
  const { paths, criticalPaths, projectDuration, isCalculated, tasks } = useProject();

  // 将任务ID列表转换为描述性文本
  const getPathText = (taskIds: string[]) => {
    return taskIds.map(id => {
      const task = tasks.find(t => t.id === id);
      return task ? `${id} (${task.duration})` : id;
    }).join(' → ');
  };

  if (!isCalculated) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Path Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Click "Generate Network Diagram" to calculate and analyze all possible paths through the project network.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Path Analysis
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          Project Duration: {projectDuration} days
        </Typography>
      </Box>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Path</TableCell>
              <TableCell>Tasks</TableCell>
              <TableCell align="right">Duration (days)</TableCell>
              <TableCell>Critical</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paths.map((path, index) => (
              <TableRow 
                key={index}
                sx={{ 
                  backgroundColor: path.isCritical ? 'rgba(255, 0, 0, 0.1)' : 'inherit'
                }}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>{getPathText(path.tasks)}</TableCell>
                <TableCell align="right">{path.duration}</TableCell>
                <TableCell>
                  {path.isCritical && <Chip size="small" label="Yes" color="error" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {criticalPaths.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Critical Path{criticalPaths.length > 1 ? 's' : ''}:
          </Typography>
          {criticalPaths.map((path, index) => (
            <Typography key={index} sx={{ mb: 1, fontWeight: 'bold', color: '#d32f2f' }}>
              {getPathText(path.tasks)} = {path.duration} days
            </Typography>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default PathAnalysis; 