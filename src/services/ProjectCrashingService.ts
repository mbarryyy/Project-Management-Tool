import { CrashTask, CrashPath, CostAnalysisResult } from '../hooks/ProjectCrashingContext';

export class ProjectCrashingService {
  /**
   * 计算所有可能的路径
   */
  static calculateAllPaths(tasks: CrashTask[]): CrashPath[] {
    const taskMap = new Map<string, CrashTask>();
    tasks.forEach(task => taskMap.set(task.id, task));

    const startTasks = tasks.filter(task => task.predecessors.length === 0);
    if (startTasks.length === 0) return [];

    const allPaths: CrashPath[] = [];
    startTasks.forEach(startTask => {
      this.findPaths(
        startTask.id,
        [],
        new Set<string>(),
        taskMap,
        tasks,
        allPaths
      );
    });
    return this.calculatePathDurations(allPaths, taskMap);
  }

  /**
   * 深度优先搜索找出所有路径
   */
  private static findPaths(
    currentTaskId: string,
    currentPathNodes: string[],
    visitedOnThisPath: Set<string>,
    taskMap: Map<string, CrashTask>,
    allTasks: CrashTask[],
    allPaths: CrashPath[]
  ): void {
    if (visitedOnThisPath.has(currentTaskId)) {
      console.warn(`Cycle detected at task ${currentTaskId} during path finding, path ignored.`);
      return;
    }
    const newPathNodes = [...currentPathNodes, currentTaskId];
    visitedOnThisPath.add(currentTaskId);

    const successorTasks = allTasks.filter(task => 
      task.predecessors.some(pred => pred.taskId === currentTaskId)
    );

    if (successorTasks.length === 0) {
      allPaths.push({
        tasks: newPathNodes,
        durations: [0], 
        isCritical: false
      });
    } else {
      successorTasks.forEach(successor => {
        this.findPaths(
          successor.id,
          newPathNodes,
          new Set<string>(visitedOnThisPath),
          taskMap,
          allTasks,
          allPaths
        );
      });
    }
  }

  /**
   * 计算每条路径的持续时间并确定关键路径
   */
  private static calculatePathDurations(
    paths: CrashPath[],
    taskMap: Map<string, CrashTask>
  ): CrashPath[] {
    if (paths.length === 0) return [];
    const EPSILON = 0.000001;
    paths.forEach(path => {
      const duration = path.tasks.reduce((total, taskId) => {
        const task = taskMap.get(taskId);
        return total + (task ? task.duration : 0);
      }, 0);
      path.durations = [duration];
    });

    const maxDuration = Math.max(0, ...paths.map(path => path.durations[0]));
    paths.forEach(path => {
      path.isCritical = Math.abs(path.durations[0] - maxDuration) < EPSILON;
    });
    return paths;
  }

