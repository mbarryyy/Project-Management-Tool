import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Box,
  Tooltip,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoIcon from '@mui/icons-material/Info';
import { useProjectCrashing } from '../hooks/ProjectCrashingContext';
import { CrashTask } from '../hooks/ProjectCrashingContext';
import CrashingTaskEditDialog from './CrashingTaskEditDialog';

// Project Crashing 任务表格组件 - 显示任务列表及相关信息
const CrashingTaskTable: React.FC = () => {
  const { crashTasks, deleteCrashTask, isCrashed } = useProjectCrashing();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // 格式化浮点数，整数直接返回，浮点数保留2位小数
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return '-';
    if (num === Number.MAX_SAFE_INTEGER) return 'N/A';
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  // 处理删除任务
  const handleDelete = (taskId: string) => {
    if (!isCrashed && window.confirm(`Are you sure you want to delete task ${taskId}?`)) {
      deleteCrashTask(taskId);
    }
  };

  // 处理编辑任务
  const handleEdit = (taskId: string) => {
    setSelectedTaskId(taskId);
    setEditDialogOpen(true);
  };

  // 关闭编辑对话框
  const handleCloseDialog = () => {
    setEditDialogOpen(false);
  };

  // 定义固定宽度的样式
  const columnWidths = {
    id: { width: '80px', minWidth: '80px' },
    predecessors: { width: '120px', minWidth: '120px' },
    slope: { width: '100px', minWidth: '100px' },
    maxCrashTime: { width: '140px', minWidth: '140px' },
    normalTime: { width: '130px', minWidth: '130px' },
    normalCost: { width: '130px', minWidth: '130px' },
    crashTime: { width: '130px', minWidth: '130px' },
    crashCost: { width: '130px', minWidth: '130px' },
    actions: { width: '100px', minWidth: '100px' }
  };

  // 如果没有任务，显示提示信息
  if (crashTasks.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Task List
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No tasks added yet. Use the form above to add new tasks.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Task List
        </Typography>
        <Tooltip 
          title="N/A in the Slope column indicates that the task cannot be crashed (Normal Time = Crash Time, making Max Crash Time = 0)."
          arrow
          placement="right"
        >
          <IconButton size="small" color="info" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={columnWidths.id}>ID</TableCell>
              <TableCell align="center" sx={columnWidths.predecessors}>Predecessors</TableCell>
              <TableCell align="center" sx={columnWidths.slope}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                  Slope
                  <Tooltip title="Cost per unit time reduction. N/A means the task cannot be crashed.">
                    <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5 }} />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="center" sx={columnWidths.maxCrashTime}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                  Max Crash Time
                  <Tooltip title="Maximum possible reduction in time (Normal Time - Crash Time)">
                    <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5 }} />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="center" sx={columnWidths.normalTime}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                  Normal Time
                  <Tooltip title="Regular duration of the task">
                    <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5 }} />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="center" sx={columnWidths.normalCost}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                  Normal Cost
                  <Tooltip title="Regular cost of the task">
                    <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5 }} />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="center" sx={columnWidths.crashTime}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                  Crash Time
                  <Tooltip title="Minimum possible duration of the task">
                    <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5 }} />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="center" sx={columnWidths.crashCost}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                  Crash Cost
                  <Tooltip title="Cost when the task is fully crashed">
                    <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5 }} />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="center" sx={columnWidths.actions}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {crashTasks.map((task) => (
              <TableRow 
                key={task.id}
                sx={{ 
                  backgroundColor: task.isCritical ? 'rgba(255, 0, 0, 0.1)' : 'inherit'
                }}
              >
                <TableCell align="center" sx={columnWidths.id}>{task.id}</TableCell>
                <TableCell align="center" sx={columnWidths.predecessors}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    {task.predecessors.map((pred) => (
                      <Chip 
                        key={pred.taskId} 
                        label={pred.taskId} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell align="center" sx={columnWidths.slope}>{formatNumber(task.slope)}</TableCell>
                <TableCell align="center" sx={columnWidths.maxCrashTime}>{formatNumber(task.maxCrashTime)}</TableCell>
                <TableCell align="center" sx={columnWidths.normalTime}>{task.normalTime}</TableCell>
                <TableCell align="center" sx={columnWidths.normalCost}>{task.normalCost}</TableCell>
                <TableCell align="center" sx={columnWidths.crashTime}>{task.crashTime}</TableCell>
                <TableCell align="center" sx={columnWidths.crashCost}>{task.crashCost}</TableCell>
                <TableCell align="center" sx={columnWidths.actions}>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEdit(task.id)}
                      disabled={isCrashed}
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDelete(task.id)}
                      disabled={isCrashed}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <CrashingTaskEditDialog 
        open={editDialogOpen} 
        onClose={handleCloseDialog}
        selectedTaskId={selectedTaskId}
      />
    </Paper>
  );
};

export default CrashingTaskTable; 