import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  ReactFlowProvider,
  Panel,
  Handle,
  NodeChange,
  NodePositionChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Paper, Typography, Divider, Button } from '@mui/material';
import { useProjectCrashing, CrashTask, NodePosition } from '../hooks/ProjectCrashingContext';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

// 自定义节点样式
const customNodeStyles = {
  default: {
    background: '#ffffff',
    color: '#333',
    border: '1px solid #ccc'
  },
  critical: {
    background: '#ffe6e6',
    color: '#d32f2f',
    border: '1px solid #d32f2f'
  },
  highlight: {
    color: '#1976d2',
    fontWeight: 'bold'
  }
};

// 自定义节点组件 - 显示任务节点
const CustomTaskNode = ({ data }: { data: any }) => {
  return (
    <Box
      sx={{
        padding: '10px',
        borderRadius: '4px',
        width: '220px',
        backgroundColor: data.isCritical ? customNodeStyles.critical.background : customNodeStyles.default.background,
        color: data.isCritical ? customNodeStyles.critical.color : customNodeStyles.default.color,
        border: data.isCritical ? customNodeStyles.critical.border : customNodeStyles.default.border,
        fontWeight: data.isCritical ? 'bold' : 'normal',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <Typography variant="subtitle2" gutterBottom>
        {data.label}
      </Typography>
      <Divider sx={{ my: 0.5 }} />
      <Box sx={{ 
        backgroundColor: data.highlighted ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
        p: 0.5,
        borderRadius: 1,
        mb: 0.5
      }}>
        <Typography variant="caption" display="block" sx={{ 
          fontWeight: 'bold', 
          color: data.highlighted ? customNodeStyles.highlight.color : 'inherit' 
        }}>
          Duration: {data.duration} days 
          {data.originalDuration !== undefined && data.originalDuration !== data.duration && 
            ` (original: ${data.originalDuration})`}
        </Typography>
      </Box>
      <Typography variant="caption" display="block">
        ES: {data.earlyStart !== undefined ? data.earlyStart : '-'} | 
        EF: {data.earlyFinish !== undefined ? data.earlyFinish : '-'}
      </Typography>
      <Typography variant="caption" display="block">
        LS: {data.lateStart !== undefined ? data.lateStart : '-'} | 
        LF: {data.lateFinish !== undefined ? data.lateFinish : '-'}
      </Typography>
      <Typography variant="caption" display="block">
        Slack: {data.slack !== undefined ? data.slack : '-'}
      </Typography>
      <Typography variant="caption" display="block">
        Crash Info: {data.maxCrashTime > 0 ? `${data.maxCrashTime} units left` : 'Max crashed'}
      </Typography>
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </Box>
  );
};

// 节点类型映射
const nodeTypes = {
  taskNode: CustomTaskNode
};

// 网络图组件
const DiagramCanvas = () => {
  const { 
    crashTasks, 
    crashedTasksHistory, 
    isCrashed, 
    currentIteration,
    costAnalysis,
    nodePositions,
    setNodePositions,
    resetNodePositions
  } = useProjectCrashing();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const diagramContainerRef = useRef<HTMLDivElement>(null);

  // Toggle full screen mode using the Fullscreen API
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      if (diagramContainerRef.current?.requestFullscreen) {
        diagramContainerRef.current.requestFullscreen()
          .then(() => setIsFullScreen(true))
          .catch(err => console.error("Error attempting to enable fullscreen:", err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullScreen(false))
          .catch(err => console.error("Error attempting to exit fullscreen:", err));
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Consolidated logic for getting tasks based on current state
  const getCurrentTasks = useCallback((): CrashTask[] => {
    if (!isCrashed) {
      // NOT CRASHED: Display tasks from context, ensuring duration is normalTime.
      // This state is for when tasks are being added/edited BEFORE performCrashing.
      return crashTasks.map(task => ({
        ...task,
        duration: task.normalTime, 
      }));
    } else {
      // CRASHED: Use history. Iteration 0 should have duration = normalTime.
      if (crashedTasksHistory.length > 0) {
        const iterationIndex = Math.min(currentIteration, crashedTasksHistory.length - 1);
        return crashedTasksHistory[iterationIndex];
      } else {
        // Fallback if history is unexpectedly empty after crashing.
        return crashTasks.map(task => ({ ...task, duration: task.normalTime }));
      }
    }
  }, [isCrashed, crashTasks, crashedTasksHistory, currentIteration]);

  const getCrashedActivities = useCallback(() => {
    if (!isCrashed || currentIteration === 0 || !costAnalysis[currentIteration]) {
      return [];
    }
    
    // 收集从第1次迭代到当前迭代的所有被crash的任务
    const allCrashedActivities: string[] = [];
    for (let i = 1; i <= currentIteration; i++) {
      if (costAnalysis[i] && costAnalysis[i].crashedActivities) {
        costAnalysis[i].crashedActivities.forEach(activity => {
          if (!allCrashedActivities.includes(activity)) {
            allCrashedActivities.push(activity);
          }
        });
      }
    }
    
    return allCrashedActivities;
  }, [isCrashed, currentIteration, costAnalysis]);

  // Reset node positions to original layout
  const handleResetPositions = () => {
    resetNodePositions();
    // Force re-render with recalculated positions
    const { nodes: newNodes, edges: newEdges } = createFlowElements();
    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Handle when nodes change positions
  const handleNodesChange = (changes: NodeChange[]) => {
    onNodesChange(changes);
    
    // Save position changes
    const positionChanges = changes.filter((change): change is NodePositionChange => 
      change.type === 'position' && !change.dragging
    );
    
    if (positionChanges.length > 0) {
      positionChanges.forEach(change => {
        const nodeId = change.id;
        const updatedNode = nodes.find(n => n.id === nodeId);
        if (updatedNode) {
          setNodePositions((prevPositions: NodePosition[]) => {
            // Remove old position if exists
            const filteredPositions = prevPositions.filter(pos => pos.id !== nodeId);
            // Add new position
            return [...filteredPositions, {
              id: nodeId,
              x: updatedNode.position.x,
              y: updatedNode.position.y
            }];
          });
        }
      });
    }
  };

  const calculatePositions = useCallback((tasks: CrashTask[]) => {
    // First check if we have stored positions
    if (nodePositions.length > 0) {
      const positionMap: { [key: string]: { x: number, y: number } } = {};
      nodePositions.forEach(pos => {
        positionMap[pos.id] = { x: pos.x, y: pos.y };
      });
      
      // Check if we need to calculate positions for any new tasks
      const existingIds = nodePositions.map(pos => pos.id);
      const allTaskIds = tasks.map(task => task.id);
      const needsCalculation = allTaskIds.some(id => !existingIds.includes(id));
      
      if (!needsCalculation) {
        // All tasks have stored positions
        return positionMap;
      } else {
        // Calculate positions only for new tasks
        const calculatedPositions = calculateDefaultPositions(tasks);
        // Merge with existing positions
        return { ...calculatedPositions, ...positionMap };
      }
    } else {
      // No stored positions, calculate all
      return calculateDefaultPositions(tasks);
    }
  }, [nodePositions]);

  // Original position calculation logic moved to a separate function
  const calculateDefaultPositions = (tasks: CrashTask[]) => {
    const taskLevels: { [key: string]: number } = {};
    const maxLevel = { value: 0 }; 
    const calculateLevel = (taskId: string, level: number, visited: Set<string>) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      taskLevels[taskId] = Math.max(taskLevels[taskId] || 0, level);
      maxLevel.value = Math.max(maxLevel.value, level);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const successors = tasks.filter(t => t.predecessors.some(p => p.taskId === taskId));
        successors.forEach(s => calculateLevel(s.id, level + 1, visited));
      }
    };
    const startTasks = tasks.filter(task => task.predecessors.length === 0);
    startTasks.forEach(task => calculateLevel(task.id, 0, new Set<string>()));
    const levelCounts: { [key: number]: number } = {};
    for (const taskId in taskLevels) {
      const level = taskLevels[taskId];
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }
    const sortedTasks = [...tasks].sort((a, b) => {
      const levelA = taskLevels[a.id] || 0;
      const levelB = taskLevels[b.id] || 0;
      if (levelA !== levelB) return levelA - levelB;
      return a.id.localeCompare(b.id);
    });
    const levelPositions: { [key: number]: number } = {};
    const taskPositions: { [key: string]: { x: number, y: number } } = {};
    for (const task of sortedTasks) {
      const level = taskLevels[task.id] || 0;
      const position = levelPositions[level] || 0;
      const x = level * 300 + 100; 
      const y = position * 150 + 50;
      taskPositions[task.id] = { x, y };
      levelPositions[level] = position + 1;
    }
    return taskPositions;
  };

  // Create nodes and edges
  const createFlowElements = useCallback(() => {
    const tasksToDisplay = getCurrentTasks();

    if (!tasksToDisplay || tasksToDisplay.length === 0) {
      return { nodes: [], edges: [] };
    }

    const positions = calculatePositions(tasksToDisplay);
    const currentCrashedActivities = getCrashedActivities();

    const newNodes: Node[] = tasksToDisplay.map(task => {
      let nodeOriginalDuration;
      // 仅当项目已压缩、不是初始迭代且持续时间已改变时才显示原始持续时间
      if (isCrashed && currentIteration > 0 && crashedTasksHistory.length > 0 && crashedTasksHistory[0]) {
        const initialTaskState = crashedTasksHistory[0].find(t => t.id === task.id);
        if (initialTaskState && initialTaskState.duration !== task.duration) {
          nodeOriginalDuration = initialTaskState.duration; 
        }
      }

      return {
        id: task.id,
        type: 'taskNode',
        position: positions[task.id] || { x: 0, y: 0 },
        data: {
          label: `${task.id}${task.description ? ': ' + task.description : ''}`,
          duration: task.duration,
          originalDuration: nodeOriginalDuration,
          normalTime: task.normalTime,
          normalCost: task.normalCost,
          crashTime: task.crashTime,
          crashCost: task.crashCost,
          maxCrashTime: task.maxCrashTime,
          slope: task.slope,
          earlyStart: task.earlyStart,
          earlyFinish: task.earlyFinish,
          lateStart: task.lateStart, 
          lateFinish: task.lateFinish,
          slack: task.slack,
          isCritical: task.isCritical,
          highlighted: currentCrashedActivities.includes(task.id)
        },
        draggable: true,
      };
    });

    const newEdges: Edge[] = [];
    tasksToDisplay.forEach(task => {
      task.predecessors.forEach(pred => {
        const predTask = tasksToDisplay.find(t => t.id === pred.taskId);
        if (!predTask) return;
        const isCriticalEdge = task.isCritical && predTask.isCritical;
        newEdges.push({
          id: `edge-${pred.taskId}-to-${task.id}`,
          source: pred.taskId,
          target: task.id,
          type: 'straight',
          style: { stroke: isCriticalEdge ? '#FF0000' : '#1a365d', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 24, height: 24, color: isCriticalEdge ? '#FF0000' : '#1a365d' },
          animated: isCriticalEdge,
        });
      });
    });
    return { nodes: newNodes, edges: newEdges };
  }, [getCurrentTasks, calculatePositions, getCrashedActivities, isCrashed, currentIteration, crashedTasksHistory]);

  // useEffect to update diagram when relevant data changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = createFlowElements();
    setNodes(newNodes);
    setEdges(newEdges);
  }, [isCrashed, currentIteration, crashTasks, crashedTasksHistory, createFlowElements, setNodes, setEdges]);
  
  // Conditional rendering based on whether there are nodes to display
  if (nodes.length === 0) {
    return (
      <div>
        <Typography variant="body1" color="text.secondary">
          {isCrashed ? "No tasks data for current iteration." : "Add tasks to see the network diagram."}
        </Typography>
      </div>
    );
  }

  return (
    <div 
      ref={diagramContainerRef}
      style={{ 
        width: '100%', 
        height: isFullScreen ? '100vh' : '600px',
        position: 'relative'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        style={{ background: '#f8f8f8' }}
      >
        <Controls />
        <Background color="#e8e8e8" gap={16} />
        <Panel position="top-left">
          <div style={{ 
            background: 'rgba(255,255,255,0.85)', 
            padding: '10px', 
            borderRadius: '5px', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            border: '1px solid #eee',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            fontSize: '12px',
            maxWidth: '200px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Legend:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ 
                width: '20px', 
                height: '0px',
                borderBottom: '3px dashed #FF0000',
                display: 'inline-block' 
              }}></div>
              <span>Critical Path</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ 
                width: '15px', 
                height: '15px', 
                backgroundColor: customNodeStyles.critical.background, 
                border: customNodeStyles.critical.border,
                display: 'inline-block' 
              }}></div>
              <span>Critical Task</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ 
                width: '15px', 
                height: '15px', 
                backgroundColor: 'rgba(25, 118, 210, 0.1)', 
                border: '1px solid #1976d2',
                display: 'inline-block' 
              }}></div>
              <span>Crashed Task</span>
            </div>
            <div style={{ marginTop: '5px', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
              <span>Current Iteration: {currentIteration}</span>
            </div>
          </div>
        </Panel>
        <Panel position="top-right">
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={handleResetPositions}
            >
              Reset
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              onClick={toggleFullScreen}
            >
              {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          </Box>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Network Diagram for Project Crashing
const NetworkDiagramForCrashing: React.FC = () => {
  const { isCrashed, costAnalysis, currentIteration } = useProjectCrashing();

  // 根据当前迭代动态获取项目持续时间
  const getCurrentProjectDuration = () => {
    if (!isCrashed || costAnalysis.length === 0) {
      return 0;
    }
    
    // 确保不超出costAnalysis的范围
    const iterIndex = Math.min(currentIteration, costAnalysis.length - 1);
    return costAnalysis[iterIndex].projectDuration;
  };

  const currentProjectDuration = getCurrentProjectDuration();

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Network Diagram
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          {/* 使用当前迭代的项目持续时间 */}
          {isCrashed && currentProjectDuration > 0 && `Project Duration: ${currentProjectDuration} days`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isCrashed
            ? currentIteration > 0 
              ? `Iteration ${currentIteration} - Use the slider to navigate through different iterations` 
              : 'Initial state (Iteration 0 - before any crashing)'
            : 'Add tasks and click "Crashing Project" to view the diagram and analysis.'
          }
        </Typography>
      </Box>
      <Box sx={{ height: '600px', width: '100%' }}>
        <ReactFlowProvider>
          <DiagramCanvas />
        </ReactFlowProvider>
      </Box>
    </Paper>
  );
};

export default NetworkDiagramForCrashing; 