  /**
   * 执行项目压缩算法，返回所有迭代的结果
   */
  static crashProject(
    tasks: CrashTask[], 
    indirectCostInput: number, 
    reductionPerUnitInput: number
  ): {
    crashedTasks: CrashTask[][],
    paths: CrashPath[],
    criticalPaths: CrashPath[],
    costAnalysis: CostAnalysisResult[]
  } {
    const EPSILON = 0.000001;
    const initialTasksState: CrashTask[] = JSON.parse(JSON.stringify(tasks)).map((task: CrashTask) => ({
      ...task,
      duration: task.normalTime
    }));
    
    let historicalPaths = this.calculateAllPaths(initialTasksState);
    const initialTaskMapForDurations = new Map(initialTasksState.map((t: CrashTask) => [t.id, t]));
    historicalPaths.forEach(p => {
        const initialDuration = p.tasks.reduce((sum, tid) => sum + (initialTaskMapForDurations.get(tid)?.duration || 0), 0);
        p.durations = [initialDuration];
    });
    
    let currentCriticalPaths = historicalPaths.filter(path => path.isCritical);
    const initialMaxDuration = currentCriticalPaths.length > 0 ? currentCriticalPaths[0].durations[0] : 
                              (historicalPaths.length > 0 ? Math.max(0,...historicalPaths.map(p => p.durations[0])) :0) ;
    const initialDirectCost = initialTasksState.reduce((sum: number, task: CrashTask) => sum + task.normalCost, 0);

    const costAnalysis: CostAnalysisResult[] = [{
      projectDuration: initialMaxDuration,
      crashedActivities: [],
      crashCost: 0,
      directCost: initialDirectCost,
      indirectCost: indirectCostInput,
      totalCost: initialDirectCost + indirectCostInput,
      isOptimum: false,
      isCrashPoint: false
    }];

    const crashedTasksHistory: CrashTask[][] = [JSON.parse(JSON.stringify(initialTasksState))];
    let currentTasks: CrashTask[] = JSON.parse(JSON.stringify(initialTasksState));
    let iteration = 0;
    let canContinueCrashing = true;
    let previousCommittedMaxDuration = initialMaxDuration;
    console.log(`[CrashProject] Initial Max Duration: ${initialMaxDuration}`);

    while (canContinueCrashing) {
      console.log(`[CrashProject] Starting iteration attempt for logical iteration ${iteration + 1}. Previous committed max duration: ${previousCommittedMaxDuration}`);
      currentCriticalPaths = historicalPaths.filter(p => 
        p.durations.length > iteration && 
        Math.abs(p.durations[iteration] - previousCommittedMaxDuration) < EPSILON
      );
      console.log(`[CrashProject] Iteration ${iteration + 1}: Found ${currentCriticalPaths.length} critical paths based on duration ${previousCommittedMaxDuration}.`);

      let crashableTasksOnCurrentCriticalPaths: CrashTask[] = [];
      currentCriticalPaths.forEach(path => {
        path.tasks.forEach(taskId => {
          const task = currentTasks.find(t => t.id === taskId);
          if (task && (task.maxCrashTime || 0) > 0 && task.duration > task.crashTime) {
            if (!crashableTasksOnCurrentCriticalPaths.some(ct => ct.id === task.id)) {
              crashableTasksOnCurrentCriticalPaths.push(JSON.parse(JSON.stringify(task)));
            }
          }
        });
      });

      if (crashableTasksOnCurrentCriticalPaths.length === 0) {
        console.log(`[CrashProject] Iteration ${iteration + 1}: No crashable tasks on critical paths. Stopping.`);
        if (costAnalysis.length > 0) costAnalysis[costAnalysis.length - 1].isCrashPoint = true;
        canContinueCrashing = false; break;
      }

      let tasksToCompressFromSelection: CrashTask[] = [];
      let currentIterationSelectedTaskIds: string[] = [];
      
      // CRITICAL: REPLACE THIS WITH YOUR FULL TASK SELECTION LOGIC for multiple critical paths
      // This placeholder is INSUFFICIENT for complex scenarios.
      // Your logic should populate `tasksToCompressFromSelection` with all tasks that need
      // to be crashed *simultaneously* in this iteration according to your strategy.
      console.log(`[CrashProject] Iteration ${iteration + 1}: Selecting tasks to crash... (Using standard crashing algorithm)`);
      
      // 获取每个任务所在的关键路径
      const taskToPathsMap = new Map<string, number[]>();
      crashableTasksOnCurrentCriticalPaths.forEach(task => {
        const pathIndices: number[] = [];
        currentCriticalPaths.forEach((path, index) => {
          if (path.tasks.includes(task.id)) {
            pathIndices.push(index);
          }
        });
        taskToPathsMap.set(task.id, pathIndices);
        console.log(`[CrashProject] Task ${task.id} is on paths: ${pathIndices.join(', ')}, slope: ${task.slope}`);
      });
      
      // 输出当前关键路径信息
      currentCriticalPaths.forEach((path, idx) => {
        const crashableTasks = path.tasks.filter(tid => {
          const task = crashableTasksOnCurrentCriticalPaths.find(t => t.id === tid);
          return !!task;
        });
        console.log(`[CrashProject] Critical Path ${idx}: ${path.tasks.join('->')} 可压缩任务: ${crashableTasks.join(',')}`);
      });
      
      // 1. 当只有一条关键路径时
      if (currentCriticalPaths.length === 1) {
        console.log(`[CrashProject] 只有一条关键路径，选择斜率最小的任务`);
        // 按斜率排序任务
        crashableTasksOnCurrentCriticalPaths.sort((a, b) => (a.slope || Infinity) - (b.slope || Infinity));
        // 选择斜率最小的任务
        if (crashableTasksOnCurrentCriticalPaths.length > 0) {
          const bestTask = crashableTasksOnCurrentCriticalPaths[0];
          tasksToCompressFromSelection = [bestTask];
          console.log(`[CrashProject] 选择单任务 ${bestTask.id}，斜率=${bestTask.slope}`);
        }
      } 
      // 2. 当有多条关键路径时
      else {
        console.log(`[CrashProject] 有 ${currentCriticalPaths.length} 条关键路径，寻找共同任务或最佳组合`);
        
        // 创建一个候选列表，包含所有可能的单任务和任务组合
        let allCandidates: {
          tasks: CrashTask[],
          taskCount: number,
          totalSlope: number,
          reduction?: number
        }[] = [];
        
        // 2.1 查找共同任务并添加到候选列表
        const criticalTaskSets = currentCriticalPaths.map(path => new Set(path.tasks));
        const commonTasks = crashableTasksOnCurrentCriticalPaths.filter(task => 
          criticalTaskSets.every(taskSet => taskSet.has(task.id))
        );
        
        if (commonTasks.length > 0) {
          console.log(`[CrashProject] 找到 ${commonTasks.length} 个共同任务，添加到候选列表`);
          // 将共同任务添加到候选列表（作为单任务"组合"）
          commonTasks.forEach(task => {
            allCandidates.push({
              tasks: [task],
              taskCount: 1,
              totalSlope: task.slope || Infinity
            });
          });
        }
        
        // 2.2 生成所有可能的任务组合并添加到候选列表
        console.log(`[CrashProject] 生成所有可能的任务组合添加到候选列表`);
        
        // 生成所有可能的任务组合
        const generateAllPossibleCombinations = () => {
          const allTasks = crashableTasksOnCurrentCriticalPaths;
          let allCombinations: CrashTask[][] = [];
          
          // 添加所有单个任务（不在共同任务中的）
          allTasks.forEach(task => {
            if (!commonTasks.some(ct => ct.id === task.id)) {
              allCombinations.push([task]);
            }
          });
          
          // 添加所有2个任务的组合
          for (let i = 0; i < allTasks.length; i++) {
            for (let j = i + 1; j < allTasks.length; j++) {
              allCombinations.push([allTasks[i], allTasks[j]]);
            }
          }
          
          // 添加所有3个任务的组合（如果需要）
          if (currentCriticalPaths.length >= 3) {
            for (let i = 0; i < allTasks.length; i++) {
              for (let j = i + 1; j < allTasks.length; j++) {
                for (let k = j + 1; k < allTasks.length; k++) {
                  allCombinations.push([allTasks[i], allTasks[j], allTasks[k]]);
                }
              }
            }
          }
          
          return allCombinations;
        };
        
        // 将所有组合添加到候选列表
        const allCombinations = generateAllPossibleCombinations();
        allCombinations.forEach(combo => {
          // 计算组合的总斜率
          const totalSlope = combo.reduce((sum, task) => sum + (task.slope || Infinity), 0);
          allCandidates.push({
            tasks: combo,
            taskCount: combo.length,
            totalSlope
          });
        });
        
        console.log(`[CrashProject] 总共生成了 ${allCandidates.length} 个候选方案（包括共同任务和组合）`);
        
        // 2.3 评估所有候选方案
        // 测试每个候选方案的效果（是否能减少项目持续时间，减少多少）
        const evaluatedCandidates = allCandidates.map(candidate => {
          // 创建任务副本进行模拟
          let simTasks = JSON.parse(JSON.stringify(currentTasks));
          
          // 应用压缩
          candidate.tasks.forEach(task => {
            const simTask = simTasks.find((t: CrashTask) => t.id === task.id);
            if (simTask && simTask.duration > simTask.crashTime) {
              simTask.duration -= 1;
            }
          });
          
          // 计算新的路径持续时间
          const simPaths = this.calculateAllPaths(simTasks);
          const newPathDurations = simPaths.map(p => p.durations[0]);
          const newMaxDuration = newPathDurations.length > 0 ? Math.max(0, ...newPathDurations) : 0;
          
          // 计算减少的持续时间
          const reduction = previousCommittedMaxDuration - newMaxDuration;
          
          // 验证是否覆盖所有关键路径
          const coveredPathIndices = new Set<number>();
          simPaths.forEach((path) => {
            if (path.durations[0] < previousCommittedMaxDuration) {
              currentCriticalPaths.forEach((cPath, cIdx) => {
                // 如果路径任务序列相同，认为是同一条路径
                if (pathsAreEqual(path.tasks, cPath.tasks)) {
                  coveredPathIndices.add(cIdx);
                }
              });
            }
          });
          
          // 辅助函数：比较两个路径是否相同
          function pathsAreEqual(path1: string[], path2: string[]): boolean {
            if (path1.length !== path2.length) return false;
            for (let i = 0; i < path1.length; i++) {
              if (path1[i] !== path2[i]) return false;
            }
            return true;
          }
          
          return {
            ...candidate,
            reduction,
            coveredPathsCount: coveredPathIndices.size,
            allPathsCovered: coveredPathIndices.size === currentCriticalPaths.length
          };
        });
        
        // 2.4 筛选有效的候选方案（能减少项目持续时间且覆盖所有关键路径的）
        const effectiveCandidates = evaluatedCandidates.filter(c => 
          c.reduction > 0 && c.allPathsCovered
        );
        
        console.log(`[CrashProject] 找到 ${effectiveCandidates.length} 个有效的候选方案`);
        
        // 2.5 选择最优的候选方案
        if (effectiveCandidates.length > 0) {
          // 先按总斜率排序（升序）- 修改这里的排序依据，按斜率排序
          effectiveCandidates.sort((a, b) => a.totalSlope - b.totalSlope);
          
          // 找到总斜率最小的所有候选方案
          const minSlope = effectiveCandidates[0].totalSlope;
          const minSlopeCandidates = effectiveCandidates.filter(c => c.totalSlope === minSlope);
          
          console.log(`[CrashProject] 最小总斜率: ${minSlope}, 有 ${minSlopeCandidates.length} 个候选方案能达到此效果`);
          
          // 从总斜率最小的候选方案中，选择能减少最多时间的
          minSlopeCandidates.sort((a, b) => b.reduction - a.reduction);
          const maxReduction = minSlopeCandidates[0].reduction;
          const maxReductionCandidates = minSlopeCandidates.filter(c => c.reduction === maxReduction);
          
          console.log(`[CrashProject] 最大减少时间: ${maxReduction}, 有 ${maxReductionCandidates.length} 个候选方案满足条件`);
          
          // 从能减少最多时间的候选方案中，选择任务数量最少的
          maxReductionCandidates.sort((a, b) => a.taskCount - b.taskCount);
          const bestCandidate = maxReductionCandidates[0];
          
          // 选定最优方案
          tasksToCompressFromSelection = bestCandidate.tasks;
          
          // 输出最优方案信息
          console.log(`[CrashProject] 最优方案: ${bestCandidate.tasks.map(t => t.id).join('+')} | 减少=${bestCandidate.reduction}, 任务数=${bestCandidate.taskCount}, 斜率=${bestCandidate.totalSlope.toFixed(2)}`);
          
          // 打印所有有效候选方案详情（用于调试）
          console.log(`[CrashProject] 所有有效候选方案详情（按总斜率升序排列）:`);
          effectiveCandidates
            .sort((a, b) => a.totalSlope - b.totalSlope)
            .forEach(c => {
              console.log(`  - ${c.tasks.map(t => t.id).join('+')} | 减少=${c.reduction}, 任务数=${c.taskCount}, 斜率=${c.totalSlope.toFixed(2)}, 是共同任务=${commonTasks.some(ct => c.tasks.length === 1 && ct.id === c.tasks[0].id) ? '是' : '否'}`);
            });
        } else {
          // 如果没有找到有效的候选方案，尝试备选策略
          // 如果没有找到有效组合，回退到之前的策略
          if (taskToPathsMap.size > 0) {
            // 从Map的键中获取任务ID，然后找到对应的任务对象
            tasksToCompressFromSelection = Array.from(taskToPathsMap.keys())
              .map(taskId => crashableTasksOnCurrentCriticalPaths.find(t => t.id === taskId))
              .filter((task): task is CrashTask => task !== undefined);
            
            const totalSlope = tasksToCompressFromSelection.reduce((sum, task) => sum + (task.slope || Infinity), 0);
            console.log(`[CrashProject] 使用每条路径上斜率最小的任务组合: ${tasksToCompressFromSelection.map(t => t.id).join('+')}, 总斜率=${totalSlope}`);
          }
        }
      }
      
      // 为了调试，添加模拟测试，确认选择的任务是否能减少项目持续时间
      if (tasksToCompressFromSelection.length > 0) {
        // 创建任务副本进行模拟
        let simTasks = JSON.parse(JSON.stringify(currentTasks));
        
        // 应用压缩
        tasksToCompressFromSelection.forEach(task => {
          const simTask = simTasks.find((t: CrashTask) => t.id === task.id);
          if (simTask && simTask.duration > simTask.crashTime) {
            simTask.duration -= 1;
          }
        });
        
        // 计算新的路径持续时间
        const simPaths = this.calculateAllPaths(simTasks);
        const newMaxDuration = simPaths.length > 0 ? 
          Math.max(0, ...simPaths.map(p => p.durations[0])) : 0;
        
        const expectedReduction = previousCommittedMaxDuration - newMaxDuration;
        const totalSlope = tasksToCompressFromSelection.reduce((sum, task) => sum + (task.slope || Infinity), 0);
        
        console.log(`[CrashProject] 选定的任务组合 ${tasksToCompressFromSelection.map(t => t.id).join('+')} 预计减少时间: ${expectedReduction}, 总斜率: ${totalSlope}`);
      
        // 最终确认选择的任务
        currentIterationSelectedTaskIds = tasksToCompressFromSelection.map(t => t.id);
        console.log(`[CrashProject] Iteration ${iteration + 1}: 最终选择任务: ${currentIterationSelectedTaskIds.join(', ')}`);
      } else {
        console.log(`[CrashProject] Iteration ${iteration + 1}: 没有选到任何任务，停止压缩。`);
      }

      if (tasksToCompressFromSelection.length === 0) {
        if (costAnalysis.length > 0) costAnalysis[costAnalysis.length - 1].isCrashPoint = true;
        canContinueCrashing = false; break;
      }

      let hypotheticalNextTasksState: CrashTask[] = JSON.parse(JSON.stringify(currentTasks));
      const crashTimeReduction = 1;
      let actualTasksModifiedCount = 0;
      let actualCrashCostForThisStep = 0;

      tasksToCompressFromSelection.forEach(taskSpec => {
        const taskInHypo = hypotheticalNextTasksState.find(t => t.id === taskSpec.id);
        if (taskInHypo && taskInHypo.duration > taskInHypo.crashTime && (taskInHypo.maxCrashTime || 0) >= crashTimeReduction) {
          taskInHypo.duration -= crashTimeReduction;
          taskInHypo.maxCrashTime = (taskInHypo.maxCrashTime || 0) - crashTimeReduction;
          actualTasksModifiedCount++;
          actualCrashCostForThisStep += taskSpec.slope || 0;
        }
      });

      if (actualTasksModifiedCount === 0) {
        console.log(`[CrashProject] Iteration ${iteration + 1}: Selected task(s) could not actually be crashed further. Stopping.`);
        if (costAnalysis.length > 0) costAnalysis[costAnalysis.length - 1].isCrashPoint = true;
        canContinueCrashing = false; break;
      }

      const tempHypotheticalPaths = this.calculateAllPaths(hypotheticalNextTasksState);
      const hypotheticalNewMaxDuration = tempHypotheticalPaths.length > 0 ? Math.max(0, ...tempHypotheticalPaths.map(p => p.durations[0])) : 0;
      console.log(`[CrashProject] Iteration ${iteration + 1}: Hypothetical new max duration: ${hypotheticalNewMaxDuration}. Previous committed: ${previousCommittedMaxDuration}`);
      // Log all hypothetical path durations
      // tempHypotheticalPaths.forEach(p => console.log(`    Hypo Path ${p.tasks.join('->')}: ${p.durations[0]}`));

      if (hypotheticalNewMaxDuration < previousCommittedMaxDuration - EPSILON) {
        console.log(`[CrashProject] Iteration ${iteration + 1}: Duration REDUCED. Committing iteration.`);
        iteration++; // This is a valid new iteration number (e.g., 1st crash is iteration 1)
        currentTasks = hypotheticalNextTasksState;

        const currentTaskMap = new Map(currentTasks.map((t: CrashTask) => [t.id, t]));
        historicalPaths.forEach(pDetail => {
          const newDurationForPath = pDetail.tasks.reduce((sum, taskId) => sum + (currentTaskMap.get(taskId)?.duration || 0), 0);
          while (pDetail.durations.length <= iteration) {
            // Pad with previous duration if iteration was skipped or for new paths
            pDetail.durations.push(pDetail.durations.length > 0 ? pDetail.durations[pDetail.durations.length -1] : 0);
          }
          pDetail.durations[iteration] = newDurationForPath;
          pDetail.isCritical = Math.abs(newDurationForPath - hypotheticalNewMaxDuration) < EPSILON;
        });
        
        // Update currentCriticalPaths for the next loop's selection phase based on newly committed state
        // This was missing, leading to potentially stale critical path analysis for task selection.
        currentCriticalPaths = historicalPaths.filter(p => p.isCritical && p.durations.length > iteration && Math.abs(p.durations[iteration] - hypotheticalNewMaxDuration) < EPSILON);

        const prevCostItem = costAnalysis[costAnalysis.length - 1];
        const newDirectCost = prevCostItem.directCost + actualCrashCostForThisStep;
        const daysReducedTotal = initialMaxDuration - hypotheticalNewMaxDuration;
        const newIndirectCostValue = indirectCostInput - (daysReducedTotal * reductionPerUnitInput);
        
        costAnalysis.push({
          projectDuration: hypotheticalNewMaxDuration,
          crashedActivities: [...currentIterationSelectedTaskIds],
          crashCost: actualCrashCostForThisStep,
          directCost: newDirectCost,
          indirectCost: newIndirectCostValue,
          totalCost: newDirectCost + newIndirectCostValue,
          isOptimum: false,
          isCrashPoint: false
        });
        crashedTasksHistory.push(JSON.parse(JSON.stringify(currentTasks)));
        previousCommittedMaxDuration = hypotheticalNewMaxDuration;
      } else {
        console.log(`[CrashProject] Iteration ${iteration + 1}: Duration NOT reduced or increased (${hypotheticalNewMaxDuration} vs ${previousCommittedMaxDuration}). Stopping.`);
        if (costAnalysis.length > 0) costAnalysis[costAnalysis.length - 1].isCrashPoint = true;
        canContinueCrashing = false;
      }
    }
    console.log(`[CrashProject] Loop finished. Total committed iterations: ${iteration}`);

    if (costAnalysis.length > 0) {
        const minCostIndex = costAnalysis.reduce((minIndex, item, index, arr) => 
            item.totalCost < arr[minIndex].totalCost ? index : minIndex, 0);
        if (costAnalysis[minCostIndex]) costAnalysis[minCostIndex].isOptimum = true;
    }
    
    // Ensure the returned criticalPaths are from the very last COMMITTED state.
    // `iteration` here is the count of committed crashes (e.g., if 1 crash, iteration is 1).
    // So, durations[iteration] is the correct index for the last committed state.
    const finalCommittedDuration = previousCommittedMaxDuration; // This holds the duration of the last validly committed iteration
    const finalCriticalPaths = historicalPaths.filter(p => 
        p.durations.length > iteration && 
        Math.abs(p.durations[iteration] - finalCommittedDuration) < EPSILON
    );

    return {
      crashedTasks: crashedTasksHistory,
      paths: historicalPaths,
      criticalPaths: finalCriticalPaths, 
      costAnalysis
    };
  }
  
