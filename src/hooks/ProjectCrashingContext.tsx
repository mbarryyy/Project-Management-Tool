import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { Task, Predecessor } from '../models/Task';
import { DependencyType } from '../models/Dependency';
import { ProjectCrashingService } from '../services/ProjectCrashingService';

// Define the structure of the crash-specific task information
export interface CrashTask extends Task {
  normalTime: number;
  normalCost: number;
  crashTime: number;
  crashCost: number;
  slope?: number;
  maxCrashTime?: number;
  // 添加松弛时间和早开始/晚开始等属性
  earlyStart?: number;
  earlyFinish?: number;
  lateStart?: number;
  lateFinish?: number;
  slack?: number;
  isCritical?: boolean;
}

// Define the interface for path analysis in project crashing
export interface CrashPath {
  tasks: string[];
  durations: number[]; // Array of durations for each iteration
  isCritical: boolean;
}

// Define the interface for cost analysis results
export interface CostAnalysisResult {
  projectDuration: number;
  crashedActivities: string[];
  crashCost: number;
  directCost: number;
  indirectCost: number;
  totalCost: number;
  isOptimum: boolean;
  isCrashPoint: boolean;
}

// Define the interface for saved project crashing data
export interface SavedProjectCrashingData {
  id: string; // 唯一标识符
  name: string; // 项目名称
  tasks: CrashTask[];
  indirectCost: number;
  reductionPerUnit: number;
  lastUpdated: string;
}

// 保存的项目列表
export interface SavedProjectsList {
  projects: SavedProjectCrashingData[];
}

// Node position type
export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

// Define the context type
interface ProjectCrashingContextType {
  indirectCost: number;
  setIndirectCost: (cost: number) => void;
  reductionPerUnit: number;
  setReductionPerUnit: (reduction: number) => void;
  crashTasks: CrashTask[];
  setCrashTasks: (tasks: CrashTask[]) => void;
  addCrashTask: (task: CrashTask) => void;
  updateCrashTask: (taskId: string, updatedTask: Partial<CrashTask>) => void;
  deleteCrashTask: (taskId: string) => void;
  crashPaths: CrashPath[];
  criticalCrashPaths: CrashPath[];
  costAnalysis: CostAnalysisResult[];
  crashedTasksHistory: CrashTask[][];
  isCrashed: boolean;
  currentIteration: number;
  setCurrentIteration: (iteration: number) => void;
  totalIterations: number;
  performCrashing: () => void;
  clearCrashingData: () => void;
  projectDuration: number;
  error: string | null;
  saveProjectCrashingData: (projectName: string) => boolean;
  loadProjectCrashingData: (projectId: string) => boolean;
  getSavedProjects: () => SavedProjectCrashingData[];
  deleteProject: (projectId: string) => boolean;
  updateProjectName: (projectId: string, newName: string) => boolean;
  nodePositions: NodePosition[];
  setNodePositions: React.Dispatch<React.SetStateAction<NodePosition[]>>;
  resetNodePositions: () => void;
}

// Create the context
const ProjectCrashingContext = createContext<ProjectCrashingContextType | undefined>(undefined);

