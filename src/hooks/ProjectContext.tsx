import React, { createContext, useContext, ReactNode } from 'react';
import { Task, Path } from '../models/Task';
import { useProjectData, SavedProjectData } from './useProjectData';

// Define the context type
interface ProjectContextType {
  projectName: string;
  setProjectName: (name: string) => void;
  tasks: Task[];
  paths: Path[];
  criticalPaths: Path[];
  projectDuration: number;
  isCalculated: boolean;
  error: string | null;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  addTask: (task: any) => void;
  updateTask: (task: Task) => void;
  updateTasks: (tasks: Task[]) => void;
  insertTaskBefore: (targetTaskId: string, newTask: any) => void;
  renumberTasks: (startIndex: number, increment?: number) => void;
  deleteTask: (taskId: string) => void;
  calculateSchedule: () => void;
  clearProject: () => void;
  saveProject: (projectName: string) => boolean;
  loadProject: (projectId: string) => boolean;
  reorderTasks: (oldIndex: number, newIndex: number) => void;
  updateTaskWithNewId: (originalId: string, updatedTask: Task) => void;
  getSavedProjects: () => SavedProjectData[];
  deleteProject: (projectId: string) => boolean;
  updateProjectName: (projectId: string, newName: string) => boolean;
}

// Create the context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Create the provider component
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const projectData = useProjectData();

  return (
    <ProjectContext.Provider value={projectData}>
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook to use the Project context
export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  
  return context;
}; 