  /**
   * 计算任务的松弛时间
   */
  static calculateSlackTimes(tasks: CrashTask[], _criticalPathsForSlack?: CrashPath[]): CrashTask[] {
    const taskMap = new Map<string, CrashTask>();
    tasks.forEach(task => taskMap.set(task.id, { ...task }));
    const EPSILON = 0.000001;

    const earlyTimes: { [key: string]: { earlyStart: number, earlyFinish: number } } = {};
    const startNodes = tasks.filter(task => task.predecessors.length === 0);
    startNodes.forEach(task => {
      earlyTimes[task.id] = { earlyStart: 0, earlyFinish: task.duration };
    });

    const sortedTasks = this.topologicalSort(tasks);
    for (const task of sortedTasks) {
      if (earlyTimes[task.id]) continue;
      let maxPredEF = 0;
      task.predecessors.forEach(pred => {
        if (earlyTimes[pred.taskId]) {
          maxPredEF = Math.max(maxPredEF, earlyTimes[pred.taskId].earlyFinish);
        }
      });
      earlyTimes[task.id] = { earlyStart: maxPredEF, earlyFinish: maxPredEF + task.duration };
    }

    const projectDurationFromESEF = Math.max(0, ...Object.values(earlyTimes).map(time => time.earlyFinish));
    const lateTimes: { [key: string]: { lateStart: number, lateFinish: number } } = {};
    const endNodes = tasks.filter(task => !tasks.some(t => t.predecessors.some(p => p.taskId === task.id)));

    endNodes.forEach(task => {
      lateTimes[task.id] = { lateFinish: projectDurationFromESEF, lateStart: projectDurationFromESEF - task.duration };
    });

    for (const task of [...sortedTasks].reverse()) {
      if (lateTimes[task.id]) continue;
      const successors = tasks.filter(t => t.predecessors.some(p => p.taskId === task.id));
      let minSuccLS = projectDurationFromESEF;
      if (successors.length > 0) {
        minSuccLS = Infinity;
        successors.forEach(succ => {
          if (lateTimes[succ.id]) {
            minSuccLS = Math.min(minSuccLS, lateTimes[succ.id].lateStart);
          }
        });
      }
      lateTimes[task.id] = { lateFinish: minSuccLS, lateStart: minSuccLS - task.duration };
    }
    
    return tasks.map(originalTask => {
      const taskFromMap = taskMap.get(originalTask.id)!;
      const early = earlyTimes[taskFromMap.id] || { earlyStart: 0, earlyFinish: taskFromMap.duration };
      const late = lateTimes[taskFromMap.id] || { lateStart: projectDurationFromESEF - taskFromMap.duration, lateFinish: projectDurationFromESEF };
      const slack = late.lateStart - early.earlyStart;
      return {
        ...originalTask,
        earlyStart: early.earlyStart,
        earlyFinish: early.earlyFinish,
        lateStart: late.lateStart,
        lateFinish: late.lateFinish,
        slack: Math.abs(slack) < EPSILON ? 0 : slack,
        isCritical: Math.abs(slack) < EPSILON
      };
    });
  }
  
  /**
   * 使用拓扑排序获取任务列表
   */
  private static topologicalSort(tasks: CrashTask[]): CrashTask[] {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const taskMap = new Map<string, CrashTask>();

    tasks.forEach(task => {
      taskMap.set(task.id, task);
      adj.set(task.id, []);
      inDegree.set(task.id, 0);
    });

    tasks.forEach(task => {
      task.predecessors.forEach(pred => {
        if (adj.has(pred.taskId)) {
            adj.get(pred.taskId)!.push(task.id);
            inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        } else {
            console.warn(`Task ${task.id} lists predecessor ${pred.taskId} which is not found in the tasks list during sort graph construction.`);
        }
      });
    });

    const queue: string[] = [];
    tasks.forEach(task => {
      if (inDegree.get(task.id) === 0) {
        queue.push(task.id);
      }
    });

    const sortedResult: CrashTask[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sortedResult.push(taskMap.get(u)!);
      (adj.get(u) || []).forEach(v => {
        inDegree.set(v, (inDegree.get(v) || 1) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      });
    }
    if (sortedResult.length !== tasks.length) {
      console.warn("Topological sort result length mismatch. Possible cycle or orphaned tasks.");
    }
    return sortedResult;
  }
} 