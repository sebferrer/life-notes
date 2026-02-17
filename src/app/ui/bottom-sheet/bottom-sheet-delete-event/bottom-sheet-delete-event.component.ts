import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

export interface IDeleteConfirmationDetails {
    type: 'med' | 'log';
    name: string;
    dateLabel: string;
    timeLabel: string;
    quantityLabel?: string;
    detail?: string;
}

@Component({
    selector: 'app-bottom-sheet-delete-event',
    templateUrl: 'bottom-sheet-delete-event.component.html',
    styleUrls: ['bottom-sheet-delete-event.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetDeleteEventComponent {
    @Input() public title: string;
    @Input() public message: string;
    @Input() public warning: string;
    @Input() public itemDetails: IDeleteConfirmationDetails;

    @Output() public confirm = new EventEmitter<void>();
    @Output() public cancel = new EventEmitter<void>();

    constructor() { }

    public onConfirm(): void {
        this.confirm.emit();
    }

    public onCancel(): void {
        this.cancel.emit();
    }
}
