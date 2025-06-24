import * as crypto from "crypto";

class BufferWriter {
  private buffer = Buffer.alloc(1024);
  private position = 0;

  pack(): Buffer {
    const out = Buffer.alloc(this.position);
    this.buffer.copy(out, 0, 0, out.length);
    return out;
  }

  putUint16(v: number): BufferWriter {
    this.buffer.writeUInt16LE(v, this.position);
    this.position += 2;
    return this;
  }

  putUint32(v: number): BufferWriter {
    this.buffer.writeUInt32LE(v, this.position);
    this.position += 4;
    return this;
  }

  putBytes(bytes: Buffer): BufferWriter {
    this.putUint16(bytes.length);
    bytes.copy(this.buffer, this.position);
    this.position += bytes.length;
    return this;
  }

  putString(str: string): BufferWriter {
    return this.putBytes(Buffer.from(str));
  }

  putTreeMapUInt32(map: Map<number, number>): BufferWriter {
    this.putUint16(map.size);

    map.forEach((value, key) => {
      this.putUint16(key);
      this.putUint32(value);
    });

    return this;
  }
}

export const VERSION = "001";

export enum Privilege {
  PrivPublishStream = 0,
  PrivSubscribeStream = 4,
}

enum PrivatePrivilege {
  PrivPublishAudioStream = 1,
  PrivPublishVideoStream,
  PrivPublishDataStream,
}

export class AccessToken {
  appID: string;
  appKey: string;
  roomID: string;
  userID: string;
  issuedAt: number;
  nonce: number;
  expireAt: number;
  privileges: Map<number, number>;
  signature?: string;

  constructor(appID: string, appKey: string, roomID: string, userID: string) {
    this.appID = appID;
    this.appKey = appKey;
    this.roomID = roomID;
    this.userID = userID;
    this.issuedAt = Math.floor(new Date().getTime() / 1000);
    this.nonce = Math.floor(Math.random() * 0xffffffff);
    this.expireAt = 0;
    this.privileges = new Map();
  }

  addPrivilege(privilege: Privilege, expireTimestamp: number): void {
    this.privileges.set(privilege.valueOf(), expireTimestamp);

    if (privilege === Privilege.PrivPublishStream) {
      this.privileges.set(
        PrivatePrivilege.PrivPublishAudioStream.valueOf(),
        expireTimestamp
      );
      this.privileges.set(
        PrivatePrivilege.PrivPublishVideoStream.valueOf(),
        expireTimestamp
      );
      this.privileges.set(
        PrivatePrivilege.PrivPublishDataStream.valueOf(),
        expireTimestamp
      );
    }
  }

  // ExpireTime sets token expire time, won't expire by default.
  // The token will be invalid after expireTime no matter what privilege's expireTime is.
  expireTime(expireTimestamp: number): void {
    this.expireAt = expireTimestamp;
  }

  // Serialize generates the token string
  serialize(): string {
    const bytesM = this.packMsg();
    const signature = this.encodeHMac(this.appKey, bytesM);
    const content = new BufferWriter()
      .putBytes(bytesM)
      .putBytes(signature)
      .pack();

    return VERSION + this.appID + content.toString("base64");
  }

  verify(key: string): boolean {
    if (
      this.expireAt > 0 &&
      Math.floor(new Date().getTime() / 1000) > this.expireAt
    ) {
      return false;
    }
    return this.encodeHMac(key, this.packMsg()).toString() === this.signature;
  }

  private packMsg(): Buffer {
    const bufM = new BufferWriter();

    bufM.putUint32(this.nonce);
    bufM.putUint32(this.issuedAt);
    bufM.putUint32(this.expireAt);
    bufM.putString(this.roomID);
    bufM.putString(this.userID);
    bufM.putTreeMapUInt32(new Map([...this.privileges.entries()].sort()));

    return bufM.pack();
  }

  private encodeHMac(key: string, message: Buffer): Buffer {
    return crypto.createHmac("sha256", key).update(message).digest();
  }
}

export function generateRtcToken(appID: string, appKey: string, roomID: string, userID: string, expireTimestamp: number): string {
  console.log('[generateRtcToken] Called with:', { appID, appKey, roomID, userID, expireTimestamp });
  const accessToken = new AccessToken(appID, appKey, roomID, userID);
  accessToken.expireTime(expireTimestamp);
  accessToken.addPrivilege(Privilege.PrivPublishStream, expireTimestamp);
  accessToken.addPrivilege(Privilege.PrivSubscribeStream, expireTimestamp);
  const token = accessToken.serialize();
  console.log('[generateRtcToken] Generated token:', token.substring(0, 20) + '...' );
  return token;
}