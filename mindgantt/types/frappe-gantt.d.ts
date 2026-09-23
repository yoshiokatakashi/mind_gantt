declare module "frappe-gantt" {
  export type GanttTaskInput = {
    id: string;
    name: string;
    start: string;
    end: string;
    progress?: number;
  };

  export type GanttOptions = {
    view_mode?: "Day" | "Week" | "Month" | "Year";
    view_mode_select?: boolean;
    bar_height?: number;
    bar_corner_radius?: number;
    padding?: number;
    today_button?: boolean;
    readonly?: boolean;
    on_click?: (task: GanttTaskInput) => void;
    on_date_change?: (task: GanttTaskInput, start: Date, end: Date) => void;
    on_progress_change?: (task: GanttTaskInput, progress: number) => void;
  };

  export default class Gantt {
    constructor(wrapper: string | HTMLElement, tasks: GanttTaskInput[], options?: GanttOptions);
    refresh(tasks: GanttTaskInput[]): void;
    update_task(taskId: string, newDetails: Partial<GanttTaskInput>): void;
    change_view_mode(mode: string, maintainPos?: boolean): void;
  }
}
