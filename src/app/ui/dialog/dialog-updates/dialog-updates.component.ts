import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IUpdateMessage } from 'src/app/models/update-message.model';
import { UpdatesService } from 'src/app/infra/updates.service';
import { SettingsService } from 'src/app/infra/settings.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-dialog-updates',
  templateUrl: './dialog-updates.component.html',
  styleUrls: ['./dialog-updates.component.scss']
})
export class DialogUpdatesComponent implements OnInit {

  public updates: IUpdateMessage[] = [];
  public currentIndex: number = 0;
  public loading: boolean = true;
  public error: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<DialogUpdatesComponent>,
    private updatesService: UpdatesService,
    private settingsService: SettingsService,
    @Inject(MAT_DIALOG_DATA) public data: { lastUpdate: number }
  ) { }

  ngOnInit(): void {
    this.updatesService.getUpdates().pipe(
      catchError(() => {
        this.error = true;
        this.loading = false;
        return of([]);
      })
    ).subscribe(updates => {
      if (this.error) return;

      // Get last 5 updates
      this.updates = updates.slice(-5);
      
      // Determine initial index
      const lastUpdate = this.data.lastUpdate;
      
      const firstNewIndex = this.updates.findIndex(u => u.id > lastUpdate);
      
      if (firstNewIndex !== -1) {
          this.currentIndex = firstNewIndex;
      } else {
          this.currentIndex = Math.max(0, this.updates.length - 1);
      }
      
      this.loading = false;
      
      // Update lastUpdate to the highest ID seen
      if (this.updates.length > 0) {
          const maxId = Math.max(...this.updates.map(u => u.id));
          if (maxId > lastUpdate) {
              this.settingsService.setLastUpdate(maxId).subscribe();
          }
      }
    });
  }

  public next(): void {
    if (this.currentIndex < this.updates.length - 1) {
      this.currentIndex++;
    }
  }

  public prev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  public close(): void {
    this.dialogRef.close();
  }
}
