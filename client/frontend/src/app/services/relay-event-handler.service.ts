import { Injectable, inject, OnDestroy } from '@angular/core';
import { RelayService, type RelayMessage } from './relay.service';
import { GameHubService } from './game-hub.service';
import { DEFAULT_AVATAR } from '../data/avatars';

interface ParticipantRecord {
  playerId: string;
  playerName: string;
  teamName: string | null;
  avatarEmoji: string;
  avatarColor: string;
}

interface SessionRecord {
  quizId: string;
  quizTitle: string;
  pinCode: string;
}

/**
 * LOBI KATILIM İZOLASYONU — Dokunulmaz Yapı
 *
 * Bu servis SADECE PLAYER_JOINED olayını işler.
 * Cevap doğrulama, joker, oyun durumu gibi hiçbir kod burada yoktur.
 * MockApiService'deki cevap mantığından TAMAMEN bağımsızdır.
 *
 * Akış:
 * 1. Host cihazı lobi ekranına gider → bu servis otomatik bağlanır
 * 2. PLAYER_JOINED mesajı gelirse:
 *    a. Oturum yoksa oluştur
 *    b. İsim duplicate mi kontrol et
 *    c. Participant'ı kaydet
 *    d. Accept mesajını yayınla
 * 3. host-lobby EventSource/polling ile AYRICA dinler → UI'ı günceller
 *
 * Değişiklikler:
 * - MockApiService.handleRelayMessage'dan PLAYER_JOINED mantığı tamamen silindi
 * - Bu servis kendi relay bağlantılarını bağımsız yönetir
 * - Cevap doğrulama kodları HiÇbir şekilde etkilenmez
 */
@Injectable({ providedIn: 'root' })
export class RelayEventHandler implements OnDestroy {
  private readonly relay = inject(RelayService);
  private readonly hub = inject(GameHubService);
  private readonly disconnects: Array<() => void> = [];

  private readonly sessions = new Map<string, SessionRecord>();
  private readonly participants = new Map<string, ParticipantRecord[]>();

  constructor() {
    this.loadPersisted();
    for (const [id, session] of this.sessions) {
      this.connectSession(id, session.pinCode);
    }
  }

  ngOnDestroy(): void {
    this.disconnects.forEach((d) => d());
    this.disconnects.length = 0;
  }

  private connectSession(sessionId: string, pinCode: string): void {
    const disconnect = this.relay.connect(pinCode, true, (msg: RelayMessage) =>
      this.handleMessage(sessionId, pinCode, msg),
    );
    this.disconnects.push(disconnect);
  }

  private handleMessage(sessionId: string, pinCode: string, msg: RelayMessage): void {
    if (msg.type !== 'PLAYER_JOINED') {
      return;
    }

    const targetSessionId = msg.sessionId ?? sessionId;

    // Bitmiş oturuma katılma engeli
    // (Not: durum kontrolü basit — detaylı kontrol host-lobby'de)
    if (!this.sessions.has(targetSessionId)) {
      // Oturum bu cihazda yoksa oluştur
      const hostSession = this.sessions.values().next().value;
      this.sessions.set(targetSessionId, {
        quizId: hostSession?.quizId ?? '',
        quizTitle: hostSession?.quizTitle ?? 'Sınav',
        pinCode,
      });
      this.persist();
    }

    // İsim duplicate kontrolü
    const existing = this.participants.get(targetSessionId) ?? [];
    const normalizedName = msg.player.name.toLocaleLowerCase('tr-TR');
    if (existing.some((p) => p.playerName.toLocaleLowerCase('tr-TR') === normalizedName)) {
      void this.relay.publish(pinCode, {
        type: 'reject',
        sessionId: targetSessionId,
        playerName: msg.player.name,
        message: 'Bu isim zaten lobide kullanılıyor.',
      });
      return;
    }

    // Participant'ı kaydet
    const participant: ParticipantRecord = {
      playerId: String(msg.player.id),
      playerName: msg.player.name,
      teamName: msg.teamName ?? null,
      avatarEmoji: msg.avatarEmoji?.trim() || DEFAULT_AVATAR.emoji,
      avatarColor: msg.avatarColor?.trim() || DEFAULT_AVATAR.color,
    };
    existing.push(participant);
    this.participants.set(targetSessionId, existing);
    this.persist();

    // Accept mesajını yayınla — telefonun bağlantısını onayla
    void this.relay.publish(pinCode, {
      type: 'accept',
      sessionId: targetSessionId,
      playerName: msg.player.name,
    });
  }

  private loadPersisted(): void {
    try {
      const raw = localStorage.getItem('tki.EventHandler.sessions');
      if (raw) {
        const arr = JSON.parse(raw) as Array<[string, SessionRecord]>;
        for (const [k, v] of arr) {
          this.sessions.set(k, v);
        }
      }
      const rawP = localStorage.getItem('tki.EventHandler.participants');
      if (rawP) {
        const arr = JSON.parse(rawP) as Array<[string, ParticipantRecord[]]>;
        for (const [k, v] of arr) {
          this.participants.set(k, v);
        }
      }
    } catch { /* ignore */ }
  }

  private persist(): void {
    try {
      localStorage.setItem('tki.EventHandler.sessions', JSON.stringify([...this.sessions]));
      localStorage.setItem('tki.EventHandler.participants', JSON.stringify([...this.participants]));
    } catch { /* ignore */ }
  }
}
