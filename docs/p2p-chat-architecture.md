# P2P Chat 架構說明

## 先講結論

`p2p-chat` 的聊天內容不會經過 Vercel，也不會寫入 Cloudflare R2、KV 或 Durable Object Storage。

Cloudflare Worker 只做「房間協調」：暫時知道哪些瀏覽器在線、每個瀏覽器的 PeerJS ID 是什麼，然後把成員加入/離開事件通知給其他人。真正的文字、圖片、檔案與撤回封包，都是瀏覽器彼此透過 WebRTC 直連傳送。

```text
Vercel 靜態前端
    │
    │ 公開 wss:// Worker URL
    ▼
Cloudflare Worker
    │ 依 Room ID 路由
    ▼
Durable Object：一個 Room ID 對應一個房間協調者
    │ 只交換在線成員與 PeerJS ID
    ▼
瀏覽器 A  ◄──────── WebRTC / PeerJS DataChannel ────────►  瀏覽器 B
             聊天訊息、檔案、E2EE、撤回
```

## 一次加入房間的流程

1. A 按下「建立聊天室」。前端使用瀏覽器的隨機 UUID 產生 `Room ID`。
2. URL 立即變成 `/p2p-chat?room=<RoomID>`。這個 Room ID 是聊天室身份，不是某個使用者的身份。
3. A 的 PeerJS 建立一個暫時的 `Peer ID`，再連到：

   ```text
   wss://david888-p2p-room-signal.oobwei.workers.dev/rooms/<RoomID>
   ```

4. Worker 使用 `env.ROOMS.idFromName(RoomID)` 找到同一個 Durable Object 房間。
5. 房間把在線成員清單送回 A。B 用同一個 URL 加入時，也會收到同一份清單。
6. 前端根據成員清單建立 PeerJS 直連。為避免 A、B 同時撥號，程式以 Peer ID 字典順序決定由哪一方發起連線。
7. 直連建立後，Worker 不再參與聊天內容傳送。

程式位置：

- 前端房間流程：[`src/tools/p2p-chat/p2p-chat.vue`](../src/tools/p2p-chat/p2p-chat.vue)
- 房間訊息格式：[`src/tools/p2p-chat/p2p-chat.room-protocol.ts`](../src/tools/p2p-chat/p2p-chat.room-protocol.ts)
- Cloudflare Worker：[`workers/p2p-room-signal/src/index.ts`](../workers/p2p-room-signal/src/index.ts)
- Durable Object binding：[`workers/p2p-room-signal/wrangler.toml`](../workers/p2p-room-signal/wrangler.toml)

## 為什麼 Vercel 不需要 Cloudflare 憑證？

因為 Vercel 沒有直接存取 Cloudflare 資源。

瀏覽器只是連線到一個公開的 WebSocket endpoint，和呼叫公開 API 的概念相同：

```text
瀏覽器 → https:// / wss:// 公開 Worker URL
```

Cloudflare 平台內部則透過 Worker binding 使用 Durable Object：

```toml
[[durable_objects.bindings]]
name = "ROOMS"
class_name = "Room"
```

因此：

- Vercel 不需要保存 Cloudflare API Token。
- 瀏覽器不會拿到 Cloudflare 憑證。
- `wrangler deploy` 的 Cloudflare 登入權限只用於部署 Worker。
- 正式網站只需要知道公開的 Worker URL。

如果未來真的要從 Worker 存取 R2 或 KV，也應該由 Worker 使用 binding 存取，不應該把 R2/KV 憑證放進 Vercel 前端或瀏覽器。

## 目前有沒有 KV 寫入額度問題？

目前沒有，因為這個版本完全沒有呼叫 KV，也沒有呼叫 Durable Object Storage：

- 不保存聊天歷史。
- 不保存房間成員歷史。
- 不保存圖片或檔案。
- 成員資料只放在 WebSocket attachment 與目前在線的連線中。

所以目前確實不會產生 KV `put` 寫入量，也沒有 R2 檔案寫入量。

但這不等於「流量越大都不用付成本」。仍然會受到以下因素影響：

- Worker 請求與 WebSocket 建立連線數。
- Durable Object 收到的 WebSocket 訊息數。
- Durable Object 執行時間與 CPU 使用量。
- 同一個房間的連線數、廣播數量與記憶體壓力。
- Cloudflare 帳號方案的免費額度、計費方式與平台限制。

目前前端每 20 秒送一次 heartbeat，讓房間成員狀態保持新鮮；這些 heartbeat 也會被 Worker 處理。聊天訊息本身則不會經過 Worker，因此聊天越熱絡，不會等比例增加 Worker 的聊天封包處理量。

Cloudflare 的 Durable Object WebSocket Hibernation 可以讓閒置期間降低執行時間成本，但請求、WebSocket 訊息與連線數仍然有平台限制與計費規則。單一 Durable Object 也不是無限容量；大量不同房間可以分散到不同 Object，大量使用者集中在同一房間時仍會形成單房間瓶頸。詳見 [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)、[Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) 與 [WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)。

## 「房間持續存在」到底代表什麼？

Room ID 是穩定的房間地址，不代表聊天記錄永久保存。

- A 離開或重新整理，不會摧毀 Room ID。
- A 回到同一個 URL 後，會以新的 Peer ID / session 重新加入。
- B 不需要恢復房主，也不需要重新建立聊天室。
- 如果所有人都離開，房間可以休眠；下次有人使用同一 Room ID 時，Worker 會重新找到或啟動對應的房間協調者。
- 之前的聊天內容不會恢復，因為聊天內容從未保存到伺服器。

## 安全模型與限制

目前的邀請網址就是房間的「持有者憑證」：拿到網址的人可以加入。

- Room ID 使用隨機值，降低被猜中的機率。
- 目前沒有帳號登入、成員審核或房主權限。
- 如果邀請網址外流，拿到網址的人可以進入房間。
- E2EE 密碼仍由聊天雙方自行設定；Worker 看不到聊天明文。

若未來需要私人房間、踢人、房主權限或登入身份，就需要另外加入身份驗證與授權機制，不能只依賴隨機 Room ID。

## 部署方式

Worker 的正式網址目前是：

```text
https://david888-p2p-room-signal.oobwei.workers.dev
```

部署指令：

```bash
wrangler deploy --config workers/p2p-room-signal/wrangler.toml
```

Vercel 前端預設使用上述 Worker URL，也可以透過 `VITE_P2P_ROOM_SIGNALING_URL` 覆寫。
