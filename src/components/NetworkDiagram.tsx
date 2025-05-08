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
  ConnectionLineType,
  ReactFlowProvider,
  Panel,
  Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import * as XLSX from 'xlsx';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useProject } from '../hooks/ProjectContext';
import { Task } from '../models/Task';
import { DependencyType } from '../models/Dependency';
import { SavedProjectData } from '../hooks/useProjectData';

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
  const { 
    tasks, 
    isCalculated, 
    projectName, 
    saveProject, 
    loadProject, 
    updateTask, 
    addTask, 
    clearProject, 
    getSavedProjects, 
    deleteProject, 
    updateProjectName 
  } = useProject();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 状态管理
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProjectData[]>([]);
  const [editingProject, setEditingProject] = useState<{id: string, name: string} | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success');
  
  // 显示提示信息
  const showAlert = (message: string, severity: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };
  
  // 导出Excel文件
  const handleExportToExcel = (projectToExport?: SavedProjectData) => {
    const tasksToExport = projectToExport ? projectToExport.tasks : tasks;
    const projectNameToExport = projectToExport ? projectToExport.name : projectName;
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 创建任务表格
    const tasksHeaders = ['Task ID', 'Description', 'Predecessors', 'Duration'];
    const tasksData = tasksToExport.map(task => [
      task.id,
      task.description,
      task.predecessors.map(p => p.taskId).join(','),
      task.duration
    ]);
    
    // 添加标题行
    const titleRow = [`Task List - ${projectNameToExport || 'Project'}`];
    const completeTasksData = [titleRow, [], tasksHeaders, ...tasksData];
    
    const tasksSheet = XLSX.utils.aoa_to_sheet(completeTasksData);
    
    // 设置列宽
    const wscols = [
      { wch: 10 }, // Task ID
      { wch: 30 }, // Description
      { wch: 15 }, // Predecessors
      { wch: 15 }, // Duration
    ];
    
    tasksSheet['!cols'] = wscols;
    
    // 添加到工作簿
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Task List');
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // 文件名包含日期和时间
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `${projectNameToExport || 'Project'}_TaskList_${dateStr}.xlsx`;
    
    // 保存文件
    saveAs(data, fileName);
    
    // 显示成功信息
    showAlert(`Task List exported as "${fileName}"`, 'success');
  };
  
  // 从Excel导入任务
  const handleImportFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 重置文件输入字段
    event.target.value = '';
    
    // 读取Excel文件
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 获取第一个工作表
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 转换为JSON
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, blankrows: false });
        
        // 验证格式 - 查找表头行
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (Array.isArray(row) && 
              row.includes('Task ID') && 
              row.includes('Description') && 
              row.includes('Predecessors') && 
              row.includes('Duration')) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          setImportError('Invalid file format: Headers not found');
          return;
        }
        
        // 获取列索引
        const headers = jsonData[headerRowIndex];
        const taskIdIndex = headers.indexOf('Task ID');
        const descriptionIndex = headers.indexOf('Description');
        const predecessorsIndex = headers.indexOf('Predecessors');
        const durationIndex = headers.indexOf('Duration');
        
        // 验证必要列是否存在
        if (taskIdIndex === -1 || durationIndex === -1) {
          setImportError('Invalid file format: Required columns missing');
          return;
        }
        
        // 解析任务数据
        const importedTasks: Task[] = [];
        let invalidRowFound = false;
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // 确保行有效
          if (!row || !row[taskIdIndex] || row[taskIdIndex] === '') continue;
          
          // 检查必填字段
          if (row[durationIndex] === undefined) {
            invalidRowFound = true;
            continue;
          }
          
          // 处理前置任务
          let predecessorIds: string[] = [];
          if (predecessorsIndex !== -1 && row[predecessorsIndex]) {
            predecessorIds = row[predecessorsIndex].toString().split(',').map((id: string) => id.trim());
          }
          
          // 创建新任务
          importedTasks.push({
            id: row[taskIdIndex].toString(),
            description: descriptionIndex !== -1 ? (row[descriptionIndex]?.toString() || '') : '',
            duration: parseFloat(row[durationIndex]),
            predecessors: predecessorIds.map(predId => ({
              taskId: predId,
              type: DependencyType.FS,
              lag: 0
            })),
            earlyStart: 0,
            earlyFinish: 0,
            lateStart: 0,
            lateFinish: 0,
            slack: 0,
            isCritical: false
          });
        }
        
        if (importedTasks.length === 0) {
          setImportError('No valid tasks found in the file');
          return;
        }
        
        // 清除现有数据并导入新任务
        clearProject();
        
        // 添加导入的任务
        importedTasks.forEach((task: Task) => {
          addTask({
            id: task.id,
            description: task.description,
            duration: task.duration,
            predecessorIds: task.predecessors.map((p: {taskId: string}) => p.taskId)
          });
        });
        
        // 成功导入
        setManageDialogOpen(false);
        showAlert(`Successfully imported ${importedTasks.length} tasks${invalidRowFound ? ' (some invalid rows were skipped)' : ''}`, 'success');
        
      } catch (err) {
        console.error('Error importing file:', err);
        setImportError('Failed to import file. Please check the file format.');
      }
    };
    
    reader.onerror = () => {
      setImportError('Error reading the file');
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // 触发文件选择
  const handleImportButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // 处理管理项目
  const handleManageProjects = () => {
    const projects = getSavedProjects();
    setSavedProjects(projects);
    setManageDialogOpen(true);
  };
  
  // 加载项目
  const handleLoadProject = (projectId: string) => {
    try {
      const success = loadProject(projectId);
      
      if (success) {
        const project = savedProjects.find(p => p.id === projectId);
        showAlert(`Project "${project?.name || 'Unknown'}" loaded successfully`, 'success');
        setManageDialogOpen(false);
      } else {
        showAlert('Failed to load project', 'error');
      }
    } catch (err) {
      showAlert('Failed to load project: Invalid format', 'error');
      console.error('Failed to load project:', err);
    }
  };
  
  // 删除项目
  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      const success = deleteProject(projectId);
      if (success) {
        setSavedProjects(savedProjects.filter(p => p.id !== projectId));
        showAlert('Project deleted successfully', 'success');
      } else {
        showAlert('Failed to delete project', 'error');
      }
    }
  };
  
  // 编辑项目名称
  const handleEditProjectName = (project: SavedProjectData) => {
    setEditingProject({ id: project.id, name: project.name });
  };
  
  // 保存编辑后的项目名称
  const handleSaveProjectName = () => {
    if (editingProject) {
      const success = updateProjectName(editingProject.id, editingProject.name);
      if (success) {
        setSavedProjects(savedProjects.map(p => 
          p.id === editingProject.id 
            ? { ...p, name: editingProject.name } 
            : p
        ));
        setEditingProject(null);
        showAlert('Project name updated', 'success');
      } else {
        showAlert('Failed to update project name', 'error');
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Network Diagram
        </Typography>
        
        <Button
          variant="outlined"
          color="primary"
          startIcon={<SettingsIcon />}
          onClick={handleManageProjects}
          size="small"
        >
          Manage Network Diagrams
        </Button>
      </Box>
      
      <Box sx={{ height: 700, border: '1px solid #ccc', position: 'relative' }}>
        <ReactFlowProvider>
          <DiagramCanvas />
        </ReactFlowProvider>
      </Box>
      
      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFromExcel}
        style={{ display: 'none' }}
        accept=".xlsx,.xls"
      />
      
      {/* 管理项目对话框 */}
      <Dialog 
        open={manageDialogOpen} 
        onClose={() => setManageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Manage Network Diagrams</DialogTitle>
        <DialogContent>
          {savedProjects.length === 0 ? (
            <Typography variant="body1" align="center" sx={{ my: 2 }}>
              No saved network diagrams found
            </Typography>
          ) : (
            <List>
              {savedProjects.map((project) => (
                <ListItem key={project.id} divider>
                  {editingProject && editingProject.id === project.id ? (
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs>
                        <TextField
                          fullWidth
                          value={editingProject.name}
                          onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                          size="small"
                          autoFocus
                        />
                      </Grid>
                      <Grid item>
                        <Button onClick={handleSaveProjectName} size="small" color="primary">
                          Save
                        </Button>
                        <Button onClick={() => setEditingProject(null)} size="small">
                          Cancel
                        </Button>
                      </Grid>
                    </Grid>
                  ) : (
                    <>
                      <ListItemText 
                        primary={project.name} 
                        secondary={`Last updated: ${new Date(project.lastUpdated).toLocaleString()} | Tasks: ${project.tasks.length}`} 
                        onClick={() => handleLoadProject(project.id)}
                        sx={{ cursor: 'pointer' }}
                      />
                      <ListItemSecondaryAction sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleExportToExcel(project)} 
                          title="Export to Excel"
                          size="small"
                          sx={{ color: 'primary.main', width: '28px', height: '28px' }}
                        >
                          <FileDownloadIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleEditProjectName(project)}
                          title="Edit Project Name"
                          size="small"
                          sx={{ color: 'primary.main', width: '28px', height: '28px' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete Project"
                          size="small"
                          sx={{ color: 'error.main', width: '28px', height: '28px' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
              ))}
            </List>
          )}
          
          {importError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {importError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={handleImportButtonClick}
            startIcon={<FolderOpenIcon />}
          >
            Import from Excel
          </Button>
          <Button onClick={() => {
            setManageDialogOpen(false);
            setImportError(null);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 提示信息 */}
      <Snackbar 
        open={alertOpen} 
        autoHideDuration={3000} 
        onClose={() => setAlertOpen(false)}
      >
        <Alert severity={alertSeverity} onClose={() => setAlertOpen(false)}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default NetworkDiagram; 