import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IUpdateMessage } from '../models/update-message.model';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UpdatesService {

    constructor(private http: HttpClient) { }

    public getUpdates(): Observable<IUpdateMessage[]> {
        return this.http.get<IUpdateMessage[]>(environment.updatesUrl);
    }
}
