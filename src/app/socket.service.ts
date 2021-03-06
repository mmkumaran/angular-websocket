// ----------------------------------------------------------------------
// Copyright 2019 Schlumberger. All rights reserved in Schlumberger
// authored and generated code (including the selection and
// arrangement of the source code base regardless of the authorship
// of individual files), but not including any copyright interest(s)
// owned by a third party related to source code or object code
// authored or generated by non-Schlumberger personnel.
//
// This source code includes Schlumberger confidential and/or
// proprietary information and may include Schlumberger trade secrets.
// Any use, disclosure and/or reproduction is prohibited unless
// authorized in writing.
//
// Publication Rights :: Schlumberger Private
// ----------------------------------------------------------------------
import { Injectable, NgZone } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';

import * as io from 'socket.io-client';

@Injectable()
export class SocketService {
  private socket: io;

  private connectivitySubject: BehaviorSubject<boolean> = new BehaviorSubject(true);
  connectivity: Observable<boolean> = this.connectivitySubject.asObservable().pipe(delay(5000));

  constructor(private ngZone: NgZone) {
    this.ngZone.runOutsideAngular(() => {
      this.socket = io({
        transports: ['websocket'],
        upgrade: false,
        path: '/socket-api',
        reconnectionAttempts: 2,
        reconnectionDelay: 1000
      });
      setupSocketConnection(this.socket, this.connectivitySubject);
    });
  }

  bffSubscribeRaw(room: string, callback: (data) => void): void {
    this.socket.on(room, callback);
    this.socket.emit(`data`);
  }

  bffSubscribe<T>(room: string, subject: BehaviorSubject<T>): void {
    const callback = data => {
      this.ngZone.run(() => {
        subject.next(data);
      });
    };

    this.bffSubscribeRaw(room, callback);
  }

  listenOn(eventType: string, callback: any) {
    this.socket.on(eventType, data => {
      this.ngZone.run(() => {
        callback(data);
      });
    });
  }

  listen(event: string): Observable<any> {
    return new Observable(observer => {
      this.socket.on(event, data => {
        observer.next(data);
      });
      // dispose of the event listener when unsubscribed
      return () => this.socket.off(event);
    });
  }

  removeListener(eventType: string) {
    this.socket.off(eventType);
  }
  bffEmit(room: string, data?: any): void {
    if (data) {
      this.socket.emit(room, data);
    } else {
      this.socket.emit(room);
    }
  }

  public closeSocketConnection(): void {
    this.socket.close();
  }
}

function setupSocketConnection(socket: io, connectivitySubject: BehaviorSubject<boolean>): void {
  socket.on('connect', sock => {
    connectivitySubject.next(true);
  });

  socket.on('connect_error', error => {
    console.error(error);
    connectivitySubject.next(false);
  });

  socket.on('disconnect', (reason: string) => {
    console.log(reason);
    connectivitySubject.next(false);
  });
}
