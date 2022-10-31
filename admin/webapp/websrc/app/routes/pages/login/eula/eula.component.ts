import {Component, OnInit, Output, EventEmitter} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {AgreementComponent} from "@routes/pages/login/eula/agreement/agreement.component";


@Component({
  selector: 'app-eula',
  templateUrl: './eula.component.html',
  styleUrls: ['./eula.component.scss']
})
export class EulaComponent implements OnInit {

  isEULAPageOpened = true;

  @Output() eulaStatus = new EventEmitter<boolean>();

  constructor(
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
  }

  openEULAPage(){
    this.isEULAPageOpened = false;
    this.dialog.open(
      AgreementComponent,
      {
        disableClose: true,
        width: '80vw',
        height: '685px'
      }
    );
  }

  onCheck(isChecked: boolean){
    this.eulaStatus.emit(isChecked);
  }

}
