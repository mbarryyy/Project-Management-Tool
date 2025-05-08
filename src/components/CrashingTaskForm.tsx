import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  SelectChangeEvent,
  Paper,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useProjectCrashing, CrashTask } from '../hooks/ProjectCrashingContext';
import { DependencyType } from '../models/Dependency';

// 任务表单组件 - 用于添加Project Crashing所需的任务
const CrashingTaskForm: React.FC = () => {
  const { crashTasks, addCrashTask, isCrashed } = useProjectCrashing();
  
  // 表单状态
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [normalTime, setNormalTime] = useState<number | ''>('');
  const [normalCost, setNormalCost] = useState<number | ''>('');
  const [crashTime, setCrashTime] = useState<number | ''>('');
  const [crashCost, setCrashCost] = useState<number | ''>('');
  const [predecessorIds, setPredecessorIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 通知状态
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // 重置表单
  const resetForm = () => {
    setId('');
    setDescription('');
    setNormalTime('');
    setNormalCost('');
    setCrashTime('');
    setCrashCost('');
    setPredecessorIds([]);
    setError(null);
  };

  // 验证表单
  const validateForm = (): boolean => {
    if (!id.trim()) {
      setError('Task ID is required');
      return false;
    }

    if (crashTasks.some(task => task.id === id.trim())) {
      setError('Task ID must be unique');
      return false;
    }

    if (normalTime === '') {
      setError('Normal Time is required');
      return false;
    } else if (normalTime < 0) {
      setError('Normal Time must be a positive number');
      return false;
    }

    if (normalCost === '') {
      setError('Normal Cost is required');
      return false;
    } else if (normalCost < 0) {
      setError('Normal Cost must be a positive number');
      return false;
    }

    if (crashTime === '') {
      setError('Crash Time is required');
      return false;
    } else if (crashTime < 0) {
      setError('Crash Time must be a positive number');
      return false;
    }

    if (crashCost === '') {
      setError('Crash Cost is required');
      return false;
    } else if (crashCost < 0) {
      setError('Crash Cost must be a positive number');
      return false;
    }

    if (Number(crashTime) > Number(normalTime)) {
      setError('Crash Time cannot be greater than Normal Time');
      return false;
    }

    // 检查循环依赖
    if (predecessorIds.includes(id)) {
      setError('A task cannot be its own predecessor');
      return false;
    }

    setError(null);
    return true;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const newTask: CrashTask = {
      id: id.trim(),
      description: description.trim(),
      duration: Number(normalTime), // Default duration is the normal time
      normalTime: Number(normalTime),
      normalCost: Number(normalCost),
      crashTime: Number(crashTime),
      crashCost: Number(crashCost),
      predecessors: predecessorIds.map(predId => ({
        taskId: predId,
        type: DependencyType.FS,
        lag: 0
      }))
    };

    addCrashTask(newTask);
    
    // 显示通知
    setNotificationMessage(`Task "${newTask.id}" added successfully`);
    setNotificationOpen(true);

    resetForm();
  };

  // 处理前置任务选择变化
  const handlePredecessorChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setPredecessorIds(typeof value === 'string' ? value.split(',') : value);
  };
  
  // 关闭通知
  const handleCloseNotification = () => {
    setNotificationOpen(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Add New Task
        </Typography>
        <Tooltip 
          title={
            <React.Fragment>
              <Typography variant="body2" color="inherit">
                - Normal Time must be greater than or equal to Crash Time. When they are equal, it means the task cannot be crashed.
              </Typography>
              <Typography variant="body2" color="inherit">
                - Crash Cost can be greater than, equal to, or less than Normal Cost, depending on the specific task.
              </Typography>
            </React.Fragment>
          }
          arrow
          placement="right"
          enterDelay={1000}
        >
          <IconButton size="small" color="info" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={3}>
            <TextField
              required
              label="Task ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              size="small"
              disabled={isCrashed}
              error={!!error && error.includes('ID')}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} sm={9}>
            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
              disabled={isCrashed}
              error={!!error && error.includes('Description')}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Tooltip title="Regular duration of the task" arrow placement="top" enterDelay={1000}>
              <TextField
                required
                label="Normal Time"
                type="number"
                value={normalTime}
                onChange={(e) => setNormalTime(e.target.value === '' ? '' : Number(e.target.value))}
                size="small"
                inputProps={{ min: 0 }}
                disabled={isCrashed}
                error={!!error && error.includes('Normal Time')}
                fullWidth
              />
            </Tooltip>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Tooltip title="Regular cost of the task" arrow placement="top" enterDelay={1000}>
              <TextField
                required
                label="Normal Cost"
                type="number"
                value={normalCost}
                onChange={(e) => setNormalCost(e.target.value === '' ? '' : Number(e.target.value))}
                size="small"
                inputProps={{ min: 0 }}
                disabled={isCrashed}
                error={!!error && error.includes('Normal Cost')}
                fullWidth
              />
            </Tooltip>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Tooltip title="Minimum possible duration" arrow placement="top" enterDelay={1000}>
              <TextField
                required
                label="Crash Time"
                type="number"
                value={crashTime}
                onChange={(e) => setCrashTime(e.target.value === '' ? '' : Number(e.target.value))}
                size="small"
                inputProps={{ min: 0 }}
                disabled={isCrashed}
                error={!!error && error.includes('Crash Time')}
                fullWidth
              />
            </Tooltip>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Tooltip title="Cost when fully crashed" arrow placement="top" enterDelay={1000}>
              <TextField
                required
                label="Crash Cost"
                type="number"
                value={crashCost}
                onChange={(e) => setCrashCost(e.target.value === '' ? '' : Number(e.target.value))}
                size="small"
                inputProps={{ min: 0 }}
                disabled={isCrashed}
                error={!!error && error.includes('Crash Cost')}
                fullWidth
              />
            </Tooltip>
          </Grid>

          <Grid item xs={12}>
            <FormControl size="small" fullWidth disabled={isCrashed}>
              <InputLabel id="predecessors-label">Predecessors</InputLabel>
              <Select
                labelId="predecessors-label"
                multiple
                value={predecessorIds}
                onChange={handlePredecessorChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {crashTasks.map((task) => (
                  <MenuItem key={task.id} value={task.id} disabled={task.id === id}>
                    {task.id}{task.description ? ` - ${task.description}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={isCrashed}
          sx={{ mt: 2 }}
        >
          Add Task
        </Button>
      </Box>
      
      {/* 成功添加任务的通知 */}
      <Snackbar
        open={notificationOpen}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleCloseNotification} severity="success">
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default CrashingTaskForm; 