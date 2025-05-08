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
  Box,
  Tooltip,
  Chip,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlagIcon from '@mui/icons-material/Flag';
import { useProjectCrashing } from '../hooks/ProjectCrashingContext';

// Project Crashing成本分析组件 - 显示每次迭代的成本分析结果
const CrashingCostAnalysis: React.FC = () => {
  const { 
    costAnalysis, 
    isCrashed, 
    currentIteration,
    indirectCost,
    reductionPerUnit
  } = useProjectCrashing();

  if (!isCrashed) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Cost Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Click "Crashing Project" to perform project crashing analysis and view the cost analysis results.
        </Typography>
      </Paper>
    );
  }

  // 格式化金额为货币格式
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // 格式化活动列表
  const formatActivities = (activities: string[]): string => {
    return activities.length > 0 ? activities.join(', ') : '-';
  };

  // 格式化活动列表和相关成本 - 更明显地显示
  const formatActivitiesWithCost = (activities: string[], crashCost: number, index: number): React.ReactNode => {
    if (index === 0 || activities.length === 0) return '-';
    
    // 只显示活动列表，不显示组合成本
    return formatActivities(activities);
  };

  // 定义固定宽度的样式
  const columnWidths = {
    iteration: { width: '80px', minWidth: '80px' },
    duration: { width: '120px', minWidth: '120px' },
    activities: { width: '180px', minWidth: '180px' },
    crashCost: { width: '110px', minWidth: '110px' },
    directCost: { width: '110px', minWidth: '110px' },
    indirectCost: { width: '110px', minWidth: '110px' },
    totalCost: { width: '110px', minWidth: '110px' },
    status: { width: '120px', minWidth: '120px' }
  };

  // 表头单元格通用样式
  const headerCellStyle = {
    whiteSpace: 'nowrap',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Cost Analysis
        </Typography>
        <Tooltip 
          title={
            <React.Fragment>
              <Typography variant="body2" color="inherit">
                <strong>Optimum Point</strong> represents the iteration with the minimum total cost.
              </Typography>
              <Typography variant="body2" color="inherit">
                <strong>Crash Point</strong> represents the iteration where the project cannot be crashed further.
              </Typography>
              <Typography variant="body2" color="inherit">
                For each time unit shortened, direct cost increases based on crash cost, while indirect cost decreases by {formatCurrency(reductionPerUnit)}.
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
        <Typography variant="body2" gutterBottom>
          <strong>Total Indirect Cost:</strong> {formatCurrency(indirectCost)}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Cost Reduction:</strong> {formatCurrency(reductionPerUnit)} per time unit shortened
        </Typography>
      </Box>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ ...columnWidths.iteration, ...headerCellStyle }}>Iteration</TableCell>
              <TableCell align="center" sx={{ ...columnWidths.duration, ...headerCellStyle }}>Project Duration</TableCell>
              <TableCell align="center" sx={{ ...columnWidths.activities, ...headerCellStyle }}>Crashed Activities</TableCell>
              <TableCell align="center" sx={{ ...columnWidths.crashCost, ...headerCellStyle }}>Crash Cost</TableCell>
              <TableCell align="center" sx={{ ...columnWidths.directCost, ...headerCellStyle }}>Direct Cost</TableCell>
              <TableCell align="center" sx={{ ...columnWidths.indirectCost, ...headerCellStyle }}>Indirect Cost</TableCell>
              <TableCell align="center" sx={{ ...columnWidths.totalCost, ...headerCellStyle }}>Total Cost</TableCell>
              <TableCell align="center" sx={{ ...columnWidths.status, ...headerCellStyle }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {costAnalysis.slice(0, currentIteration + 1).map((result, index) => (
              <TableRow 
                key={index}
                sx={{ 
                  backgroundColor: index === currentIteration 
                    ? 'rgba(25, 118, 210, 0.08)' 
                    : result.isOptimum 
                      ? 'rgba(46, 125, 50, 0.08)'
                      : result.isCrashPoint
                        ? 'rgba(237, 108, 2, 0.08)'
                        : 'inherit'
                }}
              >
                <TableCell align="center" sx={columnWidths.iteration}>
                  {index === 0 ? 'Initial' : index}
                </TableCell>
                <TableCell align="center" sx={columnWidths.duration}>{result.projectDuration}</TableCell>
                <TableCell align="center" sx={{ ...columnWidths.activities, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatActivitiesWithCost(result.crashedActivities, result.crashCost, index)}
                </TableCell>
                <TableCell align="center" sx={columnWidths.crashCost}>{index === 0 ? '-' : formatCurrency(result.crashCost)}</TableCell>
                <TableCell align="center" sx={columnWidths.directCost}>{formatCurrency(result.directCost)}</TableCell>
                <TableCell align="center" sx={columnWidths.indirectCost}>{formatCurrency(result.indirectCost)}</TableCell>
                <TableCell align="center" sx={{ ...columnWidths.totalCost, fontWeight: 'bold' }}>
                  {formatCurrency(result.totalCost)}
                </TableCell>
                <TableCell align="center" sx={columnWidths.status}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    minHeight: '32px',
                    alignItems: 'center' 
                  }}>
                    {result.isOptimum && (
                      <Tooltip title="Optimum Point (Minimum Total Cost)">
                        <Chip 
                          icon={<CheckCircleIcon />} 
                          label="Optimum" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                          sx={{ width: '90px' }}
                        />
                      </Tooltip>
                    )}
                    {result.isCrashPoint && (
                      <Tooltip title="Crash Point (Cannot be further crashed)">
                        <Chip 
                          icon={<FlagIcon />} 
                          label="Crash Point" 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ width: '90px' }}
                        />
                      </Tooltip>
                    )}
                    {index === currentIteration && !result.isOptimum && !result.isCrashPoint && (
                      <Tooltip title="Current Iteration">
                        <Chip 
                          label="Current" 
                          size="small" 
                          color="primary"
                          variant="outlined"
                          sx={{ width: '90px' }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default CrashingCostAnalysis; 