// Create the provider component
export const ProjectCrashingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State for indirect cost and reduction per unit
  const [indirectCost, setIndirectCost] = useState<number>(0);
  const [reductionPerUnit, setReductionPerUnit] = useState<number>(0);
  
  // State for tasks
  const [crashTasks, setCrashTasks] = useState<CrashTask[]>([]);
  
  // State for analysis results
  const [crashPaths, setCrashPaths] = useState<CrashPath[]>([]);
  const [criticalCrashPaths, setCriticalCrashPaths] = useState<CrashPath[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysisResult[]>([]);
  const [crashedTasksHistory, setCrashedTasksHistory] = useState<CrashTask[][]>([]);
  
  // State for UI control
  const [isCrashed, setIsCrashed] = useState<boolean>(false);
  const [currentIteration, setCurrentIterationInternal] = useState<number>(0);
  const [totalIterations, setTotalIterations] = useState<number>(0);
  const [projectDuration, setProjectDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  // State for node positions
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);

  // Wrapper for setCurrentIteration that also updates projectDuration
  const setCurrentIteration = (iteration: number) => {
    setCurrentIterationInternal(iteration);
    
    // Update the project duration based on the selected iteration's data
    if (costAnalysis.length > iteration) {
      setProjectDuration(costAnalysis[iteration].projectDuration);
    }
  };

  // Function to reset node positions
  const resetNodePositions = () => {
    setNodePositions([]);
  };

  // Function to add a new task
  const addCrashTask = useCallback((task: CrashTask) => {
    // Calculate maxCrashTime and slope before adding the task
    const maxCrashTime = task.normalTime - task.crashTime;
    const slope = maxCrashTime > 0 
      ? (task.crashCost - task.normalCost) / maxCrashTime 
      : Number.MAX_SAFE_INTEGER; // If task can't be crashed, set slope to infinity
    
    // Add the task with calculated properties
    setCrashTasks(prev => [...prev, {
      ...task,
      maxCrashTime,
      slope
    }]);
  }, []);

  // Function to update a task
  const updateCrashTask = useCallback((taskId: string, updatedTask: Partial<CrashTask>) => {
    setCrashTasks(prev => 
      prev.map(task => {
        if (task.id !== taskId) return task;
        
        // Create the updated task by merging old and new properties
        const updated = { ...task, ...updatedTask };
        
        // Recalculate maxCrashTime and slope if normalTime, crashTime, normalCost, or crashCost changed
        if (
          updatedTask.normalTime !== undefined || 
          updatedTask.crashTime !== undefined || 
          updatedTask.normalCost !== undefined || 
          updatedTask.crashCost !== undefined
        ) {
          const maxCrashTime = updated.normalTime - updated.crashTime;
          const slope = maxCrashTime > 0 
            ? (updated.crashCost - updated.normalCost) / maxCrashTime 
            : Number.MAX_SAFE_INTEGER; // If task can't be crashed, set slope to infinity
          
          return { ...updated, maxCrashTime, slope };
        }
        
        return updated;
      })
    );
  }, []);

  // Function to delete a task
  const deleteCrashTask = useCallback((taskId: string) => {
    setCrashTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  // Function to perform the crashing analysis
  const performCrashing = () => {
    try {
      setError(null);
      
      // 验证输入数据
      if (crashTasks.length === 0) {
        throw new Error('No tasks to crash');
      }
      
      if (indirectCost < 0 || reductionPerUnit < 0) {
        throw new Error('Indirect cost and reduction per unit must be non-negative');
      }
      
      // 检查是否有没有前置任务的任务
      const startTasks = crashTasks.filter(task => task.predecessors.length === 0);
      if (startTasks.length === 0) {
        throw new Error('No start tasks found. At least one task must have no predecessors.');
      }
      
      // 检查是否有没有后续任务的任务
      const endTasks = crashTasks.filter(task => {
        return !crashTasks.some(t => t.predecessors.some(p => p.taskId === task.id));
      });
      if (endTasks.length === 0) {
        throw new Error('No end tasks found. At least one task must not be a predecessor for any task.');
      }
      
      // --- DETAILED LOGGING BEFORE SERVICE CALL ---
      console.log('[CONTEXT] performCrashing: Tasks being sent to service:');
      crashTasks.forEach(task => {
        console.log(`[CONTEXT] Task ${task.id}: normalTime=${task.normalTime}, duration=${task.duration}, crashTime=${task.crashTime}`);
      });
      // --- END LOGGING ---
      
      // 执行项目压缩算法
      const crashingResults = ProjectCrashingService.crashProject(
        crashTasks,
        indirectCost,
        reductionPerUnit
      );
      
      // --- DETAILED LOGGING AFTER SERVICE CALL ---
      if (crashingResults.crashedTasks && crashingResults.crashedTasks.length > 0) {
        console.log('[CONTEXT] performCrashing: Service returned crashedTasks. Iteration 0 data:');
        crashingResults.crashedTasks[0].forEach(task => {
          console.log(`[CONTEXT] Iteration 0 Task ${task.id}: normalTime=${task.normalTime}, duration=${task.duration}, crashTime=${task.crashTime}`);
        });
      } else {
        console.error('[CONTEXT] performCrashing: Service returned no crashedTasks or empty array!');
      }
      // --- END LOGGING ---
      
      // 计算每个迭代的松弛时间
      const processingTasksHistory = [...crashingResults.crashedTasks];
      for (let i = 0; i < processingTasksHistory.length; i++) {
        // 为当前迭代的任务计算松弛时间
        const currentCriticalPaths = crashingResults.paths.filter(path => {
          return path.durations[i] === Math.max(...crashingResults.paths.map(p => p.durations[i]));
        });
        
        processingTasksHistory[i] = ProjectCrashingService.calculateSlackTimes(
          processingTasksHistory[i],
          currentCriticalPaths
        );
      }
      
      // 更新状态
      setCrashPaths(crashingResults.paths);
      setCriticalCrashPaths(crashingResults.criticalPaths);
      setCostAnalysis(crashingResults.costAnalysis);
      setCrashedTasksHistory(processingTasksHistory);
      
      // 设置总迭代次数
      setTotalIterations(crashingResults.crashedTasks.length - 1);
      
      // 设置为已压缩状态
      setIsCrashed(true);
      
      // 设置初始项目持续时间并初始化当前迭代为0
      setProjectDuration(crashingResults.costAnalysis[0].projectDuration);
      setCurrentIterationInternal(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('[CONTEXT] Error while crashing project:', errorMessage);
    }
  };

  // Function to clear all crashing data
  const clearCrashingData = () => {
    setCrashTasks([]);
    setCrashPaths([]);
    setCriticalCrashPaths([]);
    setCostAnalysis([]);
    setCrashedTasksHistory([]);
    setIsCrashed(false);
    setCurrentIteration(0);
    setTotalIterations(0);
    setProjectDuration(0);
    setError(null);
  };

  // Function to save project crashing data to localStorage
  const saveProjectCrashingData = (projectName: string): boolean => {
    try {
      // 生成唯一ID
      const projectId = Date.now().toString();
      
      const projectData: SavedProjectCrashingData = {
        id: projectId,
        name: projectName.trim() || `Project ${projectId.slice(-4)}`,
        tasks: crashTasks,
        indirectCost,
        reductionPerUnit,
        lastUpdated: new Date().toISOString()
      };
      
      // 获取现有的项目列表
      let savedProjects: SavedProjectsList = {projects: []};
      const savedProjectsString = localStorage.getItem('projectCrashingList');
      
      if (savedProjectsString) {
        savedProjects = JSON.parse(savedProjectsString);
      }
      
      // 添加新项目到列表
      savedProjects.projects.push(projectData);
      
      // 保存更新后的项目列表
      localStorage.setItem('projectCrashingList', JSON.stringify(savedProjects));
      
      console.log(`Saving crashing project "${projectData.name}" with ID: ${projectId}, ${crashTasks.length} tasks`);
      return true;
    } catch (err) {
      console.error('Failed to save project crashing data:', err);
      return false;
    }
  };

  // 获取保存的项目列表
  const getSavedProjects = (): SavedProjectCrashingData[] => {
    try {
      const savedProjectsString = localStorage.getItem('projectCrashingList');
      if (!savedProjectsString) {
        return [];
      }
      
      const savedProjects = JSON.parse(savedProjectsString) as SavedProjectsList;
      return savedProjects.projects;
    } catch (err) {
      console.error('Failed to get saved projects list:', err);
      return [];
    }
  };

  // 从列表中加载特定项目
  const loadProjectCrashingData = (projectId: string): boolean => {
    try {
      const savedProjects = getSavedProjects();
      const projectToLoad = savedProjects.find(project => project.id === projectId);
      
      if (!projectToLoad) {
        setError(`Project with ID ${projectId} not found`);
        return false;
      }
      
      setIndirectCost(projectToLoad.indirectCost);
      setReductionPerUnit(projectToLoad.reductionPerUnit);
      setCrashTasks(projectToLoad.tasks);
      
      // Reset analysis data since we need to re-run the crashing algorithm
      setCrashPaths([]);
      setCriticalCrashPaths([]);
      setCostAnalysis([]);
      setCrashedTasksHistory([]);
      setIsCrashed(false);
      setCurrentIteration(0);
      setTotalIterations(0);
      setProjectDuration(0);
      setError(null);
      
      return true;
    } catch (err) {
      setError('Failed to load project crashing data');
      console.error('Failed to load project crashing data:', err);
      return false;
    }
  };

  // 删除保存的项目
  const deleteProject = (projectId: string): boolean => {
    try {
      const savedProjectsString = localStorage.getItem('projectCrashingList');
      if (!savedProjectsString) {
        return false;
      }
      
      const savedProjects = JSON.parse(savedProjectsString) as SavedProjectsList;
      
      // 过滤掉要删除的项目
      savedProjects.projects = savedProjects.projects.filter(project => project.id !== projectId);
      
      // 保存更新后的项目列表
      localStorage.setItem('projectCrashingList', JSON.stringify(savedProjects));
      
      return true;
    } catch (err) {
      console.error('Failed to delete project:', err);
      return false;
    }
  };

  // 更新项目名称
  const updateProjectName = (projectId: string, newName: string): boolean => {
    try {
      const savedProjectsString = localStorage.getItem('projectCrashingList');
      if (!savedProjectsString) {
        return false;
      }
      
      const savedProjects = JSON.parse(savedProjectsString) as SavedProjectsList;
      
      // 查找并更新项目名称
      const projectToUpdate = savedProjects.projects.find(project => project.id === projectId);
      if (!projectToUpdate) {
        return false;
      }
      
      projectToUpdate.name = newName.trim() || projectToUpdate.name;
      
      // 保存更新后的项目列表
      localStorage.setItem('projectCrashingList', JSON.stringify(savedProjects));
      
      return true;
    } catch (err) {
      console.error('Failed to update project name:', err);
      return false;
    }
  };

  // The context value
  const contextValue: ProjectCrashingContextType = {
    indirectCost,
    setIndirectCost,
    reductionPerUnit,
    setReductionPerUnit,
    crashTasks,
    setCrashTasks,
    addCrashTask,
    updateCrashTask,
    deleteCrashTask,
    crashPaths,
    criticalCrashPaths,
    costAnalysis,
    crashedTasksHistory,
    isCrashed,
    currentIteration,
    setCurrentIteration,
    totalIterations,
    performCrashing,
    clearCrashingData,
    projectDuration,
    error,
    saveProjectCrashingData,
    loadProjectCrashingData,
    getSavedProjects,
    deleteProject,
    updateProjectName,
    nodePositions,
    setNodePositions,
    resetNodePositions
  };

  return (
    <ProjectCrashingContext.Provider value={contextValue}>
      {children}
    </ProjectCrashingContext.Provider>
  );
};

// Custom hook to use the Project Crashing context
export const useProjectCrashing = (): ProjectCrashingContextType => {
  const context = useContext(ProjectCrashingContext);
  
  if (context === undefined) {
    throw new Error('useProjectCrashing must be used within a ProjectCrashingProvider');
  }
  
  return context;
}; 