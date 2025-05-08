import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Button,
  Typography,
  TextField,
  Paper,
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
  Grid,
  Divider,
  InputAdornment,
  Tooltip
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ClearIcon from '@mui/icons-material/Clear';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useProjectCrashing, SavedProjectCrashingData } from '../hooks/ProjectCrashingContext';
import { DependencyType } from '../models/Dependency';
import CrashingTaskForm from './CrashingTaskForm';
import CrashingTaskTable from './CrashingTaskTable';
import CrashingPathAnalysis from './CrashingPathAnalysis';
import CrashingCostAnalysis from './CrashingCostAnalysis';
import CrashingIterationSlider from './CrashingIterationSlider';
import NetworkDiagramForCrashing from './NetworkDiagramForCrashing';

// Project Crashing 组件 - 项目崩溃分析的主容器
const ProjectCrashing: React.FC = () => {
  const { 
    indirectCost, 
    setIndirectCost, 
    reductionPerUnit, 
    setReductionPerUnit,
    crashTasks,
    isCrashed,
    performCrashing,
    clearCrashingData,
    saveProjectCrashingData,
    loadProjectCrashingData,
    getSavedProjects,
    deleteProject,
    updateProjectName,
    error: contextError,
    costAnalysis,
    crashPaths,
    currentIteration,
    addCrashTask
  } = useProjectCrashing();

  // UI状态
  const [infoOpen, setInfoOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success');
  
  // 临时状态，用于输入字段
  const [indirectCostInput, setIndirectCostInput] = useState(indirectCost.toString());
  const [reductionInput, setReductionInput] = useState(reductionPerUnit.toString());

  // 添加状态管理保存和加载对话框
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [savedProjects, setSavedProjects] = useState<SavedProjectCrashingData[]>([]);
  const [editingProject, setEditingProject] = useState<{id: string, name: string} | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理间接成本输入变化
  const handleIndirectCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIndirectCostInput(e.target.value);
    const numValue = parseFloat(e.target.value);
    if (!isNaN(numValue) && numValue >= 0) {
      setIndirectCost(numValue);
    }
  };

  // 处理单位时间减少成本输入变化
  const handleReductionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReductionInput(e.target.value);
    const numValue = parseFloat(e.target.value);
    if (!isNaN(numValue) && numValue >= 0) {
      setReductionPerUnit(numValue);
    }
  };

  // 显示提示信息
  const showAlert = (message: string, severity: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  // 处理项目崩溃计算
  const handlePerformCrashing = () => {
    if (crashTasks.length === 0) {
      showAlert('Please add at least one task first', 'error');
      return;
    }

    if (indirectCost <= 0 || reductionPerUnit <= 0) {
      showAlert('Please enter valid indirect cost and reduction values', 'error');
      return;
    }

    try {
      performCrashing();
      showAlert('Project crashing analysis performed successfully', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform project crashing analysis';
      showAlert(`Error: ${errorMessage}`, 'error');
    }
  };

  // 处理保存项目崩溃数据
  const handleSaveProjectCrashingData = () => {
    if (crashTasks.length === 0) {
      showAlert('No tasks to save', 'error');
      return;
    }

    setSaveDialogOpen(true);
  };

  // 处理保存对话框确认
  const handleConfirmSave = () => {
    const success = saveProjectCrashingData(projectName);
    if (success) {
      showAlert(`Project "${projectName || 'Untitled'}" saved successfully`, 'success');
      setSaveDialogOpen(false);
      setProjectName('');
    } else {
      showAlert('Failed to save project crashing data', 'error');
    }
  };

  // 处理加载项目崩溃数据
  const handleLoadProjectCrashingData = () => {
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
  const handleLoadProject = (projectId: string) => {
    try {
      const success = loadProjectCrashingData(projectId);
      
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
  const handleEditProjectName = (project: SavedProjectCrashingData) => {
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

  // 清空项目崩溃数据前确认
  const handleClearCrashingData = () => {
    if (window.confirm('Are you sure you want to clear all project crashing data?')) {
      clearCrashingData();
      // 重置输入字段
      setIndirectCostInput('0');
      setReductionInput('0');
      showAlert('Project crashing data cleared successfully', 'success');
    }
  };

  // 修改导出函数，使其可以导出特定项目
  const handleExportToExcel = (projectToExport?: SavedProjectCrashingData) => {
    // 如果指定了要导出的项目，则使用该项目数据
    const tasksToExport = projectToExport ? projectToExport.tasks : crashTasks;
    const projectNameToExport = projectToExport ? projectToExport.name : projectName;
    
    // Create workbook with Task List focus
    const workbook = XLSX.utils.book_new();
    
    // Create Tasks sheet with English header
    const tasksHeaders = ['Task ID', 'Description', 'Predecessors', 'Normal Time', 'Normal Cost', 'Crash Time', 'Crash Cost'];
    const tasksData = tasksToExport.map(task => [
      task.id,
      task.description,
      task.predecessors.map(p => p.taskId).join(','),
      task.normalTime,
      task.normalCost,
      task.crashTime,
      task.crashCost
    ]);
    
    // Add title row at the top
    const titleRow = [`Task List - ${projectNameToExport || 'Project'}`];
    const completeTasksData = [titleRow, [], tasksHeaders, ...tasksData];
    
    const tasksSheet = XLSX.utils.aoa_to_sheet(completeTasksData);
    
    // Set column widths and style for better readability
    const wscols = [
      { wch: 10 }, // Task ID
      { wch: 30 }, // Description
      { wch: 15 }, // Predecessors
      { wch: 15 }, // Normal Time
      { wch: 15 }, // Normal Cost
      { wch: 15 }, // Crash Time
      { wch: 15 }, // Crash Cost
    ];
    
    tasksSheet['!cols'] = wscols;
    
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Task List');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create a filename with date and time
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `${projectNameToExport || 'Project'}_TaskList_${dateStr}.xlsx`;
    
    // Save the file
    saveAs(data, fileName);
    
    // Show success alert
    showAlert(`Task List exported as "${fileName}"`, 'success');
  };
  
  // 处理从Excel导入任务
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
              row.includes('Normal Time') &&
              row.includes('Normal Cost') &&
              row.includes('Crash Time') &&
              row.includes('Crash Cost')) {
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
        const normalTimeIndex = headers.indexOf('Normal Time');
        const normalCostIndex = headers.indexOf('Normal Cost');
        const crashTimeIndex = headers.indexOf('Crash Time');
        const crashCostIndex = headers.indexOf('Crash Cost');
        
        // 验证必要列是否存在
        if (taskIdIndex === -1 || normalTimeIndex === -1 || normalCostIndex === -1 || 
            crashTimeIndex === -1 || crashCostIndex === -1) {
          setImportError('Invalid file format: Required columns missing');
          return;
        }
        
        // 清除现有数据
        clearCrashingData();
        
        // 解析任务数据
        let importedCount = 0;
        let invalidRowFound = false;
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // 确保行有效
          if (!row || !row[taskIdIndex] || row[taskIdIndex] === '') continue;
          
          // 检查必填字段
          if (row[normalTimeIndex] === undefined || 
              row[normalCostIndex] === undefined ||
              row[crashTimeIndex] === undefined ||
              row[crashCostIndex] === undefined) {
            invalidRowFound = true;
            continue;
          }
          
          // 处理前置任务
          let predecessorIds: string[] = [];
          if (predecessorsIndex !== -1 && row[predecessorsIndex]) {
            predecessorIds = row[predecessorsIndex].toString().split(',').map((id: string) => id.trim());
          }
          
          // 添加新任务
          addCrashTask({
            id: row[taskIdIndex].toString(),
            description: descriptionIndex !== -1 ? (row[descriptionIndex]?.toString() || '') : '',
            duration: parseFloat(row[normalTimeIndex]), // Default duration is the normal time
            normalTime: parseFloat(row[normalTimeIndex]),
            normalCost: parseFloat(row[normalCostIndex]),
            crashTime: parseFloat(row[crashTimeIndex]),
            crashCost: parseFloat(row[crashCostIndex]),
            predecessors: predecessorIds.map(predId => ({
              taskId: predId,
              type: DependencyType.FS,
              lag: 0
            }))
          });
          
          importedCount++;
        }
        
        if (importedCount === 0) {
          setImportError('No valid tasks found in the file');
          return;
        }
        
        // 成功导入
        setManageDialogOpen(false);
        showAlert(`Successfully imported ${importedCount} tasks${invalidRowFound ? ' (some invalid rows were skipped)' : ''}`, 'success');
        setImportError(null);
        
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

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Project Crashing
          </Typography>
          
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Project Parameters
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Tooltip title="Total indirect cost of the project" arrow placement="top" enterDelay={1000}>
                <TextField
                  label="Indirect Cost"
                  placeholder="e.g. 1500"
                  variant="outlined"
                  size="small"
                  type="number"
                  value={indirectCostInput}
                  onChange={handleIndirectCostChange}
                  inputProps={{ min: 0 }}
                  disabled={isCrashed}
                />
              </Tooltip>
              
              <Tooltip title="Amount saved for each time unit the project is shortened" arrow placement="top" enterDelay={1000}>
                <TextField
                  label="Cost Reduction per Unit Time"
                  placeholder="e.g. 50"
                  variant="outlined"
                  size="small"
                  type="number"
                  value={reductionInput}
                  onChange={handleReductionChange}
                  inputProps={{ min: 0 }}
                  disabled={isCrashed}
                />
              </Tooltip>
            </Box>
          </Paper>
          
          {contextError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {contextError}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CalculateIcon />}
              onClick={handlePerformCrashing}
              disabled={isCrashed || crashTasks.length === 0}
            >
              Crashing Project
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveProjectCrashingData}
              disabled={crashTasks.length === 0}
            >
              Save Project
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FolderOpenIcon />}
              onClick={handleLoadProjectCrashingData}
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
              onClick={handleClearCrashingData}
              disabled={crashTasks.length === 0}
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
        
        <CrashingTaskForm />
        <CrashingTaskTable />
        
        {isCrashed && (
          <>
            <CrashingIterationSlider autoPlayEnabled={true} />
            <CrashingPathAnalysis />
            <CrashingCostAnalysis />
            <NetworkDiagramForCrashing />
          </>
        )}
      </Container>
      
      {/* 帮助信息对话框 */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)}>
        <DialogTitle>About Project Crashing</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Project Crashing is a technique used to reduce project duration by adding resources to critical activities.
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Instructions:
          </Typography>
          
          <Typography variant="body2" paragraph>
            1. Enter the total indirect cost of the project and the cost reduction per unit time.
          </Typography>
          
          <Typography variant="body2" paragraph>
            2. Add tasks with their ID, description (optional), predecessors, normal time, normal cost, crash time, and crash cost.
          </Typography>
          
          <Typography variant="body2" paragraph>
            3. Click "Crashing Project" to perform project crashing analysis.
          </Typography>
          
          <Typography variant="body2" paragraph>
            4. View the task list, path analysis, cost analysis, and network diagram to understand the optimal crashing strategy.
          </Typography>
          
          <Typography variant="body2" paragraph>
            5. Use the Save and Load buttons to store and retrieve your project crashing data.
          </Typography>
          
          <Typography variant="body2" paragraph>
            6. Use the Clear Project button to reset all project crashing data.
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
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
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
                onClick={() => handleLoadProject(project.id)}
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

export default ProjectCrashing; 