import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { getToken } from './api.service';
import { environment } from '../../environments/environment';
import type {
  AnswerSubmittedEvent,
  GameFinishedEvent,
  GameStartedEvent,
  JokerUsedEvent,
  PlayerAvatarUpdatedEvent,
  PlayerJoinedEvent,
  QuestionStartedEvent,
  RoomPlayersUpdatedEvent,
} from '../models/types';

const HUB_URL = `${environment.apiUrl.replace(/\/$/, '')}/hubs/game`;

@Injectable({ providedIn: 'root' })
export class GameHubService {
  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<signalR.HubConnection> | null = null;
  private joinedSessions = new Set<string>();

  readonly playerJoined$ = new Subject<PlayerJoinedEvent>();
  readonly roomPlayersUpdated$ = new Subject<RoomPlayersUpdatedEvent>();
  readonly gameStarted$ = new Subject<GameStartedEvent>();
  readonly questionStarted$ = new Subject<QuestionStartedEvent>();
  readonly answerSubmitted$ = new Subject<AnswerSubmittedEvent>();
  readonly jokerUsed$ = new Subject<JokerUsedEvent>();
  readonly gameFinished$ = new Subject<GameFinishedEvent>();
  readonly playerAvatarUpdated$ = new Subject<PlayerAvatarUpdatedEvent>();

  getConnection(): Promise<signalR.HubConnection> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve(this.connection);
    }

    if (this.connection?.state === signalR.HubConnectionState.Connecting && this.startPromise) {
      return this.startPromise;
    }

    if (this.connection?.state === signalR.HubConnectionState.Reconnecting) {
      return Promise.resolve(this.connection);
    }

    if (this.connection && this.startPromise) {
      this.connection = null;
      this.startPromise = null;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.onreconnected(() => {
      void this.rejoinGroups();
    });

    this.registerHandlers(this.connection);

    this.startPromise = this.connection
      .start()
      .then(() => this.connection!)
      .catch((err) => {
        this.startPromise = null;
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
    connection.on('AnswerSubmitted', (event: AnswerSubmittedEvent) =>
      this.answerSubmitted$.next(event),
    );
    connection.on('JokerUsed', (event: JokerUsedEvent) => this.jokerUsed$.next(event));
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

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
    this.startPromise = null;
  }
}
