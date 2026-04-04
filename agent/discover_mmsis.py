import asyncio
import json
import websockets

async def discover_mmsis():
    print("Connecting to AIS Stream to find 5 active MMSIs...")
    async with websockets.connect("wss://stream.aisstream.io/v0/stream") as ws:
        subscribe_message = {
            "APIKey": "ff4c13e6a3bdcb8ce1c5de7227068f6ee299a3d5",
            "BoundingBoxes": [[[-90, -180], [90, 180]]],
            "FilterMessageTypes": ["PositionReport"],
        }
        await ws.send(json.dumps(subscribe_message))
        
        found = set()
        while len(found) < 5:
            msg = await ws.recv()
            data = json.loads(msg)
            mmsi = data.get("MetaData", {}).get("MMSI")
            if mmsi:
                found.add(mmsi)
                print(f"Discovered: {mmsi}")
        
    print(f"\nFinal discovered MMSIs: {list(found)}")

if __name__ == "__main__":
    try:
        asyncio.run(asyncio.wait_for(discover_mmsis(), timeout=30))
    except asyncio.TimeoutError:
        print("Timeout reached.")
    except Exception as e:
        print(f"Error: {e}")
