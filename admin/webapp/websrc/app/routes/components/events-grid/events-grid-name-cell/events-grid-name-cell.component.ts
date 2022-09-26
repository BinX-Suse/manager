import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-events-grid-name-cell',
  templateUrl: './events-grid-name-cell.component.html',
  styleUrls: ['./events-grid-name-cell.component.scss'],
})
export class EventsGridNameCellComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;
  name!: string;
  isParent!: boolean;
  get isChildVisible() {
    return this.params.data.visible;
  }

  constructor() {}

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.name = params.data.name;
    this.isParent = !params.data.parent_id && params.data.child_id;
  }

  refresh(params: ICellRendererParams): boolean {
    return false;
  }

  toggleVisible(): void {
    this.params.data.visible = !this.params.data.visible;
    const child_node = this.params.api.getRowNode(this.params.data.child_id);
    if (child_node) child_node.data.visible = !child_node.data.visible;
    this.params.api.onFilterChanged();
  }
}
