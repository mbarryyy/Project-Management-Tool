import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  ConnectionLineType,
  ReactFlowProvider,
  Panel,
  Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Paper, Typography, Divider } from '@mui/material';
import { useProject } from '../hooks/ProjectContext';
import { Task } from '../models/Task';

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
  }
};

// 自定义节点组件 - 显示任务节点
const CustomTaskNode = ({ data }: { data: any }) => {
  return (
    <Box
      sx={{
        padding: '10px',
        borderRadius: '4px',
        width: '180px',
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
      <Typography variant="caption" display="block">
        Duration: {data.duration}
      </Typography>
      <Typography variant="caption" display="block">
        ES: {data.earlyStart} | EF: {data.earlyFinish}
      </Typography>
      <Typography variant="caption" display="block">
        LS: {data.lateStart} | LF: {data.lateFinish}
      </Typography>
      <Typography variant="caption" display="block">
        Slack: {data.slack}
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
  const { tasks, criticalPaths, isCalculated } = useProject();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 计算坐标
  const calculatePositions = useCallback((tasks: Task[]) => {
    // 提取任务层级关系
    const taskLevels: { [key: string]: number } = {};
    const maxLevel = { value: 0 }; // 使用对象让内部函数可更新
    
    // 深度优先搜索确定每个任务的层级
    const calculateLevel = (taskId: string, level: number, visited: Set<string>) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      
      taskLevels[taskId] = Math.max(taskLevels[taskId] || 0, level);
      maxLevel.value = Math.max(maxLevel.value, level);
      
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // 获取所有以此任务为前置的任务
        const successors = tasks.filter(t => 
          t.predecessors.some(p => p.taskId === taskId)
        );
        
        successors.forEach(s => {
          calculateLevel(s.id, level + 1, visited);
        });
      }
    };
    
    // 获取所有起始任务（没有前置任务的任务）
    const startTasks = tasks.filter(task => task.predecessors.length === 0);
    
    // 从每个起始任务开始DFS
    startTasks.forEach(task => {
      calculateLevel(task.id, 0, new Set<string>());
    });
    
    // 计算每个层级中的任务数量
    const levelCounts: { [key: number]: number } = {};
    for (const taskId in taskLevels) {
      const level = taskLevels[taskId];
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }
    
    // 首先排序任务，确保相同层级的任务按ID顺序排列
    const sortedTasks = [...tasks].sort((a, b) => {
      const levelA = taskLevels[a.id] || 0;
      const levelB = taskLevels[b.id] || 0;
      
      if (levelA !== levelB) return levelA - levelB;
      return a.id.localeCompare(b.id);
    });
    
    // 计算每个任务在其层级中的垂直位置索引
    const levelPositions: { [key: number]: number } = {};
    
    // 计算任务的x, y坐标
    const taskPositions: { [key: string]: { x: number, y: number } } = {};
    
    for (const task of sortedTasks) {
      const level = taskLevels[task.id] || 0;
      const position = levelPositions[level] || 0;
      
      // 水平间距为300，垂直间距为150
      const x = level * 300 + 100; 
      const y = position * 150 + 50;
      
      taskPositions[task.id] = { x, y };
      
      levelPositions[level] = position + 1;
    }
    
    return taskPositions;
  }, []);

  // 创建节点和边
  const createFlowElements = useCallback((tasks: Task[]) => {
    if (!isCalculated || tasks.length === 0) return { nodes: [], edges: [] };
    
    const positions = calculatePositions(tasks);
    
    // 创建节点
    const nodes: Node[] = tasks.map(task => ({
      id: task.id,
      type: 'taskNode',
      position: positions[task.id] || { x: 0, y: 0 },
      data: {
        label: `${task.id}${task.description ? ': ' + task.description : ''}`,
        duration: task.duration,
        earlyStart: task.earlyStart,
        earlyFinish: task.earlyFinish,
        lateStart: task.lateStart,
        lateFinish: task.lateFinish,
        slack: task.slack,
        isCritical: task.isCritical
      },
      draggable: true,
    }));
    
    // 创建边
    const edges: Edge[] = [];
    
    // 找出所有依赖关系并创建边
    tasks.forEach(task => {
      task.predecessors.forEach(pred => {
        const predTask = tasks.find(t => t.id === pred.taskId);
        if (!predTask) return;
        
        const isCriticalEdge = task.isCritical && predTask.isCritical;
        
        // 创建边
        edges.push({
          id: `edge-${pred.taskId}-to-${task.id}`,
          source: pred.taskId,
          target: task.id,
          type: 'straight',
          style: {
            stroke: isCriticalEdge ? '#FF0000' : '#1a365d',
            strokeWidth: 2, 
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 24,
            height: 24,
            color: isCriticalEdge ? '#FF0000' : '#1a365d',
          },
          animated: isCriticalEdge,
          label: '',
          labelStyle: { 
            fill: isCriticalEdge ? '#FF0000' : '#1a365d',
            fontWeight: 'bold',
            fontSize: 12 
          },
          labelBgStyle: { 
            fill: 'rgba(255,255,255,0.9)',
            padding: '3px 5px',
            borderRadius: 4 
          },
        });
      });
    });
    
    console.log('创建图形元素：', nodes.length, '个节点,', edges.length, '条边');
    
    return { nodes, edges };
  }, [calculatePositions, isCalculated]);

  // 当计算结果变化时更新图形
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = createFlowElements(tasks);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [tasks, isCalculated, createFlowElements, setNodes, setEdges]);

  // 未计算时显示提示信息
  if (!isCalculated) {
    return (
      <div>
        <Typography variant="body1" color="text.secondary">
          Click "Generate Network Diagram" to calculate and visualize the project network diagram.
        </Typography>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: 'straight',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 24,
            height: 24,
            color: '#1a365d',
          },
          style: {
            strokeWidth: 2,
            stroke: '#1a365d',
          },
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={4}
        style={{ background: '#f8f8f8' }}
      >
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
          </div>
        </Panel>
        <Background color="#e8e8e8" gap={16} />
        <Controls showInteractive={true} />
      </ReactFlow>
    </div>
  );
};

// 网络图容器组件 - 主组件
const NetworkDiagram: React.FC = () => {
  const { isCalculated } = useProject();

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Network Diagram
      </Typography>
      
      <Box sx={{ height: 700, border: '1px solid #ccc', position: 'relative' }}>
        <ReactFlowProvider>
          <DiagramCanvas />
        </ReactFlowProvider>
      </Box>
    </Paper>
  );
};

export default NetworkDiagram; 