import { DependencyType } from '../models/Dependency';

export interface Task {
  id: string;
  description: string;
  duration: number;
  predecessors: Predecessor[];
  
  // 计算的属性
  earlyStart?: number;
  earlyFinish?: number;
  lateStart?: number;
  lateFinish?: number;
  slack?: number;
  isCritical?: boolean;
}

export interface Predecessor {
  taskId: string;
  type: DependencyType;
  lag: number;
}

// 用于内部存储所有路径
export interface Path {
  tasks: string[];  // 任务ID序列
  duration: number; // 路径总持续时间
  isCritical: boolean;
} 