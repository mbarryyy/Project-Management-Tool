import { useState, useCallback, useEffect } from 'react';
import { Task, Path } from '../models/Task';
import { DependencyType } from '../models/Dependency';
import { ProjectScheduler } from '../services/ProjectScheduler';

// 初始项目状态
const defaultProject = {
  name: 'New Project',
  tasks: [] as Task[],
  paths: [] as Path[],
  criticalPaths: [] as Path[],
  projectDuration: 0
};

// 定义保存的项目数据接口
export interface SavedProjectData {
  id: string; // 唯一标识符
  name: string; // 项目名称
  tasks: Task[];
  lastUpdated: string;
}

// 保存的项目列表
export interface SavedProjectsList {
  projects: SavedProjectData[];
}

export const useProjectData = () => {
  // 项目基本信息
  const [projectName, setProjectName] = useState(defaultProject.name);
  // 任务列表
  const [tasks, setTasks] = useState<Task[]>(defaultProject.tasks);
  // 计算后的路径
  const [paths, setPaths] = useState<Path[]>(defaultProject.paths);
  // 关键路径
  const [criticalPaths, setCriticalPaths] = useState<Path[]>(defaultProject.criticalPaths);
  // 项目总持续时间
  const [projectDuration, setProjectDuration] = useState(defaultProject.projectDuration);
  // 是否已计算
  const [isCalculated, setIsCalculated] = useState(false);
  // 错误消息
  const [error, setError] = useState<string | null>(null);
  // 当前选中用于编辑的任务ID
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 添加新任务
  const addTask = useCallback((task: Omit<Task, 'predecessors' | 'isCritical'> & { predecessorIds?: string[] }) => {
    const newTask: Task = {
      ...task,
      predecessors: (task.predecessorIds || []).map(id => ({
        taskId: id,
        type: DependencyType.FS,
        lag: 0
      })),
      isCritical: false
    };

    setTasks(prev => [...prev, newTask]);
    setIsCalculated(false);
  }, []);

  // 更新任务
  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => 
      prev.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
    setIsCalculated(false);
  }, []);

  // 批量更新多个任务
  const updateTasks = useCallback((updatedTasks: Task[]) => {
    setTasks(prev => {
      const taskMap = new Map(prev.map(task => [task.id, task]));
      updatedTasks.forEach(task => {
        taskMap.set(task.id, task);
      });
      return Array.from(taskMap.values());
    });
    setIsCalculated(false);
  }, []);

  // 插入任务到特定任务之前
  const insertTaskBefore = useCallback((targetTaskId: string, newTask: Omit<Task, 'predecessors' | 'isCritical'> & { predecessorIds?: string[] } & { autoRenumber?: boolean }) => {
    setTasks(prev => {
      // 找到目标任务
      const targetTask = prev.find(task => task.id === targetTaskId);
      if (!targetTask) return prev;

      let tasksToUpdate = [...prev];
      const targetTaskOriginalId = targetTask.id;
      
      // 如果启用了自动重编号
      if (newTask.autoRenumber) {
        // 1. 创建ID映射表 - 为所有ID >= targetTaskId的任务创建新ID
        const idMap: Record<string, string> = {};
        
        // 识别需要重编号的任务
        const tasksToRenumber = tasksToUpdate.filter(task => {
          const taskNum = Number(task.id);
          const targetNum = Number(targetTaskId);
          
          if (!isNaN(taskNum) && !isNaN(targetNum)) {
            // 数字ID比较
            return taskNum >= targetNum;
          } else {
            // 字母ID比较
            return task.id >= targetTaskId;
          }
        });
        
        // 按ID从大到小排序，确保从最高ID开始重新编号
        const sortedTasksToRenumber = [...tasksToRenumber].sort((a, b) => {
          const aNum = Number(a.id);
          const bNum = Number(b.id);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return bNum - aNum; // 从大到小
          } else {
            return b.id.localeCompare(a.id); // 从大到小
          }
        });
        
        // 从高ID到低ID重编号
        sortedTasksToRenumber.forEach(task => {
          const taskNum = Number(task.id);
          const targetNum = Number(targetTaskId);
          
          if (!isNaN(taskNum) && !isNaN(targetNum)) {
            // 数字ID递增
            idMap[task.id] = String(taskNum + 1);
          } else if (task.id.length === 1) {
            // 单字符字母ID递增
            const charCode = task.id.charCodeAt(0);
            if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
              idMap[task.id] = String.fromCharCode(charCode + 1);
            }
          } else {
            // 多字符ID处理
            idMap[task.id] = task.id + "1"; // 简单处理，可以根据需要完善
          }
        });
        
        // 更新所有受影响任务的ID和前置任务引用
        tasksToUpdate = tasksToUpdate.map(task => {
          const newId = idMap[task.id];
          if (!newId) return task;
          
          return {
            ...task,
            id: newId,
            predecessors: task.predecessors.map(pred => ({
              ...pred,
              taskId: idMap[pred.taskId] || pred.taskId
            }))
          };
        });
        
        // 2. 新任务将使用目标任务的原始ID
        newTask.id = targetTaskOriginalId;
      }
      
      // 准备新任务
      const taskToInsert: Task = {
        ...newTask,
        predecessors: (newTask.predecessorIds || []).map(id => ({
          taskId: id,
          type: DependencyType.FS,
          lag: 0
        })),
        isCritical: false
      };
      
      // 找到更新后的目标任务（ID可能已经改变）
      const updatedTargetTask = tasksToUpdate.find(task => {
        // 如果启用了自动重编号，目标任务的ID已变更，我们需要找到它的新ID
        if (newTask.autoRenumber) {
          return task.id === incrementId(targetTaskOriginalId);
        } else {
          return task.id === targetTaskId;
        }
      });
      
      if (!updatedTargetTask) return tasksToUpdate.concat([taskToInsert]);
      
      // 更新目标任务的前置任务列表 - 现在它的前置任务是新插入的任务
      const finalTargetTask: Task = {
        ...updatedTargetTask,
        predecessors: [
          {
            taskId: taskToInsert.id,
            type: DependencyType.FS,
            lag: 0
          }
        ]
      };
      
      // 将目标任务的原始前置任务设置为新任务的前置任务
      taskToInsert.predecessors = targetTask.predecessors;
      
      // 创建最终更新的任务列表
      return tasksToUpdate
        .map(task => task.id === finalTargetTask.id ? finalTargetTask : task)
        .concat([taskToInsert]);
    });
    
    setIsCalculated(false);
  }, []);
  
  // 递增ID的辅助函数（支持数字和字母）
  const incrementId = (id: string): string => {
    const num = Number(id);
    if (!isNaN(num)) {
      return String(num + 1);
    } else if (id.length === 1) {
      const charCode = id.charCodeAt(0);
      if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
        return String.fromCharCode(charCode + 1);
      }
    }
    return id + "1"; // 默认处理
  };

  // 重新编号任务（递增）
  const renumberTasks = useCallback((startIndex: number, increment: number = 1) => {
    setTasks(prev => {
      // 创建ID映射表
      const idMap: Record<string, string> = {};
      
      // 识别需要重新编号的任务（ID大于等于startIndex的所有任务）
      const tasksToRenumber = prev.filter(task => {
        // 支持数字ID和字母ID
        const taskNum = Number(task.id);
        if (!isNaN(taskNum)) {
          return taskNum >= startIndex;
        } else {
          // 字母ID的比较，例如：'B' >= 'B' 或 'C' >= 'B'
          return task.id >= String(startIndex);
        }
      });
      
      // 按ID从大到小排序，确保从最高ID开始重编号，避免冲突
      const sortedTasksToRenumber = [...tasksToRenumber].sort((a, b) => {
        const aNum = Number(a.id);
        const bNum = Number(b.id);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return bNum - aNum; // 数字ID，从大到小
        } else {
          return b.id.localeCompare(a.id); // 字母ID，从大到小
        }
      });
      
      // 从高ID到低ID进行重编号
      sortedTasksToRenumber.forEach(task => {
        const taskNum = Number(task.id);
        if (!isNaN(taskNum)) {
          // 数字ID递增
          idMap[task.id] = String(taskNum + increment);
        } else {
          // 字母ID递增（例如：'B' -> 'C'）
          // 处理单个字符的字母
          if (task.id.length === 1) {
            const charCode = task.id.charCodeAt(0);
            // 确保在有效范围内
            if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
              idMap[task.id] = String.fromCharCode(charCode + increment);
            }
          } else {
            // 多字符ID的处理（如果需要，可以实现更复杂的逻辑）
            // 此处仅为简单实现，实际可能需要更复杂的序列处理
            idMap[task.id] = task.id + increment;
          }
        }
      });
      
      // 更新任务ID和前置任务引用
      const updatedTasks = prev.map(task => {
        const newId = idMap[task.id];
        if (!newId) return task;

        return {
          ...task,
          id: newId,
          predecessors: task.predecessors.map(pred => ({
            ...pred,
            taskId: idMap[pred.taskId] || pred.taskId
          }))
        };
      });

      // 全局更新：确保所有任务中引用到重编号任务的地方都被更新
      // 这已经在上面的代码中处理了前置任务的引用，实际项目可能需要处理更多关系

      return updatedTasks;
    });
    setIsCalculated(false);
  }, []);

  // 删除任务
  const deleteTask = useCallback((taskId: string) => {
    // 删除任务本身
    setTasks(prev => prev.filter(task => task.id !== taskId));
    
    // 从其他任务的前置任务列表中移除此任务
    setTasks(prev => 
      prev.map(task => ({
        ...task,
        predecessors: task.predecessors.filter(p => p.taskId !== taskId)
      }))
    );
    
    setIsCalculated(false);
  }, []);

  // 计算项目调度
  const calculateSchedule = useCallback(() => {
    try {
      if (tasks.length === 0) {
        setError('No tasks to calculate');
        return;
      }

      setError(null);
      
      const scheduler = new ProjectScheduler(tasks);
      scheduler.calculateSchedule();
      
      // 更新计算后的任务
      setTasks(scheduler.getCalculatedTasks());
      
      // 更新路径和关键路径
      setPaths(scheduler.getAllPaths());
      setCriticalPaths(scheduler.getCriticalPaths());
      
      // 更新项目持续时间
      setProjectDuration(scheduler.getProjectDuration());
      
      setIsCalculated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsCalculated(false);
    }
  }, [tasks]);

  // 清空项目
  const clearProject = useCallback(() => {
    setProjectName(defaultProject.name);
    setTasks(defaultProject.tasks);
    setPaths(defaultProject.paths);
    setCriticalPaths(defaultProject.criticalPaths);
    setProjectDuration(defaultProject.projectDuration);
    setIsCalculated(false);
    setError(null);
    setSelectedTaskId(null);
  }, []);

  // 保存项目到localStorage，添加项目命名功能
  const saveProject = useCallback((projectName: string) => {
    try {
      // 生成唯一ID
      const projectId = Date.now().toString();
      
      const projectData: SavedProjectData = {
        id: projectId,
        name: projectName.trim() || `Project ${projectId.slice(-4)}`,
        tasks,
        lastUpdated: new Date().toISOString()
      };
      
      // 获取现有的项目列表
      let savedProjects: SavedProjectsList = {projects: []};
      const savedProjectsString = localStorage.getItem('networkDiagramProjectsList');
      
      if (savedProjectsString) {
        savedProjects = JSON.parse(savedProjectsString);
      }
      
      // 添加新项目到列表
      savedProjects.projects.push(projectData);
      
      // 保存更新后的项目列表
      localStorage.setItem('networkDiagramProjectsList', JSON.stringify(savedProjects));
      
      console.log(`Saving network diagram project "${projectData.name}" with ID: ${projectId}, ${tasks.length} tasks`);
      return true;
    } catch (err) {
      console.error('Failed to save project:', err);
      return false;
    }
  }, [tasks]);

  // 获取保存的项目列表
  const getSavedProjects = useCallback(() => {
    try {
      const savedProjectsString = localStorage.getItem('networkDiagramProjectsList');
      if (!savedProjectsString) {
        return [];
      }
      
      const savedProjects = JSON.parse(savedProjectsString) as SavedProjectsList;
      return savedProjects.projects;
    } catch (err) {
      console.error('Failed to get saved projects list:', err);
      return [];
    }
  }, []);

  // 从列表中加载特定项目
  const loadProject = useCallback((projectId: string) => {
    try {
      const savedProjects = getSavedProjects();
      const projectToLoad = savedProjects.find(project => project.id === projectId);
      
      if (!projectToLoad) {
        setError(`Project with ID ${projectId} not found`);
        return false;
      }
      
      setProjectName(projectToLoad.name || defaultProject.name);
      setTasks(projectToLoad.tasks || []);
      setIsCalculated(false);
      setError(null);
      
      return true;
    } catch (err) {
      setError('Failed to load project');
      console.error('Failed to load project:', err);
      return false;
    }
  }, [getSavedProjects]);

  // 删除保存的项目
  const deleteProject = useCallback((projectId: string) => {
    try {
      const savedProjectsString = localStorage.getItem('networkDiagramProjectsList');
      if (!savedProjectsString) {
        return false;
      }
      
      const savedProjects = JSON.parse(savedProjectsString) as SavedProjectsList;
      
      // 过滤掉要删除的项目
      savedProjects.projects = savedProjects.projects.filter(project => project.id !== projectId);
      
      // 保存更新后的项目列表
      localStorage.setItem('networkDiagramProjectsList', JSON.stringify(savedProjects));
      
      return true;
    } catch (err) {
      console.error('Failed to delete project:', err);
      return false;
    }
  }, []);

  // 更新项目名称
  const updateProjectName = useCallback((projectId: string, newName: string) => {
    try {
      const savedProjectsString = localStorage.getItem('networkDiagramProjectsList');
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
      localStorage.setItem('networkDiagramProjectsList', JSON.stringify(savedProjects));
      
      return true;
    } catch (err) {
      console.error('Failed to update project name:', err);
      return false;
    }
  }, []);

  // 重新排序任务（通过拖拽）
  const reorderTasks = useCallback((oldIndex: number, newIndex: number) => {
    setTasks(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
    setIsCalculated(false);
  }, []);

  // 更新任务ID（专门处理ID变更的情况）
  const updateTaskWithNewId = useCallback((originalId: string, updatedTask: Task) => {
    setTasks(prev => {
      // 1. 移除原ID的任务
      const tasksWithoutOriginal = prev.filter(task => task.id !== originalId);
      
      // 2. 更新所有引用了原ID的任务的前置任务
      const updatedTasks = tasksWithoutOriginal.map(task => {
        // 检查任务是否引用了原ID作为前置任务
        const hasOriginalIdAsPredecessor = task.predecessors.some(p => p.taskId === originalId);
        
        if (hasOriginalIdAsPredecessor) {
          // 更新引用
          return {
            ...task,
            predecessors: task.predecessors.map(p => ({
              ...p,
              taskId: p.taskId === originalId ? updatedTask.id : p.taskId
            }))
          };
        }
        
        return task;
      });
      
      // 3. 添加更新后的任务
      return [...updatedTasks, updatedTask];
    });
    
    setIsCalculated(false);
  }, []);

  return {
    projectName,
    setProjectName,
    tasks,
    paths,
    criticalPaths,
    projectDuration,
    isCalculated,
    error,
    selectedTaskId,
    setSelectedTaskId,
    addTask,
    updateTask,
    updateTasks,
    insertTaskBefore,
    renumberTasks,
    deleteTask,
    calculateSchedule,
    clearProject,
    saveProject,
    loadProject,
    reorderTasks,
    updateTaskWithNewId,
    getSavedProjects,
    deleteProject,
    updateProjectName
  };
}; 