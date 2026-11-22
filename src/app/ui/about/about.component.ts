import { Component, OnInit } from '@angular/core';
import { ReviewService } from 'src/app/infra/review.service';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

    constructor(
        private reviewService: ReviewService
    ) { }

    public ngOnInit(): void {
    }

    public rateApp(): void {
        this.reviewService.openStorePage();
    }

    public openKofi(): void {
        window.open('https://ko-fi.com/kimida', '_blank');
    }

}
