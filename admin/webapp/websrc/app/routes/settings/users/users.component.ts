import { Component, OnInit } from '@angular/core';
import { MapConstant } from '@common/constants/map.constant';
import { AuthUtilsService } from '@common/utils/auth.utils';
import { SettingsService } from '@services/settings.service';
import { combineLatest, of, Subject } from 'rxjs';
import {
  catchError,
  map,
  pluck,
  repeatWhen,
  switchMap,
  tap,
} from 'rxjs/operators';
import { MultiClusterService } from '@services/multi-cluster.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  private _switchClusterSubscription;
  private refreshUserSubject$ = new Subject();
  private refreshRoleSubject$ = new Subject();
  private refreshPwdProfileSubject$ = new Subject();
  activeTabIndex: number = 0;
  error: unknown;
  globalRoles!: string[];
  users$ = this.settingsService.getUsers().pipe(
    tap(user => {
      this.globalRoles = user.global_roles;
    }),
    pluck('users')
  );
  domain$ = this.settingsService.getDomain();
  userData$ = combineLatest([this.users$, this.domain$]).pipe(
    map(([users, domain]) => {
      return {
        users,
        domains: domain.domains
          .map(d => d.name)
          .filter(name => name.charAt(0) !== '_'),
      };
    }),
    catchError(err => {
      this.error = err;
      throw err;
    }),
    repeatWhen(() => this.refreshUserSubject$)
  );
  roleData$ = this.refreshRoleSubject$.pipe(
    switchMap(() =>
      this.settingsService.getRoles().pipe(
        catchError(err => {
          if (
            [MapConstant.NOT_FOUND, MapConstant.ACC_FORBIDDEN].includes(
              err.status
            )
          ) {
            return of([]);
          } else {
            this.error = err;
            throw err;
          }
        })
      )
    )
  );
  pwdProfile$ = this.refreshPwdProfileSubject$.pipe(
    switchMap(() => this.settingsService.getPwdProfile())
  );
  isReadPasswordProfileAuthorized!: boolean;
  isUpdatePasswordProfileAuthorized!: boolean;

  constructor(
    private settingsService: SettingsService,
    private multiClusterService: MultiClusterService,
    private authUtils: AuthUtilsService
  ) {}

  ngOnInit(): void {
    this.isReadPasswordProfileAuthorized =
      this.authUtils.getDisplayFlagByMultiPermission(
        'read_password_profile_1'
      ) ||
      this.authUtils.getDisplayFlagByMultiPermission(
        'read_password_profile_2'
      ) ||
      this.authUtils.getDisplayFlagByMultiPermission('read_password_profile_3');
    this.isUpdatePasswordProfileAuthorized =
      this.authUtils.getDisplayFlagByMultiPermission('update_password_profile');
    this._switchClusterSubscription =
      this.multiClusterService.onClusterSwitchedEvent$.subscribe(() => {
        this.onSwitchTab();
      });
  }

  activateTab(event): void {
    this.activeTabIndex = event.index;
    this.onSwitchTab();
  }

  private onSwitchTab() {
    switch (this.activeTabIndex) {
      case 0:
        this.refreshUserSubject$.next(true);
        break;
      case 1:
        this.refreshRoleSubject$.next(true);
        break;
      case 2:
        this.refreshPwdProfileSubject$.next(true);
    }
  }

  refreshUsers(): void {
    this.refreshUserSubject$.next(true);
  }

  refreshRoles(): void {
    this.refreshRoleSubject$.next(true);
  }
}
