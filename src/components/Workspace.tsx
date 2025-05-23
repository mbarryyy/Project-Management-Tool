import React, { useState, useRef } from 'react';
import {
  Container,
  Box,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  DialogContentText,
  Grid
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CalculateIcon from '@mui/icons-material/Calculate';
import ClearIcon from '@mui/icons-material/Clear';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
// @ts-ignore
import { saveAs } from 'file-saver';

import TaskForm from './TaskForm';
import TaskTable from './TaskTable';
import NetworkDiagram from './NetworkDiagram';
import PathAnalysis from './PathAnalysis';
import { useProject } from '../hooks/ProjectContext';
import { SavedProjectData } from '../hooks/useProjectData';

// 工作区组件 - 应用程序的主容器
const Workspace: React.FC = () => {
  const { 
    projectName, 
    setProjectName, 
    tasks, 
    calculateSchedule, 
    clearProject,
    saveProject,
    loadProject,
    isCalculated,
    error,
    selectedTaskId,
    getSavedProjects,
    deleteProject,
    updateProjectName,
    addTask
  } = useProject();

  // UI状态
  const [infoOpen, setInfoOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success');

  // 添加状态管理保存和加载对话框
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [savedProjects, setSavedProjects] = useState<SavedProjectData[]>([]);
  const [editingProject, setEditingProject] = useState<{id: string, name: string} | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 显示提示信息
  const showAlert = (message: string, severity: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  // 清空项目前确认
  const handleClearProject = () => {
    if (window.confirm('Are you sure you want to clear all project data?')) {
      clearProject();
      showAlert('Project cleared successfully', 'success');
    }
  };

  // 处理保存项目
  const handleSaveProject = () => {
    if (tasks.length === 0) {
      showAlert('No tasks to save', 'error');
      return;
    }

    setProjectNameInput(projectName);
    setSaveDialogOpen(true);
  };

  // 处理保存对话框确认
  const handleConfirmSave = () => {
    const success = saveProject(projectNameInput);
    if (success) {
      showAlert(`Project "${projectNameInput || 'Untitled'}" saved successfully`, 'success');
      setSaveDialogOpen(false);
      // 更新当前项目名称
      setProjectName(projectNameInput);
    } else {
      showAlert('Failed to save project', 'error');
    }
  };

  // 处理加载项目
  const handleLoadProject = () => {
    try {
      // 获取保存的项目列表
      const projects = getSavedProjects();
      
      if (projects.length === 0) {
        showAlert('No saved projects found', 'error');
        return;
      }
      
      setSavedProjects(projects);
      setLoadDialogOpen(true);
    } catch (err) {
      showAlert('Failed to load project list', 'error');
      console.error('Failed to load project list:', err);
    }
  };

  // 处理加载特定项目
  const handleLoadSpecificProject = (projectId: string) => {
    try {
      const success = loadProject(projectId);
      
      if (success) {
        const project = savedProjects.find(p => p.id === projectId);
        showAlert(`Project "${project?.name || 'Unknown'}" loaded successfully`, 'success');
        setLoadDialogOpen(false);
      } else {
        showAlert('Failed to load project', 'error');
      }
    } catch (err) {
      showAlert('Failed to load project: Invalid format', 'error');
      console.error('Failed to load project:', err);
    }
  };

  // 处理管理项目
  const handleManageProjects = () => {
    const projects = getSavedProjects();
    setSavedProjects(projects);
    setManageDialogOpen(true);
  };

  // 处理删除项目
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

  // 处理编辑项目名称
  const handleEditProjectName = (project: SavedProjectData) => {
    setEditingProject({ id: project.id, name: project.name });
  };

  // 处理保存项目名称
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

  // 计算网络图
  const handleCalculate = () => {
    try {
      calculateSchedule();
      if (!error) {
        showAlert('Network diagram generated successfully', 'success');
      } else {
        showAlert(`Error: ${error}`, 'error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate network diagram';
      showAlert(`Error: ${errorMessage}`, 'error');
    }
  };

  // 在现有函数之后添加导出Excel功能
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

  // 添加导入Excel功能
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
        
        // 解析任务数据并添加到项目
        const importedTasks = [];
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
          let predecessorIds = [];
          if (predecessorsIndex !== -1 && row[predecessorsIndex]) {
            predecessorIds = row[predecessorsIndex].toString().split(',').map((id: string) => id.trim());
          }
          
          // 添加到导入任务数组
          importedTasks.push({
            id: row[taskIdIndex].toString(),
            description: descriptionIndex !== -1 ? (row[descriptionIndex]?.toString() || '') : '',
            duration: parseFloat(row[durationIndex]),
            predecessorIds
          });
        }
        
        if (importedTasks.length === 0) {
          setImportError('No valid tasks found in the file');
          return;
        }
        
        // 清除现有数据
        clearProject();
        
        // 添加导入的任务
        importedTasks.forEach(task => {
          // 直接使用TaskForm中的字段格式添加
          addTask({
            id: task.id,
            description: task.description,
            duration: task.duration,
            predecessorIds: task.predecessorIds
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

  // 添加触发文件选择的函数
  const handleImportButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ mb: 4 }}>
          <TextField
            label="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
          />
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CalculateIcon />}
              onClick={handleCalculate}
              disabled={tasks.length === 0}
            >
              Generate Network Diagram
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveProject}
              disabled={tasks.length === 0}
            >
              Save Project
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FolderOpenIcon />}
              onClick={handleLoadProject}
            >
              Load Project
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SettingsIcon />}
              onClick={handleManageProjects}
            >
              Manage Projects
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearIcon />}
              onClick={handleClearProject}
              disabled={tasks.length === 0}
            >
              Clear Project
            </Button>
            
            <Button
              variant="outlined"
              color="info"
              startIcon={<InfoIcon />}
              onClick={() => setInfoOpen(true)}
            >
              Info
            </Button>
          </Box>
        </Box>
        
        <TaskForm />
        <TaskTable />
        
        {isCalculated && (
          <>
            <NetworkDiagram />
            <PathAnalysis />
          </>
        )}
      </Container>
      
      {/* 帮助信息对话框 */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)}>
        <DialogTitle>About Project Management Tool</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            This tool allows you to create a project network diagram and analyze critical paths using the Critical Path Method (CPM).
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Instructions:
          </Typography>
          
          <Typography variant="body2" paragraph>
            1. Add tasks with their ID, description (optional), duration, and predecessors.
          </Typography>
          
          <Typography variant="body2" paragraph>
            2. Edit tasks or insert new tasks between existing ones using the edit button.
          </Typography>
          
          <Typography variant="body2" paragraph>
            3. Click "Generate Network Diagram" to calculate early/late dates and identify the critical path.
          </Typography>
          
          <Typography variant="body2" paragraph>
            4. View the network diagram and path analysis results.
          </Typography>
          
          <Typography variant="body2" paragraph>
            5. Save your project to load it later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Close</Button>
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

      {/* 保存项目对话框 */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for your project:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={projectNameInput}
            onChange={(e) => setProjectNameInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmSave} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      {/* 加载项目对话框 */}
      <Dialog 
        open={loadDialogOpen} 
        onClose={() => setLoadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Load Project</DialogTitle>
        <DialogContent>
          <List>
            {savedProjects.map((project) => (
              <ListItem 
                key={project.id} 
                button 
                onClick={() => handleLoadSpecificProject(project.id)}
                divider
              >
                <ListItemText 
                  primary={project.name} 
                  secondary={`Last updated: ${new Date(project.lastUpdated).toLocaleString()} | Tasks: ${project.tasks.length}`} 
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* 管理项目对话框 */}
      <Dialog 
        open={manageDialogOpen} 
        onClose={() => setManageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Manage Projects</DialogTitle>
        <DialogContent>
          {savedProjects.length === 0 ? (
            <Typography variant="body1" align="center" sx={{ my: 2 }}>
              No saved projects found
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
                      />
                      <ListItemSecondaryAction sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleExportToExcel(project)} 
                          title="Export to Excel"
                          size="small"
                          sx={{ color: 'primary.main' }}
                        >
                          <FileDownloadIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleEditProjectName(project)}
                          title="Edit Project Name"
                          size="small"
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete Project"
                          size="small"
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon />
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

      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFromExcel}
        style={{ display: 'none' }}
        accept=".xlsx,.xls"
      />
    </>
  );
};

export default Workspace; 