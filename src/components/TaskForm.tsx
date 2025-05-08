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
  Snackbar,
  Alert
} from '@mui/material';
import { Task } from '../models/Task';
import { useProject } from '../hooks/ProjectContext';

// 任务表单组件 - 用于添加新任务和编辑现有任务
const TaskForm: React.FC = () => {
  const { tasks, addTask, isCalculated } = useProject();
  
  // 表单状态
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [predecessorIds, setPredecessorIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 通知状态
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // 重置表单
  const resetForm = () => {
    setId('');
    setDescription('');
    setDuration('');
    setPredecessorIds([]);
    setError(null);
  };

  // 验证表单
  const validateForm = (): boolean => {
    if (!id.trim()) {
      setError('Task ID is required');
      return false;
    }

    if (tasks.some(task => task.id === id.trim())) {
      setError('Task ID must be unique');
      return false;
    }

    if (duration === '' || duration < 0) {
      setError('Duration must be a positive number');
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

    const newTask = {
      id: id.trim(),
      description: description.trim(),
      duration: Number(duration),
      predecessorIds
    };

    addTask(newTask);
    
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
      <Typography variant="h6" component="h2" gutterBottom>
        Add New Task
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            required
            label="Task ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            size="small"
            disabled={isCalculated}
            error={!!error && error.includes('ID')}
            sx={{ width: '30%' }}
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            disabled={isCalculated}
            error={!!error && error.includes('Description')}
            sx={{ width: '70%' }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            required
            label="Duration (days)"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
            size="small"
            inputProps={{ min: 0 }}
            disabled={isCalculated}
            error={!!error && error.includes('Duration')}
            sx={{ width: '30%' }}
          />

          <FormControl size="small" sx={{ width: '70%' }} disabled={isCalculated}>
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
              {tasks.map((task) => (
                <MenuItem key={task.id} value={task.id} disabled={task.id === id}>
                  {task.id}{task.description ? ` - ${task.description}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={isCalculated}
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

export default TaskForm; 