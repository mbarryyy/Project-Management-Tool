import { Task, Path, Predecessor } from '../models/Task';
import { DependencyType, createDependencyStrategy } from '../models/Dependency';

export class ProjectScheduler {
  private tasks: Task[] = [];
  private paths: Path[] = [];
  private criticalPaths: Path[] = [];

  constructor(tasks: Task[]) {
    // 创建任务的深拷贝，避免修改原始数据
    this.tasks = JSON.parse(JSON.stringify(tasks));
  }

  /**
   * 计算项目调度，包括关键路径、各任务的ES、EF、LS、LF和浮动时间
   */
  public calculateSchedule(): void {
    if (this.tasks.length === 0) return;

    // 检查项目图是否有循环依赖
    this.validateNoCyclicDependencies();

    // 计算早期日期 (Early Start, Early Finish)
    this.calculateEarlyDates();

    // 计算晚期日期 (Late Start, Late Finish)
    this.calculateLateDates();

    // 计算浮动时间和标记关键路径
    this.calculateSlackAndMarkCriticalPath();

    // 找出所有路径
    this.findAllPaths();
  }

  /**
   * 获取计算后的任务列表
   */
  public getCalculatedTasks(): Task[] {
    return this.tasks;
  }

  /**
   * 获取所有路径
   */
  public getAllPaths(): Path[] {
    return this.paths;
  }

  /**
   * 获取关键路径
   */
  public getCriticalPaths(): Path[] {
    return this.criticalPaths;
  }

  /**
   * 获取项目总持续时间
   */
  public getProjectDuration(): number {
    const lastTasks = this.findEndTasks();
    if (lastTasks.length === 0) return 0;

    // 项目持续时间是所有结束节点中最大的earlyFinish
    return Math.max(...lastTasks.map(task => task.earlyFinish || 0));
  }

  /**
   * 验证项目图中没有循环依赖
   */
  private validateNoCyclicDependencies(): void {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const isCyclic = (taskId: string): boolean => {
      if (!visited.has(taskId)) {
        visited.add(taskId);
        recStack.add(taskId);

        const task = this.findTaskById(taskId);
        if (task) {
          for (const pred of task.predecessors) {
            if (!visited.has(pred.taskId) && isCyclic(pred.taskId)) {
              return true;
            } else if (recStack.has(pred.taskId)) {
              return true;
            }
          }
        }
      }
      recStack.delete(taskId);
      return false;
    };

    for (const task of this.tasks) {
      if (!visited.has(task.id) && isCyclic(task.id)) {
        throw new Error('Cyclic dependency detected in project graph');
      }
    }
  }

  /**
   * 计算所有任务的早期开始和早期结束日期
   */
  private calculateEarlyDates(): void {
    // 找出起始任务（没有前置任务的任务）
    const startTasks = this.findStartTasks();

    // 初始化所有任务的早期日期
    this.tasks.forEach(task => {
      task.earlyStart = undefined;
      task.earlyFinish = undefined;
    });

    // 将起始任务的早期开始设为0
    startTasks.forEach(task => {
      task.earlyStart = 0;
      task.earlyFinish = task.duration;
    });

    // 拓扑排序
    const sortedTasks = this.topologicalSort();

    // 根据拓扑顺序计算每个任务的早期日期
    for (const task of sortedTasks) {
      // 寻找进入当前任务的所有任务
      this.tasks.forEach(fromTask => {
        const dependency = fromTask.predecessors.find(p => p.taskId === task.id);
        if (dependency) {
          const strategy = createDependencyStrategy(dependency.type);
          strategy.calculateEarlyDates(task, fromTask, dependency.lag);
        }
      });

      // 如果此任务有前置任务，则计算其早期开始和结束
      if (task.predecessors.length > 0) {
        let maxEarlyStart = 0;
        
        for (const pred of task.predecessors) {
          const predTask = this.findTaskById(pred.taskId);
          if (predTask && predTask.earlyFinish !== undefined) {
            const earlyStart = predTask.earlyFinish + (pred.lag || 0);
            maxEarlyStart = Math.max(maxEarlyStart, earlyStart);
          }
        }
        
        task.earlyStart = maxEarlyStart;
        task.earlyFinish = maxEarlyStart + task.duration;
      }
    }
  }

