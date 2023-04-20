import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Apikey, ApikeyGetResponse, ErrorResponse } from '@common/types';
import { UtilsService } from '@common/utils/app.utils';
import { GlobalVariable } from '@common/variables/global.variable';
import { TranslateService } from '@ngx-translate/core';
import {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ICellRendererParams,
} from 'ag-grid-community';
import * as moment from 'moment';
import * as $ from 'jquery';
import { ApikeysGridStateCellComponent } from './apikeys-grid-state-cell/apikeys-grid-state-cell.component';
import { ApikeysGridExpirationCellComponent } from './apikeys-grid-expiration-cell/apikeys-grid-expiration-cell.component';
import { ApikeysGridActionCellComponent } from './apikeys-grid-action-cell/apikeys-grid-action-cell.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '@components/ui/confirm-dialog/confirm-dialog.component';
import { finalize, switchMap, take } from 'rxjs/operators';
import { SettingsService } from '@services/settings.service';
import { NotificationService } from '@services/notification.service';
import { AddApikeyDialogComponent } from './add-apikey-dialog/add-apikey-dialog.component';
import { updateGridData } from '@common/utils/common.utils';
import { MapConstant } from '@common/constants/map.constant';

@Component({
  selector: 'app-apikeys-grid',
  templateUrl: './apikeys-grid.component.html',
  styleUrls: ['./apikeys-grid.component.scss'],
})
export class ApikeysGridComponent implements OnInit {
  private readonly $win;
  domains!: string[];
  globalRoles!: string[];
  domainRoles!: string[];
  now_ts = Date.now() / 1000;
  _rowData!: Apikey[];
  @Input() set apikeyData(value: {
    apikeyData: ApikeyGetResponse;
    domains: string[];
  }) {
    this._rowData = value.apikeyData.apikeys;
    if (value.domains.length) {
      this.domains = value.domains;
    }
    this.globalRoles = value.apikeyData.global_roles.filter(
      role =>
        ![
          MapConstant.FED_ROLES.FEDADMIN,
          MapConstant.FED_ROLES.FEDREADER,
        ].includes(role)
    );
    this.domainRoles = value.apikeyData.domain_roles;
    if (this.gridApi) {
      this.gridApi.setRowData(this.rowData);
      this.gridApi.sizeColumnsToFit();
    }
  }
  get rowData() {
    return this._rowData;
  }
  @Output() refreshData = new EventEmitter<void>();
  gridOptions!: GridOptions;
  gridApi!: GridApi;
  get apikeyCount() {
    return this.rowData.length;
  }
  columnDefs: ColDef[] = [
    {
      headerName: this.tr.instant('apikey.gridHeader.STATE'),
      cellRenderer: 'stateCellRenderer',
      cellClass: ['d-flex', 'align-items-center', 'justify-content-center'],
      valueGetter: params => params.data.expiration_timestamp > this.now_ts,
      width: 80,
    },
    {
      headerName: this.tr.instant('apikey.gridHeader.NAME'),
      field: 'apikey_name',
    },
    {
      headerName: this.tr.instant('apikey.gridHeader.DESCRIPTION'),
      field: 'description',
    },
    {
      headerName: this.tr.instant('apikey.gridHeader.ROLE'),
      field: 'role',
    },
    {
      headerName: this.tr.instant('apikey.gridHeader.EXPIRES'),
      cellRenderer: 'expirationCellRenderer',
    },
    {
      headerName: this.tr.instant('apikey.gridHeader.AGE'),
      cellRenderer: params => {
        return this.utils.humanizeDuration(
          moment.duration(
            moment().diff(moment.unix(params.data.created_timestamp))
          )
        );
      },
      comparator: (value1, value2, node1, node2) => {
        return node1.data.created_timestamp - node2.data.created_timestamp;
      },
    },
    {
      sortable: false,
      cellRenderer: 'actionCellRenderer',
      cellRendererParams: {
        delete: event => this.deleteApikey(event),
      },
      cellClass: ['d-flex', 'align-items-center', 'justify-content-end'],
      width: 80,
    },
  ];

  constructor(
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private utils: UtilsService,
    private tr: TranslateService
  ) {
    this.$win = $(GlobalVariable.window);
  }

  ngOnInit(): void {
    this.gridOptions = this.utils.createGridOptions(this.columnDefs, this.$win);
    this.gridOptions = {
      ...this.gridOptions,
      rowHeight: 40,
      rowData: this.rowData,
      onGridReady: event => this.onGridReady(event),
      components: {
        stateCellRenderer: ApikeysGridStateCellComponent,
        expirationCellRenderer: ApikeysGridExpirationCellComponent,
        actionCellRenderer: ApikeysGridActionCellComponent,
      },
    };
  }

  onResize(): void {
    this.gridApi.sizeColumnsToFit();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  createApikey(): void {
    this.settingsService.createApikey().subscribe(apikeyInit => {
      const addDialogRef = this.dialog.open(AddApikeyDialogComponent, {
        width: '80%',
        maxWidth: '1100px',
        data: {
          apikeyInit: apikeyInit,
          globalRoles: this.globalRoles,
          domainRoles: this.domainRoles,
          domains: this.domains,
        },
      });
      addDialogRef.componentInstance.confirm
        .pipe(
          take(1),
          switchMap((apikey: Apikey) => this.settingsService.addApikey(apikey)),
          finalize(() => {
            addDialogRef.componentInstance.saving$.next(false);
            addDialogRef.componentInstance.onNoClick();
          })
        )
        .subscribe({
          complete: () => {
            this.notificationService.open(this.tr.instant('apikey.msg.ADD_OK'));
            setTimeout(() => this.refreshData.emit(), 1000);
          },
          error: ({ error }: { error: ErrorResponse }) => {
            this.notificationService.openError(
              error,
              this.tr.instant('apikey.msg.ADD_NG')
            );
          },
        });
    });
  }

  deleteApikey(event: ICellRendererParams): void {
    const name = event.data.apikey_name;
    const deleteMessage = this.tr.instant('apikey.msg.REMOVE_CFM', {
      name,
    });
    const deleteDialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '80%',
      maxWidth: '600px',
      data: {
        message: deleteMessage,
      },
    });
    deleteDialogRef.componentInstance.confirm
      .pipe(
        take(1),
        switchMap(() => this.settingsService.deleteApikey(name)),
        finalize(() => {
          deleteDialogRef.componentInstance.onCancel();
          deleteDialogRef.componentInstance.loading = false;
        })
      )
      .subscribe({
        next: () => {
          this.notificationService.open(
            this.tr.instant('apikey.msg.REMOVE_OK')
          );
          updateGridData(
            this.rowData,
            [{ apikey_name: name }],
            this.gridOptions.api!,
            'apikey_name',
            'delete'
          );
        },
        error: ({ error }: { error: ErrorResponse }) => {
          this.notificationService.openError(
            error,
            this.tr.instant('apikey.msg.REMOVE_NG')
          );
        },
      });
  }
}
