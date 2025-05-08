import React, { useCallback, useEffect } from 'react';
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
  Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Paper, Typography, Divider, Alert } from '@mui/material';
import { useProjectCrashing, CrashTask } from '../hooks/ProjectCrashingContext';

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
    costAnalysis
  } = useProjectCrashing();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Consolidated logic for getting tasks based on current state
  const getCurrentTasks = useCallback((): CrashTask[] => {
    if (!isCrashed) {
      // NOT CRASHED: Display tasks from context, ensuring duration is normalTime.
      // This state is for when tasks are being added/edited BEFORE performCrashing.
      console.log("Diagram: Not crashed. Using context tasks, mapping duration to normalTime.");
      return crashTasks.map(task => ({
        ...task,
        duration: task.normalTime, 
      }));
    } else {
      // CRASHED: Use history. Iteration 0 should have duration = normalTime.
      if (crashedTasksHistory.length > 0) {
        const iterationIndex = Math.min(currentIteration, crashedTasksHistory.length - 1);
        console.log(`Diagram: Crashed. Using history for iteration ${iterationIndex}.`);
        return crashedTasksHistory[iterationIndex];
      } else {
        // Fallback if history is unexpectedly empty after crashing.
        console.log("Diagram: Crashed, but no history. Defaulting to context tasks with duration as normalTime.");
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

  const calculatePositions = useCallback((tasks: CrashTask[]) => {
    // This function remains as is.
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
  }, []);

  // Create nodes and edges
  const createFlowElements = useCallback(() => {
    const tasksToDisplay = getCurrentTasks();

    if (!tasksToDisplay || tasksToDisplay.length === 0) {
      console.log("Diagram createFlowElements: No tasks to display.");
      return { nodes: [], edges: [] };
    }
    console.log("Diagram createFlowElements: Processing tasks - ", tasksToDisplay.map(t => `${t.id}: dur=${t.duration}, normal=${t.normalTime}`));

    // --- TARGETED LOG FOR TASK B AT ITERATION 0 ---
    if (currentIteration === 0) {
      const taskB_forDiagram = tasksToDisplay.find(t => t.id === 'B');
      if (taskB_forDiagram) {
        console.log(`[DIAGRAM] createFlowElements (Iter 0) - Task B data: id=${taskB_forDiagram.id}, duration=${taskB_forDiagram.duration}, normalTime=${taskB_forDiagram.normalTime}, crashTime=${taskB_forDiagram.crashTime}`);
      } else {
        console.log("[DIAGRAM] createFlowElements (Iter 0) - Task B not found in tasksToDisplay.");
      }
    }
    // --- END TARGETED LOG ---

    const positions = calculatePositions(tasksToDisplay);
    const currentCrashedActivities = getCrashedActivities();

    const newNodes: Node[] = tasksToDisplay.map(task => {
      let nodeOriginalDuration;
      // Show originalDuration only if crashed, for iterations > 0, and if duration actually changed from initial state.
      if (isCrashed && currentIteration > 0 && crashedTasksHistory.length > 0 && crashedTasksHistory[0]) {
        const initialTaskState = crashedTasksHistory[0].find(t => t.id === task.id);
        // initialTaskState.duration should be normalTime
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
          duration: task.duration, // Directly from getCurrentTasks
          originalDuration: nodeOriginalDuration,
          normalTime: task.normalTime, // Keep for reference if needed, but not displayed by default
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
    console.log("DiagramCanvas useEffect: Triggered.");
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
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background />
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