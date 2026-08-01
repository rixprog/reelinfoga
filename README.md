# ReelBrain — Android app

Thin client. **All the work happens on the laptop**; this app receives a shared reel
URL, posts it, polls, and renders what comes back.

## Run it

The backend must be running on the laptop (`cd ~/projects/reelbrain && npm run dev`)
and Tailscale must be up on both devices.

```bash
# 1. plug the phone in, USB debugging on
adb devices                 # should list it

# 2. build and install the dev client (first time only, ~5-10 min)
npx expo run:android

# 3. after that, just:
npx expo start --dev-client
```

No Expo account and no EAS cloud build needed — the Android SDK is local.

## Share intents do not work in Expo Go

`expo-share-intent` needs a native build. That is what `expo run:android` produces.
Running in Expo Go will start, but ReelBrain will not appear in Instagram's share
sheet.

## The loop

1. Open a reel in Instagram → Share → ReelBrain
2. The app queues the URL locally, posts it, and returns you to Instagram
3. The laptop processes it (~40 s)
4. The reel appears on Home

The queue is on disk, so a share made with no signal or with the laptop asleep is
retried rather than lost.

## Backend URL

Settings → Backend. Defaults to `http://fedora.tail786f1.ts.net:3000` — the Tailscale
MagicDNS name, which does not change when you switch wifi networks (a LAN IP does, and
that is the usual way a setup like this breaks). "Test connection" reports how many
reels the backend can see.

## Screens

| | |
|---|---|
| Home | collections grid, closing-this-week highlight, recently saved, processing strip |
| Search | hybrid semantic + keyword, and category browse from a collection |
| Alerts | deadlines by urgency, add-to-calendar, register |
| Settings | backend URL, connection test, how-to-share |
| Reel detail | per-category card, **evidence panel**, transcript toggle |

## Not built yet

Map (needs `react-native-maps`), geofencing, trip planner, product comparison. All the
backend routes for these already exist.