  /**
   * 计算所有任务的晚期开始和晚期结束日期
   */
  private calculateLateDates(): void {
    // 找出结束任务（没有后续任务的任务）
    const endTasks = this.findEndTasks();
    
    // 项目总持续时间
    const projectDuration = Math.max(...endTasks.map(task => task.earlyFinish || 0));
    
    // 初始化所有任务的晚期日期
    this.tasks.forEach(task => {
      task.lateStart = undefined;
      task.lateFinish = undefined;
    });
    
    // 设置结束任务的晚期结束为项目总持续时间
    endTasks.forEach(task => {
      task.lateFinish = projectDuration;
      task.lateStart = task.lateFinish - task.duration;
    });
    
    // 逆拓扑排序
    const reversedSortedTasks = this.topologicalSort().reverse();
    
    // 根据逆拓扑顺序计算每个任务的晚期日期
    for (const task of reversedSortedTasks) {
      // 找出所有以此任务为前置任务的任务
      const successors = this.tasks.filter(t => 
        t.predecessors.some(p => p.taskId === task.id)
      );
      
      if (successors.length > 0) {
        let minLateFinish = Number.MAX_VALUE;
        
        for (const successor of successors) {
          if (successor.lateStart !== undefined) {
            const pred = successor.predecessors.find(p => p.taskId === task.id);
            const lag = pred ? pred.lag : 0;
            const lateFinish = successor.lateStart - lag;
            minLateFinish = Math.min(minLateFinish, lateFinish);
          }
        }
        
        if (minLateFinish !== Number.MAX_VALUE) {
          task.lateFinish = minLateFinish;
          task.lateStart = task.lateFinish - task.duration;
        }
      }
    }
  }

  /**
   * 计算浮动时间并标记关键路径上的任务
   */
  private calculateSlackAndMarkCriticalPath(): void {
    this.tasks.forEach(task => {
      if (task.earlyStart !== undefined && task.lateStart !== undefined) {
        task.slack = task.lateStart - task.earlyStart;
        task.isCritical = task.slack === 0;
      }
    });
  }

  /**
   * 拓扑排序算法
   */
  private topologicalSort(): Task[] {
    const visited = new Set<string>();
    const result: Task[] = [];

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      
      visited.add(taskId);
      
      const task = this.findTaskById(taskId);
      if (!task) return;
      
      for (const pred of task.predecessors) {
        visit(pred.taskId);
      }
      
      result.push(task);
    };

    for (const task of this.tasks) {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    }

    return result;
  }

  /**
   * 找出所有起始任务（没有前置任务的任务）
   */
  private findStartTasks(): Task[] {
    return this.tasks.filter(task => task.predecessors.length === 0);
  }

  /**
   * 找出所有结束任务（没有后续任务的任务）
   */
  private findEndTasks(): Task[] {
    const successorIds = new Set<string>();
    
    this.tasks.forEach(task => {
      task.predecessors.forEach(pred => {
        successorIds.add(pred.taskId);
      });
    });
    
    return this.tasks.filter(task => !successorIds.has(task.id));
  }

  /**
   * 根据ID查找任务
   */
  private findTaskById(id: string): Task | undefined {
    return this.tasks.find(task => task.id === id);
  }

  /**
   * 找出所有可能的路径
   */
  private findAllPaths(): void {
    this.paths = [];
    const startTasks = this.findStartTasks();
    const endTasks = this.findEndTasks();
    
    for (const startTask of startTasks) {
      for (const endTask of endTasks) {
        this.findPathsHelper(startTask, endTask, [startTask.id], 0);
      }
    }
    
    // 标记关键路径
    this.criticalPaths = this.paths.filter(path => {
      return path.duration === this.getProjectDuration();
    });
    
    // 确保所有路径上的关键标记正确性
    this.criticalPaths.forEach(path => {
      path.isCritical = true;
    });
  }

  /**
   * 递归查找路径的辅助函数
   */
  private findPathsHelper(currentTask: Task, endTask: Task, currentPath: string[], currentDuration: number): void {
    if (currentTask.id === endTask.id) {
      // 找到一条从起始到结束的路径
      this.paths.push({
        tasks: [...currentPath],
        duration: currentDuration + currentTask.duration,
        isCritical: false // 暂时设为false，后续会更新
      });
      return;
    }
    
    // 找出所有以currentTask为前置任务的任务
    const successors = this.tasks.filter(task => 
      task.predecessors.some(pred => pred.taskId === currentTask.id)
    );
    
    for (const successor of successors) {
      // 避免循环
      if (!currentPath.includes(successor.id)) {
        const newPath = [...currentPath, successor.id];
        this.findPathsHelper(successor, endTask, newPath, currentDuration + currentTask.duration);
      }
    }
  }
} 