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
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useProject } from '../hooks/ProjectContext';
import { Task } from '../models/Task';
import TaskEditDialog from './TaskEditDialog';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

// 可排序的表格行组件
interface SortableTableRowProps {
  id: string;
  task: Task;
  isCalculated: boolean;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const SortableTableRow: React.FC<SortableTableRowProps> = ({ id, task, isCalculated, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging 
      ? '#f5f5f5' 
      : task.isCritical 
        ? 'rgba(255, 0, 0, 0.1)' 
        : 'inherit',
    cursor: isCalculated ? 'default' : 'grab',
    userSelect: 'none' as const,
  };

  return (
    <TableRow 
      ref={setNodeRef}
      style={style}
    >
      <TableCell component="th" scope="row">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {task.id}
        </Box>
      </TableCell>
      <TableCell>{task.description || '-'}</TableCell>
      <TableCell align="right">{task.duration}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
      {isCalculated && (
        <>
          <TableCell align="right">{task.earlyStart}</TableCell>
          <TableCell align="right">{task.earlyFinish}</TableCell>
          <TableCell align="right">{task.lateStart}</TableCell>
          <TableCell align="right">{task.lateFinish}</TableCell>
          <TableCell align="right">{task.slack}</TableCell>
          <TableCell>
            {task.isCritical && <Chip size="small" label="Yes" color="error" />}
          </TableCell>
        </>
      )}
      <TableCell align="center">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconButton 
            size="small" 
            onClick={() => onEdit(task.id)}
            disabled={isCalculated}
            color="primary"
            sx={{ mr: 1 }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => onDelete(task.id)}
            disabled={isCalculated}
            color="error"
            sx={{ mr: !isCalculated ? 1 : 0 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
          {!isCalculated && (
            <Box
              {...attributes}
              {...listeners}
              sx={{ 
                cursor: 'grab', 
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' }
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
};

// 任务表格组件 - 显示已添加的任务及其计算结果
const TaskTable: React.FC = () => {
  const { tasks, deleteTask, isCalculated, setSelectedTaskId, reorderTasks } = useProject();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = (taskId: string) => {
    if (!isCalculated && window.confirm(`Are you sure you want to delete task ${taskId}?`)) {
      deleteTask(taskId);
    }
  };

  const handleEdit = (taskId: string) => {
    if (!isCalculated) {
      setSelectedTaskId(taskId);
      setEditDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedTaskId(null);
  };
  
  // 处理拖拽结束事件
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(task => task.id === active.id);
      const newIndex = tasks.findIndex(task => task.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTasks(oldIndex, newIndex);
      }
    }
  };

  if (tasks.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Task List
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No tasks added yet. Use the form above to add tasks to your project.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Task List
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Duration</TableCell>
                <TableCell>Predecessors</TableCell>
                {isCalculated && (
                  <>
                    <TableCell align="right">ES</TableCell>
                    <TableCell align="right">EF</TableCell>
                    <TableCell align="right">LS</TableCell>
                    <TableCell align="right">LF</TableCell>
                    <TableCell align="right">Slack</TableCell>
                    <TableCell>Critical</TableCell>
                  </>
                )}
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            {!isCalculated ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext
                  items={tasks.map(task => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody>
                    {tasks.map((task) => (
                      <SortableTableRow
                        key={task.id}
                        id={task.id}
                        task={task}
                        isCalculated={isCalculated}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </TableBody>
                </SortableContext>
              </DndContext>
            ) : (
              <TableBody>
                {tasks.map((task) => (
                  <TableRow 
                    key={task.id}
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      backgroundColor: task.isCritical ? 'rgba(255, 0, 0, 0.1)' : 'inherit'
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {task.id}
                    </TableCell>
                    <TableCell>{task.description || '-'}</TableCell>
                    <TableCell align="right">{task.duration}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
                    <TableCell align="right">{task.earlyStart}</TableCell>
                    <TableCell align="right">{task.earlyFinish}</TableCell>
                    <TableCell align="right">{task.lateStart}</TableCell>
                    <TableCell align="right">{task.lateFinish}</TableCell>
                    <TableCell align="right">{task.slack}</TableCell>
                    <TableCell>
                      {task.isCritical && <Chip size="small" label="Yes" color="error" />}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEdit(task.id)}
                          disabled={true}
                          color="primary"
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDelete(task.id)}
                          disabled={true}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      </Paper>

      <TaskEditDialog 
        open={editDialogOpen} 
        onClose={handleCloseDialog}
      />
    </>
  );
};

export default TaskTable; 