import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  SelectChangeEvent
} from '@mui/material';
import { useProjectCrashing, CrashTask } from '../hooks/ProjectCrashingContext';
import { DependencyType } from '../models/Dependency';

interface CrashingTaskEditDialogProps {
  open: boolean;
  onClose: () => void;
  selectedTaskId: string;
}

const CrashingTaskEditDialog: React.FC<CrashingTaskEditDialogProps> = ({ 
  open, 
  onClose, 
  selectedTaskId 
}) => {
  const { 
    crashTasks, 
    updateCrashTask
  } = useProjectCrashing();

  // 当前编辑的任务
  const selectedTask = crashTasks.find(task => task.id === selectedTaskId);

  // 表单字段状态
  const [id, setId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [normalTime, setNormalTime] = useState<string>('');
  const [normalCost, setNormalCost] = useState<string>('');
  const [crashTime, setCrashTime] = useState<string>('');
  const [crashCost, setCrashCost] = useState<string>('');
  const [predecessors, setPredecessors] = useState<string[]>([]);
  const [availablePredecessors, setAvailablePredecessors] = useState<string[]>([]);
  const [originalId, setOriginalId] = useState<string>('');
  
  // 错误状态
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 当选中的任务变化时，更新表单字段
  useEffect(() => {
    if (selectedTask) {
      setId(selectedTask.id);
      setOriginalId(selectedTask.id);
      setDescription(selectedTask.description || '');
      setNormalTime(selectedTask.normalTime.toString());
      setNormalCost(selectedTask.normalCost.toString());
      setCrashTime(selectedTask.crashTime.toString());
      setCrashCost(selectedTask.crashCost.toString());
      setPredecessors(selectedTask.predecessors.map(pred => pred.taskId));
      
      // 更新可用的前置任务列表（不包括自己和可能导致循环依赖的任务）
      const possiblePredecessors = crashTasks
        .filter(task => task.id !== selectedTask.id)
        .map(task => task.id);
      setAvailablePredecessors(possiblePredecessors);
    }
  }, [selectedTask, crashTasks]);

  // 处理前置任务变化
  const handlePredecessorsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setPredecessors(typeof value === 'string' ? value.split(',') : value);
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // 验证ID
    if (!id.trim()) {
      newErrors.id = 'Task ID is required';
    } else if (id.trim() !== originalId && crashTasks.some(task => task.id === id.trim())) {
      newErrors.id = 'Task ID must be unique';
    }
    
    // 验证时间和成本字段
    if (!normalTime.trim() || isNaN(Number(normalTime)) || Number(normalTime) <= 0) {
      newErrors.normalTime = 'Normal time must be a positive number';
    }
    
    if (!normalCost.trim() || isNaN(Number(normalCost)) || Number(normalCost) < 0) {
      newErrors.normalCost = 'Normal cost must be a non-negative number';
    }
    
    if (!crashTime.trim() || isNaN(Number(crashTime)) || Number(crashTime) <= 0) {
      newErrors.crashTime = 'Crash time must be a positive number';
    } else if (Number(crashTime) > Number(normalTime)) {
      newErrors.crashTime = 'Crash time cannot be greater than normal time';
    }
    
    if (!crashCost.trim() || isNaN(Number(crashCost)) || Number(crashCost) < 0) {
      newErrors.crashCost = 'Crash cost must be a non-negative number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理保存
  const handleSave = () => {
    if (!validateForm() || !selectedTask) return;

    // 如果ID已更改，需要更新所有引用到此任务的前置关系
    const idChanged = id.trim() !== originalId;
    
    // 创建更新后的任务对象
    const updatedTask: CrashTask = {
      ...selectedTask,
      id: id.trim(),
      description: description.trim(),
      normalTime: Number(normalTime),
      normalCost: Number(normalCost),
      crashTime: Number(crashTime),
      crashCost: Number(crashCost),
      predecessors: predecessors.map(predId => ({
        taskId: predId,
        type: DependencyType.FS,
        lag: 0  // 添加必需的lag属性
      }))
    };
    
    // 更新任务
    updateCrashTask(updatedTask);
    onClose();
  };

  // 处理取消
  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Task</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Task ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            error={!!errors.id}
            helperText={errors.id || ''}
            fullWidth
            margin="dense"
          />
          
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="dense"
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Normal Time"
              type="number"
              value={normalTime}
              onChange={(e) => setNormalTime(e.target.value)}
              error={!!errors.normalTime}
              helperText={errors.normalTime || ''}
              fullWidth
              margin="dense"
            />
            
            <TextField
              label="Normal Cost"
              type="number"
              value={normalCost}
              onChange={(e) => setNormalCost(e.target.value)}
              error={!!errors.normalCost}
              helperText={errors.normalCost || ''}
              fullWidth
              margin="dense"
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Crash Time"
              type="number"
              value={crashTime}
              onChange={(e) => setCrashTime(e.target.value)}
              error={!!errors.crashTime}
              helperText={errors.crashTime || ''}
              fullWidth
              margin="dense"
            />
            
            <TextField
              label="Crash Cost"
              type="number"
              value={crashCost}
              onChange={(e) => setCrashCost(e.target.value)}
              error={!!errors.crashCost}
              helperText={errors.crashCost || ''}
              fullWidth
              margin="dense"
            />
          </Box>
          
          <FormControl fullWidth margin="dense">
            <InputLabel id="predecessors-label">Predecessors</InputLabel>
            <Select
              labelId="predecessors-label"
              multiple
              value={predecessors}
              onChange={handlePredecessorsChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {availablePredecessors.map((taskId) => (
                <MenuItem key={taskId} value={taskId}>
                  {taskId}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrashingTaskEditDialog; 