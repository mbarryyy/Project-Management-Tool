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
  FormControlLabel,
  Switch,
  Typography,
  SelectChangeEvent
} from '@mui/material';
import { Task } from '../models/Task';
import { useProject } from '../hooks/ProjectContext';
import { DependencyType } from '../models/Dependency';

interface TaskEditDialogProps {
  open: boolean;
  onClose: () => void;
}

const TaskEditDialog: React.FC<TaskEditDialogProps> = ({ open, onClose }) => {
  const { 
    tasks, 
    selectedTaskId, 
    updateTask, 
    insertTaskBefore, 
    renumberTasks,
    updateTasks,
    updateTaskWithNewId
  } = useProject();

  // 当前编辑的任务
  const selectedTask = tasks.find(task => task.id === selectedTaskId);

  // 表单状态
  const [id, setId] = useState('');
  const [originalId, setOriginalId] = useState(''); // 保存原始ID用于任务更新
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [predecessorIds, setPredecessorIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInsertingTask, setIsInsertingTask] = useState(false);
  const [newTaskId, setNewTaskId] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [renumberSubsequent, setRenumberSubsequent] = useState(true);

  // 当选中的任务变化时更新表单
  useEffect(() => {
    if (selectedTask) {
      setId(selectedTask.id);
      setOriginalId(selectedTask.id); // 保存原始ID
      setDescription(selectedTask.description || '');
      setDuration(selectedTask.duration);
      setPredecessorIds(selectedTask.predecessors.map(p => p.taskId));
      setError(null);
      setIsInsertingTask(false);
      setNewTaskId('');
      setNewTaskDescription('');
    }
  }, [selectedTask]);

  // 验证表单
  const validateForm = (): boolean => {
    // 基本验证
    if (!id.trim()) {
      setError('Task ID is required');
      return false;
    }

    if (id !== originalId && tasks.some(task => task.id === id.trim())) {
      setError('Task ID must be unique');
      return false;
    }

    if (duration === '' || duration < 0) {
      setError('Duration must be a positive number');
      return false;
    }

    // 验证前置任务不包含自己
    if (predecessorIds.includes(id)) {
      setError('A task cannot be its own predecessor');
      return false;
    }

    // 插入任务相关验证
    if (isInsertingTask) {
      if (!newTaskId.trim()) {
        setError('New task ID is required');
        return false;
      }

      // 只有在不自动重编号时才验证新任务ID的唯一性
      if (!renumberSubsequent && tasks.some(task => task.id === newTaskId.trim())) {
        setError('New task ID must be unique');
        return false;
      }
    }

    setError(null);
    return true;
  };

  // 处理保存
  const handleSave = () => {
    if (!validateForm() || !selectedTask) return;

    // 如果ID已更改，需要更新所有引用到此任务的前置关系
    const idChanged = id.trim() !== originalId;
    
    if (idChanged) {
      // 创建修改后的任务
      const updatedTask = {
        ...selectedTask,
        id: id.trim(),
        description: description.trim(),
        duration: Number(duration),
        predecessors: predecessorIds.map(predId => ({
          taskId: predId,
          type: selectedTask.predecessors.find(p => p.taskId === predId)?.type || DependencyType.FS,
          lag: selectedTask.predecessors.find(p => p.taskId === predId)?.lag || 0
        }))
      };
      
      // 使用专门的函数处理ID变更情况
      updateTaskWithNewId(originalId, updatedTask);
    } else {
      // ID没有更改，正常更新任务
      updateTask({
        ...selectedTask,
        id: id.trim(),
        description: description.trim(),
        duration: Number(duration),
        predecessors: predecessorIds.map(predId => ({
          taskId: predId,
          type: selectedTask.predecessors.find(p => p.taskId === predId)?.type || DependencyType.FS,
          lag: selectedTask.predecessors.find(p => p.taskId === predId)?.lag || 0
        }))
      });
    }
    
    onClose();
  };

  // 处理插入新任务
  const handleInsertTask = () => {
    if (!validateForm() || !selectedTask) return;

    // 插入新任务，传递 autoRenumber 参数
    insertTaskBefore(selectedTask.id, {
      id: newTaskId.trim(),
      description: newTaskDescription.trim(),
      duration: 1,
      predecessorIds: selectedTask.predecessors.map(p => p.taskId),
      autoRenumber: renumberSubsequent // 新增，指示是否自动重编号
    });

    // 不再需要单独调用 renumberTasks，因为 insertTaskBefore 现在会处理
    // 删除以前的重编号代码

    onClose();
  };

  // 处理前置任务选择变化
  const handlePredecessorChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setPredecessorIds(typeof value === 'string' ? value.split(',') : value);
  };

  // 若无选中任务，不显示对话框
  if (!selectedTask) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isInsertingTask ? 'Insert New Task' : 'Edit Task'}
      </DialogTitle>
      
      <DialogContent>
        {!isInsertingTask ? (
          // 编辑现有任务表单
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 2 }}>
              <TextField
                required
                label="Task ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                fullWidth
                error={!!error && error.includes('ID')}
              />

              <TextField
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                required
                label="Duration (days)"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 0 }}
                fullWidth
                error={!!error && error.includes('Duration')}
              />

              <FormControl fullWidth>
                <InputLabel id="edit-predecessors-label">Predecessors</InputLabel>
                <Select
                  labelId="edit-predecessors-label"
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
                  {tasks
                    .filter(task => task.id !== selectedTaskId)
                    .map((task) => (
                      <MenuItem key={task.id} value={task.id}>
                        {task.id}{task.description ? ` - ${task.description}` : ''}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={isInsertingTask}
                    onChange={(e) => setIsInsertingTask(e.target.checked)}
                  />
                }
                label="Insert new task before this task"
              />
            </Box>
          </>
        ) : (
          // 插入新任务表单
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
              You are inserting a new task before task {selectedTaskId}.
              The new task will become a predecessor of task {selectedTaskId},
              and will inherit all predecessors of task {selectedTaskId}.
            </Typography>
            
            <TextField
              required
              label="New Task ID"
              value={newTaskId}
              onChange={(e) => setNewTaskId(e.target.value)}
              fullWidth
              error={!!error && error.includes('New task ID')}
              sx={{ mb: 2 }}
            />

            <TextField
              label="Description (optional)"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch 
                  checked={renumberSubsequent}
                  onChange={(e) => setRenumberSubsequent(e.target.checked)}
                />
              }
              label="Auto-renumber subsequent tasks"
            />
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="text" 
                color="primary" 
                onClick={() => setIsInsertingTask(false)}
              >
                Back to Edit Mode
              </Button>
            </Box>
          </>
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {isInsertingTask ? (
          <Button 
            onClick={handleInsertTask} 
            variant="contained" 
            color="primary"
            disabled={!newTaskId.trim()}
          >
            Insert Task
          </Button>
        ) : (
          <Button 
            onClick={handleSave} 
            variant="contained" 
            color="primary"
          >
            Save Changes
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TaskEditDialog; 