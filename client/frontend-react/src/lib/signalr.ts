import * as signalR from '@microsoft/signalr'
import { getToken } from './api'

const HUB_URL = import.meta.env.VITE_SIGNALR_URL ?? '/hubs/game'

class SignalRManager {
  private connection: signalR.HubConnection | null = null
  private startPromise: Promise<signalR.HubConnection> | null = null
  private joinedSessions = new Set<string>()

  getConnection(): Promise<signalR.HubConnection> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve(this.connection)
    }

    if (
      this.connection?.state === signalR.HubConnectionState.Connecting &&
      this.startPromise
    ) {
      return this.startPromise
    }

    if (this.connection?.state === signalR.HubConnectionState.Reconnecting) {
      return Promise.resolve(this.connection)
    }

    if (this.connection && this.startPromise) {
      this.connection = null
      this.startPromise = null
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    this.connection.onreconnected(() => {
      void this.rejoinGroups()
    })

    this.startPromise = this.connection
      .start()
      .then(() => this.connection!)
      .catch((err) => {
        this.startPromise = null
        throw err
      })

    return this.startPromise
  }

  async joinGameGroup(sessionId: string): Promise<void> {
    this.joinedSessions.add(sessionId)
    const connection = await this.getConnection()
    await connection.invoke('JoinGameGroup', sessionId)
  }

  async leaveGameGroup(sessionId: string): Promise<void> {
    this.joinedSessions.delete(sessionId)
    const connection = await this.getConnection()
    await connection.invoke('LeaveGameGroup', sessionId)
  }

  private async rejoinGroups(): Promise<void> {
    for (const sessionId of this.joinedSessions) {
      try {
        await this.connection?.invoke('JoinGameGroup', sessionId)
      } catch {
        // bağlantı yeniden kurulduğunda grup üyelikleri tekrar eklenir
      }
    }
  }

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.stop()
      this.connection = null
    }
    this.startPromise = null
  }
}

export const signalRManager = new SignalRManager()
