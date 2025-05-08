// 依赖关系类型
export enum DependencyType {
  FS = 'Finish-to-Start', // 前置任务完成后，后续任务才能开始（最常见）
  FF = 'Finish-to-Finish', // 前置任务完成后，后续任务才能完成
  SS = 'Start-to-Start',  // 前置任务开始后，后续任务才能开始
  SF = 'Start-to-Finish'  // 前置任务开始后，后续任务才能完成（最少见）
}

// 当前系统仅支持FS类型，其他类型为未来扩展预留
export interface Dependency {
  fromTaskId: string;
  toTaskId: string;
  type: DependencyType;
  lag: number; // 延迟天数，正数表示延迟，负数表示提前
}

// 依赖关系计算策略接口 - 为支持不同依赖类型的计算提供扩展点
export interface DependencyCalculationStrategy {
  calculateEarlyDates(fromTask: any, toTask: any, lag: number): void;
  calculateLateDates(fromTask: any, toTask: any, lag: number): void;
}

// FS依赖关系计算策略（当前版本实现）
export class FSCalculationStrategy implements DependencyCalculationStrategy {
  calculateEarlyDates(fromTask: any, toTask: any, lag: number): void {
    // 前置任务结束后 + 延迟 = 后续任务最早开始
    const possibleStart = fromTask.earlyFinish + lag;
    if (toTask.earlyStart === undefined || possibleStart > toTask.earlyStart) {
      toTask.earlyStart = possibleStart;
      toTask.earlyFinish = toTask.earlyStart + toTask.duration;
    }
  }

  calculateLateDates(fromTask: any, toTask: any, lag: number): void {
    // 后续任务最晚开始 - 延迟 = 前置任务最晚结束
    const possibleFinish = toTask.lateStart - lag;
    if (fromTask.lateFinish === undefined || possibleFinish < fromTask.lateFinish) {
      fromTask.lateFinish = possibleFinish;
      fromTask.lateStart = fromTask.lateFinish - fromTask.duration;
    }
  }
}

// 工厂方法 - 根据依赖类型创建相应的计算策略
export function createDependencyStrategy(type: DependencyType): DependencyCalculationStrategy {
  // 当前版本只支持FS，其他类型为未来扩展预留
  return new FSCalculationStrategy();
} 