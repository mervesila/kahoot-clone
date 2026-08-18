import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { getToken } from './api.service';
import { environment } from '../../environments/environment';
import type {
  AnswerSubmittedEvent,
  GameFinishedEvent,
  GameStartedEvent,
  PlayerAvatarUpdatedEvent,
  PlayerJoinedEvent,
  QuestionStartedEvent,
  RoomPlayersUpdatedEvent,
} from '../models/types';

const HUB_URL = `${environment.apiUrl.replace(/\/$/, '')}/hubs/game`;

const RECONNECT_DELAY_MS = 5000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable({ providedIn: 'root' })
export class GameHubService {
  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<signalR.HubConnection> | null = null;
  private joinedSessions = new Set<string>();
  private stopped = false;

  readonly playerJoined$ = new Subject<PlayerJoinedEvent>();
  readonly roomPlayersUpdated$ = new Subject<RoomPlayersUpdatedEvent>();
  readonly gameStarted$ = new Subject<GameStartedEvent>();
  readonly questionStarted$ = new Subject<QuestionStartedEvent>();
  readonly gameStateChanged$ = new Subject<QuestionStartedEvent>();
  readonly answerSubmitted$ = new Subject<AnswerSubmittedEvent>();
  readonly gameFinished$ = new Subject<GameFinishedEvent>();
  readonly playerAvatarUpdated$ = new Subject<PlayerAvatarUpdatedEvent>();

  getConnection(): Promise<signalR.HubConnection> {
    this.stopped = false;

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve(this.connection);
    }

    if (
      this.connection?.state === signalR.HubConnectionState.Connecting ||
      this.connection?.state === signalR.HubConnectionState.Reconnecting
    ) {
      if (this.startPromise) {
        return this.startPromise;
      }
      return Promise.resolve(this.connection);
    }

    if (this.connection && this.startPromise) {
      this.connection = null;
      this.startPromise = null;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => getToken() ?? '',
      })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => RECONNECT_DELAY_MS })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection = connection;
    this.registerHandlers(connection);

    connection.onreconnected(() => {
      void this.rejoinGroups();
    });

    connection.onclose(() => {
      this.startPromise = null;
      void this.silentRetry();
    });

    this.startPromise = connection
      .start()
      .then(() => this.connection!)
      .catch((err) => {
        this.startPromise = null;
        void this.silentRetry();
        throw err;
      });

    return this.startPromise;
  }

  private registerHandlers(connection: signalR.HubConnection): void {
    connection.on('PlayerJoined', (event: PlayerJoinedEvent) => this.playerJoined$.next(event));
    connection.on('RoomPlayersUpdated', (event: RoomPlayersUpdatedEvent) =>
      this.roomPlayersUpdated$.next(event),
    );
    connection.on('GameStarted', (event: GameStartedEvent) => this.gameStarted$.next(event));
    connection.on('QuestionStarted', (event: QuestionStartedEvent) =>
      this.questionStarted$.next(event),
    );
    connection.on('GameStateChanged', (event: QuestionStartedEvent) =>
      this.gameStateChanged$.next(event),
    );
    connection.on('AnswerSubmitted', (event: AnswerSubmittedEvent) =>
      this.answerSubmitted$.next(event),
    );
    connection.on('GameFinished', (event: GameFinishedEvent) => this.gameFinished$.next(event));
    connection.on('PlayerAvatarUpdated', (event: PlayerAvatarUpdatedEvent) =>
      this.playerAvatarUpdated$.next(event),
    );
  }

  async joinGameGroup(sessionId: string): Promise<void> {
    this.joinedSessions.add(sessionId);
    const connection = await this.getConnection();
    await connection.invoke('JoinGameGroup', sessionId);
  }

  async leaveGameGroup(sessionId: string): Promise<void> {
    this.joinedSessions.delete(sessionId);
    const connection = await this.getConnection();
    await connection.invoke('LeaveGameGroup', sessionId);
  }

  async updatePlayerAvatar(
    sessionId: string,
    playerId: string,
    emoji: string,
    color: string,
  ): Promise<void> {
    const connection = await this.getConnection();
    await connection.invoke('UpdatePlayerAvatar', sessionId, playerId, emoji, color);
  }

  private async rejoinGroups(): Promise<void> {
    for (const sessionId of this.joinedSessions) {
      try {
        await this.connection?.invoke('JoinGameGroup', sessionId);
      } catch {
        // bağlantı yeniden kurulduğunda grup üyelikleri tekrar eklenir
      }
    }
  }

  private async silentRetry(): Promise<void> {
    await delay(RECONNECT_DELAY_MS);
    if (this.stopped) {
      return;
    }
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }
    try {
      await this.getConnection();
      await this.rejoinGroups();
    } catch {
      // Bağlantı kurulamazsa kullanıcıya gösterilmez, arka planda denemeye devam edilir.
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
    this.startPromise = null;
  }
}
